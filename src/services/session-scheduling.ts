import type { FootballSession, FootballVenue } from "@/domain/training";

export interface SessionConflict {
  kind: "coach" | "player" | "venue";
  sessionId: string;
}

function chain(id: string, venues: FootballVenue[]) {
  const result: FootballVenue[] = [],
    seen = new Set<string>();
  let venue = venues.find((item) => item.id === id);
  while (venue && !seen.has(venue.id)) {
    result.push(venue);
    seen.add(venue.id);
    venue = venues.find((item) => item.id === venue?.parentVenueId);
  }
  return result;
}

export function venueHierarchyError(
  venue: FootballVenue,
  venues: FootballVenue[],
) {
  if (
    venues.some(
      (child) =>
        child.parentVenueId === venue.id && child.branchId !== venue.branchId,
    )
  )
    return "Move or review child zones before changing this venue's branch.";
  if (!venue.parentVenueId) return undefined;
  const parent = venues.find((item) => item.id === venue.parentVenueId);
  if (
    !parent ||
    parent.academyId !== venue.academyId ||
    parent.branchId !== venue.branchId
  )
    return "Choose a parent venue in the same academy and branch.";
  const records = [...venues.filter((item) => item.id !== venue.id), venue];
  const visited = new Set<string>([venue.id]);
  let next: FootballVenue | undefined = parent;
  while (next) {
    if (visited.has(next.id)) return "Venue zones cannot form a cycle.";
    visited.add(next.id);
    next = records.find((item) => item.id === next?.parentVenueId);
  }
  return undefined;
}

export function venuesConflict(a: string, b: string, venues: FootballVenue[]) {
  const left = chain(a, venues),
    right = chain(b, venues);
  if (a === b) return left[0]?.exclusive !== false;
  if (!left.length || !right.length) return false;
  if (left.some((item) => item.id === b)) return right[0].exclusive !== false;
  if (right.some((item) => item.id === a)) return left[0].exclusive !== false;
  const ancestor = left.find((item) =>
    right.some((other) => other.id === item.id),
  );
  return ancestor ? ancestor.independentChildren !== true : false;
}

export function bookingOverlap(
  a: Pick<FootballSession, "startAt" | "endAt">,
  b: Pick<FootballSession, "startAt" | "endAt">,
  bufferMinutes = 0,
) {
  const start = Date.parse(a.startAt),
    end = Date.parse(a.endAt),
    otherStart = Date.parse(b.startAt),
    otherEnd = Date.parse(b.endAt);
  if (
    ![start, end, otherStart, otherEnd].every(Number.isFinite) ||
    end <= start ||
    otherEnd <= otherStart
  )
    return false;
  const buffer = Math.max(0, bufferMinutes) * 60000;
  return start < otherEnd + buffer && otherStart < end + buffer;
}

/** Called inside the existing write transaction before a booking is confirmed. */
export function sessionConflicts(
  candidate: FootballSession,
  sessions: FootballSession[],
  venues: FootballVenue[],
): SessionConflict[] {
  if (candidate.status === "CANCELLED") return [];
  const conflicts: SessionConflict[] = [];
  for (const record of sessions) {
    if (
      record.id === candidate.id ||
      record.academyId !== candidate.academyId ||
      ["DRAFT", "CANCELLED"].includes(record.status)
    )
      continue;
    if (bookingOverlap(candidate, record)) {
      if (candidate.coachIds.some((id) => record.coachIds.includes(id)))
        conflicts.push({ kind: "coach", sessionId: record.id });
      if (
        candidate.roster.some((player) =>
          record.roster.some((other) => other.playerId === player.playerId),
        )
      )
        conflicts.push({ kind: "player", sessionId: record.id });
    }
    if (
      candidate.venueId &&
      record.venueId &&
      venuesConflict(candidate.venueId, record.venueId, venues)
    ) {
      const buffer = Math.max(
        0,
        ...chain(candidate.venueId, venues).map(
          (item) => item.bufferMinutes ?? 0,
        ),
        ...chain(record.venueId, venues).map((item) => item.bufferMinutes ?? 0),
      );
      if (bookingOverlap(candidate, record, buffer))
        conflicts.push({ kind: "venue", sessionId: record.id });
    }
  }
  return conflicts;
}
