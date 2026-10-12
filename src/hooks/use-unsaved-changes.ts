"use client";
import { useEffect } from "react";

const checkedEvents = new WeakSet<Event>();
const dirtyEditors = new Set<symbol>();
export function confirmUnsavedChanges() {
  return (
    !dirtyEditors.size ||
    window.confirm(
      "You have unsaved changes. Stay to save them, or discard them and leave?",
    )
  );
}

/** Drafts stay in their editor on cancellation; no private draft enters URL/storage. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const editor = Symbol();
    dirtyEditors.add(editor);
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest(
        "a[href], .workspace-tabs button, .training-desk-tabs button, [data-leave-editor]",
      );
      if (!action || checkedEvents.has(event)) return;
      checkedEvents.add(event);
      if (
        !window.confirm(
          "You have unsaved changes. Stay to save them, or discard them and leave?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      dirtyEditors.delete(editor);
    };
  }, [dirty]);
}
