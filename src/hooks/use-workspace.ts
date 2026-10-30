"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import type { WorkspaceKind, WorkspacePayload } from "@/domain/workspace";
import type { FootballSession } from "@/domain/training";

function isSavedSession(value: unknown): value is FootballSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    [
      "id",
      "academyId",
      "sportId",
      "branchId",
      "squadId",
      "location",
      "timezone",
      "startLocal",
      "endLocal",
      "startAt",
      "endAt",
      "theme",
      "updatedAt",
      "updatedBy",
    ].every((key) => typeof record[key] === "string") &&
    typeof record.version === "number" &&
    typeof record.status === "string" &&
    ["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(
      record.status,
    ) &&
    Array.isArray(record.coachIds) &&
    Array.isArray(record.roster) &&
    Array.isArray(record.agenda) &&
    Array.isArray(record.objectives)
  );
}

export async function workspaceRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error ?? "Request could not be completed.");
  return value;
}
export function useWorkspace(academyId: string) {
  const pending = useRef(false);
  const [data, setData] = useState<WorkspacePayload | null>(null),
    [error, setError] = useState(""),
    [trainingFeedback, setTrainingFeedback] = useState<{
      academyId: string;
      notice: string;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const next = await workspaceRequest<WorkspacePayload>(
        `/api/workspaces/${academyId}`,
        "GET",
        undefined,
        signal,
      );
      if (!signal?.aborted) setData(next);
    },
    [academyId],
  );
  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<WorkspacePayload>(
      `/api/workspaces/${academyId}`,
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
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Workspace unavailable.");
      });
    return () => controller.abort();
  }, [academyId]);
  async function mutate<T>(
    path: string,
    method: string,
    body: unknown,
  ): Promise<T | undefined> {
    if (pending.current) return undefined;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await workspaceRequest<T>(
        `/api/workspaces/${academyId}${path}`,
        method,
        body,
      );
      try {
        await reload();
      } catch {
        if (
          path === "/training" &&
          typeof body === "object" &&
          body !== null &&
          "action" in body &&
          body.action === "session" &&
          isSavedSession(value) &&
          value.academyId === academyId
        ) {
          const session = value;
          setData((current) => {
            if (current?.academy.id !== academyId) return current;
            const previous = current.records.session.find(
              (record) => record.id === session.id,
            );
            if (previous && previous.version > session.version) return current;
            return {
              ...current,
              records: {
                ...current.records,
                session: [
                  ...current.records.session.filter(
                    (record) => record.id !== session.id,
                  ),
                  session,
                ],
              },
            };
          });
        }
        setError(
          "Saved to academy records, but the refreshed view could not load. Reload to see the confirmed result.",
        );
      }
      return value;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return undefined;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    data: data?.academy.id === academyId ? data : null,
    error,
    trainingNotice:
      trainingFeedback?.academyId === academyId ? trainingFeedback.notice : "",
    setTrainingNotice: (notice: string) =>
      setTrainingFeedback({ academyId, notice }),
    busy,
    reload,
    save: <T>(kind: WorkspaceKind, body: unknown, id?: string) =>
      mutate<T>(
        `/records/${kind}${id ? `/${id}` : ""}`,
        id ? "PUT" : "POST",
        body,
      ),
    action: <T>(
      action: string,
      id?: string,
      payload?: unknown,
      verified = false,
    ) => mutate<T>("/actions", "POST", { action, id, data: payload, verified }),
    configure: (body: unknown) =>
      mutate("", "PATCH", {
        expectedVersion: data?.academy.configVersion ?? 0,
        ...(typeof body === "object" && body !== null ? body : {}),
      }),
    training: <T>(body: unknown) => mutate<T>("/training", "POST", body),
    period: <T>(body: unknown) => mutate<T>("/periods", "POST", body),
    communication: <T>(body: unknown) =>
      mutate<T>("/communication", "POST", body),
    finance: <T>(body: unknown) => mutate<T>("/finance", "POST", body),
  };
}
