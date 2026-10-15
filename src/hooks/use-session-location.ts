"use client";
import { useEffect, useRef, useState } from "react";
import type {
  SessionPlaceChoice,
  SessionPlaceSuggestion,
  SessionPlacesStatus,
} from "@/domain/session-location";
import { workspaceRequest } from "./use-workspace";

export function useSessionLocation(
  academyId: string,
  squadId: string,
  operationalLocation: string,
) {
  const [status, setStatus] = useState<SessionPlacesStatus | "LOADING">(
    "LOADING",
  );
  const [suggestions, setSuggestions] = useState<SessionPlaceSuggestion[]>([]);
  const [choice, setChoice] = useState<SessionPlaceChoice | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useRef<string | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const endpoint = `/api/workspaces/${academyId}/places`;
  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<{ status: SessionPlacesStatus }>(
      endpoint,
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setStatus(result.status);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("CONFIGURATION_BLOCKED");
      });
    return () => controller.abort();
  }, [endpoint]);
  function clear(endSession = false) {
    generation.current += 1;
    if (endSession) token.current = null;
    setSuggestions([]);
    setChoice(null);
    setNotice("");
  }
  async function search(query: string) {
    if (pending.current) return;
    if (!squadId || query.trim().length < 3 || query.trim().length > 120) {
      setNotice("Choose a batch and enter 3–120 characters to search.");
      return;
    }
    if (status !== "AVAILABLE") {
      setNotice(
        "Google Maps is configuration-blocked. Enter the training location manually.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setChoice(null);
    setNotice("");
    setSuggestions([]);
    token.current ??= crypto.randomUUID();
    const current = ++generation.current;
    try {
      const result = await workspaceRequest<{
        suggestions: SessionPlaceSuggestion[];
      }>(endpoint, "POST", {
        action: "search",
        squadId,
        sessionToken: token.current,
        query,
      });
      if (current === generation.current) {
        setSuggestions(result.suggestions);
        if (!result.suggestions.length)
          setNotice(
            "No places found. Refine your search or enter a manual location.",
          );
      }
    } catch (error) {
      if (current === generation.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "Maps search unavailable. Use a manual location.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function select(placeId: string) {
    if (pending.current || !token.current) return;
    if (!operationalLocation.trim()) {
      setNotice(
        "Enter your academy's training location above before confirming a map selection.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setNotice("");
    const current = ++generation.current;
    try {
      const result = await workspaceRequest<{ place: SessionPlaceChoice }>(
        endpoint,
        "POST",
        {
          action: "select",
          squadId,
          sessionToken: token.current,
          placeId,
          operationalLocation,
        },
      );
      if (current === generation.current) {
        setChoice(result.place);
        setSuggestions([]);
      }
    } catch (error) {
      if (current === generation.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "Place details unavailable. Use a manual location.",
        );
    } finally {
      token.current = null;
      pending.current = false;
      setBusy(false);
    }
  }
  return { status, suggestions, choice, notice, busy, search, select, clear };
}
