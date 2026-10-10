"use client";
import { useAcademy } from "@/hooks/use-academy";
import type { MessageDraft } from "@/domain/entities";
import {
  newDraft,
  transitionDraft,
} from "@/services/communication/message-drafts";
export function useMessageDrafts() {
  const { data, update, notify, ready } = useAcademy();
  function create() {
    const draft = newDraft(data);
    update((s) => ({ ...s, messages: [...s.messages, draft] }));
    return draft;
  }
  function act(
    edited: MessageDraft,
    action: Parameters<typeof transitionDraft>[2],
  ) {
    const current = data.messages.find((m) => m.id === edited.id);
    if (!current) return;
    try {
      const next = transitionDraft(current, edited, action);
      update((s) => ({
        ...s,
        messages: s.messages.map((m) => (m.id === next.id ? next : m)),
      }));
      return next;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not update draft.",
      );
    }
  }
  return { data, ready, create, act, notify };
}
