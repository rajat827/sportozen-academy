import type { WorkspacePayload, WorkspacePlayer } from "@/domain/workspace";
import { UNASSIGNED_PLAYER_BATCH } from "./player-form-options";

export function playerAge(birthDate: string | undefined, day: string) {
  if (!birthDate) return undefined;
  const [year, month, date] = birthDate.split("-").map(Number);
  const [currentYear, currentMonth, currentDate] = day.split("-").map(Number);
  return (
    currentYear -
    year -
    (currentMonth < month || (currentMonth === month && currentDate < date)
      ? 1
      : 0)
  );
}

export function academyDate(data: WorkspacePayload, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: data.academy.timezone,
  }).format(now);
}
export function portalSessionSummary(data: WorkspacePayload, now = new Date()) {
  const active = data.records.session.filter(
    (s) => !["DRAFT", "CANCELLED"].includes(s.status),
  );
  const today = academyDate(data, now);
  const todaySessions = active
    .filter((s) => academyDate(data, new Date(s.startAt)) === today)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const upcoming = active
    .filter((s) => s.status !== "COMPLETED" && s.endAt >= now.toISOString())
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return {
    today,
    todaySessions,
    upcoming,
    next:
      todaySessions.find(
        (s) => s.status !== "COMPLETED" && s.endAt >= now.toISOString(),
      ) ?? upcoming[0],
  };
}
export function playerBatch(data: WorkspacePayload, player: WorkspacePlayer) {
  const batch = player.squadId
    ? data.records.squad.find((s) => s.id === player.squadId)
    : data.records.squad.find((s) => s.playerIds.includes(player.id));
  if (batch) return batch.name;
  // Parents, support users and coaches of shared batches cannot read every
  // batch record. The server records the batch name with each reviewed
  // placement, while an explicit unassignment ("") keeps a historical label.
  if (
    !["OWNER", "ADMIN"].includes(data.membership.role) &&
    player.squadId !== "" &&
    player.squad.trim()
  )
    return player.squad;
  return UNASSIGNED_PLAYER_BATCH;
}
export function approvedPlayerReport(data: WorkspacePayload, playerId: string) {
  return data.records.report
    .filter(
      (r) => r.playerId === playerId && r.status === "Approved" && r.snapshot,
    )
    .sort(
      (a, b) =>
        b.period.localeCompare(a.period) ||
        (b.recordVersion ?? 0) - (a.recordVersion ?? 0),
    )[0];
}
export function currentPlayerPlan(data: WorkspacePayload, playerId: string) {
  return data.records.plan.filter(
    (p) =>
      p.playerId === playerId && !["COMPLETED", "PAUSED"].includes(p.status),
  )[0];
}
export function playerDevelopmentHistory(
  data: WorkspacePayload,
  playerId: string,
) {
  return data.records.report
    .filter(
      (r) => r.playerId === playerId && r.status === "Approved" && r.snapshot,
    )
    .sort((a, b) => b.period.localeCompare(a.period));
}
export function portalDate(
  value: string,
  data: WorkspacePayload,
  time = false,
) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not scheduled";
  return new Intl.DateTimeFormat(data.academy.dateLocale, {
    timeZone: data.academy.timezone,
    ...(time
      ? {
          hour: "numeric",
          minute: "2-digit",
          hour12: data.academy.timeFormat !== "24_HOUR",
        }
      : { day: "numeric", month: "short", year: "numeric" }),
  }).format(new Date(value));
}
