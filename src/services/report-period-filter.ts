import type { WorkspaceReport } from "@/domain/workspace";

/** Match persisted period identity; display labels and approved snapshots stay unchanged. */
export function reportMatchesPeriod(
  report: Pick<WorkspaceReport, "period" | "reportingPeriod">,
  selectedPeriod: string,
) {
  if (!selectedPeriod) return true;
  if (report.reportingPeriod?.key)
    return report.reportingPeriod.key === selectedPeriod;
  // Older reports can predate canonical metadata. Preserve their exact-match
  // behaviour and the existing ISO-month-with-timezone display format.
  if (report.period === selectedPeriod) return true;
  const legacyMonth = /^(\d{4}-(?:0[1-9]|1[0-2]))\s+\([^)]+\)$/.exec(
    report.period,
  )?.[1];
  return legacyMonth === selectedPeriod;
}
