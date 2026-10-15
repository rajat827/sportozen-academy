"use client";
import {
  useRef,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ApprovedWorkspaceShell } from "./approved-workspace-shell";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewRoute, type PreviewScenario } from "./catalog";
import {
  CalendarSessionPanel,
  calendarDateLabel,
  calendarTime,
} from "./calendar-session-panel";
import { CalendarSessionEditor } from "./calendar-session-editor";
import {
  calendarContext,
  calendarCoaches,
  calendarResources,
  listSessions,
  filterSessions,
  sessionVenue,
  sessionSelectionPatch,
  copySessionPatch,
  newSessionDraft,
  cancelSessionPatch,
  groupOverlappingSessions,
  weekDates,
  monthDates,
  shiftCalendarDate,
  previewSessionCategories,
  type PreviewCalendarView,
  type PreviewScheduledSession,
  type PreviewSessionPatchResult,
  type PreviewSessionFilters,
} from "./preview-session-records";
import "./approved-calendar.css";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";

function subscribeViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}
const phoneSnapshot = () => window.innerWidth < 768;
const overlaySnapshot = () => window.innerWidth < 1200;
const serverSnapshot = () => false;
const categoryClass = (category: string) =>
  category === "Trial Session"
    ? "cal-category-trial"
    : category === "Match"
      ? "cal-category-match"
      : category === "Other Event"
        ? "cal-category-other"
        : category === "Academy Closed"
          ? "cal-category-closed"
          : "";
function minutes(time: string) {
  const [hours, minute] = time.split(":").map(Number);
  return hours * 60 + minute;
}

