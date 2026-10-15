"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  MapPin,
  X,
  MoreHorizontal,
  ClipboardList,
  Users,
  UserRound,
  Target,
  CheckCircle2,
  FileText,
  Copy,
  Trash2,
} from "lucide-react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewDrills } from "./fixtures";
import { previewRoute } from "./catalog";
import {
  calendarCoaches,
  sessionAccess,
  sessionSelectionPatch,
  sessionVenue,
  sessionAttendance,
  sessionNotes,
  sessionObjectives,
  saveSessionNotePatch,
  scheduleSessionPatch,
  type PreviewScheduledSession,
  type PreviewSessionPatchResult,
} from "./preview-session-records";

export function calendarDateLabel(date: string) {
  if (!date) return "Date not confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function calendarTime(time: string) {
  if (!time) return "Not confirmed";
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}
export function CalendarSessionPanel({
  record,
  onClose,
  onEdit,
  onCopy,
  onCancel,
  onNotice,
  onCommit,
  onViewCalendar,
}: {
  record: PreviewScheduledSession;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onCancel: () => void;
  onNotice: (message: string) => void;
  onCommit: (result: PreviewSessionPatchResult) => boolean;
  onViewCalendar: () => void;
}) {
  const state = usePreviewState(),
    access = sessionAccess(state, record),
    coaches = calendarCoaches(state),
    [tab, setTab] = useState("Details");
  const savedNote = sessionNotes(state, record),
    [note, setNote] = useState(savedNote),
    [confirmedNote, setConfirmedNote] = useState(savedNote);
  useUnsavedChanges(note !== confirmedNote);
  const roster = state.players.filter((player) =>
    record.rosterIds.includes(player.id),
  );
  const attendance = sessionAttendance(state, record),
    objectives = sessionObjectives(state, record);
  const openDesk = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const selected = sessionSelectionPatch(previewAdapter.read(), record.id);
    if (!selected.ok || !selected.patch) {
      event.preventDefault();
      onNotice(selected.errors.join(" "));
      return;
    }
    const saved = previewAdapter.saveConfirmed(selected.patch);
    if (!saved.ok) {
      event.preventDefault();
      onNotice(saved.error);
    }
  };
  return (
    <div className="cal-panel" data-session-id={record.id}>
      <div className="cal-panel-header">
        <span className="cal-type-badge">
          {record.category === "Training"
            ? "Training Session"
            : record.category}
        </span>
        <button
          type="button"
          className="cal-close"
          onClick={onClose}
          aria-label="Close session details"
          data-leave-editor
        >
          <X size={20} />
        </button>
        <h2 id="cal-session-title">{record.title}</h2>
        <p className="cal-panel-meta">
          <CalendarDays size={18} />
          {calendarDateLabel(record.date)}
          <span className="cal-panel-status">{record.status}</span>
        </p>
        <p className="cal-panel-meta">
          <Clock3 size={18} />
          {record.allDay
            ? "All day"
            : `${calendarTime(record.start)} – ${calendarTime(record.end)}`}
        </p>
        <p className="cal-panel-meta">
          <MapPin size={18} />
          {sessionVenue(state, record)}
        </p>
      </div>
      <div className="cal-panel-actions">
        {access.canRoster && record.dateConfirmed ? (
          <Link
            className="cal-button cal-primary"
            href={previewRoute("session-agenda")}
            onClick={openDesk}
          >
            Open Session
          </Link>
        ) : (
          <button type="button" className="cal-button cal-primary" disabled>
            Open Session
          </button>
        )}
        <button
          type="button"
          className="cal-button"
          disabled={!access.canManage}
          onClick={() => {
            setNote(confirmedNote);
            onEdit();
          }}
          data-leave-editor
        >
          Edit Session
        </button>
        <button
          type="button"
          className="cal-icon-button"
          aria-label="More session actions"
          onClick={() =>
            onNotice(
              "Scheduling changes are preview records only. Parent notification requires a separate review; no external delivery is connected.",
            )
          }
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div
        className="cal-panel-tabs"
        role="tablist"
        aria-label="Session details tabs"
      >
        {["Details", "Players", "Plan", "Attendance", "Notes"].map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`cal-tab-${record.id}`}
            onClick={() => setTab(value)}
            data-leave-editor
          >
            {value === "Players" ? `Players (${roster.length})` : value}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`cal-tab-${record.id}`} aria-label={tab}>
        {tab === "Details" && (
          <>
            <div className="cal-info-grid">
              {[
                ["Batch", record.batch, CalendarDays],
                [
                  "Coach",
                  record.coachIds
                    .map(
                      (id) =>
                        coaches.find((coach) => coach.id === id)?.name ??
                        "Unassigned",
                    )
                    .join(", ") || "Not shared",
                  UserRound,
                ],
                ["Session Type", record.category, ClipboardList],
                ["Expected Players", `${roster.length} recorded`, Users],
              ].map(([label, value, Icon]) => {
                const Symbol = Icon as typeof Users;
                return (
                  <div key={label as string}>
                    <span className="hd-small-round hd-blue">
                      <Symbol size={22} />
                    </span>
                    <span>
                      <small>{label as string}</small>
                      <strong>{value as string}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="cal-panel-card cal-focus-box">
              <span className="hd-small-round hd-mint">
                <Target size={22} />
              </span>
              <div>
                <h3>Focus</h3>
                <strong>{record.focus || "No team focus recorded"}</strong>
                <p>{record.cue || "No coaching cue recorded."}</p>
              </div>
            </div>
            <div className="cal-panel-card cal-preparation">
              <span className="hd-small-round hd-blue">
                <FileText size={22} />
              </span>
              <div>
                <h3>Preparation</h3>
                {record.preparation.length ? (
                  <ul>
                    {record.preparation.map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={14} />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No preparation instructions recorded.</p>
                )}
              </div>
            </div>
            <p className="cal-plan-context">
              This session follows its weekly batch plan.{" "}
              {Object.keys(record.adjustments).length} individual adjustments
              recorded.
            </p>
            {record.previewOnly && (
              <p className="cal-fixture-note">
                This event category is a design-preview example; customer
                scheduling support is unavailable.
              </p>
            )}
          </>
        )}
        {tab === "Players" && (
          <div className="cal-panel-list">
            {!access.canRoster ? (
              <p>Private session rosters are unavailable to parent accounts.</p>
            ) : !roster.length ? (
              <p>
                No player roster recorded for this example session. No player
                count is inferred.
              </p>
            ) : (
              roster.map((player) => (
                <div key={player.id}>
                  <strong>{player.name}</strong>
                  <small>
                    {player.category} · {player.batch}
                  </small>
                  <p>
                    {record.adjustments[player.id]
                      ? `Player adjustment: ${objectives[player.id]}`
                      : `Following batch plan: ${record.focus}`}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "Plan" && (
          <div className="cal-panel-list">
            <p className="cal-plan-context">
              Shared plan: {record.focus || "Not recorded"}. Individual
              adjustments are optional.
            </p>
            {record.agendaIds.map((id) => {
              const drill = previewDrills.find((item) => item.id === id);
              return drill ? (
                <div key={id}>
                  <strong>
                    {drill.name} · {drill.minutes} min
                  </strong>
                  <p>{drill.cue}</p>
                </div>
              ) : null;
            })}
            {!record.agendaIds.length && <p>No activities recorded.</p>}
            {access.canRoster && Object.keys(record.adjustments).length > 0 && (
              <p className="cal-plan-context">
                {Object.keys(record.adjustments).length} player adjustments
                remain with this session; they do not need to be entered again.
              </p>
            )}
          </div>
        )}
        {tab === "Attendance" && (
          <div className="cal-panel-list">
            {!access.canRoster ? (
              <p>Attendance records are restricted to authorised staff.</p>
            ) : !roster.length ? (
              <p>
                No roster to mark. Opening this session does not mark anyone
                present.
              </p>
            ) : (
              <>
                {roster.map((player) => (
                  <div key={player.id}>
                    <strong>{player.name}</strong>
                    <p>{attendance[player.id] ?? "Unmarked"}</p>
                  </div>
                ))}
                <Link
                  href={previewRoute("session-attendance")}
                  className="cal-button"
                  onClick={openDesk}
                >
                  Open session attendance
                </Link>
              </>
            )}
          </div>
        )}
        {tab === "Notes" &&
          (access.canNotes ? (
            <div>
              <label className="cal-note-label">
                Staff-only session note
                <textarea
                  className="cal-note"
                  aria-label="Staff-only session note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={!access.canManage}
                />
              </label>
              <p className="cal-plan-context">
                Private staff draft. Not part of a parent update or approved
                observation.
              </p>
              <button
                type="button"
                className="cal-button"
                disabled={
                  !access.canManage || !note.trim() || note === confirmedNote
                }
                onClick={() => {
                  if (
                    onCommit(
                      saveSessionNotePatch(
                        previewAdapter.read(),
                        record.id,
                        note,
                      ),
                    )
                  ) {
                    setConfirmedNote(note.trim());
                    setNote(note.trim());
                  }
                }}
              >
                Save private note
              </button>
            </div>
          ) : (
            <p>Staff-only notes are unavailable to parent accounts.</p>
          ))}
      </div>
      <div className="cal-panel-footer">
        <button
          type="button"
          className="cal-button"
          onClick={onViewCalendar}
          data-leave-editor
        >
          <CalendarDays size={17} />
          View in Calendar
        </button>
        <button
          type="button"
          className="cal-button"
          disabled={!access.canRoster}
          onClick={() => {
            setNote(confirmedNote);
            onCopy();
          }}
          data-leave-editor
        >
          <Copy size={16} />
          Copy Session
        </button>
        <button
          type="button"
          className="cal-button cal-danger"
          disabled={!access.canManage}
          onClick={() => {
            setNote(confirmedNote);
            onCancel();
          }}
          data-leave-editor
        >
          <Trash2 size={16} />
          Cancel Session
        </button>
      </div>
      {record.status === "Draft" && access.canManage && (
        <button
          type="button"
          className="cal-button"
          onClick={() =>
            onCommit(
              scheduleSessionPatch(
                previewAdapter.read(),
                record.id,
                record.version,
              ),
            )
          }
        >
          Review and schedule draft
        </button>
      )}
      <p className="cal-fixture-note">
        Saving and scheduling do not send parent notifications. No WhatsApp
        delivery is connected.
      </p>
    </div>
  );
}
