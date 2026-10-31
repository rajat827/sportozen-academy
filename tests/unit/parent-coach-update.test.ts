import { describe, expect, it } from "vitest";
import type { WorkspaceReport, WorkspaceUpdate } from "@/domain/workspace";
import type { ReportViewModel } from "@/domain/report";
import { parentCoachUpdatePreview } from "@/services/parent-coach-update";

const attendanceBasis =
  "Attendance basis: present / (present + absent); 1/1 (100%).";
const missingObservation =
  "This monthly snapshot has no eligible in-period individual observation; further coach review is required.";
const report = (overrides: Partial<WorkspaceReport> = {}): WorkspaceReport => ({
  id: "month",
  academyId: "academy",
  playerId: "child",
  sportId: "football",
  planId: "plan",
  period: "2026-09",
  observation: missingObservation,
  evidenceType: "COACH_OBSERVATION",
  nextStep: "Review receiving",
  closingNote: "",
  status: "Approved",
  externalDeliveryStatus: "NOT_SENT",
  snapshot: {
    evidence: [
      { text: attendanceBasis, source: "Recorded session attendance" },
      {
        text: "No reviewed parent-eligible observations recorded in this period.",
        source: "Missing evidence",
      },
    ],
  } as ReportViewModel,
  ...overrides,
});
const update = (overrides: Partial<WorkspaceUpdate> = {}): WorkspaceUpdate => ({
  id: "update",
  academyId: "academy",
  playerId: "child",
  sportId: "football",
  planId: "plan",
  type: "DEVELOPMENT",
  messageBody: "Unapproved working text",
  approvedBody: "Reviewed ball control needs another comparable session.",
  approvalStatus: "APPROVED",
  inAppPublicationStatus: "PUBLISHED",
  externalDeliveryStatus: "NOT_SENT",
  version: 1,
  approvedAt: "2026-10-20T12:00:00Z",
  ...overrides,
});
const scope = { academyId: "academy", playerId: "child" };

describe("parent Latest Coach Update preview", () => {
  it("shows the actual missing-observation wording instead of concatenating attendance evidence", () => {
    const preview = parentCoachUpdatePreview({ ...scope, report: report() });
    expect(preview.body).toBe(missingObservation);
    expect(preview.body).not.toContain("Attendance basis:");
    expect(preview.source).toBe("approved-report");
    expect(preview.destination).toBe("reports");
    expect(preview.reportId).toBe("month");
  });
  it("uses an explicit missing-observation message when an approved report has no observation", () => {
    const preview = parentCoachUpdatePreview({
      ...scope,
      report: report({ observation: "  " }),
    });
    expect(preview.source).toBe("missing");
    expect(preview.body).toContain("No reviewed individual observation");
    expect(preview.body).not.toContain(attendanceBasis);
  });
  it("gives the published approved update body and its actual approval date priority", () => {
    const shared = update(),
      preview = parentCoachUpdatePreview({
        ...scope,
        report: report(),
        update: shared,
      });
    expect(preview.body).toBe(shared.approvedBody);
    expect(preview.approvedAt).toBe(shared.approvedAt);
    expect(preview.destination).toBe("messages");
    expect(preview.reportId).toBeUndefined();
    expect(preview.body).not.toContain(shared.messageBody);
  });
  it("keeps unpublished, unapproved or empty update wording out of the preview", () => {
    for (const value of [
      update({ approvalStatus: "DRAFT" }),
      update({ inAppPublicationStatus: "UNPUBLISHED" }),
      update({ approvedBody: " " }),
    ]) {
      const preview = parentCoachUpdatePreview({
        ...scope,
        report: report(),
        update: value,
      });
      expect(preview.body).toBe(missingObservation);
      expect(preview.destination).toBe("reports");
    }
  });
  it("does not substitute another child's or academy's source", () => {
    for (const values of [{ playerId: "sibling" }, { academyId: "other" }]) {
      const preview = parentCoachUpdatePreview({
        ...scope,
        report: report(values),
        update: update(values),
      });
      expect(preview.source).toBe("missing");
      expect(preview.reportId).toBeUndefined();
      expect(preview.body).not.toContain("Reviewed ball control");
    }
  });
  it("does not present an unapproved or unsnapshotted report as a coach update", () => {
    for (const value of [
      report({ status: "Draft" }),
      report({ snapshot: undefined }),
    ]) {
      const preview = parentCoachUpdatePreview({ ...scope, report: value });
      expect(preview.source).toBe("missing");
      expect(preview.reportId).toBeUndefined();
    }
  });
});
