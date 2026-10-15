"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FinanceActionResult,
  FinanceCommand,
  FinancePayload,
} from "@/domain/finance";
import { useWorkspace, workspaceRequest } from "./use-workspace";

export function useFinance(workspace: ReturnType<typeof useWorkspace>) {
  const academyId = workspace.data?.academy.id;
  const role = workspace.data?.membership.role;
  const allowed = role === "OWNER" || role === "ADMIN" || role === "PARENT";
  const enabled = Boolean(workspace.data?.academy.modules.includes("fees"));
  const [data, setData] = useState<FinancePayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const retry = useRef<{ fingerprint: string; command: FinanceCommand } | null>(
    null,
  );
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!academyId || !enabled || !allowed) return;
      const next = await workspaceRequest<FinancePayload>(
        `/api/workspaces/${academyId}/finance`,
        "GET",
        undefined,
        signal,
      );
      if (!signal?.aborted) {
        setData(next);
        setError("");
      }
    },
    [academyId, enabled, allowed],
  );
  useEffect(() => {
    if (!academyId || !enabled || !allowed) return;
    const controller = new AbortController();
    workspaceRequest<FinancePayload>(
      `/api/workspaces/${academyId}/finance`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (!controller.signal.aborted) {
          setData(next);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Fee account unavailable.",
          );
      });
    return () => controller.abort();
  }, [academyId, role, enabled, allowed]);
  async function mutate(
    action: FinanceCommand["action"],
    values: unknown,
    extra: { id?: string; expectedVersion?: number } = {},
  ) {
    if (pending.current || !academyId || !enabled || !allowed) return undefined;
    const fingerprint = JSON.stringify({ academyId, action, values, extra });
    const command =
      retry.current?.fingerprint === fingerprint
        ? retry.current.command
        : { requestId: crypto.randomUUID(), action, data: values, ...extra };
    retry.current = { fingerprint, command };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await workspace.finance<FinanceActionResult>(command);
      if (!result) {
        setError(
          "The change was not saved. Your draft is retained; review the error and retry.",
        );
        return undefined;
      }
      retry.current = null;
      try {
        await reload();
      } catch {
        setError(
          "Saved successfully. The fee account could not refresh; refresh it before the next change.",
        );
      }
      return result;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not refresh the fee account. Retry safely with the same draft.",
      );
      return undefined;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const scopedData =
    allowed &&
    enabled &&
    data !== null &&
    data?.academyId === academyId &&
    data.canManage === (role !== "PARENT")
      ? data
      : null;
  return {
    data: scopedData,
    error: !enabled
      ? "Fees are not enabled for this academy."
      : !allowed
        ? "Your academy role has no finance access."
        : error,
    busy,
    reload,
    mutate,
  };
}
