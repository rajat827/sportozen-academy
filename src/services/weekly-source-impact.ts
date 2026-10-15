import type { WorkspaceKind, WorkspaceRecords } from "@/domain/workspace";
import type { FootballSession, FootballSquad } from "@/domain/training";
import type { WeeklyPlan } from "@/domain/communication";

/** Scope invalidation to actual source consumers, or a new confirmed booking
 * in this child's batch/week. Issued snapshots remain historical records. */
export function weeklySourceAffected(
  kind: WorkspaceKind,
  record: WorkspaceRecords[WorkspaceKind],
  weekly: WeeklyPlan,
  previous?: WorkspaceRecords[WorkspaceKind],
) {
  if (record.academyId !== weekly.academyId) return false;
  if (kind === "plan") return weekly.content.sourcePlanId === record.id;
  if (kind === "squad") {
    if (weekly.squadId !== record.id) return false;
    const next = record as FootballSquad,
      old = previous as FootballSquad | undefined;
    return (
      Boolean(old?.playerIds.includes(weekly.playerId)) !==
      next.playerIds.includes(weekly.playerId)
    );
  }
  if (kind !== "session") return false;
  const session = record as FootballSession;
  if (
    (weekly.snapshot ?? weekly.content).sessions.some(
      (source) => source.id === session.id,
    )
  )
    return true;
  if (
    ["DRAFT", "CANCELLED"].includes(session.status) ||
    session.squadId !== weekly.squadId ||
    !session.roster.some((player) => player.playerId === weekly.playerId)
  )
    return false;
  const start = Date.parse(session.startAt),
    period = weekly.content.period;
  return (
    start >= Date.parse(period.startAt) && start < Date.parse(period.endAt)
  );
}
