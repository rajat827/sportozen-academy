"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  Plus,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { FootballSession } from "@/domain/training";
import { operationalSports } from "@/config/sports/workspace-sports";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  SessionDesk,
  SessionEditor,
  SquadSetup,
  useTraining,
} from "./training";
import { SessionChange } from "./portal-calendar";
import { WeeklyPlans } from "./period-plans";
import {
  academyDay,
  clock,
  dayLabel,
  sessionDay,
  sessionTone,
} from "./portal-session-view-model";
import type { SessionPortalProps } from "./portal-types";
import "./portal-training.css";

type TrainingModal =
  "new" | "edit" | "reschedule" | "cancel" | "desk" | "setup" | null;

export function PortalTraining({
  workspace: w,
  sessionId,
  onNavigate,
}: SessionPortalProps) {
  const params = useSearchParams(),
    t = useTraining(w),
    initial = w.data?.records.session.find(
      (session) => session.id === sessionId,
    );
  const lastFocused = useRef<HTMLElement | null>(null);
  const timezone = w.data?.academy.timezone ?? "UTC",
    today = academyDay(new Date(), timezone);
  const [month, setMonth] = useState(
    (initial?.startAt ? sessionDay(initial, timezone) : today).slice(0, 7),
  );
  const [batch, setBatch] = useState(""),
    [coach, setCoach] = useState(""),
    [venue, setVenue] = useState("");
  const [screen, setScreen] = useState(
      params.get("view") === "weekly" ? "Session Plans" : "Sessions",
    ),
    [tab, setTab] = useState("Plan"),
    [modal, setModal] = useState<TrainingModal>(
      params.get("create") === "session"
        ? "new"
        : ["Agenda", "Attendance", "Evidence", "Objectives", "Review"].includes(
              params.get("desk") ?? "",
            )
          ? "desk"
          : null,
    );
  const [desk, setDesk] = useState(
      ["Agenda", "Attendance", "Evidence", "Objectives", "Review"].includes(
        params.get("desk") ?? "",
      )
        ? params.get("desk")!
        : "Agenda",
    ),
    [player, setPlayer] = useState(params.get("player") ?? ""),
    [drill, setDrill] = useState(0),
    [drillSearch, setDrillSearch] = useState(""),
    [savedDraftId, setSavedDraftId] = useState(params.get("savedDraft") ?? ""),
    [confirmedSession, setConfirmedSession] = useState<FootballSession>();
  if (!w.data) return <p role="status">Loading academy training…</p>;
  const d = w.data;
  if (!["OWNER", "ADMIN", "COACH"].includes(d.membership.role))
    return (
      <p role="alert">Training management is unavailable for this role.</p>
    );
  const sessions = d.records.session
    .filter(
      (session) =>
        (!batch || session.squadId === batch) &&
        (!coach || session.coachIds.includes(coach)) &&
        (!venue || session.venueId === venue) &&
        (!session.startAt ||
          sessionDay(session, timezone).slice(0, 7) === month),
    )
    .sort((a, b) => (a.startAt || "9999").localeCompare(b.startAt || "9999"));
  const selected = sessionId
    ? (d.records.session.find((session) => session.id === sessionId) ??
      (confirmedSession?.id === sessionId &&
      confirmedSession.academyId === d.academy.id
        ? confirmedSession
        : undefined))
    : sessions[0];
  const selectedBatch = d.records.squad.find(
      (squad) => squad.id === selected?.squadId,
    ),
    roster = selected?.roster ?? [];
  const attendance = d.records.attendance.filter(
      (record) => record.sessionId === selected?.id,
    ),
    observations = d.records.evidence.filter(
      (record) => record.sessionId === selected?.id,
    );
  const openDesk = (section: string) => {
    if (!selected) return;
    setDesk(section);
    const requested = params.get("player");
    const remembered = roster.some((record) => record.playerId === player)
      ? player
      : "";
    // Explicit invalid context stays unselected in the desk; it never silently
    // substitutes another child. A fresh desk may default to its first player.
    setPlayer(requested ?? (remembered || roster[0]?.playerId || ""));
    setModal("desk");
  };
  const close = () => {
    if (!w.busy && confirmUnsavedChanges()) {
      setModal(null);
      if (params.get("create") === "session" || params.get("desk"))
        onNavigate("training", { create: "", desk: "" });
    }
  };
  const choose = (session: FootballSession) => {
    if (!confirmUnsavedChanges()) return;
    setTab("Plan");
    onNavigate("training", { session: session.id });
  };
  const changeMonth = (amount: number) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 7));
  };
  return (
    <section
      className="portal-training"
      aria-labelledby="pt-title"
      onFocusCapture={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.currentTarget.contains(event.target)
        )
          lastFocused.current = event.target;
      }}
    >
      <div className="pt-main">
        <header className="pt-header">
          <div>
            <h1 id="pt-title">Training</h1>
            <p>
              Plan sessions, assign drills, manage attendance and track
              development.
            </p>
          </div>
          <button className="pt-primary" onClick={() => setModal("new")}>
            <Plus size={18} />
            Create Session
          </button>
        </header>
        <nav className="pt-navigation" aria-label="Training sections">
          {[
            "Sessions",
            "Drills Library",
            "Session Plans",
            "Player Development",
          ].map((item) => (
            <button
              key={item}
              aria-current={screen === item ? "page" : undefined}
              onClick={() => {
                if (item === "Player Development")
                  onNavigate("development", {
                    player: player || roster[0]?.playerId,
                    session: selected?.id,
                  });
                else setScreen(item);
              }}
            >
              {item}
            </button>
          ))}
        </nav>
        <p className="pt-notice" role="status">
          {t.notice}
        </p>
        {screen === "Drills Library" ? (
          <div className="pt-library">
            <header>
              <h2>Academy drills library</h2>
              <p>Reusable football drills copied into your own curriculum.</p>
              <label>
                Search academy drills
                <input
                  type="search"
                  value={drillSearch}
                  onChange={(event) => setDrillSearch(event.target.value)}
                  placeholder="Search drills…"
                />
              </label>
            </header>
            {d.records.drill
              .filter((item) =>
                `${item.name} ${item.focusArea}`
                  .toLowerCase()
                  .includes(drillSearch.toLowerCase()),
              )
              .map((item) => (
                <article className="pt-library-card" key={item.id}>
                  <PitchDiagram />
                  <div>
                    <h3>{item.name}</h3>
                    <span>{item.focusArea}</span>
                    <p>{item.purpose}</p>
                    <p>
                      <strong>Coaching cue:</strong> {item.cue}
                    </p>
                  </div>
                </article>
              ))}
            {!d.records.drill.length && (
              <p>
                No academy drills yet. Copy a shared football template to get
                started.
              </p>
            )}
            <h3>Shared football templates</h3>
            {operationalSports.football.templates.map((template) => (
              <article className="pt-template" key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <p>{template.purpose}</p>
                </div>
                <button
                  disabled={w.busy}
                  onClick={() =>
                    w.save("drill", {
                      ...template,
                      sportId: "football",
                      templateId: template.id,
                    })
                  }
                >
                  Copy to academy
                </button>
              </article>
            ))}
          </div>
        ) : screen === "Session Plans" ? (
          <div className="pt-weekly">
            <WeeklyPlans workspace={w} />
          </div>
        ) : (
          <>
            <div className="pt-toolbar">
              <button onClick={() => setMonth(today.slice(0, 7))}>
                <CalendarDays size={16} />
                Today
              </button>
              <div className="pt-month">
                <button
                  className="pt-icon"
                  aria-label="Previous month"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>
                  {new Intl.DateTimeFormat("en-GB", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${month}-01T12:00:00Z`))}
                </strong>
                <button
                  className="pt-icon"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <label>
                <span className="pt-sr">Batch</span>
                <select
                  value={batch}
                  onChange={(event) => setBatch(event.target.value)}
                >
                  <option value="">All Batches</option>
                  {d.records.squad.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="pt-sr">Coach</span>
                <select
                  value={coach}
                  onChange={(event) => setCoach(event.target.value)}
                >
                  <option value="">All Coaches</option>
                  {d.members
                    .filter(
                      (member) =>
                        member.active &&
                        ["COACH", "OWNER", "ADMIN"].includes(member.role),
                    )
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span className="pt-sr">Venue</span>
                <select
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                >
                  <option value="">All Venues</option>
                  {d.records.venue.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="pt-columns">
              <aside className="pt-session-list">
                <h2>
                  {screen === "Session Plans" ? "Session Plans" : "Sessions"}
                </h2>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    data-session-id={session.id}
                    className={selected?.id === session.id ? "pt-selected" : ""}
                    onClick={() => choose(session)}
                  >
                    <span className="pt-date">
                      <strong>
                        {session.startAt
                          ? sessionDay(session, timezone).slice(8)
                          : "—"}
                      </strong>
                      <small>
                        {session.startAt
                          ? new Intl.DateTimeFormat("en-GB", {
                              month: "short",
                              timeZone: timezone,
                            }).format(new Date(session.startAt))
                          : "Draft"}
                      </small>
                    </span>
                    <span className="pt-session-copy">
                      <strong>
                        {d.records.squad.find(
                          (squad) => squad.id === session.squadId,
                        )?.name ?? "Archived batch"}
                      </strong>
                      <span>{session.title || session.theme}</span>
                      <small>
                        {session.startAt
                          ? `${clock(session.startAt, timezone, d.academy.timeFormat)} – ${clock(session.endAt, timezone, d.academy.timeFormat)}`
                          : "Date not set"}
                      </small>
                      <small>{session.location}</small>
                    </span>
                    <i
                      className={`pt-dot pt-${sessionTone(session)}`}
                      aria-label={session.status.toLowerCase()}
                    />
                  </button>
                ))}
                {!sessions.length && (
                  <div className="pt-empty">
                    <CalendarDays size={25} />
                    <p>No sessions match this month and filters.</p>
                    <button onClick={() => setModal("new")}>
                      Create a session
                    </button>
                    {["OWNER", "ADMIN"].includes(d.membership.role) && (
                      <button onClick={() => setModal("setup")}>
                        Set up batch and venue
                      </button>
                    )}
                  </div>
                )}
              </aside>
              <div className="pt-session-plan">
                {selected ? (
                  <>
                    {selected.id === savedDraftId &&
                      selected.status === "DRAFT" && (
                        <div className="pt-draft-success" role="status">
                          <CheckCircle2 size={20} />
                          <strong>Session saved as draft</strong>
                        </div>
                      )}
                    <header className="pt-session-heading">
                      <div>
                        <span className="pt-kind">Training Session</span>
                        <h2>
                          {selected.title ||
                            selectedBatch?.name ||
                            "Archived batch"}
                        </h2>
                      </div>
                      <span className={`pt-status pt-${sessionTone(selected)}`}>
                        {selected.status.toLowerCase().replaceAll("_", " ")}
                      </span>
                    </header>
                    <div className="pt-session-details">
                      {selected.title && (
                        <p>
                          <Users size={16} />
                          {selectedBatch?.name ?? "Archived batch"}
                        </p>
                      )}
                      <p>
                        <CalendarDays size={16} />
                        {dayLabel(
                          selected.startLocal.slice(0, 10),
                          false,
                          d.academy.dateFormat,
                        )}
                      </p>
                      <p>
                        <Clock3 size={16} />
                        {selected.startAt
                          ? `${clock(selected.startAt, selected.timezone, d.academy.timeFormat)} – ${clock(selected.endAt, selected.timezone, d.academy.timeFormat)}`
                          : "Date not set"}
                      </p>
                      <p>
                        <MapPin size={16} />
                        {selected.location || "Location not set"}
                      </p>
                      <p>
                        <UserRound size={16} />
                        {selected.coachIds
                          .map(
                            (id) =>
                              d.members.find((member) => member.userId === id)
                                ?.name ?? "Assigned coach",
                          )
                          .join(", ") || "Coach not assigned yet"}
                      </p>
                    </div>
                    {selected.status === "DRAFT" && (
                      <div
                        className="pt-draft-next-actions"
                        aria-label="Draft session next actions"
                      >
                        <button onClick={() => setModal("edit")}>
                          Add Activities
                        </button>
                        <button
                          onClick={() => setTab(`Players (${roster.length})`)}
                        >
                          Review Players
                        </button>
                        <button onClick={() => setModal("edit")}>
                          Complete Session Plan
                        </button>
                      </div>
                    )}
                    <nav
                      className="pt-plan-tabs"
                      aria-label="Selected session sections"
                    >
                      {[
                        "Plan",
                        `Players (${roster.length})`,
                        "Attendance",
                        "Notes",
                      ].map((item) => (
                        <button
                          key={item}
                          aria-pressed={tab === item}
                          onClick={() => setTab(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </nav>
                    {tab === "Plan" && (
                      <>
                        <article className="pt-focus">
                          <Target size={32} />
                          <div>
                            <h3>Session Focus</h3>
                            <p>
                              {selected.sharedObjective?.goal ||
                                selected.theme ||
                                "Training focus not recorded yet"}
                            </p>
                          </div>
                        </article>
                        <div className="pt-drill-heading">
                          <h3>Drills ({selected.agenda.length})</h3>
                          <span>
                            Total Duration:{" "}
                            {selected.agenda.reduce(
                              (sum, item) => sum + item.duration,
                              0,
                            )}{" "}
                            min
                          </span>
                        </div>
                        <ol className="pt-drills">
                          {selected.agenda.map((item, index) => (
                            <li key={`${item.drill.id}-${index}`}>
                              <span className="pt-step">{index + 1}</span>
                              <PitchDiagram />
                              <div>
                                <strong>{item.drill.name}</strong>
                                <p>{item.drill.purpose}</p>
                              </div>
                              <span className="pt-duration">
                                {item.duration} min
                              </span>
                              <button
                                className="pt-icon"
                                aria-label={`Open ${item.drill.name} in session desk`}
                                onClick={() => {
                                  setDrill(index);
                                  openDesk("Agenda");
                                }}
                              >
                                <ChevronRight size={17} />
                              </button>
                            </li>
                          ))}
                        </ol>
                        {!selected.agenda.length && (
                          <p className="pt-small">
                            No drills recorded for this session.
                          </p>
                        )}
                        <article className="pt-coaching">
                          <ClipboardList size={24} />
                          <div>
                            <h3>Coaching Points</h3>
                            <ul>
                              {Array.from(
                                new Set(
                                  [
                                    selected.sharedObjective?.cue,
                                    ...selected.agenda.map(
                                      (item) => item.drill.cue,
                                    ),
                                  ].filter((value): value is string =>
                                    Boolean(value),
                                  ),
                                ),
                              ).map((cue) => (
                                <li key={cue}>
                                  <CheckCircle2 size={13} />
                                  {cue}
                                </li>
                              ))}
                            </ul>
                            {!selected.sharedObjective?.cue &&
                              !selected.agenda.length && (
                                <p>No coaching points recorded.</p>
                              )}
                          </div>
                        </article>
                        <button
                          className="pt-personalise"
                          onClick={() => openDesk("Objectives")}
                        >
                          Optional player personalisation
                        </button>
                        <p className="pt-small">
                          Every player follows the shared batch plan. Existing
                          goals can be reused when an individual adjustment is
                          useful.
                        </p>
                      </>
                    )}
                    {tab.startsWith("Players") && (
                      <>
                        <h3 className="pt-subheading">Dated session roster</h3>
                        <ul className="pt-full-roster">
                          {roster.map((record) => (
                            <li key={record.playerId}>
                              <Initials name={record.name} />
                              <span>{record.name}</span>
                              <button
                                onClick={() =>
                                  onNavigate("players", {
                                    player: record.playerId,
                                    session: selected.id,
                                  })
                                }
                              >
                                View player
                              </button>
                            </li>
                          ))}
                        </ul>
                        {!roster.length && (
                          <p>No players recorded in this session.</p>
                        )}
                        <p className="pt-small">
                          Current batch changes do not rewrite this historical
                          roster.
                        </p>
                      </>
                    )}
                    {tab === "Attendance" && (
                      <>
                        <h3 className="pt-subheading">Session attendance</h3>
                        <ul className="pt-full-roster">
                          {roster.map((record) => (
                            <li key={record.playerId}>
                              <Initials name={record.name} />
                              <span>{record.name}</span>
                              <small>
                                {attendance
                                  .find(
                                    (item) => item.playerId === record.playerId,
                                  )
                                  ?.status.toLowerCase() ?? "Not recorded"}
                              </small>
                            </li>
                          ))}
                        </ul>
                        <button
                          className="pt-primary"
                          onClick={() => openDesk("Attendance")}
                        >
                          Mark or correct attendance
                        </button>
                        <p className="pt-small">
                          Unmarked is not absent. Recorded corrections retain
                          their history.
                        </p>
                      </>
                    )}
                    {tab === "Notes" && (
                      <>
                        <h3 className="pt-subheading">
                          Private session observations
                        </h3>
                        {observations
                          .filter((record) => record.staffNote)
                          .map((record) => (
                            <article
                              className="pt-private-note"
                              key={record.id}
                            >
                              <strong>
                                {roster.find(
                                  (item) => item.playerId === record.playerId,
                                )?.name ?? "Session player"}
                              </strong>
                              <p>{record.staffNote}</p>
                            </article>
                          ))}
                        {!observations.some((record) => record.staffNote) && (
                          <p className="pt-small">No private notes recorded.</p>
                        )}
                        <button onClick={() => openDesk("Evidence")}>
                          Record an observation
                        </button>
                        <p className="pt-small">
                          Private notes remain with staff. Parent updates follow
                          the existing review and approval process.
                        </p>
                      </>
                    )}
                  </>
                ) : (
                  <div className="pt-empty">
                    <Target size={35} />
                    <h2>
                      {sessionId ? "Session unavailable" : "Your session plan"}
                    </h2>
                    <p>
                      {sessionId
                        ? "The selected session is not accessible in this academy."
                        : "Choose a session to see its shared plan, drills and coaching points."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <aside className="pt-resources">
        <article className="pt-batch-card">
          <div>
            <h2>{selectedBatch?.name ?? "Your batch"}</h2>
            <p>
              {roster.length} players
              {selected
                ? ` · ${selected.coachIds.map((id) => d.members.find((member) => member.userId === id)?.name ?? "Assigned coach").join(", ") || "Coach not assigned yet"}`
                : ""}
            </p>
          </div>
          <span>Football</span>
        </article>
        <article className="pt-roster-card">
          <header>
            <h3>Players ({roster.length})</h3>
            <button
              disabled={!selected}
              onClick={() => setTab(`Players (${roster.length})`)}
            >
              View All
            </button>
          </header>
          <ul>
            {roster.slice(0, 5).map((record) => (
              <li key={record.playerId}>
                <Initials name={record.name} />
                <button
                  onClick={() =>
                    onNavigate("players", {
                      player: record.playerId,
                      session: selected?.id,
                    })
                  }
                >
                  {record.name}
                </button>
              </li>
            ))}
          </ul>
          {roster.length > 5 && (
            <button
              className="pt-more-players"
              onClick={() => setTab(`Players (${roster.length})`)}
            >
              <Users size={22} />+{roster.length - 5} more
            </button>
          )}
          {!roster.length && (
            <p className="pt-small">No players recorded for this session.</p>
          )}
        </article>
        <article className="pt-resources-card">
          <h3>Session Resources</h3>
          <div>
            <UserRound />
            <p>
              <span>Coach</span>
              {selected?.coachIds
                .map(
                  (id) =>
                    d.members.find((member) => member.userId === id)?.name ??
                    "Assigned coach",
                )
                .join(", ") ||
                (selected ? "Not assigned yet" : "Select a session")}
            </p>
          </div>
          <div>
            <MapPin />
            <p>
              <span>Venue</span>
              {selected?.location || "Not recorded"}
            </p>
          </div>
          <div>
            <ClipboardList />
            <p>
              <span>Preparation</span>
              {selected?.preparation?.join(", ") || "No preparation recorded"}
            </p>
          </div>
        </article>
        <article className="pt-actions">
          <h3>Session Actions</h3>
          {selected ? (
            <>
              {selected.status === "DRAFT" &&
                (!selected.coachIds.length || !selected.location.trim()) && (
                  <p className="pt-small">
                    Assign an authorised coach and record a venue or location
                    before scheduling or starting training.
                  </p>
                )}
              <button
                className="pt-primary"
                disabled={
                  w.busy || ["COMPLETED", "CANCELLED"].includes(selected.status)
                }
                onClick={async () => {
                  if (selected.status === "IN_PROGRESS") openDesk("Agenda");
                  else if (selected.status === "DRAFT") {
                    if (!selected.startAt) setModal("edit");
                    else
                      await t.submit(
                        "status",
                        { status: "SCHEDULED" },
                        selected.id,
                        selected.version,
                      );
                  } else {
                    await t.submit(
                      "status",
                      { status: "IN_PROGRESS" },
                      selected.id,
                      selected.version,
                    );
                  }
                }}
              >
                {selected.status === "DRAFT"
                  ? selected.startAt
                    ? "Schedule Session"
                    : "Set session date"
                  : selected.status === "IN_PROGRESS"
                    ? "Continue Session"
                    : selected.status === "COMPLETED"
                      ? "Session Completed"
                      : selected.status === "CANCELLED"
                        ? "Session Cancelled"
                        : "Start Session"}
              </button>
              <button onClick={() => openDesk("Attendance")}>
                <Users size={17} />
                Mark Attendance
              </button>
              <div>
                <button
                  disabled={
                    w.busy || !["DRAFT", "SCHEDULED"].includes(selected.status)
                  }
                  onClick={() =>
                    setModal(
                      selected.status === "DRAFT" ? "edit" : "reschedule",
                    )
                  }
                >
                  <CalendarDays size={16} />
                  {selected.status === "DRAFT" ? "Edit Draft" : "Reschedule"}
                </button>
                <button
                  className="pt-danger"
                  disabled={
                    w.busy ||
                    ["COMPLETED", "CANCELLED"].includes(selected.status)
                  }
                  onClick={() => setModal("cancel")}
                >
                  Cancel Session
                </button>
              </div>
              <button
                onClick={() =>
                  onNavigate("calendar", {
                    session: selected.id,
                    date: sessionDay(selected, timezone) || today,
                    view: "Week",
                  })
                }
              >
                View in Calendar
              </button>
              <button onClick={() => openDesk("Review")}>
                Review recorded evidence
              </button>
            </>
          ) : (
            <p className="pt-small">
              Choose a session to work with attendance and evidence.
            </p>
          )}
        </article>
      </aside>
      <Dialog.Root
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="pt-modal-overlay" />
          <Dialog.Content
            className={`pt-dialog ${modal === "desk" ? "pt-desk-dialog" : ""}`}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (
                lastFocused.current?.isConnected &&
                !lastFocused.current.hasAttribute("disabled")
              )
                lastFocused.current.focus();
              else
                document
                  .querySelector<HTMLButtonElement>(".pt-header button")
                  ?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (w.busy) event.preventDefault();
            }}
          >
            <Dialog.Title>
              {modal === "new"
                ? "Create a session"
                : modal === "edit"
                  ? "Edit Training Plan"
                  : modal === "cancel"
                    ? "Cancel session"
                    : modal === "reschedule"
                      ? "Reschedule session"
                      : modal === "setup"
                        ? "Set up batch and venue"
                        : "Session Desk"}
            </Dialog.Title>
            <Dialog.Description>
              {d.academy.name} · Save a draft, then build the shared session
              plan.
            </Dialog.Description>
            <button
              className="pt-icon pt-close"
              aria-label="Close session editor"
              disabled={w.busy}
              onClick={close}
            >
              <X size={21} />
            </button>
            {(modal === "new" || modal === "edit") && (
              <SessionEditor
                key={modal === "edit" ? selected?.id : "new"}
                workspace={w}
                submit={t.submit}
                initial={modal === "edit" ? selected : undefined}
                onSaved={(saved) => {
                  setConfirmedSession(saved);
                  if (modal === "new") setSavedDraftId(saved.id);
                  setModal(null);
                  setScreen("Sessions");
                  setTab("Plan");
                  setMonth(sessionDay(saved, timezone).slice(0, 7) || month);
                  setBatch("");
                  setCoach("");
                  setVenue("");
                  onNavigate("training", {
                    session: saved.id,
                    create: "",
                    view: "",
                    savedDraft:
                      modal === "new"
                        ? saved.id
                        : params.get("savedDraft") === saved.id
                          ? saved.id
                          : "",
                  });
                }}
              />
            )}
            {(modal === "reschedule" || modal === "cancel") && selected && (
              <SessionChange
                workspace={w}
                submit={t.submit}
                session={selected}
                cancel={modal === "cancel"}
                onSaved={() => setModal(null)}
              />
            )}
            {modal === "setup" && (
              <SquadSetup workspace={w} submit={t.submit} />
            )}
            {modal === "desk" && selected && (
              <SessionDesk
                key={selected.id}
                workspace={w}
                session={selected}
                submit={t.submit}
                section={desk}
                onSection={setDesk}
                selectedPlayer={player}
                onSelectPlayer={(id) => {
                  if (
                    id &&
                    !selected.roster.some((record) => record.playerId === id)
                  )
                    return;
                  setPlayer(id);
                  onNavigate("training", { session: selected.id, player: id });
                }}
                currentDrill={drill}
                onDrill={setDrill}
                onViewPlan={(id) =>
                  onNavigate("development", {
                    player: id,
                    session: selected.id,
                  })
                }
              />
            )}
            <p role="status">{t.notice}</p>
            {w.error && <p role="alert">{w.error}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <span className="pt-avatar" aria-hidden="true">
      {name
        .split(" ")
        .map((value) => value[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
function PitchDiagram() {
  return (
    <svg
      className="pt-pitch"
      viewBox="0 0 76 48"
      role="img"
      aria-label="Football drill diagram"
    >
      <rect width="76" height="48" rx="6" fill="#388b48" />
      <path
        d="M5 4h66v40H5zM38 4v40M5 14h11v20H5m66-20H60v20h11"
        fill="none"
        stroke="#bbd6ad"
        strokeWidth=".8"
      />
      <circle
        cx="38"
        cy="24"
        r="8"
        fill="none"
        stroke="#bbd6ad"
        strokeWidth=".8"
      />
      <circle cx="26" cy="19" r="3" fill="#ffe080" />
      <circle cx="48" cy="30" r="3" fill="#97d5ff" />
      <path
        d="M30 20l13 8"
        stroke="#fff"
        strokeWidth="1.1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
