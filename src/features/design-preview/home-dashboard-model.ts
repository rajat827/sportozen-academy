import {
  initialPreviewState,
  playerReportStatus,
  previewAdapter,
  usePreviewState,
  type PreviewState,
} from "./adapter";
import { reportFixture, resolvedAcademy, weekPlanContext } from "./fixtures";

export interface HomeSession {
  id: string;
  slot: "first" | "second";
  date: string;
  start: string;
  end: string;
  time: string;
  batch: string;
  title: string;
  venue: string;
  status: "Scheduled" | "In progress" | "Cancelled" | "Completed";
  playerIds: string[];
  canOpen: boolean;
  reason?: string;
}

export interface HomeAction {
  id: string;
  label: string;
  to: string;
  count?: number;
  description?: string;
  disabled?: boolean;
  reason?: string;
  playerId?: string;
  session?: HomeSession;
}

export interface HomeActivity {
  id: string;
  kind: "message" | "report" | "attendance" | "observation";
  label: string;
  detail: string;
  to: string;
  playerId: string;
}

function calendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function offsetDate(value: string, offset: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

function reportPlayers(state: PreviewState) {
  // The existing queue contains Aarav and Isha's September source records.
  // A new player has no report until a report draft/status is explicitly saved.
  const seedIds = new Set(
    initialPreviewState.players.slice(0, 2).map((p) => p.id),
  );
  return state.players.filter(
    (p) =>
      seedIds.has(p.id) ||
      state.fields[`report:${p.id}`] ||
      state.fields[`report-status:${p.id}`],
  );
}

function recordedActivity(state: PreviewState): HomeActivity[] {
  const accessible = new Map(state.players.map((p) => [p.id, p]));
  const messages = state.messages
    .filter((m) => accessible.has(m.playerId))
    .slice(-3)
    .reverse()
    .map((m): HomeActivity => ({
      id: `message:${m.id}`,
      kind: "message",
      label: `${m.sender === "Parent" ? "Parent question" : "Coach update"} · ${accessible.get(m.playerId)!.name}`,
      detail: "In-app preview record · time not recorded",
      to: "parent-questions",
      playerId: m.playerId,
    }));
  const reports = reportPlayers(state)
    .filter((p) => playerReportStatus(state, p.id) === "Approved")
    .map((p): HomeActivity => ({
      id: `report:${p.id}`,
      kind: "report",
      label: `September report approved · ${p.name}`,
      detail:
        p.id === "aarav" && !state.fields[`report-status:${p.id}`]
          ? "Reviewed September source · no external send"
          : "Saved preview approval · time not recorded",
      to: "report-detail",
      playerId: p.id,
    }));
  const attendance = Object.entries(state.attendance)
    .filter(([id, status]) => accessible.has(id) && status !== "Unmarked")
    .map(([id, status]): HomeActivity => ({
      id: `attendance:${id}`,
      kind: "attendance",
      label: `Attendance status saved · ${accessible.get(id)!.name}`,
      detail: `${status} · session date not recorded`,
      to: "session-attendance",
      playerId: id,
    }));
  const observations = state.players
    .filter((p) => state.fields[`session:${p.id}`]?.observation)
    .map((p): HomeActivity => ({
      id: `observation:${p.id}`,
      kind: "observation",
      label: `Coach observation saved · ${p.name}`,
      detail: "Private preview draft · review remains separate",
      to: "session-review",
      playerId: p.id,
    }));
  return [...messages, ...reports, ...attendance, ...observations].slice(0, 4);
}

/** Read-only projection of the existing fictional adapter; never customer data. */
export function deriveHomeDashboard(state: PreviewState) {
  const academy = resolvedAcademy(state.academyId, state.profiles);
  const context = weekPlanContext(state.fields, state.players);
  const safeWeek = calendarDate(context.week) ? context.week : "2026-10-19";
  const settings = state.fields["home-preview-context"];
  // Deterministic fixture clock follows the selected batch's first scheduled day.
  const date = calendarDate(settings?.date)
    ? settings.date
    : offsetDate(safeWeek, 1);
  const hour = /^\d{1,2}$/.test(settings?.hour ?? "")
    ? Math.min(23, Number(settings!.hour))
    : 9;
  const coachName = state.fields["coach-profile"]?.name?.trim() || "Maya Rao";
  const dateObject = new Date(`${date}T12:00:00Z`);
  // date is an academy-local calendar day, not a UTC instant to shift by zone.
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObject);
  const selectedPlayer = state.players.find((p) => p.id === state.playerId);
  const playerIds = context.playerIds;
  const [start, end] = context.time.split("–");
  const sessions: HomeSession[] = playerIds.length
    ? (["first", "second"] as const).map((slot, index) => {
        const sessionDate = offsetDate(safeWeek, index === 0 ? 1 : 3);
        const id = `${academy.id}:${context.batch}:${sessionDate}`;
        const savedStatus = state.fields[`home-session:${id}`]?.status;
        const status: HomeSession["status"] =
          savedStatus === "Cancelled" ||
          savedStatus === "Completed" ||
          savedStatus === "In progress"
            ? savedStatus
            : "Scheduled";
        const inBatch =
          !!selectedPlayer && playerIds.includes(selectedPlayer.id);
        const ready = status === "Scheduled" || status === "In progress";
        return {
          id,
          slot,
          date: sessionDate,
          start,
          end,
          time: `${displayTime(start)} – ${displayTime(end)}`,
          batch: context.batch,
          title: `${context.batch} Training Session`,
          venue: academy.venue,
          status,
          playerIds,
          canOpen: inBatch && ready,
          reason: !selectedPlayer
            ? "Select an available player before opening a session."
            : !inBatch
              ? `${selectedPlayer.name} belongs to ${selectedPlayer.batch}; select the matching batch plan.`
              : !ready
                ? `This session is ${status.toLowerCase()} and cannot be started.`
                : undefined,
        };
      })
    : [];
  const todaySessions = sessions.filter((session) => session.date === date);
  const primarySession = todaySessions.find(
    (session) =>
      session.status === "Scheduled" || session.status === "In progress",
  );
  const recordPlayers = reportPlayers(state);
  const reports = recordPlayers.map((p) => ({
    playerId: p.id,
    name: p.name,
    status: playerReportStatus(state, p.id),
  }));
  const reportPeriod = recordPlayers.length
    ? reportFixture(
        academy,
        recordPlayers[0].id,
        "default",
        undefined,
        recordPlayers[0],
      ).period
    : "September 2026";
  const currentPeriod = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObject);
  const parentQuestions = state.messages.filter(
    (message) =>
      message.sender === "Parent" &&
      state.players.some((player) => player.id === message.playerId),
  );
  const draftReports = reports.filter((report) => report.status === "Draft");
  const pending: HomeAction[] = [];
  if (draftReports.length)
    pending.push({
      id: "reports",
      label: "Review player reports",
      count: draftReports.length,
      description: `${reportPeriod} · draft source review`,
      to: "report-queue",
      playerId: draftReports[0].playerId,
    });
  if (state.weeklyStatus !== "Approved" || !state.published)
    pending.push({
      id: "weekly-update",
      label:
        state.weeklyStatus === "Approved"
          ? "Review parent publication"
          : "Review parent update",
      description:
        state.weeklyStatus === "Approved"
          ? "Approval and publication remain separate"
          : "Shared plan changed · review needed",
      to: "weekly-approval",
      disabled: !selectedPlayer,
      reason: !selectedPlayer ? "Select an available player first." : undefined,
    });
  if (parentQuestions.length)
    pending.push({
      id: "messages",
      label: "Open parent questions",
      count: parentQuestions.length,
      description: "Stored questions · read status not recorded",
      to: "parent-questions",
      playerId: parentQuestions[0].playerId,
    });
  const unmarked = primarySession?.playerIds.filter(
    (id) => !state.attendance[id] || state.attendance[id] === "Unmarked",
  ).length;
  if (primarySession && unmarked)
    pending.push({
      id: "attendance",
      label: "Mark attendance",
      count: unmarked,
      description: `${context.batch} · no result inferred`,
      to: "session-attendance",
      session: primarySession,
      disabled: !primarySession.canOpen,
      reason: primarySession.reason,
    });
  const quickActions: HomeAction[] = [
    { id: "add-session", label: "Add Session", to: "session-builder" },
    {
      id: "add-player",
      label: "Add Player",
      to: "player-add",
      disabled: true,
      reason: "Player administration is an owner workflow in this preview.",
    },
    {
      id: "send-message",
      label: "Send Message",
      to: "parent-questions",
      disabled: !selectedPlayer,
      reason: !selectedPlayer ? "Select an available player first." : undefined,
      playerId: selectedPlayer?.id,
    },
    {
      id: "generate-report",
      label: "Generate Report",
      to: "report-prepare",
      disabled: !selectedPlayer,
      reason: !selectedPlayer ? "Select an available player first." : undefined,
      playerId: selectedPlayer?.id,
    },
  ];
  const nextStart = offsetDate(date, (8 - dateObject.getUTCDay()) % 7 || 7);
  const nextEnd = offsetDate(nextStart, 6);
  const compactDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const focus = selectedPlayer
    ? {
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        batch: selectedPlayer.batch,
        personalised: !!state.adjustments[selectedPlayer.id]?.trim(),
        text: selectedPlayer.goal,
        cue:
          state.adjustments[selectedPlayer.id] ||
          (context.playerIds.includes(selectedPlayer.id)
            ? state.batchFocus
            : "No shared batch plan recorded for this player"),
      }
    : null;
  return {
    academy,
    coach: {
      name: coachName,
      initials: coachName
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join(""),
    },
    date,
    dateLabel,
    greeting:
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening",
    selectedPlayer,
    selectedPlayerMissing: !selectedPlayer,
    sessions,
    todaySessions,
    primarySession,
    summary: {
      totalPlayers: state.players.length,
      activeBatches: new Set(state.players.map((p) => p.batch)).size,
      batchNames: [...new Set(state.players.map((p) => p.batch))],
      upcomingSessions: sessions.filter(
        (session) =>
          session.date >= date &&
          session.date <= offsetDate(date, 6) &&
          (session.status === "Scheduled" || session.status === "In progress"),
      ).length,
      unreadMessages: null,
      parentQuestions: parentQuestions.length,
    },
    reports: {
      period: reportPeriod,
      currentPeriod,
      isCurrentPeriod: reportPeriod === currentPeriod,
      approved: reports.filter((report) => report.status === "Approved").length,
      inReview: 0,
      draft: draftReports.length,
      total: reports.length,
      records: reports,
    },
    focus,
    activity: recordedActivity(state),
    pending,
    quickActions,
    nextWeek: {
      start: nextStart,
      end: nextEnd,
      label: `${compactDate.format(new Date(`${nextStart}T12:00:00Z`))} – ${compactDate.format(new Date(`${nextEnd}T12:00:00Z`))}`,
    },
  };
}

