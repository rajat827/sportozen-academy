import type { WorkspaceReport } from "@/domain/workspace";

export interface ReportSourceReview {
  sourcesCurrent: boolean;
  reason?: string;
}

export type ReportReviewQueueStatus =
  "Draft" | "Needs Review" | "Ready for Approval" | "Approved";

/** Display guidance only. The existing approval command rechecks every rule. */
export function reportReviewEligibility(
  report: WorkspaceReport | undefined,
  options: {
    dirty: boolean;
    reviewed: boolean;
    busy?: boolean;
    sourceReview?: ReportSourceReview;
    now?: Date;
  },
): {
  canApprove: boolean;
  reason: string;
  queueStatus: ReportReviewQueueStatus;
} {
  if (report?.status === "Approved")
    return {
      canApprove: false,
      reason:
        "This report is approved. Prepare a reviewed correction to change it.",
      queueStatus: "Approved",
    };
  if (!report?.monthlySources || !report.reportingPeriod)
    return {
      canApprove: false,
      reason: "Prepare a monthly draft from recorded training first.",
      queueStatus: "Draft",
    };

  const untouched =
    !report.observation.trim() &&
    !report.nextStep.trim() &&
    !report.closingNote.trim();
  const blocked = (reason: string) => ({
    canApprove: false,
    reason,
    queueStatus: (untouched && !options.dirty
      ? "Draft"
      : "Needs Review") as ReportReviewQueueStatus,
  });
  if (options.dirty) return blocked("Save your changes before approving.");
  if (options.sourceReview?.sourcesCurrent === false)
    return blocked(
      options.sourceReview.reason ||
        "Training records changed. Refresh the draft's training evidence and review it again.",
    );
  const end = Date.parse(report.reportingPeriod.endAt);
  if (!Number.isFinite(end))
    return blocked(
      "The reporting period is unavailable. Reload and review this draft.",
    );
  if ((options.now ?? new Date()).getTime() < end)
    return blocked(
      "Wait until the reporting month ends before final approval.",
    );
  if (!report.nextStep.trim())
    return blocked(
      "Record and save a next development focus before approving.",
    );
  if (!options.reviewed)
    return blocked(
      "Confirm that you reviewed the player, training evidence and feedback.",
    );
  if (options.busy)
    return {
      canApprove: false,
      reason: "Wait for the current save to finish.",
      queueStatus: "Ready for Approval",
    };
  return {
    canApprove: true,
    reason: "Ready for approval. Sharing with parents is a separate action.",
    queueStatus: "Ready for Approval",
  };
}
