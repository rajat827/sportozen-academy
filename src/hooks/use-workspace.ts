"use client";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceKind, WorkspacePayload } from "@/domain/workspace";
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
  const [data, setData] = useState<WorkspacePayload | null>(null),
    [error, setError] = useState(""),
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
        if (!controller.signal.aborted) setData(next);
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
    setBusy(true);
    setError("");
    try {
      const value = await workspaceRequest<T>(
        `/api/workspaces/${academyId}${path}`,
        method,
        body,
      );
      await reload();
      return value;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return {
    data,
    error,
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
    configure: (body: unknown) => mutate("", "PATCH", body),
    training: <T>(body: unknown) => mutate<T>("/training", "POST", body),
  };
}
