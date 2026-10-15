"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnnouncementView } from "@/domain/batch-announcement";
import { workspaceRequest } from "./use-workspace";
export function useAnnouncements(academyId: string) {
  const [data, setData] = useState<AnnouncementView>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    retry = useRef<{ body: string; requestId: string } | undefined>(undefined);
  const path = `/api/workspaces/${academyId}/communication/announcements`;
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const next = await workspaceRequest<AnnouncementView>(
        path,
        "GET",
        undefined,
        signal,
      );
      if (!signal?.aborted) setData(next);
    },
    [path],
  );
  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<AnnouncementView>(
      path,
      "GET",
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (!controller.signal.aborted) setData(next);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Announcements unavailable.",
          );
      });
    return () => controller.abort();
  }, [path]);
  async function run<T>(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ): Promise<T | undefined> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const value = { action, data, id, expectedVersion },
      body = JSON.stringify(value);
    const requestId =
      retry.current?.body === body
        ? retry.current.requestId
        : crypto.randomUUID();
    retry.current = { body, requestId };
    try {
      const result = await workspaceRequest<T>(path, "POST", {
        ...value,
        requestId,
      });
      retry.current = undefined;
      if (action !== "preview")
        try {
          await reload();
        } catch {
          setError(
            "The announcement was saved, but the refreshed list is unavailable. Reload before continuing.",
          );
        }
      return result;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Announcement request failed; your draft is retained.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { data, error, busy, run };
}
