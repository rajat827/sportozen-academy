import type { FootballSession, FootballVenue } from "@/domain/training";

/** A venue filter includes its configured zones, never a location-text guess. */
export function sessionMatchesVenue(
  session: FootballSession,
  venueId: string,
  venues: FootballVenue[],
) {
  if (!venueId) return true;
  const selected = venues.find(
    (venue) =>
      venue.id === venueId &&
      venue.academyId === session.academyId &&
      venue.branchId === session.branchId,
  );
  if (!selected || !session.venueId) return false;
  const seen = new Set<string>();
  let currentId: string | undefined = session.venueId;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const current = venues.find(
      (venue) =>
        venue.id === currentId &&
        venue.academyId === session.academyId &&
        venue.branchId === session.branchId,
    );
    if (!current) return false;
    if (current.id === selected.id) return true;
    currentId = current.parentVenueId;
  }
  return false;
}

export function academyDay(value: string | Date, timezone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function mondayOf(day: string) {
  return weekStartOf(day, 1);
}
export function weekStartOf(day: string, startsOn: 0 | 1 = 1) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -((weekday - startsOn + 7) % 7));
}
export function sessionDay(session: FootballSession, timezone: string) {
  return session.startAt ? academyDay(session.startAt, timezone) : "";
}
export function clock(
  value: string,
  timezone: string,
  format: "12_HOUR" | "24_HOUR" = "12_HOUR",
) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: format !== "24_HOUR",
      }).format(new Date(value))
    : "Date not set";
}
export function dayLabel(
  day: string,
  long = false,
  format: "DD_MMM_YYYY" | "MM_DD_YYYY" | "YYYY_MM_DD" = "DD_MMM_YYYY",
) {
  if (!day) return "Date not set";
  if (format === "YYYY_MM_DD") return day;
  if (format === "MM_DD_YYYY")
    return `${day.slice(5, 7)}/${day.slice(8)}/${day.slice(0, 4)}`;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}
export function minutesAt(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  );
}
export interface SessionDaySegment {
  startMinute: number;
  endMinute: number;
  continuesFromPreviousDay: boolean;
  continuesToNextDay: boolean;
}
/** One visible academy-day slice; midnight ends belong only to the prior day. */
export function sessionSegmentForDay(
  session: FootballSession,
  day: string,
  timezone: string,
): SessionDaySegment | undefined {
  const start = Date.parse(session.startAt),
    end = Date.parse(session.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return undefined;
  const firstDay = academyDay(session.startAt, timezone),
    lastDay = academyDay(new Date(end - 1), timezone),
    endDay = academyDay(session.endAt, timezone);
  if (day < firstDay || day > lastDay) return undefined;
  const startMinute =
    day === firstDay ? minutesAt(session.startAt, timezone) : 0;
  let endMinute = day === endDay ? minutesAt(session.endAt, timezone) : 1440;
  // A different branch can book across the academy's repeated DST hour. Keep
  // that real interval visible rather than silently dropping the booking.
  if (endMinute <= startMinute)
    endMinute = Math.min(1440, startMinute + (end - start) / 60000);
  return {
    startMinute,
    endMinute,
    continuesFromPreviousDay: day > firstDay,
    continuesToNextDay: day < lastDay,
  };
}
export function sessionIntersectsDays(
  session: FootballSession,
  firstDay: string,
  lastDay: string,
  timezone: string,
) {
  const end = Date.parse(session.endAt),
    start = Date.parse(session.startAt);
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    academyDay(session.startAt, timezone) <= lastDay &&
    academyDay(new Date(end - 1), timezone) >= firstDay
  );
}
export function sessionTone(session: FootballSession) {
  return session.status === "CANCELLED"
    ? "cancelled"
    : session.status === "DRAFT"
      ? "draft"
      : session.status === "COMPLETED"
        ? "complete"
        : "training";
}
/** Half-open interval columns; overlapping sessions retain their actual start and duration. */
export function calendarColumns(sessions: FootballSession[]) {
  const sorted = [...sessions]
    .filter((session) => session.startAt && session.endAt)
    .sort(
      (a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
    );
  const result = new Map<string, { column: number; columns: number }>();
  let group: FootballSession[] = [],
    end = -Infinity;
  const finish = () => {
    const ends: number[] = [];
    for (const session of group) {
      const start = Date.parse(session.startAt);
      let column = ends.findIndex((value) => value <= start);
      if (column === -1) column = ends.length;
      ends[column] = Date.parse(session.endAt);
      result.set(session.id, { column, columns: 1 });
    }
    for (const session of group) result.get(session.id)!.columns = ends.length;
  };
  for (const session of sorted) {
    const start = Date.parse(session.startAt);
    if (group.length && start >= end) {
      finish();
      group = [];
      end = -Infinity;
    }
    group.push(session);
    end = Math.max(end, Date.parse(session.endAt));
  }
  finish();
  return result;
}