export function ApprovedCalendar({
  scenario = "default",
}: {
  scenario?: PreviewScenario;
}) {
  const state = usePreviewState(),
    context = calendarContext(state),
    mobile = useSyncExternalStore(
      subscribeViewport,
      phoneSnapshot,
      serverSnapshot,
    ),
    overlay = useSyncExternalStore(
      subscribeViewport,
      overlaySnapshot,
      serverSnapshot,
    );
  const [viewChoice, setView] = useState<PreviewCalendarView | null>(null),
    [filters, setFilters] = useState<PreviewSessionFilters>({}),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [panelChoice, setPanel] = useState<boolean | null>(null),
    [expanded, setExpanded] = useState<PreviewScheduledSession[] | null>(null),
    [editor, setEditor] = useState<PreviewScheduledSession | null>(null),
    [cancelling, setCancelling] = useState(false),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState("");
  const lastTrigger = useRef<HTMLElement | null>(null);
  const view = viewChoice ?? (mobile ? "Agenda" : "Week"),
    date = context.date;
  const records = listSessions(state);
  const dataset =
    context.scenario === "simultaneous"
      ? records.filter(
          (item) =>
            item.source === "simultaneous" ||
            item.id.includes(":simultaneous:") ||
            item.copiedFrom?.includes(":simultaneous:") ||
            item.planId.startsWith(`fixture-weekly:${state.academyId}:`),
        )
      : records;
  const chosen = selectedId ?? state.fields["session-context"]?.id;
  const selected =
    dataset.find((item) => item.id === chosen) ??
    (selectedId
      ? undefined
      : (dataset.find((item) =>
          context.scenario === "simultaneous"
            ? item.batch === "U12 Foundations"
            : item.date === date,
        ) ?? dataset[0]));
  const showPanel =
    !!selected &&
    context.role !== "PARENT" &&
    !["empty", "loading", "failed-save"].includes(scenario) &&
    (panelChoice ?? !overlay);
  const unavailable = scenario === "loading" || scenario === "failed-save";
  const visible =
    scenario === "empty" || unavailable ? [] : filterSessions(dataset, filters);
  const week = weekDates(date),
    month = monthDates(date);
  const timedInWeek = visible.filter(
    (item) => !item.allDay && week.includes(item.date),
  );
  const firstHour = Math.min(
    8,
    ...timedInWeek.map((item) => Math.floor(minutes(item.start) / 60)),
  );
  const lastHour = Math.max(
    22,
    ...timedInWeek.map((item) => Math.ceil(minutes(item.end) / 60)),
  );
  const rangeMinutes = (lastHour - firstHour) * 60;
  const shortestDuration = Math.min(
    120,
    ...timedInWeek.map((item) =>
      Math.max(1, minutes(item.end) - minutes(item.start)),
    ),
  );
  const pixelsPerHour = Math.max(35, (44 * 60) / shortestDuration);
  const timeScroll = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const scroll = timeScroll.current;
    if (
      !scroll ||
      !selected ||
      !timedInWeek.some((item) => item.id === selected.id)
    )
      return;
    const top =
      ((minutes(selected.start) - firstHour * 60) / 60) * pixelsPerHour;
    if (
      top < scroll.scrollTop ||
      top > scroll.scrollTop + scroll.clientHeight - 44
    )
      scroll.scrollTop = Math.max(0, top - scroll.clientHeight / 2);
  }, [selected, firstHour, pixelsPerHour, timedInWeek, view]);
  const period = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  const coaches = calendarCoaches(state),
    resources = calendarResources(state);
  const setContext = (patch: Record<string, string>) => {
    const live = previewAdapter.read();
    previewAdapter.save({
      fields: {
        ...live.fields,
        "calendar-preview-context": {
          ...live.fields["calendar-preview-context"],
          ...patch,
        },
      },
    });
  };
  function commit(result: PreviewSessionPatchResult) {
    if (!result.ok || !result.patch) {
      setNotice(result.errors.join(" "));
      return false;
    }
    if (scenario === "failed-save") {
      setNotice(
        "Preview save failed. Your entered draft is retained; no stored record changed.",
      );
      return false;
    }
    const saved = previewAdapter.saveConfirmed(result.patch);
    if (!saved.ok) {
      setNotice(saved.error);
      return false;
    }
    setNotice(
      "Saved to this browser’s fictional preview. No parent notification was sent.",
    );
    return true;
  }
  function choose(record: PreviewScheduledSession, trigger?: HTMLElement) {
    if (!confirmUnsavedChanges()) return;
    const result = sessionSelectionPatch(previewAdapter.read(), record.id);
    if (!result.ok || !result.patch) {
      setNotice(result.errors.join(" "));
      return;
    }
    const saved = previewAdapter.saveConfirmed(result.patch);
    if (!saved.ok) {
      setNotice(saved.error);
      return;
    }
    if (trigger && !expanded) lastTrigger.current = trigger;
    if (record.date) setContext({ date: record.date });
    setSelectedId(record.id);
    setPanel(true);
    setExpanded(null);
  }
  function eventCard(record: PreviewScheduledSession, compact = false) {
    return (
      <button
        type="button"
        key={record.id}
        data-session-id={record.id}
        className={`cal-event ${categoryClass(record.category)} ${record.status === "Cancelled" ? "cancelled" : ""}`}
        aria-pressed={showPanel && selected?.id === record.id}
        onClick={(event) => choose(record, event.currentTarget)}
        aria-label={`${record.title}, ${calendarDateLabel(record.date)}, ${record.allDay ? "All day" : `${calendarTime(record.start)} to ${calendarTime(record.end)}`}, ${sessionVenue(state, record)}, ${record.status}`}
      >
        <strong>{record.title}</strong>
        {!compact && (
          <>
            <span>
              {record.allDay
                ? "All day"
                : `${calendarTime(record.start)} – ${calendarTime(record.end)}`}
            </span>
            <span>{sessionVenue(state, record)}</span>
            <span>
              {record.coachIds
                .map((id) => coaches.find((coach) => coach.id === id)?.name)
                .filter(Boolean)
                .join(", ")}
              {record.status === "Cancelled" && " · Cancelled"}
            </span>
          </>
        )}
      </button>
    );
  }
  const panel = selected && (
    <CalendarSessionPanel
      key={`${selected.academyId}:${selected.id}`}
      record={selected}
      onClose={() => setPanel(false)}
      onEdit={() => setEditor(selected)}
      onCopy={() => {
        const result = copySessionPatch(
          previewAdapter.read(),
          selected.id,
          `${state.academyId}:draft:${crypto.randomUUID()}`,
        );
        if (result.ok && result.record) setEditor(result.record);
        else setNotice(result.errors.join(" "));
      }}
      onCancel={() => {
        setReason("");
        setCancelling(true);
      }}
      onNotice={setNotice}
      onCommit={commit}
      onViewCalendar={() => {
        if (selected.date) setContext({ date: selected.date });
        setView("Week");
        setPanel(false);
      }}
    />
  );
  const reviewTools = (
    <>
      <label>
        Calendar example
        <select
          aria-label="Calendar example"
          value={context.scenario}
          onChange={(event) => {
            if (!confirmUnsavedChanges()) return;
            setSelectedId(null);
            setPanel(null);
            setFilters({});
            setContext({
              scenario: event.target.value,
              role: event.target.value === "default" ? "COACH" : "OWNER",
              date: context.today,
            });
          }}
        >
          <option value="default">Recorded batch plan</option>
          <option value="simultaneous">
            Three simultaneous sessions · owner example
          </option>
          <option value="event-types">Event categories · owner example</option>
        </select>
      </label>
      <label>
        Calendar access example
        <select
          aria-label="Calendar access example"
          value={context.role}
          onChange={(event) => {
            if (!confirmUnsavedChanges()) return;
            setSelectedId(null);
            setPanel(null);
            setContext({ role: event.target.value });
          }}
        >
          <option value="COACH">Assigned coach</option>
          <option value="OWNER">Academy owner</option>
        </select>
      </label>
      <p className="hd-muted">
        Example sessions and resource checks stay in the fictional adapter.
        These controls do not authorise customer records.
      </p>
    </>
  );
  return (
    <ApprovedWorkspaceShell
      active="Calendar"
      role={context.role === "OWNER" ? "OWNER" : "COACH"}
      scenario={scenario}
      className="approved-calendar"
      tools={reviewTools}
    >
      <div
        className={`cal-layout ${!showPanel || overlay ? "cal-panel-closed" : ""}`}
      >
        <div className="cal-workspace">
          <div className="cal-heading">
            <div>
              <h1>Calendar</h1>
              <p>Manage training sessions, matches and academy schedule.</p>
            </div>
            <button
              className="cal-button cal-primary"
              type="button"
              onClick={() => {
                if (!confirmUnsavedChanges()) return;
                const result = newSessionDraft(
                  previewAdapter.read(),
                  `${state.academyId}:draft:${crypto.randomUUID()}`,
                );
                if (result.ok && result.record) setEditor(result.record);
                else setNotice(result.errors.join(" "));
              }}
            >
              <Plus size={18} />
              Add Session
            </button>
          </div>
          <div className="cal-toolbar">
            <button
              type="button"
              className="cal-button"
              onClick={() => setContext({ date: context.today })}
            >
              <CalendarDays size={18} />
              Today
            </button>
            <div className="cal-period">
              <button
                type="button"
                className="cal-icon-button"
                aria-label="Previous calendar period"
                onClick={() =>
                  setContext({ date: shiftCalendarDate(date, view, -1) })
                }
              >
                <ChevronLeft size={17} />
              </button>
              <label className="cal-period-label cal-date-picker">
                {period}
                <input
                  aria-label="Selected calendar date"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    if (event.target.value)
                      setContext({ date: event.target.value });
                  }}
                />
              </label>
              <button
                type="button"
                className="cal-icon-button"
                aria-label="Next calendar period"
                onClick={() =>
                  setContext({ date: shiftCalendarDate(date, view, 1) })
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="cal-views" aria-label="Calendar view">
              {(["Week", "Month", "Agenda"] as const).map((item) => (
                <button
                  type="button"
                  className="cal-button"
                  key={item}
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="cal-filters">
            {[
              [
                "batch",
                "All Batches",
                [...new Set(dataset.map((item) => item.batch))].map((batch) => [
                  batch,
                  batch,
                ]),
              ],
              [
                "category",
                "All Session Types",
                previewSessionCategories.map((type) => [type, type]),
              ],
              [
                "coachId",
                "All Coaches",
                coaches
                  .filter((coach) =>
                    dataset.some((item) => item.coachIds.includes(coach.id)),
                  )
                  .map((coach) => [coach.id, coach.name]),
              ],
              [
                "resourceId",
                "All Venues",
                resources
                  .filter((resource) =>
                    dataset.some((item) => item.resourceId === resource.id),
                  )
                  .map((resource) => [resource.id, resource.name]),
              ],
            ].map(([key, label, options]) => (
              <select
                aria-label={label as string}
                key={key as string}
                value={filters[key as keyof PreviewSessionFilters] ?? "All"}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    [key as string]: event.target.value,
                  })
                }
              >
                <option value="All">{label as string}</option>
                {(options as string[][]).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            ))}
          </div>
          {notice && (
            <p
              className={`cal-notice ${/failed|already|unavailable|changed elsewhere|cannot/i.test(notice) ? "error" : ""}`}
              role="status"
            >
              {notice}
            </p>
          )}
          {unavailable && (
            <div
              className={`cal-notice ${scenario === "failed-save" ? "error" : ""}`}
              role={scenario === "failed-save" ? "alert" : "status"}
            >
              {scenario === "loading" ? (
                "Loading fictional calendar records…"
              ) : (
                <>
                  Unable to load calendar records. No empty schedule is
                  inferred.{" "}
                  <Link href={previewRoute("sessions")}>Retry preview</Link>
                </>
              )}
            </div>
          )}
          {context.scenario !== "default" && (
            <p className="cal-fixture-note">
              Fictional{" "}
              {context.scenario === "simultaneous"
                ? "owner example: three sessions on Tuesday at 5:00 PM. Their rosters are unrecorded; existing batch sessions remain stored."
                : "event-category examples. Non-training categories are not implemented in customer scheduling."}
            </p>
          )}
          {context.role === "PARENT" ? (
            <div className="cal-empty">
              Use the linked-child schedule. Staff rosters and private notes are
              unavailable.{" "}
              <Link href={previewRoute("parent-schedule")}>
                Open parent schedule
              </Link>
            </div>
          ) : (
            <>
              {view === "Week" && (
                <div className="cal-week-scroll">
                  <div className="cal-week" aria-label="Weekly calendar">
                    <div className="cal-day-headings">
                      <span />
                      {week.map((day) => (
                        <button
                          type="button"
                          className="cal-day-heading"
                          key={day}
                          aria-pressed={date === day}
                          onClick={() => setContext({ date: day })}
                        >
                          <span>
                            {new Intl.DateTimeFormat("en-GB", {
                              weekday: "short",
                              timeZone: "UTC",
                            }).format(new Date(`${day}T12:00:00Z`))}
                          </span>
                          <strong>{Number(day.slice(-2))}</strong>
                        </button>
                      ))}
                    </div>
                    <div className="cal-all-day">
                      <span>All day</span>
                      {week.map((day) => (
                        <div className="cal-all-day-cell" key={day}>
                          {visible
                            .filter((item) => item.date === day && item.allDay)
                            .map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={(event) =>
                                  choose(item, event.currentTarget)
                                }
                              >
                                {item.title}
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                    <div className="cal-time-scroll" ref={timeScroll}>
                      <div
                        className="cal-time-grid"
                        style={
                          {
                            height: (lastHour - firstHour) * pixelsPerHour,
                            "--cal-hour-px": `${pixelsPerHour}px`,
                          } as CSSProperties
                        }
                      >
                        <div className="cal-time-labels">
                          {Array.from(
                            { length: Math.ceil((lastHour - firstHour) / 2) },
                            (_, index) => firstHour + index * 2,
                          ).map((hour) => (
                            <span
                              key={hour}
                              style={{
                                top: `${((hour - firstHour) / (lastHour - firstHour)) * 100}%`,
                              }}
                            >
                              {calendarTime(`${hour}:00`)}
                            </span>
                          ))}
                        </div>
                        {week.map((day) => (
                          <div className="cal-day" key={day}>
                            {groupOverlappingSessions(
                              visible.filter(
                                (item) => item.date === day && !item.allDay,
                              ),
                            ).map((group) => {
                              const placement = {
                                top: `${((minutes(group.start) - firstHour * 60) / rangeMinutes) * 100}%`,
                                height: `${((minutes(group.end) - minutes(group.start)) / rangeMinutes) * 100}%`,
                              } as CSSProperties;
                              return (
                                <div
                                  className="cal-cluster"
                                  key={group.id}
                                  style={placement}
                                >
                                  {group.sessions.length === 1 ? (
                                    eventCard(group.sessions[0])
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="cal-event-group"
                                        aria-label={`${calendarTime(group.start)}, ${group.sessions.length} simultaneous sessions, ${group.date}`}
                                        onClick={(event) => {
                                          if (!confirmUnsavedChanges()) return;
                                          lastTrigger.current =
                                            event.currentTarget;
                                          setExpanded(group.sessions);
                                        }}
                                      >
                                        <span>{calendarTime(group.start)}</span>
                                        <strong>
                                          {group.sessions.length} simultaneous
                                          sessions
                                        </strong>
                                        <small>
                                          {group.sessions
                                            .map(
                                              (item) =>
                                                item.batch.split(" ")[0],
                                            )
                                            .join(" · ")}
                                        </small>
                                      </button>
                                      <div className="cal-overlap-columns">
                                        {group.sessions.map((item) => (
                                          <div
                                            className="cal-overlap-lane"
                                            key={item.id}
                                          >
                                            <div
                                              className="cal-overlap-member"
                                              style={{
                                                top: `${((minutes(item.start) - minutes(group.start)) / (minutes(group.end) - minutes(group.start))) * 100}%`,
                                                height: `${((minutes(item.end) - minutes(item.start)) / (minutes(group.end) - minutes(group.start))) * 100}%`,
                                              }}
                                            >
                                              {eventCard(item)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {view === "Month" && (
                <div className="cal-month" aria-label="Monthly calendar">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <span key={day}>{day}</span>
                    ),
                  )}
                  {month.map((day) => {
                    const events = visible.filter((item) => item.date === day);
                    return (
                      <div
                        className={`cal-month-day ${day.slice(0, 7) !== date.slice(0, 7) ? "outside" : ""} ${day === date ? "selected" : ""}`}
                        key={day}
                      >
                        <button
                          type="button"
                          aria-label={`Select ${calendarDateLabel(day)}`}
                          onClick={() => setContext({ date: day })}
                        >
                          {Number(day.slice(-2))}
                        </button>
                        {events
                          .slice(0, 2)
                          .map((item) => eventCard(item, true))}
                        {events.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Show all ${events.length} sessions on ${calendarDateLabel(day)}`}
                            onClick={(event) => {
                              lastTrigger.current = event.currentTarget;
                              setExpanded(events);
                            }}
                          >
                            + {events.length - 2} more
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {view === "Agenda" && (
                <div className="cal-agenda" aria-label="Calendar agenda">
                  {week
                    .filter((day) => visible.some((item) => item.date === day))
                    .map((day) => (
                      <section className="cal-agenda-day" key={day}>
                        <h2>{calendarDateLabel(day)}</h2>
                        {[
                          ...new Set(
                            visible
                              .filter((item) => item.date === day)
                              .sort((a, b) =>
                                (a.allDay ? "00:00" : a.start).localeCompare(
                                  b.allDay ? "00:00" : b.start,
                                ),
                              )
                              .map((item) =>
                                item.allDay ? "All day" : item.start,
                              ),
                          ),
                        ].map((time) => (
                          <div className="cal-agenda-time" key={time}>
                            <strong>
                              {time === "All day" ? time : calendarTime(time)}
                            </strong>
                            <div className="cal-agenda-cards">
                              {visible
                                .filter(
                                  (item) =>
                                    item.date === day &&
                                    (item.allDay
                                      ? time === "All day"
                                      : item.start === time),
                                )
                                .map((item) => eventCard(item))}
                            </div>
                          </div>
                        ))}
                      </section>
                    ))}
                </div>
              )}
              {!unavailable &&
                !visible.some((item) =>
                  (view === "Month" ? month : week).includes(item.date),
                ) && (
                  <div className="cal-empty" role="status">
                    <p>
                      {Object.values(filters).some(
                        (value) => value && value !== "All",
                      )
                        ? "No sessions match these filters in this period."
                        : "No accessible sessions in this period."}
                    </p>
                    <button
                      type="button"
                      className="cal-button"
                      onClick={() => setFilters({})}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              <div className="cal-legend" aria-label="Event colour legend">
                {previewSessionCategories.map((category) => (
                  <span key={category} className={categoryClass(category)}>
                    <i />
                    {category}
                  </span>
                ))}
              </div>
              <p className="cal-fixture-note">
                Calendar uses the academy’s recorded time zone. Overlap checks
                are preview-only; server resource-booking protection is
                unavailable.
              </p>
            </>
          )}
        </div>
        {showPanel && !overlay && (
          <aside
            className="cal-panel-desktop"
            aria-label="Selected session details"
          >
            {panel}
          </aside>
        )}
      </div>
      <Dialog.Root
        open={!!expanded}
        onOpenChange={(open) => {
          if (!open) setExpanded(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="hd-overlay" />
          <Dialog.Content
            className="cal-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!panelChoice) lastTrigger.current?.focus();
            }}
          >
            <Dialog.Title>Sessions at this time</Dialog.Title>
            <Dialog.Description>
              These records stay separate. Choose a session to view its own
              coach, space, plan and roster.
            </Dialog.Description>
            {expanded?.map((item) => eventCard(item))}
            <Dialog.Close
              className="cal-close"
              aria-label="Close simultaneous session list"
            >
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={overlay && showPanel}
        onOpenChange={(open) => {
          if (!open && confirmUnsavedChanges()) setPanel(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="hd-overlay" />
          <Dialog.Content
            className="cal-panel-sheet"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              lastTrigger.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">
              Selected session details
            </Dialog.Title>
            {panel}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {editor && (
        <CalendarSessionEditor
          key={`${editor.id}:${editor.version}`}
          record={editor}
          failedSave={scenario === "failed-save"}
          onClose={() => setEditor(null)}
          onSaved={(record) => {
            setEditor(null);
            setSelectedId(record.id);
            setContext({ date: record.date });
            setPanel(true);
            setNotice(
              "Session saved in the fictional preview. Review any parent notification separately.",
            );
          }}
        />
      )}
      <Dialog.Root open={cancelling} onOpenChange={setCancelling}>
        <Dialog.Portal>
          <Dialog.Overlay className="hd-overlay" />
          <Dialog.Content className="cal-dialog">
            <Dialog.Title>Confirm session cancellation</Dialog.Title>
            <Dialog.Description>
              {selected?.title} ·{" "}
              {selected?.date
                ? calendarDateLabel(selected.date)
                : "Date not confirmed"}
              . This simulation keeps the historical record and does not mark
              attendance or notify parents.
            </Dialog.Description>
            <label>
              Cancellation reason
              <textarea
                aria-label="Cancellation reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="cal-button cal-danger"
              disabled={!reason.trim()}
              onClick={() => {
                if (
                  selected &&
                  commit(
                    cancelSessionPatch(
                      previewAdapter.read(),
                      selected.id,
                      true,
                      reason,
                      selected.version,
                    ),
                  )
                )
                  setCancelling(false);
              }}
            >
              Confirm cancellation in preview
            </button>
            <Dialog.Close className="cal-button">Keep session</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ApprovedWorkspaceShell>
  );
}
