"use client";
import { useEffect } from "react";

const checkedEvents = new WeakSet<Event>();
const dirtyEditors = new Map<symbol, (() => void) | undefined>();
export function confirmUnsavedChanges() {
  const leave =
    !dirtyEditors.size ||
    window.confirm(
      "You have unsaved changes. Stay to save them, or discard them and leave?",
    );
  if (leave) dirtyEditors.forEach((discard) => discard?.());
  return leave;
}

/** Drafts stay in their editor on cancellation; no private draft enters URL/storage. */
export function useUnsavedChanges(dirty: boolean, onDiscard?: () => void) {
  useEffect(() => {
    if (!dirty) return;
    const editor = Symbol();
    dirtyEditors.set(editor, onDiscard);
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest(
        "a[href], .workspace-tabs button, .training-desk-tabs button, [data-leave-editor]",
      );
      if (!action || checkedEvents.has(event)) return;
      checkedEvents.add(event);
      const leave = window.confirm(
        "You have unsaved changes. Stay to save them, or discard them and leave?",
      );
      if (!leave) {
        event.preventDefault();
        event.stopPropagation();
      } else dirtyEditors.forEach((discard) => discard?.());
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      dirtyEditors.delete(editor);
    };
  }, [dirty, onDiscard]);
}
