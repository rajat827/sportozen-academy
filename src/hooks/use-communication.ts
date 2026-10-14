"use client";
import { useEffect, useState } from "react";
import { workspaceRequest, useWorkspace } from "./use-workspace";
import type {
  CommunicationSettings,
  GuardianContact,
  DeliveryJob,
} from "@/domain/communication";
export interface CommunicationView {
  settings: CommunicationSettings;
  contacts: GuardianContact[];
  jobs: DeliveryJob[];
  reminders: { playerId: string; period: string; reason: string }[];
  unrouted: {
    id: string;
    receivedAt: string;
    outcome: string;
    guardianId?: string;
    body?: string;
  }[];
}
export function useCommunication(w: ReturnType<typeof useWorkspace>) {
  const [data, setData] = useState<CommunicationView>(),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    if (w.data)
      workspaceRequest<CommunicationView>(
        `/api/workspaces/${w.data.academy.id}/communication`,
        "GET",
        undefined,
        controller.signal,
      )
        .then((v) => {
          if (!controller.signal.aborted) setData(v);
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error ? e.message : "Communication unavailable",
            );
        });
    return () => controller.abort();
  }, [w.data]);
  return { data, error };
}
