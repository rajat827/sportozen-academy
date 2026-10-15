"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrialEnrolment, TrialPayload, TrialPolicy } from "@/domain/trial";
import { workspaceRequest, type useWorkspace } from "./use-workspace";

export type TrialAction =
  | "policy"
  | "create"
  | "transition"
  | "feedback"
  | "review"
  | "publish"
  | "convert"
  | "invoice";
type Command = {
  requestId: string;
  action: TrialAction;
  id?: string;
  expectedVersion?: number;
  data: unknown;
};
export function useTrials(
  workspace: ReturnType<typeof useWorkspace>,
  playerId: string,
) {
  const academyId = workspace.data?.academy.id,
    role = workspace.data?.membership.role;
  const allowed = ["OWNER", "ADMIN", "COACH", "PARENT"].includes(role ?? "");
  const scope = `${academyId}:${playerId}`,
    endpoint = `/api/workspaces/${academyId}/trials`;
  const [state, setState] = useState<{
      scope: string;
      data: TrialPayload;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    retry = useRef<{ fingerprint: string; command: Command } | null>(null);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!academyId || !playerId || !allowed) return;
      const data = await workspaceRequest<TrialPayload>(
        `${endpoint}?player=${encodeURIComponent(playerId)}`,
        "GET",
        undefined,
        signal,
      );
      if (!signal?.aborted) {
        setState({ scope, data });
        setError("");
      }
    },
    [academyId, playerId, allowed, endpoint, scope],
  );
  useEffect(() => {
    if (!academyId || !playerId || !allowed) return;
    const controller = new AbortController();
    workspaceRequest<TrialPayload>(
      `${endpoint}?player=${encodeURIComponent(playerId)}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setState({ scope, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Trial records unavailable.",
          );
      });
    return () => controller.abort();
  }, [academyId, playerId, allowed, endpoint, scope]);
  async function mutate(
    action: TrialAction,
    data: unknown,
    extra: { id?: string; expectedVersion?: number } = {},
  ) {
    if (pending.current || !academyId || !playerId || !allowed)
      return undefined;
    const fingerprint = JSON.stringify({ scope, action, data, extra });
    const command =
      retry.current?.fingerprint === fingerprint
        ? retry.current.command
        : { requestId: crypto.randomUUID(), action, data, ...extra };
    retry.current = { fingerprint, command };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await workspaceRequest<TrialEnrolment | TrialPolicy>(
        endpoint,
        "POST",
        command,
      );
      retry.current = null;
      const refresh = await Promise.allSettled([reload(), workspace.reload()]);
      if (refresh.some((value) => value.status === "rejected"))
        setError(
          "Trial change saved. Refresh the player and trial records before another change.",
        );
      return result;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Trial was not saved. Your draft is retained; retry safely.",
      );
      return undefined;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    data: allowed && state?.scope === scope ? state.data : null,
    error,
    busy,
    reload,
    mutate,
  };
}
