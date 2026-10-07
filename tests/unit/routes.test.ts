import { describe, it, expect } from "vitest";
import { isSupportedRoute } from "@/config/navigation/routes";
describe("Role route validation before streaming", () => {
  it("accepts supported static and dynamic route shapes", () => {
    for (const route of [
      "/owner/academy/branches",
      "/owner/players/p1",
      "/coach/sessions/s-123/desk",
      "/coach/sessions/new",
      "/parent/progress",
    ])
      expect(isSupportedRoute(route)).toBe(true);
  });
  it("rejects unsupported roles, modules and excess path segments", () => {
    for (const route of [
      "/owner/unsupported",
      "/parent/players/p2",
      "/owner/academy/unknown",
      "/coach/evidence/e1/extra",
      "/admin/dashboard",
    ])
      expect(isSupportedRoute(route)).toBe(false);
  });
});
