import { describe, expect, it } from "vitest";
import {
  initialPreviewState,
  previewTransition,
  playerWeeklyState,
  type PreviewState,
} from "@/features/design-preview/adapter";
import {
  addCalendarDays,
  allPreviewSessions,
  attendancePatch,
  calendarContext,
  calendarResources,
  cancelSessionPatch,
  conflictsFor,
  copySessionPatch,
  eventTypeFixtures,
  filterSessions,
  groupOverlappingSessions,
  intervalsOverlap,
  listSessions,
  monthDates,
  newSessionDraft,
  parentScheduleSessions,
  rescheduleSessionPatch,
  resourcesConflict,
  saveSessionDraftPatch,
  saveSessionNotePatch,
  saveSessionObservationPatch,
  saveSessionObjectivePatch,
  scheduleSessionPatch,
  selectedSession,
  sessionAccess,
  sessionAttendance,
  sessionNotes,
  sessionObservation,
  sessionObjectives,
  sessionSelectionPatch,
  shiftCalendarDate,
  simultaneousSessionFixture,
  validateSessionDraft,
  weekDates,
  type PreviewScheduledSession,
  type PreviewSessionPatchResult,
} from "@/features/design-preview/preview-session-records";
import { deriveHomeDashboard } from "@/features/design-preview/home-dashboard-model";

function fixture(simultaneous = false): PreviewState {
  const state = structuredClone(initialPreviewState);
  if (simultaneous)
    state.fields["calendar-preview-context"] = {
      scenario: "simultaneous",
      role: "OWNER",
    };
  return state;
}
function apply(state: PreviewState, result: PreviewSessionPatchResult) {
  expect(result.ok, result.errors.join("; ")).toBe(true);
  return previewTransition(state, result.patch!);
}
function trio(state: PreviewState) {
  return listSessions(state).filter(
    (record) => record.source === "simultaneous",
  );
}

