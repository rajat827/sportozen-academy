import { describe, expect, it } from "vitest";
import type { FootballSession, FootballVenue } from "@/domain/training";
import {
  academyDay,
  addDays,
  calendarColumns,
  clock,
  dayLabel,
  minutesAt,
  mondayOf,
  sessionDay,
  sessionSegmentForDay,
  sessionIntersectsDays,
  sessionMatchesVenue,
  weekStartOf,
} from "@/features/workspaces/portal-session-view-model";

const session = (id: string, startAt: string, endAt: string) =>
  ({ id, startAt, endAt }) as FootballSession;
describe("real portal session calendar projection", () => {
  const venue = (
    id: string,
    parentVenueId?: string,
    academyId = "academy",
    branchId = "branch",
  ) => ({ id, parentVenueId, academyId, branchId }) as FootballVenue;
  const bookingAt = (venueId?: string) =>
    ({ venueId, academyId: "academy", branchId: "branch" }) as FootballSession;
  it("filters a parent venue and all configured descendant zones without including sibling grounds", () => {
    const venues = [
      venue("ground"),
      venue("zone-a", "ground"),
      venue("zone-b", "ground"),
      venue("small-zone", "zone-a"),
      venue("other-ground"),
    ];
    expect(sessionMatchesVenue(bookingAt("ground"), "ground", venues)).toBe(
      true,
    );
    expect(sessionMatchesVenue(bookingAt("zone-a"), "ground", venues)).toBe(
      true,
    );
    expect(sessionMatchesVenue(bookingAt("small-zone"), "ground", venues)).toBe(
      true,
    );
    expect(sessionMatchesVenue(bookingAt("zone-b"), "zone-a", venues)).toBe(
      false,
    );
    expect(
      sessionMatchesVenue(bookingAt("other-ground"), "ground", venues),
    ).toBe(false);
    expect(sessionMatchesVenue(bookingAt("ground"), "zone-a", venues)).toBe(
      false,
    );
  });
  it("does not infer a venue from location text or follow stale and cross-academy resource links", () => {
    const venues = [
      venue("ground"),
      venue("zone", "foreign"),
      venue("foreign", undefined, "different-academy"),
      venue("other-branch", "ground", "academy", "other"),
    ];
    expect(sessionMatchesVenue(bookingAt(), "", venues)).toBe(true);
    expect(sessionMatchesVenue(bookingAt(), "ground", venues)).toBe(false);
    expect(sessionMatchesVenue(bookingAt("missing"), "ground", venues)).toBe(
      false,
    );
    expect(sessionMatchesVenue(bookingAt("zone"), "ground", venues)).toBe(
      false,
    );
    expect(
      sessionMatchesVenue(bookingAt("other-branch"), "ground", venues),
    ).toBe(false);
    expect(sessionMatchesVenue(bookingAt("ground"), "foreign", venues)).toBe(
      false,
    );
    expect(sessionMatchesVenue(bookingAt("ground"), "stale", venues)).toBe(
      false,
    );
  });
  it("terminates safely on a cyclic stale venue hierarchy", () => {
    const venues = [
      venue("ground"),
      venue("cycle-a", "cycle-b"),
      venue("cycle-b", "cycle-a"),
    ];
    expect(sessionMatchesVenue(bookingAt("cycle-a"), "ground", venues)).toBe(
      false,
    );
  });
  it("places a cross-branch UTC booking on the academy's local day", () => {
    const booking = session(
      "evening",
      "2026-10-20T20:30:00Z",
      "2026-10-20T21:30:00Z",
    );
    expect(sessionDay(booking, "Asia/Kolkata")).toBe("2026-10-21");
    expect(sessionDay(booking, "America/New_York")).toBe("2026-10-20");
    expect(minutesAt(booking.startAt, "Asia/Kolkata")).toBe(120);
  });
  it("retains local calendar dates across daylight saving transitions", () => {
    expect(academyDay("2026-11-01T05:30:00Z", "America/New_York")).toBe(
      "2026-11-01",
    );
    expect(academyDay("2026-11-01T06:30:00Z", "America/New_York")).toBe(
      "2026-11-01",
    );
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
  });
  it("keeps simultaneous bookings in separate columns without dropping any session", () => {
    const sessions = ["U10", "U12", "U14"].map((id) =>
      session(id, "2026-10-20T17:00:00Z", "2026-10-20T18:30:00Z"),
    );
    const positions = calendarColumns(sessions);
    expect(positions.size).toBe(3);
    expect(
      new Set([...positions.values()].map((position) => position.column)).size,
    ).toBe(3);
    expect(
      [...positions.values()].every((position) => position.columns === 3),
    ).toBe(true);
  });
  it("treats exact ends as nonoverlapping and retains partial overlap geometry", () => {
    const a = session("a", "2026-10-20T17:00:00Z", "2026-10-20T18:00:00Z"),
      b = session("b", "2026-10-20T18:00:00Z", "2026-10-20T19:00:00Z"),
      partial = session(
        "partial",
        "2026-10-20T17:45:00Z",
        "2026-10-20T18:15:00Z",
      );
    expect(calendarColumns([a, b]).get("a")).toEqual({ column: 0, columns: 1 });
    const positions = calendarColumns([a, partial, b]);
    expect(positions.get("a")).toEqual({ column: 0, columns: 2 });
    expect(positions.get("partial")).toEqual({ column: 1, columns: 2 });
    expect(positions.get("b")).toEqual({ column: 0, columns: 2 });
  });
  it("does not place undated draft copies at an invented time", () => {
    const draft = session("draft", "", "");
    expect(sessionDay(draft, "Asia/Kolkata")).toBe("");
    expect(calendarColumns([draft]).size).toBe(0);
  });
  it("uses academy display preferences without rewriting UTC booking times", () => {
    expect(weekStartOf("2026-10-21", 0)).toBe("2026-10-18");
    expect(weekStartOf("2026-10-21", 1)).toBe("2026-10-19");
    expect(clock("2026-10-20T11:30:00Z", "Asia/Kolkata", "24_HOUR")).toBe(
      "17:00",
    );
    expect(dayLabel("2026-10-20", false, "YYYY_MM_DD")).toBe("2026-10-20");
    expect(dayLabel("2026-10-20", false, "MM_DD_YYYY")).toBe("10/20/2026");
  });
  it("draws overnight continuations under the same ID on both actual academy days", () => {
    const overnight = session(
      "one-record",
      "2026-10-18T23:00:00Z",
      "2026-10-19T01:00:00Z",
    );
    expect(sessionSegmentForDay(overnight, "2026-10-18", "UTC")).toEqual({
      startMinute: 1380,
      endMinute: 1440,
      continuesFromPreviousDay: false,
      continuesToNextDay: true,
    });
    expect(sessionSegmentForDay(overnight, "2026-10-19", "UTC")).toEqual({
      startMinute: 0,
      endMinute: 60,
      continuesFromPreviousDay: true,
      continuesToNextDay: false,
    });
    expect(
      sessionIntersectsDays(overnight, "2026-10-19", "2026-10-25", "UTC"),
    ).toBe(true);
    expect(
      sessionSegmentForDay(overnight, "2026-10-20", "UTC"),
    ).toBeUndefined();
  });
  it("does not create a next-day or next-week segment when a session ends exactly at midnight", () => {
    const midnight = session(
      "midnight",
      "2026-10-18T23:00:00Z",
      "2026-10-19T00:00:00Z",
    );
    expect(sessionSegmentForDay(midnight, "2026-10-18", "UTC")).toEqual({
      startMinute: 1380,
      endMinute: 1440,
      continuesFromPreviousDay: false,
      continuesToNextDay: false,
    });
    expect(sessionSegmentForDay(midnight, "2026-10-19", "UTC")).toBeUndefined();
    expect(
      sessionIntersectsDays(midnight, "2026-10-19", "2026-10-25", "UTC"),
    ).toBe(false);
  });
  it("retains real elapsed time when a different branch overlaps the academy's repeated DST hour", () => {
    const fold = session(
      "fold",
      "2026-11-01T05:30:00Z",
      "2026-11-01T06:00:00Z",
    );
    expect(
      sessionSegmentForDay(fold, "2026-11-01", "America/New_York"),
    ).toMatchObject({ startMinute: 90, endMinute: 120 });
  });
});
