import type { FootballSession } from "@/domain/training";

export const SESSION_FOCUS_FALLBACK = "Training focus not recorded yet";

type Described = Pick<FootballSession, "title" | "theme">;

/** Line shown beside the batch name: optional title, then the recorded focus. */
export function sessionSummary(session: Described) {
  return (
    session.title?.trim() || session.theme.trim() || SESSION_FOCUS_FALLBACK
  );
}

/** Standalone heading; falls back to the batch label parents already see. */
export function sessionHeading(session: Described, batchName?: string) {
  return (
    session.title?.trim() ||
    session.theme.trim() ||
    (batchName ? `${batchName} Training` : "Football training")
  );
}

/** Shared training focus. A custom title labels a session; it is not a focus. */
export function sessionFocus(
  session: Pick<FootballSession, "theme" | "sharedObjective">,
) {
  return (
    session.sharedObjective?.goal.trim() ||
    session.theme.trim() ||
    SESSION_FOCUS_FALLBACK
  );
}
