import { describe, expect, it } from "vitest";
import type { WorkspacePlayer, WorkspaceReport } from "@/domain/workspace";
import type { WeeklyPlan } from "@/domain/communication";
import type { ReportViewModel } from "@/domain/report";
import { portalSourceAvailable } from "@/services/portal-source-selection";
import { privateSourcePath } from "@/services/communication/private-source-path";

const player = (id: string, academyId = "academy") =>
  ({ id, academyId, sportIds: ["football"] }) as WorkspacePlayer;
const weekly = (overrides: Partial<WeeklyPlan> = {}) =>
  ({
    id: "week",
    academyId: "academy",
    playerId: "child",
    sportId: "football",
    status: "APPROVED",
    snapshot: {},
    issuedAt: "2026-10-20T12:00:00Z",
    ...overrides,
  }) as WeeklyPlan;
const report = (overrides: Partial<WorkspaceReport> = {}): WorkspaceReport => ({
  id: "month",
  academyId: "academy",
  playerId: "child",
  sportId: "football",
  planId: "plan",
  period: "2026-10",
  observation: "Recorded observation",
  evidenceType: "COACH_OBSERVATION",
  nextStep: "Reviewed practice",
  closingNote: "",
  status: "Approved",
  externalDeliveryStatus: "NOT_SENT",
  snapshot: {} as ReportViewModel,
  ...overrides,
});
function context(role: "PARENT" | "SUPPORT" | "COACH" = "PARENT") {
  return {
    academy: { id: "academy" },
    membership: { role },
    records: {
      player: [player("child"), player("sibling")],
      weekly: [weekly()],
      report: [report()],
    },
  };
}
describe("private portal source selection", () => {
  it("generates explicit section/player/source context and an exact encoded anchor", () => {
    const weeklyLink = new URL(
      privateSourcePath("academy/a", "child b", "week/c", "WEEKLY"),
      "https://academy.example.test",
    );
    expect(weeklyLink.pathname).toBe("/workspace/academy%2Fa");
    expect(weeklyLink.searchParams.get("section")).toBe("development");
    expect(weeklyLink.searchParams.get("player")).toBe("child b");
    expect(weeklyLink.searchParams.get("weekly")).toBe("week/c");
    expect(weeklyLink.hash).toBe("#weekly-week%2Fc");
    const monthlyLink = new URL(
      privateSourcePath("academy", "child", "month", "MONTHLY"),
      "https://academy.example.test",
    );
    expect(monthlyLink.searchParams.get("section")).toBe("reports");
    expect(monthlyLink.searchParams.get("report")).toBe("month");
    expect(monthlyLink.hash).toBe("#report-month");
  });
  it("requires the exact selected authorised child rather than substituting a sibling", () => {
    const data = context();
    expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(true);
    for (const child of ["", "sibling", "unknown"])
      expect(portalSourceAvailable(data, child, "week", "WEEKLY")).toBe(false);
    expect(portalSourceAvailable(data, "child", "unknown", "WEEKLY")).toBe(
      false,
    );
  });
  it("does not expose an unpublished or unapproved weekly source to a parent", () => {
    for (const source of [
      weekly({ status: "DRAFT" }),
      weekly({ snapshot: undefined }),
      weekly({ issuedAt: undefined }),
    ]) {
      const data = context();
      data.records.weekly = [source];
      expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(
        false,
      );
    }
  });
  it("retains assigned staff access to an available weekly draft without promoting its approval", () => {
    const data = context("COACH");
    data.records.weekly = [
      weekly({ status: "DRAFT", snapshot: undefined, issuedAt: undefined }),
    ];
    expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(true);
    expect(data.records.weekly[0].status).toBe("DRAFT");
  });
  it("requires the same academy and a football enrolment even if a bad projection contains foreign records", () => {
    const data = context();
    data.records.weekly = [weekly({ academyId: "other" })];
    expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(false);
    data.records.weekly = [weekly()];
    data.records.player = [player("child", "other")];
    expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(false);
    data.records.player = [{ ...player("child"), sportIds: ["swimming"] }];
    expect(portalSourceAvailable(data, "child", "week", "WEEKLY")).toBe(false);
  });
  it("selects only the exact approved monthly snapshot for parent and support views", () => {
    for (const role of ["PARENT", "SUPPORT"] as const) {
      const data = context(role);
      expect(portalSourceAvailable(data, "child", "month", "MONTHLY")).toBe(
        true,
      );
      expect(portalSourceAvailable(data, "sibling", "month", "MONTHLY")).toBe(
        false,
      );
      for (const value of [
        report({ status: "Draft" }),
        report({ snapshot: undefined }),
        report({ academyId: "other" }),
      ]) {
        data.records.report = [value];
        expect(portalSourceAvailable(data, "child", "month", "MONTHLY")).toBe(
          false,
        );
      }
    }
  });
});
