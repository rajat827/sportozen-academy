import { describe, it, expect } from "vitest";
import { seed } from "@/data/demo/seed";
import {
  reportViewModel,
  parentReportModels,
  reportFilename,
  saveReport,
} from "@/services/reports/report-view-model";
describe("Approved report content boundary", () => {
  it("keeps the sparse recorded facts without enriching from the live plan", () => {
    const m = reportViewModel(seed, seed.reports[0]);
    expect(m.evidence[0].headline).toBe("3 of 6");
    expect(m.evidence[0].reference).toBe("e1");
    expect(m.activities).toEqual([]);
    expect(m.reviewDate).toBeUndefined();
    expect(m.reviewedReason).toBeUndefined();
    expect(m.externalDelivery).toBe("Not sent");
    expect(JSON.stringify(m)).not.toMatch(
      /91%|Cone slalom|Private working note|50%|ranking/i,
    );
    expect(reportFilename(m)).toBe(
      "Aarav-Sharma-Development-Report-2026-10.pdf",
    );
  });
  it("freezes approval and clears it on revision", () => {
    let s = saveReport(
      structuredClone(seed),
      "r1",
      "Reviewed closing note",
      "Approved",
    );
    const m = reportViewModel(s, s.reports[0]);
    s.players[0].name = "Changed live name";
    s.reports[0].sections[0].answer = "Changed live section";
    expect(reportViewModel(s, s.reports[0])).toEqual(m);
    s = saveReport(s, "r1", "New draft note", "Draft");
    expect(s.reports[0].approvedSnapshot).toBeUndefined();
    expect(parentReportModels(s, "g1")).toEqual([]);
  });
  it("filters other children and unapproved reports", () => {
    expect(parentReportModels(seed, "g1").map((m) => m.playerId)).toEqual([
      "p1",
    ]);
    expect(parentReportModels(seed, "unknown")).toEqual([]);
  });
  it("does not invent a missing coach, sport, next step or evidence", () => {
    const s = structuredClone(seed),
      r = {
        ...s.reports[0],
        coachId: "missing",
        sportId: "missing",
        sections: [],
      };
    const m = reportViewModel(s, r);
    expect(m.coach).toBeUndefined();
    expect(m.sport).toBeUndefined();
    expect(m.evidence).toEqual([]);
    expect(m.nextStep).toMatch(/confirmed/);
  });
  it("requires reviewed evidence to approve", () => {
    const s = structuredClone(seed);
    s.evidence = [];
    expect(() => saveReport(s, "r1", "Note", "Approved")).toThrow(
      /Review supporting evidence/,
    );
  });
});
