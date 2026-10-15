import type { WorkspaceReport, WorkspaceUpdate } from "@/domain/workspace";

/** Parent card copy comes from approved wording, never a calculated attendance basis. */
export function parentCoachUpdatePreview({
  academyId,
  playerId,
  update,
  report,
}: {
  academyId: string;
  playerId: string;
  update?: WorkspaceUpdate;
  report?: WorkspaceReport;
}) {
  const published =
    update?.academyId === academyId &&
    update.playerId === playerId &&
    update.approvalStatus === "APPROVED" &&
    update.inAppPublicationStatus === "PUBLISHED" &&
    ["DEVELOPMENT", "REVIEWED_SESSION"].includes(update.type)
      ? update
      : undefined;
  if (published?.approvedBody?.trim())
    return {
      body: published.approvedBody.trim(),
      source: "published-update" as const,
      approvedAt: published.approvedAt,
      destination: "messages" as const,
      reportId: undefined,
      period: undefined,
    };
  const approved =
    report?.academyId === academyId &&
    report.playerId === playerId &&
    report.status === "Approved" &&
    report.snapshot
      ? report
      : undefined;
  return {
    body:
      approved?.observation.trim() ||
      (approved
        ? "No reviewed individual observation is recorded in this report. Further coach review is needed."
        : "No approved coach observation has been shared yet. The coach’s review will appear here."),
    source: approved?.observation.trim()
      ? ("approved-report" as const)
      : ("missing" as const),
    approvedAt: undefined,
    destination: "reports" as const,
    reportId: approved?.id,
    period: approved?.period,
  };
}
