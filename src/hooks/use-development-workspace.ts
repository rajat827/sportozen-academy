"use client";
import { usePathname } from "next/navigation";
import { useAcademy } from "./use-academy";
import type { DemoState } from "@/domain/entities";
import type { Actor } from "@/services/communication/parent-updates";
export function useDevelopmentWorkspace() {
  const ctx = useAcademy();
  const path = usePathname();
  const actor: Actor = path.startsWith("/parent")
    ? { role: "parent", id: "g1" }
    : path.startsWith("/owner")
      ? { role: "owner", id: "owner-demo" }
      : { role: "coach", id: "c1" };
  function mutate(transform: (state: DemoState) => DemoState) {
    try {
      ctx.update(transform);
      return true;
    } catch (error) {
      ctx.notify(error instanceof Error ? error.message : "Could not save.");
      return false;
    }
  }
  return { ...ctx, actor, mutate };
}