describe("one fictional calendar session store", () => {
  it("preserves two legacy records by default and derives them from the existing batch plan", () => {
    const state = fixture();
    expect(listSessions(state)).toHaveLength(2);
    expect(listSessions(state)[0]).toMatchObject({
      date: "2026-10-20",
      start: "17:30",
      end: "18:30",
      rosterIds: ["aarav", "isha"],
      batch: "U10 Foundations",
      source: "legacy",
    });
    expect(state).toEqual(initialPreviewState);
    state.playerId = "leo";
    state.fields["weekly-context"] = {
      batch: "U12 Development",
      week: "2026-11-02",
    };
    expect(listSessions(state)[0]).toMatchObject({
      date: "2026-11-03",
      rosterIds: ["leo"],
      start: "18:45",
      end: "19:45",
    });
  });

  it("keeps the explicit three simultaneous sessions separate without relocating the legacy partial overlap", () => {
    const state = fixture(true);
    expect(listSessions(state)).toHaveLength(5);
    const records = trio(state);
    expect(records).toHaveLength(3);
    expect(new Set(records.map((record) => record.id)).size).toBe(3);
    expect(new Set(records.map((record) => record.planId)).size).toBe(3);
    expect(
      records.every(
        (record) =>
          record.date === "2026-10-20" &&
          record.start === "17:00" &&
          record.end === "18:30" &&
          record.rosterIds.length === 0,
      ),
    ).toBe(true);
    expect(records.map((record) => record.resourceId)).toEqual([
      "zone-a",
      "zone-b",
      "main-pitch",
    ]);
    expect(
      records.every((record) => conflictsFor(state, record).length === 0),
    ).toBe(true);
    expect(
      listSessions(state).find((record) => record.source === "legacy")?.start,
    ).toBe("17:30");
    expect(groupOverlappingSessions(records)[0].sessions).toHaveLength(3);
    expect(
      groupOverlappingSessions(listSessions(state))[0].sessions,
    ).toHaveLength(4);
  });

  it("respects coach assignments and linked-family schedule scope", () => {
    const owner = fixture(true);
    const nehaRecord = trio(owner).find((record) =>
      record.coachIds.includes("neha"),
    )!;
    owner.fields["calendar-preview-context"].role = "COACH";
    expect(listSessions(owner)).toHaveLength(2);
    expect(selectedSession(owner, nehaRecord.id)).toBeUndefined();
    expect(sessionSelectionPatch(owner, nehaRecord.id).ok).toBe(false);
    owner.fields["calendar-preview-context"].coachId = "neha";
    expect(listSessions(owner).map((record) => record.id)).toEqual([
      nehaRecord.id,
    ]);
    owner.fields["calendar-preview-context"].role = "PARENT";
    const parentRecords = listSessions(owner);
    expect(parentRecords).toHaveLength(2);
    expect(
      parentRecords.every(
        (record) =>
          record.rosterIds.join(",") === "aarav" && !record.coachIds.length,
      ),
    ).toBe(true);
    expect(sessionAccess(owner, parentRecords[0]).canRoster).toBe(false);
    expect(sessionNotes(owner, parentRecords[0])).toBe("");
    expect(
      saveSessionNotePatch(owner, parentRecords[0].id, "private note").ok,
    ).toBe(false);
    expect(
      attendancePatch(owner, parentRecords[0].id, "aarav", "Present").ok,
    ).toBe(false);
  });

  it("does not infer independence from different venue names and blocks whole-ground bookings", () => {
    const resources = calendarResources(fixture());
    expect(resourcesConflict("zone-a", "zone-b", resources)).toBe(false);
    expect(resourcesConflict("zone-a", "main-pitch", resources)).toBe(false);
    expect(resourcesConflict("zone-a", "zone-a", resources)).toBe(true);
    expect(resourcesConflict("ground", "zone-b", resources)).toBe(true);
    expect(resourcesConflict("academy", "main-pitch", resources)).toBe(true);
    expect(
      resourcesConflict("a free-text field", "somewhere else", resources),
    ).toBe(true);
    const shared = resources.map((resource) =>
      resource.id === "ground"
        ? { ...resource, independentChildren: false }
        : resource,
    );
    expect(resourcesConflict("zone-a", "zone-b", shared)).toBe(true);
  });

  it("flags overlapping coaches, exclusive spaces and players independently", () => {
    const state = fixture(true);
    const records = trio(state);
    const b = records[1];
    expect(
      conflictsFor(state, { ...b, coachIds: ["rahul"] }).map(
        (conflict) => conflict.kind,
      ),
    ).toEqual(["coach"]);
    expect(
      conflictsFor(state, { ...b, resourceId: "zone-a" }).map(
        (conflict) => conflict.kind,
      ),
    ).toEqual(["resource"]);
    expect(
      conflictsFor(state, { ...b, resourceId: "ground" }).some(
        (conflict) => conflict.kind === "resource",
      ),
    ).toBe(true);
    expect(
      conflictsFor(state, { ...b, rosterIds: ["aarav"] }).some(
        (conflict) =>
          conflict.kind === "player" && conflict.label === "Aarav Shah",
      ),
    ).toBe(true);
  });

  it("allows back-to-back bookings, detects partial overlaps and applies configured resource buffers", () => {
    expect(
      intervalsOverlap({ start: 0, end: 60 }, { start: 60, end: 120 }),
    ).toBe(false);
    expect(
      intervalsOverlap({ start: 0, end: 60 }, { start: 59, end: 120 }),
    ).toBe(true);
    const state = fixture(true);
    const b = trio(state)[1];
    const next = { ...b, start: "18:30", end: "20:00", resourceId: "zone-a" };
    expect(conflictsFor(state, next)).toEqual([]);
    state.fields["calendar-resource:riverside:zone-a"] = {
      transitionMinutes: "15",
    };
    expect(conflictsFor(state, next).map((conflict) => conflict.kind)).toEqual([
      "resource",
    ]);
  });

  it("cancellation needs confirmation and preserves historical attendance without blocking availability", () => {
    let state = fixture(true);
    const first = trio(state)[0];
    expect(cancelSessionPatch(state, first.id, false, "Rain").ok).toBe(false);
    expect(cancelSessionPatch(state, first.id, true, "").ok).toBe(false);
    state = apply(state, cancelSessionPatch(state, first.id, true, "Rain", 0));
    expect(selectedSession(state, first.id)).toMatchObject({
      status: "Cancelled",
      cancellationReason: "Rain",
      parentPublished: false,
    });
    const b = trio(state).find((record) => record.coachIds.includes("neha"))!;
    expect(
      conflictsFor(state, { ...b, coachIds: ["rahul"], resourceId: "zone-a" }),
    ).toEqual([]);
    state.attendance.aarav = "Present";
    const legacy = listSessions(state).find(
      (record) => record.source === "legacy" && record.legacySlot === "first",
    )!;
    state = apply(
      state,
      cancelSessionPatch(state, legacy.id, true, "Weather", 0),
    );
    const cancelled = selectedSession(state, legacy.id)!;
    expect(sessionAttendance(state, cancelled).aarav).toBe("Present");
    expect(state.attendance.aarav).toBe("Present");
  });

  it("copies planned structure as a new unconfirmed draft with no attendance or private notes", () => {
    let state = fixture();
    const source = listSessions(state)[0];
    state.attendance.aarav = "Present";
    state = apply(
      state,
      saveSessionNotePatch(state, source.id, "Staff-only context"),
    );
    state = apply(state, copySessionPatch(state, source.id, "copy-draft"));
    const copied = selectedSession(state, "copy-draft")!;
    expect(copied).toMatchObject({
      status: "Draft",
      date: "",
      start: "",
      end: "",
      dateConfirmed: false,
      parentPublished: false,
      copiedFrom: source.id,
    });
    expect(copied.agendaIds).toEqual(source.agendaIds);
    expect(sessionAttendance(state, copied).aarav).toBe("Unmarked");
    expect(sessionNotes(state, copied)).toBe("");
    expect(scheduleSessionPatch(state, copied.id, copied.version).ok).toBe(
      false,
    );
    state = apply(
      state,
      saveSessionDraftPatch(
        state,
        { ...copied, date: "2026-10-27", start: "17:30", end: "18:30" },
        copied.version,
      ),
    );
    const saved = selectedSession(state, copied.id)!;
    expect(saved.status).toBe("Draft");
    state = apply(state, scheduleSessionPatch(state, saved.id, saved.version));
    expect(selectedSession(state, saved.id)?.status).toBe("Scheduled");
    expect(state.published).toBe(initialPreviewState.published);
    expect(state.messages).toEqual(initialPreviewState.messages);
  });

  it("rejects conflicting or stale saves without mutating the base or submitted draft", () => {
    const state = fixture(true);
    const b = trio(state)[1];
    const draft = { ...structuredClone(b), coachIds: ["rahul"] };
    const before = structuredClone(state),
      entered = structuredClone(draft);
    const failure = rescheduleSessionPatch(state, b.id, draft, 0);
    expect(failure.ok).toBe(false);
    expect(
      failure.conflicts.some((conflict) => conflict.kind === "coach"),
    ).toBe(true);
    expect(state).toEqual(before);
    expect(draft).toEqual(entered);
    expect(rescheduleSessionPatch(state, b.id, b, 4).ok).toBe(false);
    expect(cancelSessionPatch(state, b.id, true, "Rain", 4).ok).toBe(false);
  });

  it("keeps attendance and reset-to-batch objectives independent for different sessions", () => {
    let state = fixture();
    const [first, second] = listSessions(state);
    state = apply(state, attendancePatch(state, first.id, "aarav", "Present"));
    expect(sessionAttendance(state, first).aarav).toBe("Present");
    expect(sessionAttendance(state, second).aarav).toBe("Unmarked");
    expect(state.attendance.aarav).toBe("Unmarked");
    state = apply(
      state,
      saveSessionObjectivePatch(
        state,
        second.id,
        "aarav",
        "Use the wider gate",
      ),
    );
    expect(sessionObjectives(state, second).aarav).toBe("Use the wider gate");
    expect(sessionObjectives(state, first).aarav).toBe(first.adjustments.aarav);
    state = apply(
      state,
      saveSessionObjectivePatch(state, second.id, "aarav", ""),
    );
    expect(sessionObjectives(state, second).aarav).toBe(second.focus);
    expect(state.adjustments).toEqual(initialPreviewState.adjustments);
    expect(state.weeklyStatus).toBe(initialPreviewState.weeklyStatus);
  });

  it("retains filters and view/date context independently of selected-session navigation", () => {
    const state = fixture(true);
    state.fields["calendar-preview-context"] = {
      ...state.fields["calendar-preview-context"],
      date: "2026-10-22",
      view: "Month",
      batch: "U12 Foundations",
      coachId: "neha",
    };
    const b = listSessions(state).find(
      (record) => record.batch === "U12 Foundations",
    )!;
    const selected = apply(state, sessionSelectionPatch(state, b.id));
    expect(selected.playerId).toBe("aarav");
    expect(selectedSession(selected)?.id).toBe(b.id);
    expect(calendarContext(selected)).toMatchObject({
      date: "2026-10-22",
      view: "Month",
      today: "2026-10-20",
    });
    expect(selected.fields["calendar-preview-context"]).toEqual(
      state.fields["calendar-preview-context"],
    );
    expect(
      filterSessions(listSessions(state), {
        batch: "U12 Foundations",
        coachId: "neha",
        category: "Training",
        resourceId: "zone-b",
      }),
    ).toEqual([b]);
    expect(
      filterSessions(listSessions(state), {
        batch: "U12 Foundations",
        coachId: "amit",
      }),
    ).toEqual([]);
  });

  it("calculates Monday weeks and month grids correctly across leap years and year boundaries", () => {
    expect(weekDates("2026-10-20")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(monthDates("2026-10-20")).toHaveLength(42);
    expect(monthDates("2026-10-20")[0]).toBe("2026-09-28");
    expect(shiftCalendarDate("2026-01-31", "Month", 1)).toBe("2026-02-28");
    expect(shiftCalendarDate("2028-01-31", "Month", 1)).toBe("2028-02-29");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(() => weekDates("2026-02-31")).toThrow();
  });

  it("reuses existing time-zone validation and rejects ambiguous or impossible local times", () => {
    const state = fixture();
    state.academyId = "harbour";
    const source = listSessions(state)[0];
    const ambiguous: PreviewScheduledSession = {
      ...source,
      date: "2026-10-25",
      start: "01:30",
      end: "03:00",
    };
    expect(validateSessionDraft(state, ambiguous).errors.join(" ")).toContain(
      "invalid or ambiguous",
    );
    expect(
      validateSessionDraft(state, {
        ...source,
        date: "2026-02-31",
      }).errors.join(" "),
    ).toContain("valid dated");
  });

  it("keeps unsupported event categories explicitly illustrative and closures all-day", () => {
    const state = fixture();
    const examples = eventTypeFixtures(state);
    expect(
      examples.every(
        (record) => record.previewOnly && record.source === "category-example",
      ),
    ).toBe(true);
    expect(
      examples.find((record) => record.category === "Academy Closed"),
    ).toMatchObject({
      allDay: true,
      start: "",
      end: "",
      rosterIds: [],
      resourceId: "academy",
    });
    state.fields["calendar-preview-context"] = { scenario: "event-types" };
    expect(
      listSessions(state).some(
        (record) => record.category === "Academy Closed",
      ),
    ).toBe(true);
    expect(
      allPreviewSessions(state).every(
        (record) => record.academyId === "riverside",
      ),
    ).toBe(true);
    expect(simultaneousSessionFixture(state)).toHaveLength(3);
  });

  it("keeps missing or corrupt selections unavailable instead of substituting another session", () => {
    const state = fixture();
    const first = listSessions(state)[0];
    state.fields["session-context"] = {
      id: "missing-session",
      academyId: "riverside",
    };
    expect(selectedSession(state)).toBeUndefined();
    state.fields["session-context"] = { id: first.id, academyId: "harbour" };
    expect(selectedSession(state)).toBeUndefined();
    expect(sessionSelectionPatch(state, first.id).ok).toBe(true);
    state.fields[`calendar-session:riverside:${first.id}`] = {
      record: "{broken",
    };
    expect(selectedSession(state, first.id)).toBeUndefined();
    expect(listSessions(state)).toHaveLength(1);
  });

  it("keeps Home scoped to coach Maya and follows canonical cancellation, rescheduling and attendance", () => {
    let state = fixture(true);
    expect(listSessions(state)).toHaveLength(5);
    expect(deriveHomeDashboard(state).sessions).toHaveLength(2);
    expect(deriveHomeDashboard(state).summary.upcomingSessions).toBe(2);
    const legacy = listSessions(state).find(
      (record) => record.source === "legacy" && record.legacySlot === "first",
    )!;
    state = apply(
      state,
      rescheduleSessionPatch(
        state,
        legacy.id,
        { ...legacy, date: "2026-10-21", start: "18:00", end: "19:00" },
        legacy.version,
      ),
    );
    state.fields["home-preview-context"] = { date: "2026-10-21" };
    expect(deriveHomeDashboard(state).primarySession).toMatchObject({
      id: legacy.id,
      date: "2026-10-21",
      start: "18:00",
    });
    state = apply(state, attendancePatch(state, legacy.id, "aarav", "Present"));
    expect(
      deriveHomeDashboard(state).pending.find(
        (action) => action.id === "attendance",
      )?.count,
    ).toBe(1);
    const changed = selectedSession(state, legacy.id)!;
    state = apply(
      state,
      cancelSessionPatch(state, legacy.id, true, "Weather", changed.version),
    );
    expect(deriveHomeDashboard(state).primarySession).toBeUndefined();
    expect(deriveHomeDashboard(state).summary.upcomingSessions).toBe(1);
    expect(state.fields["calendar-preview-context"].role).toBe("OWNER");
  });

  it("keeps session observations private and separate from other dates and academies", () => {
    let state = fixture();
    const [first, second] = listSessions(state);
    state = apply(
      state,
      saveSessionObservationPatch(state, first.id, "aarav", {
        observation: "A recorded first touch",
        conditions: "Wide gate",
        nextStep: "Repeat the same task",
      }),
    );
    expect(sessionObservation(state, first, "aarav")?.observation).toBe(
      "A recorded first touch",
    );
    expect(sessionObservation(state, second, "aarav")).toBeUndefined();
    expect(state.fields["session:aarav"]).toBeUndefined();
    expect(state.observation).toBe("");
    expect(state.reportStatus).toBe("Approved");
    expect(state.messages).toEqual(initialPreviewState.messages);
    state.fields["calendar-preview-context"] = { role: "PARENT" };
    expect(sessionObservation(state, first, "aarav")).toBeUndefined();
    expect(
      saveSessionObservationPatch(state, first.id, "aarav", {
        observation: "Forbidden",
        conditions: "",
        nextStep: "",
      }).ok,
    ).toBe(false);
    state.academyId = "harbour";
    expect(selectedSession(state, first.id)).toBeUndefined();
  });

  it("inherits the live batch plan for active sessions while keeping historical and copied structure stable", () => {
    let state = fixture();
    const [first, second] = listSessions(state);
    state = apply(
      state,
      rescheduleSessionPatch(
        state,
        first.id,
        { ...first, date: "2026-10-21" },
        first.version,
      ),
    );
    state = apply(
      state,
      cancelSessionPatch(state, second.id, true, "Weather", second.version),
    );
    state = apply(
      state,
      copySessionPatch(state, second.id, "copied-historical-plan"),
    );
    state = previewTransition(state, {
      batchFocus: "A newly reviewed shared task",
      drills: ["pass"],
      adjustments: { isha: "Shorter passing distance" },
    });
    expect(selectedSession(state, first.id)).toMatchObject({
      focus: "A newly reviewed shared task",
      agendaIds: ["pass"],
      adjustments: { isha: "Shorter passing distance" },
    });
    expect(selectedSession(state, second.id)?.focus).toBe(second.focus);
    expect(selectedSession(state, "copied-historical-plan")?.focus).toBe(
      second.focus,
    );
    expect(
      saveSessionNotePatch(
        state,
        second.id,
        "Cannot rewrite this historical note",
      ).ok,
    ).toBe(false);
    expect(state.weeklyStatus).toBe("Review needed");
    expect(state.published).toBe(false);
  });

  it("does not publish one linked child's adjustment through another child's approved batch schedule", () => {
    const state = fixture();
    state.players.find((player) => player.id === "leo")!.batch =
      "U10 Foundations";
    state.fields["weekly:leo"] = {
      status: "Draft",
      version: "0",
      published: "false",
    };
    state.fields["calendar-preview-context"] = { role: "PARENT" };
    const records = listSessions(state);
    expect(records).toHaveLength(2);
    expect(
      records.every((record) => record.rosterIds.join(",") === "aarav"),
    ).toBe(true);
    expect(records.every((record) => !("leo" in record.adjustments))).toBe(
      true,
    );
    state.fields["weekly:leo"] = {
      status: "Approved",
      version: "0",
      published: "true",
    };
    expect(parentScheduleSessions(state)).toHaveLength(2);
    expect(
      parentScheduleSessions(state).every(
        (record) => record.rosterIds.join(",") === "aarav",
      ),
    ).toBe(true);
    state.playerId = "leo";
    expect(parentScheduleSessions(state)).toHaveLength(2);
    expect(
      parentScheduleSessions(state).every(
        (record) => record.rosterIds.join(",") === "leo",
      ),
    ).toBe(true);
    state.playerId = "isha";
    expect(parentScheduleSessions(state)).toEqual([]);
  });

  it("keeps the current coach assigned when rescheduling while allowing an owner to reassign", () => {
    const state = fixture();
    const record = listSessions(state)[0];
    const reassigned = { ...record, coachIds: ["rahul"] };
    const rejected = rescheduleSessionPatch(
      state,
      record.id,
      reassigned,
      record.version,
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.errors).toContain(
      "Assign the current preview coach to this session.",
    );
    expect(rejected.patch).toBeUndefined();
    expect(selectedSession(state, record.id)?.coachIds).toEqual(["maya"]);
    state.fields["calendar-preview-context"] = { role: "OWNER" };
    const accepted = rescheduleSessionPatch(
      state,
      record.id,
      reassigned,
      record.version,
    );
    expect(accepted.ok).toBe(true);
    expect(accepted.record?.coachIds).toEqual(["rahul"]);
  });

  it("opens a new unsaved planning draft without copying outcomes or publishing a booking", () => {
    const state = fixture();
    const source = listSessions(state)[0];
    state.attendance.aarav = "Present";
    state.fields[`calendar-note:riverside:${source.id}`] = {
      body: "Existing private note",
    };
    const before = structuredClone(state);
    const result = newSessionDraft(state, "riverside:new-draft");
    expect(result.ok).toBe(true);
    expect(result.patch).toBeUndefined();
    expect(result.record).toMatchObject({
      id: "riverside:new-draft",
      version: 0,
      status: "Draft",
      date: "",
      start: "",
      end: "",
      dateConfirmed: false,
      parentPublished: false,
      rosterIds: source.rosterIds,
      agendaIds: source.agendaIds,
      focus: source.focus,
    });
    expect(result.record?.copiedFrom).toBeUndefined();
    expect(state).toEqual(before);
    expect(selectedSession(state, "riverside:new-draft")).toBeUndefined();
    expect(sessionAttendance(state, result.record!).aarav).toBe("Unmarked");
    expect(sessionNotes(state, result.record!)).toBe("");
    expect(newSessionDraft(state, source.id).ok).toBe(false);
    state.fields["calendar-preview-context"] = { role: "PARENT" };
    expect(newSessionDraft(state, "parent-cannot-create").ok).toBe(false);
  });

  it("derives a new owner's selected example batch without substituting another roster", () => {
    let state = fixture(true);
    const u12 = trio(state)[1];
    state = apply(state, sessionSelectionPatch(state, u12.id));
    const draft = newSessionDraft(state, "new-u12");
    expect(draft.ok).toBe(true);
    expect(draft.record).toMatchObject({
      batch: "U12 Foundations",
      coachIds: ["neha"],
      resourceId: "zone-b",
      rosterIds: [],
      agendaIds: u12.agendaIds,
    });
    expect(draft.record?.planId).toBe(u12.planId);
    expect(draft.patch).toBeUndefined();
  });

  it("invalidates only an altered shared plan's roster children and never republishes a moved date implicitly", () => {
    let state = fixture();
    const [first, second] = listSessions(state);
    state.fields["weekly:aarav"] = {
      status: "Approved",
      version: "0",
      published: "true",
      approvedContent: "Existing reviewed snapshot",
    };
    state.fields["weekly:leo"] = {
      status: "Approved",
      version: "0",
      published: "true",
      approvedContent: "Other-batch snapshot",
    };
    const untouched = structuredClone(state.fields["weekly:leo"]);
    expect(parentScheduleSessions(state).map((record) => record.date)).toEqual([
      "2026-10-20",
      "2026-10-22",
    ]);
    state = apply(
      state,
      rescheduleSessionPatch(
        state,
        first.id,
        { ...first, date: "2026-10-21" },
        first.version,
      ),
    );
    expect(playerWeeklyState(state, "aarav")).toEqual({
      approved: false,
      published: false,
    });
    expect(playerWeeklyState(state, "isha")).toEqual({
      approved: false,
      published: false,
    });
    expect(state.fields["weekly:aarav"].approvedContent).toBe(
      "Existing reviewed snapshot",
    );
    expect(state.fields["weekly:leo"]).toEqual(untouched);
    expect(state.weeklyStatus).toBe("Approved");
    expect(state.published).toBe(true);
    expect(parentScheduleSessions(state)).toEqual([]);
    expect(
      deriveHomeDashboard(state).pending.find(
        (action) => action.id === "weekly-update",
      ),
    ).toMatchObject({ label: "Review parent update", playerId: "aarav" });
    state = previewTransition(state, {
      weeklyStatus: "Approved",
      published: true,
    });
    expect(parentScheduleSessions(state).map((record) => record.date)).toEqual([
      "2026-10-22",
    ]);
    expect(
      parentScheduleSessions(state).some(
        (record) =>
          record.date === "2026-10-20" || record.date === "2026-10-21",
      ),
    ).toBe(false);
    state = apply(
      state,
      cancelSessionPatch(
        state,
        second.id,
        true,
        "Cancelled after review",
        second.version,
      ),
    );
    expect(parentScheduleSessions(state)).toEqual([]);
    expect(playerWeeklyState(state, "aarav").published).toBe(false);
    expect(state.fields["weekly:leo"]).toEqual(untouched);
    expect(selectedSession(state, first.id)?.date).toBe("2026-10-21");
    expect(selectedSession(state, second.id)?.status).toBe("Cancelled");
  });
});