export type HomeDashboardModel = ReturnType<typeof deriveHomeDashboard>;

export function useHomeDashboard() {
  return deriveHomeDashboard(usePreviewState());
}

/** Pure navigation patch. Opening a session never creates, starts or completes it. */
export function homeSessionPatch(
  state: PreviewState,
  session: HomeSession,
): Partial<PreviewState> | null {
  const current = deriveHomeDashboard(state).sessions.find(
    (item) => item.id === session.id,
  );
  if (!current?.canOpen) return null;
  return {
    fields: {
      ...state.fields,
      "session-context": {
        id: current.id,
        academyId: state.academyId,
        batch: current.batch,
        date: current.date,
        slot: current.slot,
        start: current.start,
        end: current.end,
        time: current.time,
      },
    },
  };
}

export function selectHomeSession(session: HomeSession) {
  const patch = homeSessionPatch(previewAdapter.read(), session);
  if (!patch) return false;
  previewAdapter.save(patch);
  return true;
}

export function homeActionPatch(
  state: PreviewState,
  action: HomeAction,
): Partial<PreviewState> | null {
  if (action.disabled) return null;
  if (action.playerId && !state.players.some((p) => p.id === action.playerId))
    return null;
  if (action.session) return homeSessionPatch(state, action.session);
  return action.playerId ? { playerId: action.playerId } : {};
}
