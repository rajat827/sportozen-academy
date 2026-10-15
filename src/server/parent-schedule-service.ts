import "server-only";
import type { ParentScheduledSession } from "@/domain/training";
import { workspaceRepository as repo } from "./workspace-repository";
import { database } from "./database";
import {
  requireRole,
  moduleEnabled,
  type WorkspaceAccess,
} from "./workspace-access";

/** A staff-confirmed schedule may be read by its verified guardian. Private
 * weekly wording, observations and reports retain their separate approvals. */
export function parentSchedule(ctx: WorkspaceAccess): ParentScheduledSession[] {
  requireRole(ctx, ["PARENT"]);
  if (!moduleEnabled(ctx, "session")) return [];
  const linked = new Set(
    database()
      .prepare(
        "SELECT playerId FROM guardian_relationships WHERE academyId=? AND userId=?",
      )
      .all(ctx.academy.id, ctx.user.id)
      .map((row) => String(row.playerId)),
  );
  const result: ParentScheduledSession[] = [];
  for (const session of repo.list(ctx.academy.id, "session")) {
    if (
      session.sportId !== "football" ||
      !["SCHEDULED", "IN_PROGRESS"].includes(session.status)
    )
      continue;
    const batch = repo.find(ctx.academy.id, "squad", session.squadId);
    for (const player of session.roster) {
      if (
        !linked.has(player.playerId) ||
        !repo
          .find(ctx.academy.id, "player", player.playerId)
          ?.sportIds.includes("football")
      )
        continue;
      result.push({
        id: session.id,
        childId: player.playerId,
        squadId: session.squadId,
        batchName: batch?.name ?? "Recorded training batch",
        theme: batch ? `${batch.name} Training` : "Football training",
        startAt: session.startAt,
        endAt: session.endAt,
        startLocal: session.startLocal,
        endLocal: session.endLocal,
        timezone: session.timezone,
        location: session.location,
        status: session.status as "SCHEDULED" | "IN_PROGRESS",
      });
    }
  }
  return result.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
