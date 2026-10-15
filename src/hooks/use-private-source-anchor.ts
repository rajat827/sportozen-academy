"use client";
import { useEffect } from "react";

/** Focus only a validated rendered source, after its authenticated data arrives. */
export function usePrivateSourceAnchor(anchor?: string) {
  useEffect(() => {
    if (!anchor) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ block: "start" });
        target.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor]);
}
