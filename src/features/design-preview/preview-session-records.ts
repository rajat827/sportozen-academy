import type { PreviewState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { playerWeeklyState } from "./adapter";
import { resolveSessionTime } from "@/services/training-rules";

export const previewSessionCategories = [
  "Training",
  "Trial Session",
  "Match",
  "Other Event",
  "Academy Closed",
] as const;
export type PreviewSessionCategory = (typeof previewSessionCategories)[number];
export type PreviewSessionStatus =
  "Draft" | "Scheduled" | "In progress" | "Completed" | "Cancelled";
export type PreviewCalendarView = "Week" | "Month" | "Agenda";
export type PreviewCalendarRole = "OWNER" | "COACH" | "PARENT";

export interface PreviewCalendarCoach {
  id: string;
  name: string;
  transitionMinutes: number;
}
export interface PreviewVenueResource {
  id: string;
  name: string;
  parentId?: string;
  exclusive: boolean;
  independentChildren: boolean;
  transitionMinutes: number;
}
export interface PreviewScheduledSession {
  id: string;
  academyId: string;
  version: number;
  title: string;
  batch: string;
  category: PreviewSessionCategory;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  coachIds: string[];
  resourceId: string;
  rosterIds: string[];
  agendaIds: string[];
  planId: string;
  focus: string;
  cue: string;
  preparation: string[];
  adjustments: Record<string, string>;
  status: PreviewSessionStatus;
  dateConfirmed: boolean;
  parentPublished: boolean;
  previewOnly: boolean;
  source: "legacy" | "simultaneous" | "category-example" | "saved";
  legacySlot?: "first" | "second";
  copiedFrom?: string;
  cancellationReason?: string;
}
export interface PreviewSessionFilters {
  batch?: string;
  category?: string;
  coachId?: string;
  resourceId?: string;
}
export interface PreviewSessionConflict {
  kind: "coach" | "resource" | "player" | "configuration";
  sessionId: string;
  label: string;
  message: string;
}
export interface PreviewSessionPatchResult {
  ok: boolean;
  errors: string[];
  conflicts: PreviewSessionConflict[];
  patch?: Partial<PreviewState>;
  record?: PreviewScheduledSession;
}

function dateValue(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function addCalendarDays(date: string, days: number) {
  if (!dateValue(date)) throw new Error("Choose a valid calendar date.");
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekDates(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const monday = addCalendarDays(date, -((value.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index),
  );
}
export function monthDates(date: string) {
  if (!dateValue(date)) throw new Error("Choose a valid calendar date.");
  const first = `${date.slice(0, 7)}-01`;
  const start = weekDates(first)[0];
  return Array.from({ length: 42 }, (_, index) =>
    addCalendarDays(start, index),
  );
}
export function shiftCalendarDate(
  date: string,
  view: PreviewCalendarView,
  direction: -1 | 1,
) {
  if (view !== "Month") return addCalendarDays(date, direction * 7);
  if (!dateValue(date)) throw new Error("Choose a valid calendar date.");
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + direction);
  const month = value.getUTCMonth();
  value.setUTCDate(day);
  if (value.getUTCMonth() !== month) value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

export function calendarContext(state: PreviewState) {
  const settings = state.fields["calendar-preview-context"];
  const weekly = weekPlanContext(state.fields, state.players);
  const week = dateValue(weekly.week) ? weekly.week : "2026-10-19";
  const today = dateValue(settings?.today)
    ? settings.today
    : dateValue(state.fields["home-preview-context"]?.date)
      ? state.fields["home-preview-context"].date
      : addCalendarDays(week, 1);
  const scenario =
    settings?.scenario === "simultaneous"
      ? "simultaneous"
      : settings?.scenario === "event-types"
        ? "event-types"
        : "default";
  const role: PreviewCalendarRole =
    settings?.role === "OWNER" || settings?.role === "PARENT"
      ? settings.role
      : "COACH";
  return {
    today,
    date: dateValue(settings?.date) ? settings.date : today,
    role,
    coachId: settings?.coachId || "maya",
    scenario,
    view: (settings?.view === "Month" || settings?.view === "Agenda"
      ? settings.view
      : "Week") as PreviewCalendarView,
  };
}

export function calendarCoaches(state: PreviewState): PreviewCalendarCoach[] {
  return [
    {
      id: "maya",
      name: state.fields["coach-profile"]?.name || "Maya Rao",
      transitionMinutes: 0,
    },
    { id: "rahul", name: "Rahul", transitionMinutes: 0 },
    { id: "neha", name: "Neha", transitionMinutes: 0 },
    { id: "amit", name: "Amit", transitionMinutes: 0 },
  ];
}
export function calendarResources(state: PreviewState): PreviewVenueResource[] {
  const academy = resolvedAcademy(state.academyId, state.profiles);
  const stem =
    academy.id === "riverside" ? "Riverside Ground" : "Harbour Ground";
  const resource = (
    id: string,
    name: string,
    parentId?: string,
    independentChildren = false,
  ): PreviewVenueResource => ({
    id,
    name,
    parentId,
    exclusive: true,
    independentChildren,
    transitionMinutes: Math.max(
      0,
      Math.min(
        60,
        Number(
          state.fields[`calendar-resource:${academy.id}:${id}`]
            ?.transitionMinutes,
        ) || 0,
      ),
    ),
  });
  return [
    resource("academy", academy.name, undefined, true),
    resource("ground", stem, "academy", true),
    resource("zone-a", `${stem} — Zone A`, "ground"),
    resource("zone-b", `${stem} — Zone B`, "ground"),
    resource("main-pitch", "Main Pitch", "academy"),
    resource("north-pitch", academy.venue, "academy"),
  ];
}

function legacySessions(state: PreviewState): PreviewScheduledSession[] {
  const academy = resolvedAcademy(state.academyId, state.profiles);
  const context = weekPlanContext(state.fields, state.players);
  if (!context.playerIds.length) return [];
  const week = dateValue(context.week) ? context.week : "2026-10-19";
  const [start, end] = context.time.split("–");
  return (["first", "second"] as const).map((slot, index) => {
    const date = addCalendarDays(week, index ? 3 : 1);
    const id = `${academy.id}:${context.batch}:${date}`;
    const savedStatus = state.fields[`home-session:${id}`]?.status;
    const status: PreviewSessionStatus =
      savedStatus === "Cancelled" ||
      savedStatus === "Completed" ||
      savedStatus === "In progress"
        ? savedStatus
        : "Scheduled";
    return {
      id,
      academyId: academy.id,
      version: 0,
      title: `${context.batch} Training Session`,
      batch: context.batch,
      category: "Training",
      date,
      start,
      end,
      allDay: false,
      timezone: academy.timezone,
      coachIds: ["maya"],
      resourceId: "north-pitch",
      rosterIds: [...context.playerIds],
      agendaIds: [...state.drills],
      planId: `weekly:${academy.id}:${context.batch}:${week}`,
      focus: state.batchFocus,
      cue: "Look, open, receive",
      preparation: [],
      adjustments: Object.fromEntries(
        Object.entries(state.adjustments).filter(([id]) =>
          context.playerIds.includes(id),
        ),
      ),
      status,
      dateConfirmed: true,
      parentPublished: context.playerIds.some(
        (id) => playerWeeklyState(state, id).published,
      ),
      previewOnly: false,
      source: "legacy",
      legacySlot: slot,
    };
  });
}

export function simultaneousSessionFixture(
  state: PreviewState,
): PreviewScheduledSession[] {
  const academy = resolvedAcademy(state.academyId, state.profiles);
  return [
    ["u10", "U10 Development", "rahul", "zone-a"],
    ["u12", "U12 Foundations", "neha", "zone-b"],
    ["u14", "U14 Competitive", "amit", "main-pitch"],
  ].map(([key, batch, coachId, resourceId]) => ({
    id: `${academy.id}:simultaneous:${key}:2026-10-20`,
    academyId: academy.id,
    version: 0,
    title: `${batch.split(" ")[0]} Training Session`,
    batch,
    category: "Training",
    date: "2026-10-20",
    start: "17:00",
    end: "18:30",
    allDay: false,
    timezone: academy.timezone,
    coachIds: [coachId],
    resourceId,
    rosterIds: [],
    agendaIds: ["receive", "pass", "game"],
    planId: `fixture-weekly:${academy.id}:${key}:2026-10-19`,
    focus: "Receiving and passing",
    cue: "Look, open, receive",
    preparation: [
      "Bring football boots, shin pads and a water bottle",
      "Warm up for 10 minutes before the session",
    ],
    adjustments: {},
    status: "Scheduled",
    dateConfirmed: true,
    parentPublished: false,
    previewOnly: false,
    source: "simultaneous",
  }));
}

/** Optional illustrative event types. Customer training services do not implement these categories. */
export function eventTypeFixtures(
  state: PreviewState,
): PreviewScheduledSession[] {
  const academy = resolvedAcademy(state.academyId, state.profiles);
  return [
    ["trial", "Trial Session", "Trial session", "2026-10-19", "10:00", "11:30"],
    ["match", "Match", "Match vs Eagles", "2026-10-24", "10:00", "12:00"],
    ["other", "Other Event", "Academy meeting", "2026-10-23", "17:00", "18:00"],
    ["closed", "Academy Closed", "Academy Closed", "2026-10-25", "", ""],
  ].map(([key, category, title, date, start, end]) => ({
    id: `${academy.id}:category:${key}:${date}`,
    academyId: academy.id,
    version: 0,
    title,
    batch: "",
    category: category as PreviewSessionCategory,
    date,
    start,
    end,
    allDay: category === "Academy Closed",
    timezone: academy.timezone,
    coachIds: category === "Academy Closed" ? [] : ["maya"],
    resourceId: category === "Academy Closed" ? "academy" : "main-pitch",
    rosterIds: [],
    agendaIds: [],
    planId: "",
    focus: "",
    cue: "",
    preparation: [],
    adjustments: {},
    status: "Scheduled",
    dateConfirmed: true,
    parentPublished: false,
    previewOnly: true,
    source: "category-example",
  }));
}

const recordKey = (academyId: string, id: string) =>
  `calendar-session:${academyId}:${id}`;
function storedSession(
  value: string | undefined,
  academyId: string,
  id: string,
) {
  if (!value) return undefined;
  try {
    const record = JSON.parse(value) as PreviewScheduledSession;
    if (
      record.id !== id ||
      record.academyId !== academyId ||
      !Number.isInteger(record.version) ||
      record.version < 1 ||
      !previewSessionCategories.includes(record.category) ||
      !["Draft", "Scheduled", "In progress", "Completed", "Cancelled"].includes(
        record.status,
      )
    )
      return undefined;
    if (
      !Array.isArray(record.coachIds) ||
      !Array.isArray(record.rosterIds) ||
      !Array.isArray(record.agendaIds) ||
      !Array.isArray(record.preparation) ||
      typeof record.adjustments !== "object" ||
      !record.adjustments
    )
      return undefined;
    if (
      [
        record.title,
        record.batch,
        record.date,
        record.start,
        record.end,
        record.timezone,
        record.resourceId,
        record.planId,
        record.focus,
        record.cue,
      ].some((value) => typeof value !== "string") ||
      [
        record.coachIds,
        record.rosterIds,
        record.agendaIds,
        record.preparation,
      ].some((values) => values.some((value) => typeof value !== "string")) ||
      [
        record.allDay,
        record.dateConfirmed,
        record.parentPublished,
        record.previewOnly,
      ].some((value) => typeof value !== "boolean") ||
      !["legacy", "simultaneous", "category-example", "saved"].includes(
        record.source,
      )
    )
      return undefined;
    const unconfirmedCopy =
      record.status === "Draft" &&
      !record.dateConfirmed &&
      !record.date &&
      !record.start &&
      !record.end;
    if (
      !unconfirmedCopy &&
      (!dateValue(record.date) ||
        (!record.allDay &&
          (!/^\d{2}:\d{2}$/.test(record.start) ||
            !/^\d{2}:\d{2}$/.test(record.end))))
    )
      return undefined;
    return record;
  } catch {
    return undefined;
  }
}

/** One canonical fictional schedule. Default mode preserves the existing two records. */
export function allPreviewSessions(
  state: PreviewState,
): PreviewScheduledSession[] {
  const context = calendarContext(state);
  const legacy = legacySessions(state);
  const livePlan = legacy[0];
  const base = [
    ...legacy,
    ...(context.scenario === "simultaneous"
      ? simultaneousSessionFixture(state)
      : []),
    ...(context.scenario === "event-types" ? eventTypeFixtures(state) : []),
  ];
  const records = new Map(base.map((record) => [record.id, record]));
  const prefix = `calendar-session:${state.academyId}:`;
  for (const [key, fields] of Object.entries(state.fields)) {
    if (!key.startsWith(prefix)) continue;
    const id = key.slice(prefix.length);
    const record = storedSession(fields.record, state.academyId, id);
    if (record) {
      const inherited =
        livePlan &&
        record.planId === livePlan.planId &&
        record.batch === livePlan.batch &&
        !record.copiedFrom &&
        record.status !== "Cancelled" &&
        record.status !== "Completed";
      records.set(
        id,
        inherited
          ? {
              ...record,
              focus: livePlan.focus,
              cue: livePlan.cue,
              agendaIds: [...livePlan.agendaIds],
              adjustments: Object.fromEntries(
                Object.entries(livePlan.adjustments).filter(([playerId]) =>
                  record.rosterIds.includes(playerId),
                ),
              ),
            }
          : record,
      );
    } else records.delete(id);
  }
  return [...records.values()].sort((a, b) =>
    `${a.date}:${a.allDay ? "00:00" : a.start}:${a.id}`.localeCompare(
      `${b.date}:${b.allDay ? "00:00" : b.start}:${b.id}`,
    ),
  );
}

export function sessionAccess(
  state: PreviewState,
  record: PreviewScheduledSession,
) {
  const context = calendarContext(state);
  const correctAcademy = record.academyId === state.academyId;
  const linkedIds = state.players
    .filter((player) => player.guardian === "Neha Shah")
    .map((player) => player.id);
  const staff =
    context.role === "OWNER" ||
    (context.role === "COACH" &&
      record.coachIds.includes(context.coachId) &&
      record.rosterIds.every((id) =>
        state.players.some((player) => player.id === id),
      ));
  const canSeeClosure =
    context.role === "COACH" && record.category === "Academy Closed";
  const parent =
    context.role === "PARENT" &&
    record.parentPublished &&
    (record.category === "Academy Closed" ||
      record.rosterIds.some(
        (id) =>
          linkedIds.includes(id) && playerWeeklyState(state, id).published,
      ));
  const canView = correctAcademy && (staff || canSeeClosure || parent);
  const canManage =
    correctAcademy &&
    staff &&
    record.status !== "Completed" &&
    record.status !== "Cancelled";
  return {
    canView,
    canManage,
    canRoster: correctAcademy && staff,
    canAttendance:
      canManage &&
      record.category === "Training" &&
      record.dateConfirmed &&
      record.status !== "Draft",
    canNotes: correctAcademy && staff,
    canEdit: canManage && record.status === "Draft",
    reason: !canView
      ? "This session is unavailable for the current academy role and coaching assignment."
      : !canManage
        ? "This historical or parent-visible record is read-only."
        : undefined,
  };
}

function parentRecord(
  state: PreviewState,
  record: PreviewScheduledSession,
): PreviewScheduledSession {
  const linked = new Set(
    state.players
      .filter(
        (p) =>
          p.guardian === "Neha Shah" &&
          playerWeeklyState(state, p.id).published,
      )
      .map((p) => p.id),
  );
  return {
    ...record,
    coachIds: [],
    rosterIds: record.rosterIds.filter((id) => linked.has(id)),
    adjustments: Object.fromEntries(
      Object.entries(record.adjustments).filter(([id]) => linked.has(id)),
    ),
    preparation: [...record.preparation],
  };
}
export function listSessions(state: PreviewState) {
  return allPreviewSessions(state)
    .filter((record) => sessionAccess(state, record).canView)
    .map((record) =>
      calendarContext(state).role === "PARENT"
        ? parentRecord(state, record)
        : record,
    );
}
export function selectedSession(state: PreviewState, id?: string) {
  const selection = state.fields["session-context"];
  if (!id && selection?.academyId !== state.academyId) return undefined;
  const requested = id || selection?.id;
  if (!requested) return undefined;
  return listSessions(state).find((record) => record.id === requested);
}

/** Parent-facing schedule records are separately scoped to the selected linked
 * child and that child's current approval. Staff context never expands it. */
export function parentScheduleSessions(state: PreviewState) {
  const child = state.players.find(
    (player) => player.id === state.playerId && player.guardian === "Neha Shah",
  );
  if (!child) return [];
  const approval = playerWeeklyState(state, child.id);
  if (!approval.approved || !approval.published) return [];
  const parentScope: PreviewState = {
    ...state,
    fields: {
      ...state.fields,
      "calendar-preview-context": {
        ...state.fields["calendar-preview-context"],
        role: "PARENT",
      },
    },
  };
  return listSessions(parentScope)
    .filter(
      (record) =>
        record.category === "Training" &&
        record.dateConfirmed &&
        record.status !== "Draft" &&
        record.status !== "Cancelled" &&
        record.rosterIds.includes(child.id),
    )
    .map((record) => ({
      ...record,
      rosterIds: [child.id],
      adjustments: record.adjustments[child.id]
        ? { [child.id]: record.adjustments[child.id] }
        : {},
    }))
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
    );
}
export function sessionVenue(
  state: PreviewState,
  record: PreviewScheduledSession,
) {
  return (
    calendarResources(state).find(
      (resource) => resource.id === record.resourceId,
    )?.name || "Space not configured"
  );
}
export function filterSessions(
  records: PreviewScheduledSession[],
  filters: PreviewSessionFilters,
) {
  return records.filter(
    (record) =>
      (!filters.batch ||
        filters.batch === "All" ||
        record.batch === filters.batch) &&
      (!filters.category ||
        filters.category === "All" ||
        record.category === filters.category) &&
      (!filters.coachId ||
        filters.coachId === "All" ||
        record.coachIds.includes(filters.coachId)) &&
      (!filters.resourceId ||
        filters.resourceId === "All" ||
        record.resourceId === filters.resourceId),
  );
}
export function sessionSelectionPatch(
  state: PreviewState,
  id: string,
): PreviewSessionPatchResult {
  const record = selectedSession(state, id);
  if (!record)
    return failure([
      "The selected session is missing or inaccessible; another session is not selected.",
    ]);
  return success(state, record, {
    ...state.fields,
    "session-context": {
      id: record.id,
      academyId: record.academyId,
      batch: record.batch,
      date: record.date,
      start: record.start,
      end: record.end,
      slot: record.legacySlot || "record",
      source: "calendar",
    },
  });
}

const instantCache = new Map<string, number>();
function localInstant(local: string, timezone: string) {
  const key = `${timezone}:${local}`;
  const saved = instantCache.get(key);
  if (saved !== undefined) return saved;
  const value = Date.parse(resolveSessionTime(local, timezone));
  if (instantCache.size > 256) instantCache.clear();
  instantCache.set(key, value);
  return value;
}
export function sessionInterval(record: PreviewScheduledSession) {
  if (!dateValue(record.date)) return undefined;
  try {
    const start = localInstant(
      `${record.date}T${record.allDay ? "00:00" : record.start}`,
      record.timezone,
    );
    const end = localInstant(
      `${record.allDay ? addCalendarDays(record.date, 1) : record.date}T${record.allDay ? "00:00" : record.end}`,
      record.timezone,
    );
    return end > start ? { start, end } : undefined;
  } catch {
    return undefined;
  }
}
export function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
  bufferMinutes = 0,
) {
  const buffer = Math.max(0, bufferMinutes) * 60000;
  return a.start < b.end + buffer && b.start < a.end + buffer;
}

function ancestors(id: string, resources: PreviewVenueResource[]) {
  const chain: PreviewVenueResource[] = [];
  const seen = new Set<string>();
  let resource = resources.find((item) => item.id === id);
  while (resource && !seen.has(resource.id)) {
    chain.push(resource);
    seen.add(resource.id);
    resource = resources.find((item) => item.id === resource!.parentId);
  }
  return chain;
}
export function resourcesConflict(
  a: string,
  b: string,
  resources: PreviewVenueResource[],
) {
  const left = ancestors(a, resources),
    right = ancestors(b, resources);
  if (!left.length || !right.length) return true;
  if (a === b) return left[0].exclusive;
  if (left.some((item) => item.id === b)) return right[0].exclusive;
  if (right.some((item) => item.id === a)) return left[0].exclusive;
  const common = left.find((item) =>
    right.some((other) => other.id === item.id),
  );
  return common ? !common.independentChildren : true;
}
export function conflictsFor(
  state: PreviewState,
  draft: PreviewScheduledSession,
  options: { excludeId?: string } = {},
): PreviewSessionConflict[] {
  const interval = sessionInterval(draft);
  if (!interval || draft.status === "Cancelled") return [];
  const resources = calendarResources(state),
    coaches = calendarCoaches(state);
  const targetResource = resources.find(
    (resource) => resource.id === draft.resourceId,
  );
  if (!targetResource)
    return [
      {
        kind: "configuration",
        sessionId: draft.id,
        label: "Space",
        message:
          "This space is not configured; availability cannot be inferred from a free-text venue name.",
      },
    ];
  const conflicts: PreviewSessionConflict[] = [];
  for (const record of allPreviewSessions(state)) {
    if (
      record.id === (options.excludeId || draft.id) ||
      record.status === "Cancelled" ||
      record.status === "Draft"
    )
      continue;
    const other = sessionInterval(record);
    if (!other) continue;
    const sharedCoaches = draft.coachIds.filter((id) =>
      record.coachIds.includes(id),
    );
    for (const coachId of sharedCoaches) {
      const coach = coaches.find((item) => item.id === coachId);
      if (!intervalsOverlap(interval, other, coach?.transitionMinutes))
        continue;
      conflicts.push({
        kind: "coach",
        sessionId: record.id,
        label: coach?.name || coachId,
        message: `Coach ${coach?.name || coachId} is already assigned from ${record.start}–${record.end}. Choose another coach or change the time.`,
      });
    }
    const otherResource = resources.find(
      (resource) => resource.id === record.resourceId,
    );
    const buffer = Math.max(
      ...ancestors(draft.resourceId, resources).map(
        (item) => item.transitionMinutes,
      ),
      ...ancestors(record.resourceId, resources).map(
        (item) => item.transitionMinutes,
      ),
    );
    if (
      resourcesConflict(draft.resourceId, record.resourceId, resources) &&
      intervalsOverlap(interval, other, buffer)
    )
      conflicts.push({
        kind: "resource",
        sessionId: record.id,
        label: otherResource?.name || record.resourceId,
        message: `${targetResource.name} overlaps an exclusive or whole-space booking for ${otherResource?.name || record.resourceId}. Choose an independently configured space or another time.`,
      });
    if (intervalsOverlap(interval, other))
      for (const playerId of draft.rosterIds.filter((id) =>
        record.rosterIds.includes(id),
      ))
        conflicts.push({
          kind: "player",
          sessionId: record.id,
          label:
            state.players.find((player) => player.id === playerId)?.name ||
            playerId,
          message: `${state.players.find((player) => player.id === playerId)?.name || playerId} is assigned to an overlapping session.`,
        });
  }
  return conflicts;
}

export function groupOverlappingSessions(records: PreviewScheduledSession[]) {
  const timed = records
    .filter((record) => !record.allDay && sessionInterval(record))
    .sort((a, b) => sessionInterval(a)!.start - sessionInterval(b)!.start);
  const groups: {
    id: string;
    date: string;
    start: string;
    end: string;
    sessions: PreviewScheduledSession[];
  }[] = [];
  let groupEnd = -Infinity;
  for (const record of timed) {
    const interval = sessionInterval(record)!;
    const group = groups[groups.length - 1];
    if (!group || group.date !== record.date || interval.start >= groupEnd) {
      groups.push({
        id: record.id,
        date: record.date,
        start: record.start,
        end: record.end,
        sessions: [record],
      });
      groupEnd = interval.end;
    } else {
      group.sessions.push(record);
      if (interval.end > groupEnd) group.end = record.end;
      groupEnd = Math.max(groupEnd, interval.end);
    }
  }
  return groups;
}

function failure(
  errors: string[],
  conflicts: PreviewSessionConflict[] = [],
): PreviewSessionPatchResult {
  return { ok: false, errors, conflicts };
}
function success(
  state: PreviewState,
  record: PreviewScheduledSession,
  fields?: PreviewState["fields"],
): PreviewSessionPatchResult {
  let nextFields = fields;
  if (!nextFields) {
    nextFields = {
      ...state.fields,
      [recordKey(record.academyId, record.id)]: {
        record: JSON.stringify(record),
      },
    };
    const previous = allPreviewSessions(state).find(
      (item) => item.id === record.id,
    );
    if (
      previous?.source === "legacy" &&
      previous.legacySlot === "first" &&
      previous.date === "2026-10-20"
    ) {
      for (const [playerId, status] of Object.entries(
        sessionAttendance(state, previous),
      )) {
        const key = attendanceKey(record.academyId, record.id, playerId);
        if (!nextFields[key]) nextFields[key] = { status };
      }
    }
  }
  return {
    ok: true,
    errors: [],
    conflicts: [],
    record,
    patch: { fields: nextFields },
  };
}

function invalidateSharedPlanPublication(
  state: PreviewState,
  record: PreviewScheduledSession,
  result: PreviewSessionPatchResult,
) {
  const current = weekPlanContext(state.fields, state.players);
  if (
    !result.ok ||
    !result.patch?.fields ||
    record.copiedFrom ||
    record.planId !==
      `weekly:${state.academyId}:${current.batch}:${current.week}`
  )
    return result;
  const fields = { ...result.patch.fields };
  for (const childId of record.rosterIds) {
    if (!state.players.some((player) => player.id === childId)) continue;
    const key = `weekly:${childId}`;
    fields[key] = {
      ...fields[key],
      status: "Review needed",
      published: "false",
      version: String(state.weeklyVersion),
      reviewReason:
        "Session schedule changed; review the affected child's update.",
    };
  }
  return { ...result, patch: { ...result.patch, fields } };
}

/** An unsaved planning draft. Opening this editor does not create a booking or
 * copy outcomes; only the existing validated save operation can persist it. */
export function newSessionDraft(
  state: PreviewState,
  newId: string,
): PreviewSessionPatchResult {
  const context = calendarContext(state);
  if (context.role === "PARENT")
    return failure(["Parents cannot create session records."]);
  if (
    !newId.trim() ||
    newId.length > 180 ||
    /[\r\n\0]/.test(newId) ||
    allPreviewSessions(state).some((record) => record.id === newId)
  )
    return failure(["Choose a new unique draft identifier."]);
  const weekly = weekPlanContext(state.fields, state.players);
  const selected = selectedSession(state);
  const source =
    selected?.category === "Training" &&
    sessionAccess(state, selected).canRoster
      ? selected
      : listSessions(state).find(
          (record) =>
            record.category === "Training" &&
            record.batch === weekly.batch &&
            (context.role === "OWNER" ||
              record.coachIds.includes(context.coachId)),
        );
  if (!source)
    return failure([
      "Choose an accessible assigned batch plan before adding a session.",
    ]);
  return {
    ok: true,
    errors: [],
    conflicts: [],
    record: {
      id: newId,
      academyId: source.academyId,
      version: 0,
      title: source.title,
      batch: source.batch,
      category: "Training",
      date: "",
      start: "",
      end: "",
      allDay: false,
      timezone: source.timezone,
      coachIds: [...source.coachIds],
      resourceId: source.resourceId,
      rosterIds: [...source.rosterIds],
      agendaIds: [...source.agendaIds],
      planId: source.planId,
      focus: source.focus,
      cue: source.cue,
      preparation: [...source.preparation],
      adjustments: { ...source.adjustments },
      status: "Draft",
      dateConfirmed: false,
      parentPublished: false,
      previewOnly: false,
      source: "saved",
    },
  };
}
export function validateSessionDraft(
  state: PreviewState,
  draft: PreviewScheduledSession,
  options: { excludeId?: string; allowUnconfirmed?: boolean } = {},
) {
  const errors: string[] = [];
  if (draft.academyId !== state.academyId)
    errors.push(
      "Choose the current academy; session records cannot cross academies.",
    );
  if (!draft.id.trim() || draft.id.length > 180 || /[\r\n\0]/.test(draft.id))
    errors.push("Use a valid session identifier.");
  if (!draft.title.trim()) errors.push("Enter a session title.");
  if (!previewSessionCategories.includes(draft.category))
    errors.push("Choose a supported preview session type.");
  const academy = resolvedAcademy(state.academyId, state.profiles);
  if (draft.timezone !== academy.timezone)
    errors.push("Use the configured academy time zone.");
  if (
    !calendarResources(state).some(
      (resource) => resource.id === draft.resourceId,
    )
  )
    errors.push("Choose an explicitly configured venue or zone.");
  if (
    draft.coachIds.some(
      (id) => !calendarCoaches(state).some((coach) => coach.id === id),
    )
  )
    errors.push("Choose configured preview coaches.");
  if (draft.category === "Training" && !draft.coachIds.length)
    errors.push("Assign a coach to the training session.");
  if (
    draft.rosterIds.some(
      (id) => !state.players.some((player) => player.id === id),
    )
  )
    errors.push(
      "The roster contains a missing or inaccessible preview player.",
    );
  if (new Set(draft.rosterIds).size !== draft.rosterIds.length)
    errors.push("A player can appear only once in a session roster.");
  if (
    draft.agendaIds.some(
      (id) => !previewDrills.some((drill) => drill.id === id),
    )
  )
    errors.push("Choose recorded academy activities.");
  if (
    Object.keys(draft.adjustments).some((id) => !draft.rosterIds.includes(id))
  )
    errors.push("Player adjustments must belong to this session roster.");
  if (!(
    options.allowUnconfirmed &&
    !draft.date &&
    !draft.start &&
    !draft.end
  )) {
    if (!dateValue(draft.date)) errors.push("Choose a valid dated session.");
    else {
      try {
        const start = localInstant(
          `${draft.date}T${draft.allDay ? "00:00" : draft.start}`,
          draft.timezone,
        );
        const end = localInstant(
          `${draft.allDay ? addCalendarDays(draft.date, 1) : draft.date}T${draft.allDay ? "00:00" : draft.end}`,
          draft.timezone,
        );
        if (end <= start || (!draft.allDay && end - start > 8 * 3600000))
          errors.push("Session must end after starting, within eight hours.");
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : "Choose an unambiguous local session time.",
        );
      }
    }
  }
  const conflicts = errors.length
    ? []
    : conflictsFor(state, draft, { excludeId: options.excludeId });
  return {
    errors: [...errors, ...conflicts.map((conflict) => conflict.message)],
    conflicts,
  };
}

export function saveSessionDraftPatch(
  state: PreviewState,
  draft: PreviewScheduledSession,
  expectedVersion = 0,
): PreviewSessionPatchResult {
  const current = allPreviewSessions(state).find(
    (record) => record.id === draft.id,
  );
  if (current && current.version !== expectedVersion)
    return failure([
      "This session changed elsewhere. Reload it and keep your entered draft for review.",
    ]);
  if (current && !sessionAccess(state, current).canEdit)
    return failure([
      "Only an authorised draft session can be edited. Scheduled records need the explicit preview reschedule flow.",
    ]);
  if (!current && calendarContext(state).role === "PARENT")
    return failure(["Parents cannot create session records."]);
  if (
    calendarContext(state).role === "COACH" &&
    !draft.coachIds.includes(calendarContext(state).coachId)
  )
    return failure(["Assign the current preview coach to this session."]);
  const validation = validateSessionDraft(state, draft, {
    excludeId: draft.id,
  });
  if (validation.errors.length)
    return failure(validation.errors, validation.conflicts);
  const record: PreviewScheduledSession = {
    ...structuredClone(draft),
    version: (current?.version || 0) + 1,
    status: "Draft",
    dateConfirmed: true,
    parentPublished: false,
    source: "saved",
    legacySlot: undefined,
    previewOnly: draft.category !== "Training",
  };
  return success(state, record);
}
export function copySessionPatch(
  state: PreviewState,
  id: string,
  newId: string,
): PreviewSessionPatchResult {
  const source = selectedSession(state, id);
  if (!source || !sessionAccess(state, source).canRoster)
    return failure(["This session is unavailable for copying."]);
  if (
    !newId.trim() ||
    newId.length > 180 ||
    /[\r\n\0]/.test(newId) ||
    allPreviewSessions(state).some((record) => record.id === newId)
  )
    return failure(["Choose a new unique draft identifier."]);
  const record: PreviewScheduledSession = {
    ...structuredClone(source),
    id: newId,
    version: 1,
    date: "",
    start: "",
    end: "",
    status: "Draft",
    dateConfirmed: false,
    parentPublished: false,
    source: "saved",
    copiedFrom: source.id,
    legacySlot: undefined,
    cancellationReason: undefined,
  };
  return success(state, record);
}
export function cancelSessionPatch(
  state: PreviewState,
  id: string,
  confirmed: boolean,
  reason: string,
  expectedVersion?: number,
): PreviewSessionPatchResult {
  const record = selectedSession(state, id);
  if (!confirmed)
    return failure([
      "Confirm cancellation before changing this historical session record.",
    ]);
  if (!record || !sessionAccess(state, record).canManage)
    return failure([
      "This session cannot be cancelled by the current preview role.",
    ]);
  if (expectedVersion !== undefined && expectedVersion !== record.version)
    return failure([
      "This session changed elsewhere. Reload it before confirming cancellation.",
    ]);
  if (!reason.trim()) return failure(["Record a cancellation reason."]);
  return invalidateSharedPlanPublication(
    state,
    record,
    success(state, {
      ...record,
      version: record.version + 1,
      status: "Cancelled",
      parentPublished: false,
      cancellationReason: reason.trim(),
      source: "saved",
    }),
  );
}
export function rescheduleSessionPatch(
  state: PreviewState,
  id: string,
  draft: PreviewScheduledSession,
  expectedVersion: number,
): PreviewSessionPatchResult {
  const current = selectedSession(state, id);
  if (!current || !sessionAccess(state, current).canManage)
    return failure(["This session is unavailable for rescheduling."]);
  if (current.version !== expectedVersion)
    return failure([
      "This session changed elsewhere. Reload it; your entered draft remains available.",
    ]);
  if (draft.id !== id || draft.academyId !== current.academyId)
    return failure(["Keep the selected session and academy identifiers."]);
  if (
    calendarContext(state).role === "COACH" &&
    !draft.coachIds.includes(calendarContext(state).coachId)
  )
    return failure(["Assign the current preview coach to this session."]);
  const validation = validateSessionDraft(state, draft, { excludeId: id });
  if (validation.errors.length)
    return failure(validation.errors, validation.conflicts);
  return invalidateSharedPlanPublication(
    state,
    current,
    success(state, {
      ...structuredClone(draft),
      version: current.version + 1,
      status: current.status,
      dateConfirmed: true,
      parentPublished: false,
      source: "saved",
      legacySlot: undefined,
    }),
  );
}
export function scheduleSessionPatch(
  state: PreviewState,
  id: string,
  expectedVersion: number,
): PreviewSessionPatchResult {
  const record = selectedSession(state, id);
  if (
    !record ||
    !sessionAccess(state, record).canManage ||
    record.status !== "Draft"
  )
    return failure(["Choose an authorised draft before scheduling."]);
  if (record.version !== expectedVersion)
    return failure(["This draft changed elsewhere. Reload and review it."]);
  const validation = validateSessionDraft(state, record, { excludeId: id });
  if (validation.errors.length)
    return failure(validation.errors, validation.conflicts);
  return success(state, {
    ...record,
    version: record.version + 1,
    status: "Scheduled",
    dateConfirmed: true,
    parentPublished: false,
  });
}

const attendanceKey = (
  academyId: string,
  sessionId: string,
  playerId: string,
) => `calendar-attendance:${academyId}:${sessionId}:${playerId}`;
const noteKey = (academyId: string, sessionId: string) =>
  `calendar-note:${academyId}:${sessionId}`;
export type PreviewAttendanceStatus =
  "Present" | "Absent" | "Excused" | "Unmarked";
export function sessionAttendance(
  state: PreviewState,
  record: PreviewScheduledSession,
): Record<string, PreviewAttendanceStatus> {
  if (!sessionAccess(state, record).canRoster) return {};
  return Object.fromEntries(
    record.rosterIds.map((id) => {
      const saved =
        state.fields[attendanceKey(record.academyId, record.id, id)]?.status;
      const legacy =
        record.source === "legacy" &&
        record.legacySlot === "first" &&
        record.date === "2026-10-20"
          ? state.attendance[id]
          : undefined;
      const status = saved || legacy;
      return [
        id,
        status === "Present" || status === "Absent" || status === "Excused"
          ? status
          : "Unmarked",
      ];
    }),
  );
}
export function attendancePatch(
  state: PreviewState,
  sessionId: string,
  playerId: string,
  status: PreviewAttendanceStatus,
): PreviewSessionPatchResult {
  const record = selectedSession(state, sessionId);
  if (
    !record ||
    !sessionAccess(state, record).canAttendance ||
    !record.rosterIds.includes(playerId)
  )
    return failure([
      "This player attendance record is unavailable for the selected session.",
    ]);
  if (!["Present", "Absent", "Excused", "Unmarked"].includes(status))
    return failure(["Choose an explicit attendance state."]);
  return success(state, record, {
    ...state.fields,
    [attendanceKey(record.academyId, record.id, playerId)]: { status },
  });
}
export function sessionNotes(
  state: PreviewState,
  record: PreviewScheduledSession,
) {
  return sessionAccess(state, record).canNotes
    ? state.fields[noteKey(record.academyId, record.id)]?.body || ""
    : "";
}
export function saveSessionNotePatch(
  state: PreviewState,
  sessionId: string,
  body: string,
): PreviewSessionPatchResult {
  const record = selectedSession(state, sessionId);
  if (
    !record ||
    !sessionAccess(state, record).canManage ||
    calendarContext(state).role === "PARENT"
  )
    return failure(["Staff-only session notes are unavailable for this role."]);
  if (!body.trim()) return failure(["Write a private note before saving."]);
  return success(state, record, {
    ...state.fields,
    [noteKey(record.academyId, record.id)]: {
      body: body.trim(),
      visibility: "STAFF_ONLY",
      approval: "Not reviewed",
      parentPublished: "false",
    },
  });
}

export function sessionObservation(
  state: PreviewState,
  record: PreviewScheduledSession,
  playerId: string,
) {
  if (
    !sessionAccess(state, record).canRoster ||
    !record.rosterIds.includes(playerId)
  )
    return undefined;
  return state.fields[
    `calendar-observation:${record.academyId}:${record.id}:${playerId}`
  ];
}

export function saveSessionObservationPatch(
  state: PreviewState,
  sessionId: string,
  playerId: string,
  draft: { observation: string; conditions: string; nextStep: string },
): PreviewSessionPatchResult {
  const record = selectedSession(state, sessionId);
  if (
    !record ||
    !sessionAccess(state, record).canManage ||
    !record.dateConfirmed ||
    !record.rosterIds.includes(playerId) ||
    !state.players.some((player) => player.id === playerId)
  )
    return failure([
      "Choose an available player in this authorised dated session.",
    ]);
  if (!draft.observation.trim())
    return failure([
      "Record an observation, or leave it honestly not recorded.",
    ]);
  return success(state, record, {
    ...state.fields,
    [`calendar-observation:${record.academyId}:${record.id}:${playerId}`]: {
      observation: draft.observation.trim(),
      conditions: draft.conditions.trim(),
      nextStep: draft.nextStep.trim(),
      visibility: "STAFF_ONLY",
      reviewStatus: "Draft",
      parentPublished: "false",
    },
  });
}
export function sessionObjectives(
  state: PreviewState,
  record: PreviewScheduledSession,
) {
  if (!sessionAccess(state, record).canRoster) return {};
  return Object.fromEntries(
    record.rosterIds.map((id) => [
      id,
      state.fields[`calendar-objective:${record.academyId}:${record.id}:${id}`]
        ?.inherited === "true"
        ? record.focus
        : state.fields[
            `calendar-objective:${record.academyId}:${record.id}:${id}`
          ]?.cue ||
          record.adjustments[id] ||
          record.focus,
    ]),
  );
}
export function saveSessionObjectivePatch(
  state: PreviewState,
  sessionId: string,
  playerId: string,
  cue: string,
): PreviewSessionPatchResult {
  const record = selectedSession(state, sessionId);
  if (
    !record ||
    !sessionAccess(state, record).canManage ||
    !record.rosterIds.includes(playerId)
  )
    return failure(["Choose an authorised player in this session roster."]);
  return success(state, record, {
    ...state.fields,
    [`calendar-objective:${record.academyId}:${record.id}:${playerId}`]: {
      cue: cue.trim(),
      inherited: cue.trim() ? "false" : "true",
    },
  });
}
