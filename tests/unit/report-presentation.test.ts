import { describe, expect, it } from "vitest";
import type { ReportViewModel } from "@/domain/report";
import type { FootballEvidence } from "@/domain/training";
import {
  activityIllustration,
  approvedReportPresentationData,
  parentReportSnapshot,
  reportPresentation,
} from "@/services/reports/report-presentation";

const conditions =
  "Six turns around two cones, walking pace, unopposed, same surface and cue";
const id = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
function evidence(
  index: number,
  value: number,
): ReportViewModel["evidence"][number] {
  return {
    text: `Coach record: ${value} of six close-control turns kept within the marked channel. Further comparable sessions support the next review. ${value} successful out of 6 recorded attempts. Conditions: ${conditions}.`,
    source: `RAW_RECORD reviewed 2026-08-${String(1 + index * 7).padStart(2, "0")}T02:31:00.000Z`,
    reference: `Session ${id(index)}; evidence ${id(index + 10)}; drill version 2`,
  };
}
function model(): ReportViewModel {
  return {
    reportId: "report",
    playerId: "child",
    academy: "Recorded Academy",
    player: "Recorded Player",
    period: "2026-08 (Asia/Kolkata)",
    status: "Approved",
    externalDelivery: "Not sent",
    demo: true,
    focus: "Dribbling",
    practised: "Close-control practice",
    squad: "Under-8",
    coach: "Recorded coach",
    activities: [
      {
        name: "Close-control practice",
        purpose: "Keep comfortable touches within the marked channel",
        drillId: id(100),
      },
    ],
    evidence: [
      {
        text: "5 completed roster sessions; 5 present, 0 absent, 0 excused, 0 unmarked. Attendance basis: present / (present + absent); excused and unmarked excluded. 5/5 (100%). Cancelled and unfinished sessions excluded.",
        source: "Recorded session attendance",
      },
      ...[2, 2, 3, 3, 4].map((value, index) => evidence(index, value)),
      {
        text: "Only these recorded attempts inform this review. Continue comparable observations.",
        source: "Coach reviewed commentary",
      },
    ],
    nextStep: "Repeat comparable recorded attempts",
    reviewDate: "2026-09-30",
    note: "Continue coach-reviewed practice",
  };
}
function measured(
  index: number,
  overrides: Partial<FootballEvidence> = {},
): FootballEvidence {
  return {
    id: id(index),
    academyId: "academy",
    sportId: "football",
    version: 1,
    updatedAt: "2026-09-01T00:00:00Z",
    updatedBy: "coach",
    sessionId: `session-${index}`,
    playerId: "child",
    drillId: "drill",
    drillVersion: 1,
    drillName: "Recorded close-control activity",
    conditions,
    observation: "Recorded close control under the saved conditions",
    staffNote: "PRIVATE STAFF MARKER",
    type: "RAW_RECORD",
    visibility: "PARENT_ELIGIBLE",
    measurement: "ATTEMPTS",
    unit: "ATTEMPTS",
    attempts: 6,
    successes: index,
    method: "Six measured turns",
    status: "REVIEWED",
    authorId: "coach",
    recordedAt: "2026-08-20T00:00:00Z",
    reviewedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("One approved report presentation for screen and PDF", () => {
  it("derives the five legacy records from saved wording and labels their dates as reviewed dates", () => {
    const saved = model(),
      before = structuredClone(saved);
    const p = reportPresentation(saved);
    expect(p.periodLabel).toBe("August 2026");
    expect(p.reviewDateLabel).toBe("30 September 2026");
    expect(p.attendance).toEqual({
      total: 5,
      present: 5,
      absent: 0,
      excused: 0,
      unmarked: 0,
    });
    expect(p.measurementSeries).toHaveLength(1);
    expect(p.measurementSeries[0].comparable).toBe(true);
    expect(
      p.measurementSeries[0].points.map((point) => [
        point.value,
        point.total,
        point.date,
        point.dateKind,
      ]),
    ).toEqual(
      [2, 2, 3, 3, 4].map((value, index) => [
        value,
        6,
        `2026-08-${String(index * 7 + 1).padStart(2, "0")}`,
        "REVIEWED",
      ]),
    );
    expect(p.coachEvaluation).toEqual([saved.evidence.at(-1)!.text]);
    expect(saved).toEqual(before);
  });
  it("never connects different saved conditions, versions, attempts or descriptive meaning", () => {
    for (const change of [
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        text: e.text.replace(conditions, "Different pace and surface"),
      }),
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        reference: e.reference!.replace("version 2", "version 3"),
      }),
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        text: e.text.replace("of 6 recorded", "of 8 recorded"),
      }),
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        text: e.text.replace("close-control turns", "finishing attempts"),
      }),
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        source: "RAW_RECORD reviewed 2026-09-08T02:31:00.000Z",
      }),
      (e: ReportViewModel["evidence"][number]) => ({
        ...e,
        reference: undefined,
      }),
    ]) {
      const saved = model();
      saved.evidence = [evidence(0, 2), change(evidence(1, 3))];
      const p = reportPresentation(saved);
      expect(p.measurementSeries).toHaveLength(2);
      expect(p.measurementSeries.every((s) => !s.comparable)).toBe(true);
    }
  });
  it("keeps unknown or impossible attendance missing instead of inventing zero", () => {
    const saved = model();
    saved.evidence[0].text = saved.evidence[0].text.replace(
      "5 present",
      "4 present",
    );
    expect(reportPresentation(saved).attendance).toBeUndefined();
    saved.evidence = [];
    expect(reportPresentation(saved).attendance).toBeUndefined();
    expect(reportPresentation(saved).measurementSeries).toEqual([]);
  });
  it("does not turn an unclear or impossible result into a measured ability score", () => {
    const saved = model();
    saved.evidence = [
      {
        text: "No comparable measurements were recorded.",
        source: "Coach observation",
      },
      {
        ...evidence(0, 2),
        text: evidence(0, 2).text.replace("2 successful", "9 successful"),
      },
    ];
    const p = reportPresentation(saved);
    expect(p.measurementSeries).toEqual([]);
    expect(p.observations).toHaveLength(2);
    expect(p.observations[0]).toBe("No comparable measurements were recorded.");
  });
  it("preserves old approved introductory count headlines and labels without inventing dates or a trend", () => {
    const saved = model();
    saved.evidence = [
      {
        headline: "3 of 6",
        label: "Close control observed",
        text: "Close control was observed in three of six introductory attempts. More comparable sessions are needed.",
        source: "Coach observation",
      },
    ];
    const p = reportPresentation(saved);
    expect(p.measurementSeries).toEqual([]);
    expect(p.observations).toEqual([
      "Close control observed · 3 of 6 · Close control was observed in three of six introductory attempts. More comparable sessions are needed.",
    ]);
    expect(
      reportPresentation(parentReportSnapshot(saved)).observations,
    ).toEqual(p.observations);
  });
  it("projects public facts server-side without changing stored evidence or losing long commentary", () => {
    const saved = model(),
      commentary =
        "Conditions: a coach-authored sentence, not technical metadata.\n".repeat(
          80,
        );
    saved.evidence.push({
      text: commentary,
      source: "Coach reviewed commentary",
    });
    const before = structuredClone(saved);
    const publicModel = parentReportSnapshot(saved),
      p = reportPresentation(publicModel);
    expect(saved).toEqual(before);
    expect(JSON.stringify(publicModel)).not.toMatch(
      /Attendance basis|drill version|00000000-0000|Conditions: Six turns/,
    );
    expect(p.coachEvaluation).toContain(commentary.trim());
    expect(p.measurementSeries[0].points.map((point) => point.value)).toEqual([
      2, 2, 3, 3, 4,
    ]);
    expect(reportPresentation(parentReportSnapshot(publicModel))).toEqual(p);
    expect(publicModel.note).toBe(saved.note);
  });
  it("captures actual session dates for new approvals and uses the existing strict comparison rule", () => {
    const records = [
      measured(1),
      measured(2),
      measured(3, { method: "Another collection method" }),
    ];
    const data = approvedReportPresentationData({
      evidence: records,
      sessions: records.map((record, index) => ({
        id: record.sessionId,
        startAt: `2026-08-${String(index + 1).padStart(2, "0")}T11:00:00Z`,
      })),
      timezone: "Asia/Kolkata",
      attendance: { total: 4, present: 2, absent: 1, excused: 1, unmarked: 0 },
      coachEvaluation: ["The exact recorded evaluation"],
    });
    expect(data.measurementSeries).toHaveLength(2);
    expect(data.measurementSeries[0].comparable).toBe(true);
    expect(
      data.measurementSeries[0].points.map((point) => [
        point.date,
        point.dateKind,
      ]),
    ).toEqual([
      ["2026-08-01", "SESSION"],
      ["2026-08-02", "SESSION"],
    ]);
    expect(data.measurementSeries[1].comparable).toBe(false);
    expect(JSON.stringify(data)).not.toContain("PRIVATE STAFF MARKER");
    expect(data.coachEvaluation).toEqual(["The exact recorded evaluation"]);
  });
  it("excludes staff-only and unreviewed source records when capturing new public facts", () => {
    const data = approvedReportPresentationData({
      evidence: [
        measured(1, { visibility: "STAFF_ONLY" }),
        measured(2, { status: "AWAITING_REVIEW" }),
      ],
      sessions: [],
      timezone: "UTC",
    });
    expect(data.measurementSeries).toEqual([]);
    expect(data.observations).toEqual([]);
  });
  it("keeps complete authored Conditions sentences in both measured and nonnumerical new observations", () => {
    const authored =
      "The coach recorded controlled touches. Conditions: this is part of the authored explanation.\nContinue the same recorded cue.";
    const data = approvedReportPresentationData({
      evidence: [
        measured(1, { observation: authored }),
        measured(2, {
          observation: authored,
          measurement: "OBSERVATION",
          unit: "NONE",
          attempts: undefined,
          successes: undefined,
        }),
      ],
      sessions: [],
      timezone: "UTC",
      coachEvaluation: [authored],
    });
    expect(data.measurementSeries[0].points[0].observation).toBe(authored);
    expect(data.observations).toEqual([authored]);
    expect(data.coachEvaluation).toEqual([authored]);
    expect(JSON.stringify(data)).not.toContain("PRIVATE STAFF MARKER");
  });
  it("keeps recorded identity and activity counts without inventing photos, logos or extra drills", () => {
    const p = reportPresentation(model());
    expect(p.player).toBe("Recorded Player");
    expect(p.academy).toBe("Recorded Academy");
    expect(p.logoData).toBeUndefined();
    expect(p.playerPhoto).toBeUndefined();
    expect(p.ageCategory).toBeUndefined();
    expect(p.activityCards).toHaveLength(1);
    expect(p.activityCards[0].illustrationKey).toBe("close-control");
    expect(
      [
        "Movement warm-up",
        "Passing pairs",
        "Small-sided game",
        "Unmapped exercise",
      ].map(activityIllustration),
    ).toEqual([
      "movement-warm-up",
      "passing-pairs",
      "small-sided-game",
      "generic-football",
    ]);
  });
});
