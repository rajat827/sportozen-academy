import type {
  ReportingPeriod,
  WeeklyContent,
  DeliveryState,
} from "@/domain/communication";
import type {
  FootballSession,
  FootballAttendance,
  FootballEvidence,
} from "@/domain/training";
import { resolveSessionTime, measurementText } from "@/services/training-rules";
// Cache only derived IANA boundaries, never content or delivery state. Batch
// preparation should not repeat thousands of offset probes under a write lock.
const boundaries = new Map<string, ReportingPeriod>();
export function shiftDate(date: string, days: number) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function periodFor(
  key: string,
  timezone: string,
  kind: "WEEKLY" | "MONTHLY",
): ReportingPeriod {
  const cacheKey = `${kind}:${timezone}:${key}`;
  const cached = boundaries.get(cacheKey);
  if (cached) return { ...cached };
  const start = kind === "WEEKLY" ? key : `${key}-01`;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    new Date(start + "T00:00:00Z").toISOString().slice(0, 10) !== start
  )
    throw new Error("Choose a valid period.");
  if (kind === "WEEKLY" && new Date(start + "T12:00:00Z").getUTCDay() !== 1)
    throw new Error("Weekly plans start on Monday.");
  const next =
    kind === "WEEKLY"
      ? shiftDate(start, 7)
      : new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 1))
          .toISOString()
          .slice(0, 10);
  const period = {
    key,
    timezone,
    startAt: resolveSessionTime(start + "T00:00", timezone),
    endAt: resolveSessionTime(next + "T00:00", timezone),
  };
  if (boundaries.size >= 200)
    boundaries.delete(boundaries.keys().next().value!);
  boundaries.set(cacheKey, period);
  return { ...period };
}
export function inPeriod(instant: string, period: ReportingPeriod) {
  return instant >= period.startAt && instant < period.endAt;
}
export function localClock(now: Date, timezone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function quiet(time: string, start: string, end: string) {
  return start === end
    ? false
    : start < end
      ? time >= start && time < end
      : time >= start || time < end;
}
export function weeklyWording(c: WeeklyContent) {
  const schedule = c.sessions
    .map(
      (session) =>
        `${session.theme ? `${session.theme}: ` : ""}${new Intl.DateTimeFormat("en-GB", { timeZone: session.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(session.startAt))}–${new Intl.DateTimeFormat("en-GB", { timeZone: session.timezone, timeStyle: "short" }).format(new Date(session.endAt))} (${session.timezone}), ${session.location}`,
    )
    .join("; ");
  return `This week, the squad will practise ${c.teamFocus}. ${c.playerName}'s personal focus is ${c.personalFocus}. The assigned activities are intended to support ${c.activities.map((a) => `${a.name}: ${a.purpose}`).join("; ")}. The coach will observe ${c.observe}.${schedule ? ` Confirmed sessions: ${schedule}.` : ""}${c.preparation?.length ? ` Preparation: ${c.preparation.join("; ")}.` : ""}`;
}
export function monthlyRecords(
  playerId: string,
  period: ReportingPeriod,
  sessions: FootballSession[],
  attendance: FootballAttendance[],
  evidence: FootballEvidence[],
) {
  const actual = sessions.filter(
    (s) =>
      s.sportId === "football" &&
      s.status === "COMPLETED" &&
      inPeriod(s.startAt, period) &&
      s.roster.some((p) => p.playerId === playerId),
  );
  const ids = new Set(actual.map((s) => s.id));
  const counts = { PRESENT: 0, ABSENT: 0, EXCUSED: 0, UNMARKED: 0 };
  for (const s of actual)
    counts[
      attendance.find((a) => a.sessionId === s.id && a.playerId === playerId)
        ?.status ?? "UNMARKED"
    ]++;
  const eligible = evidence.filter(
    (e) =>
      e.playerId === playerId &&
      ids.has(e.sessionId) &&
      e.status === "REVIEWED" &&
      e.visibility === "PARENT_ELIGIBLE" &&
      inPeriod(e.recordedAt, period),
  );
  const denominator = counts.PRESENT + counts.ABSENT;
  const basis = `${actual.length} completed roster sessions; ${counts.PRESENT} present, ${counts.ABSENT} absent, ${counts.EXCUSED} excused, ${counts.UNMARKED} unmarked. Attendance basis: present / (present + absent); excused and unmarked excluded. ${denominator ? `${counts.PRESENT}/${denominator} (${Math.round((counts.PRESENT / denominator) * 100)}%)` : "No marked attendance basis; no percentage"}. Cancelled and unfinished sessions excluded.`;
  return {
    actual,
    eligible,
    counts,
    basis,
    evidence: eligible.map((e) => ({
      text: `${e.observation} ${measurementText(e)}. Conditions: ${e.conditions}.`,
      source: `${e.type} reviewed ${e.reviewedAt}`,
      reference: `Session ${e.sessionId}; evidence ${e.id}; drill version ${e.drillVersion}`,
    })),
  };
}
const rank: Partial<Record<DeliveryState, number>> = {
  PROVIDER_ACCEPTED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
};
export function providerState(
  current: DeliveryState,
  next: DeliveryState,
): DeliveryState {
  if ((rank[current] ?? 0) >= 3 && next === "FAILED") return current;
  if (rank[next] && rank[next]! > (rank[current] ?? 0)) return next;
  return next === "FAILED" && current !== "CANCELLED" ? next : current;
}
