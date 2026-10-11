import type { DemoState, ReportCard } from "@/domain/entities";
import { sportConfiguration } from "@/config/sports";

import type { ReportViewModel } from "@/domain/report";
export type { ReportViewModel } from "@/domain/report";

// Existing sparse reports are already approved records. Never enrich them from a
// live plan: its assigned drills, dates and private reasons were not approved here.
export function reportViewModel(
  state: DemoState,
  report: ReportCard,
): ReportViewModel {
  if (report.approvedSnapshot && report.status === "Approved")
    return structuredClone(report.approvedSnapshot);
  const player = state.players.find(
    (p) => p.id === report.playerId && p.academyId === report.academyId,
  );
  if (!player) throw new Error("Linked report player is unavailable.");
  const section = (pattern: RegExp) =>
    report.sections.find((s) => pattern.test(s.question))?.answer.trim() ?? "";
  const rawEvidence = section(/evidence|observ/i);
  const reference = rawEvidence.match(/\b(?:observation\s+)?(e\d+)\b/i)?.[1];
  const linked = reference
    ? state.evidence.find(
        (e) =>
          e.id === reference &&
          e.playerId === player.id &&
          e.academyId === report.academyId &&
          e.status === "Coach Reviewed",
      )
    : undefined;
  // Only highlight the recorded count; it is not a percentage or skill rating.
  const count =
    /(?:three|3)\s+of\s+(?:six|6)\s+introductory attempts/i.test(rawEvidence) &&
    /close control/i.test(rawEvidence);
  const evidence = rawEvidence
    ? [
        {
          text: count
            ? "Close control was observed in three of six introductory attempts. More comparable sessions are needed before drawing a conclusion about progress."
            : rawEvidence.replace(/Coach observation\s+e\d+:\s*/i, ""),
          source:
            linked?.type ??
            (/coach observation/i.test(rawEvidence)
              ? "Coach observation"
              : "Approved report record"),
          reference: linked?.id,
          ...(count
            ? { headline: "3 of 6", label: "Close control observed" }
            : {}),
        },
      ]
    : [];
  return {
    reportId: report.id,
    playerId: player.id,
    academy: state.academy.name,
    player: player.name,
    period: report.period,
    status: report.status,
    externalDelivery: "Not sent",
    demo: true,
    sport: sportConfiguration(report.sportId)?.name,
    squad: player.squad || undefined,
    coach: state.coaches.find(
      (c) => c.id === report.coachId && c.academyId === report.academyId,
    )?.name,
    focus: section(/practis|focus/i) || "Training focus not recorded",
    practised:
      section(/practis/i) || "Recorded activities are awaiting confirmation.",
    activities: structuredClone(report.recordedDetails?.activities ?? []),
    reviewedReason: report.recordedDetails?.reviewedReason,
    reviewDate: report.recordedDetails?.reviewDate,
    nextDrill: report.recordedDetails?.nextDrill,
    observationCriteria: report.recordedDetails?.observationCriteria,
    evidence,
    nextStep: section(/next/i) || "Next development step to be confirmed",
    note: report.remarks,
  };
}

export function reportFilename(model: ReportViewModel) {
  const date = new Date(`1 ${model.period}`);
  const period = Number.isNaN(date.getTime())
    ? model.period
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${model.player.replace(/[^\p{L}\p{N}]+/gu, "-")}-Development-Report-${period.replace(/[^\p{L}\p{N}-]+/gu, "-")}.pdf`;
}

export function parentReportModels(state: DemoState, guardianId: string) {
  const ids = state.players
    .filter((p) => p.guardianId === guardianId)
    .map((p) => p.id);
  return state.reports
    .filter((r) => ids.includes(r.playerId) && r.status === "Approved")
    .map((r) => reportViewModel(state, r));
}

export function saveReport(
  state: DemoState,
  id: string,
  remarks: string,
  status: ReportCard["status"],
): DemoState {
  const report = state.reports.find((r) => r.id === id);
  if (!report) throw new Error("Report not found.");
  if (
    status === "Approved" &&
    !state.evidence.some(
      (e) =>
        e.playerId === report.playerId &&
        e.academyId === report.academyId &&
        e.status === "Coach Reviewed",
    )
  )
    throw new Error("Review supporting evidence before approving this report.");
  const edited: ReportCard = {
    ...report,
    remarks,
    status,
    approvedSnapshot: undefined,
  };
  if (status === "Approved")
    edited.approvedSnapshot = structuredClone(reportViewModel(state, edited));
  return {
    ...state,
    reports: state.reports.map((r) => (r.id === id ? edited : r)),
  };
}
