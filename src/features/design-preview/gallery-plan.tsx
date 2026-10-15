"use client";
import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Target,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { previewAdapter, usePreviewState, playerWeeklyState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { Button, Badge, Go, Field, PreviewDrawer } from "./ui";
import { AdjustmentEditor } from "./planning-screens";
import { PlayerFocusRows } from "./rows";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import "./gallery-plan.css";
import {
  parentScheduleSessions,
  sessionVenue,
} from "./preview-session-records";
export function GalleryWeeklyPlan({ parent = false }: { parent?: boolean }) {
  const state = usePreviewState(),
    ctx = weekPlanContext(state.fields, state.players),
    academy = resolvedAcademy(state.academyId, state.profiles),
    player = state.players.find((p) => p.id === state.playerId)!;
  const [focus, setFocus] = useState(state.batchFocus),
    [editing, setEditing] = useState(false),
    [batch, setBatch] = useState(ctx.batch),
    [week, setWeek] = useState(ctx.week),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Sessions");
  useUnsavedChanges(dirty);
  const weekly = playerWeeklyState(state),
    included = ctx.playerIds.includes(player.id),
    drills = state.drills
      .map((id) => previewDrills.find((d) => d.id === id))
      .filter((d) => d !== undefined);
  if (parent && (!included || !weekly.approved || !weekly.published))
    return (
      <div className="dp-empty">
        <h2>
          {included
            ? "Your next plan is awaiting coach review"
            : "No confirmed current-week plan"}
        </h2>
        <p>
          {player.name} · {player.batch}. Only a reviewed plan published for
          this child is shown here.
        </p>
        <Go to="conversation">Ask the coach</Go>
      </div>
    );
  const sessions = parent
    ? parentScheduleSessions(state).map((record, index) => ({
        key: record.id,
        label: new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        }).format(new Date(`${record.date}T12:00:00Z`)),
        time: `${record.start}–${record.end}`,
        venue: sessionVenue(state, record),
        activity: previewDrills.find(
          (drill) =>
            drill.id === (record.agendaIds[index] ?? record.agendaIds[0]),
        )?.name,
      }))
    : [ctx.first, ctx.second].map((date, index) => ({
        key: date.label,
        label: date.label,
        time: ctx.time,
        venue: academy.venue,
        activity: drills[index]?.name,
      }));
  const sessionsContent = (
    <div className="gw-sessions">
      {sessions.map((date) => (
        <article key={date.key}>
          <CalendarDays size={19} />
          <div>
            <strong>{date.label}</strong>
            <p>
              {date.time} · {date.venue}
            </p>
            <p>{date.activity ?? "Activity not yet selected"}</p>
            <Go to={parent ? "parent-schedule" : "session-summary"}>
              {parent ? "Session details" : "Open session"}
            </Go>
          </div>
        </article>
      ))}
      {!sessions.length && (
        <p>No approved current-week sessions are published for this child.</p>
      )}
      <small>
        {sessions.map((session) => session.label).join(" and ")} ·{" "}
        {academy.timezone}
      </small>
    </div>
  );
  if (parent)
    return (
      <div className="gw-parent-plan">
        <Image
          className="gw-banner"
          src="/design-preview/ui-gallery/football-week-banner.png"
          width={648}
          height={255}
          unoptimized
          alt="Football training illustration from the supplied gallery"
        />
        <small className="gw-image-note">Reference illustration</small>
        <div className="gw-team-focus">
          <small>Team Focus</small>
          <h2>{state.batchFocus}</h2>
          <p>
            Shared squad training, with an individual adjustment only where the
            coach recorded one.
          </p>
        </div>
        <div
          className="gw-tabs"
          role="tablist"
          aria-label="Weekly plan sections"
        >
          {["Sessions", `${player.name.split(" ")[0]}’s Focus`].map((name) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === name}
              aria-controls="weekly-section"
              key={name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <section id="weekly-section" role="tabpanel">
          {tab === "Sessions" ? (
            sessionsContent
          ) : (
            <div className="gw-team-focus">
              <Target size={24} />
              <h3>{state.adjustments[player.id] || state.batchFocus}</h3>
              <Badge>
                {state.adjustments[player.id]
                  ? "Personalised adjustment"
                  : "Following batch plan"}
              </Badge>
              <p>Long-term goal: {player.goal}</p>
              <div className="gw-activities">
                {drills.map((d) => (
                  <article key={d.id}>
                    <strong>{d.name}</strong>
                    <p>
                      {d.cue} · {d.minutes} min
                    </p>
                  </article>
                ))}
              </div>
              <Go to="practice">Practise together</Go>
            </div>
          )}
        </section>
      </div>
    );
  return (
    <>
      <div className="gw-stages">
        {[
          [
            "1",
            "Plan Sessions",
            "Set the team focus and activities",
            "weekly-plan",
          ],
          [
            "2",
            "Personalise for Players",
            "Adjust only where needed",
            "personalisation",
          ],
          [
            "3",
            "Review & Publish",
            "Approve wording, then publish in-app",
            "weekly-approval",
          ],
        ].map(([n, title, note, to]) => (
          <Go key={n} to={to}>
            <span>{n}</span>
            <div>
              <strong>{title}</strong>
              <small>{note}</small>
            </div>
          </Go>
        ))}
      </div>
      <div className="gw-columns">
        <section className="gw-panel">
          <div className="gw-panel-title">
            <h2>Team Focus</h2>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              Edit team focus
            </Button>
          </div>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!week || new Date(`${week}T12:00:00Z`).getUTCDay() !== 1) {
                  setError("Choose a Monday for the shared training week.");
                  return;
                }
                if (!focus.trim()) {
                  setError("Record a shared batch focus.");
                  return;
                }
                previewAdapter.save({
                  batchFocus: focus,
                  playerId:
                    batch === "U12 Development"
                      ? "leo"
                      : state.playerId === "leo"
                        ? "aarav"
                        : state.playerId,
                  fields: {
                    ...state.fields,
                    "weekly-context": { batch, week },
                  },
                  notice:
                    "Shared batch plan saved once; inherited focuses updated.",
                });
                setDirty(false);
                setError("");
                setEditing(false);
              }}
            >
              <div className="gw-context-fields">
                <Field
                  label="Batch"
                  value={batch}
                  options={["U10 Foundations", "U12 Development"]}
                  onChange={(v) => {
                    setBatch(v);
                    setDirty(true);
                  }}
                />
                <Field
                  label="Week starting"
                  type="date"
                  value={week}
                  onChange={(v) => {
                    setWeek(v);
                    setDirty(true);
                  }}
                />
              </div>
              <Field
                label="Shared batch focus"
                value={focus}
                area
                onChange={(v) => {
                  setFocus(v);
                  setDirty(true);
                }}
              />
              {dirty && <small>Unsaved changes</small>}
              {error && (
                <p className="dp-alert error" role="alert">
                  {error}
                </p>
              )}
              <div className="dp-actions">
                <Button type="submit">Save batch plan</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFocus("Receive into space, then find the next pass");
                    setDirty(true);
                  }}
                >
                  Reuse previous plan
                </Button>
              </div>
            </form>
          ) : (
            <div className="gw-focus-summary">
              <h3>{state.batchFocus}</h3>
              <p>
                {ctx.batch} · Week of {ctx.week}
              </p>
              <p>
                The squad shares this plan. Optional player adjustments stay
                alongside it.
              </p>
            </div>
          )}
          <div className="gw-panel-title">
            <h2>Sessions ({sessions.length})</h2>
            <Go to="session-builder">Build session</Go>
          </div>
          {sessionsContent}
        </section>
        <section className="gw-panel">
          <div className="gw-panel-title">
            <h2>Players ({ctx.playerIds.length})</h2>
            <Badge>{state.weeklyStatus}</Badge>
          </div>
          <small>Player · age category · personal focus</small>
          <PlayerFocusRows />
          <div className="gw-adjustments">
            <PreviewDrawer
              title="Individual adjustment"
              trigger="Personalise selected player"
            >
              <AdjustmentEditor />
            </PreviewDrawer>
            <PreviewDrawer
              title="Group adjustment"
              trigger="Adjust selected group"
            >
              <AdjustmentEditor group />
            </PreviewDrawer>
          </div>
          <div className="gw-panel-title">
            <h3>Session activities</h3>
            <Go to="weekly-drills">Choose drills</Go>
          </div>
          <div className="gw-activities">
            {drills.map((d, i) => (
              <article key={d.id}>
                <span className="gw-number">{i + 1}</span>
                <div>
                  <strong>{d.name}</strong>
                  <p>
                    {d.minutes} min · {d.cue}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="gw-panel gw-parent-preview">
          <h2>Preview for Parents</h2>
          <div className="gw-message">
            <div className="gw-mini-brand">
              <span>S</span>
              {academy.name}
            </div>
            <h3>
              {player.name.split(" ")[0]}’s plan · {ctx.week}
            </h3>
            <p>This week, {ctx.batch} will practise:</p>
            <strong>{state.batchFocus}</strong>
            <p>
              Personal focus:{" "}
              {state.adjustments[player.id] ||
                "Following the shared batch plan"}
            </p>
            <p>
              <CalendarDays size={16} />
              {sessions.length} confirmed training sessions
            </p>
            <p>
              <Target size={16} />
              {drills.map((d) => d.name).join(" · ") ||
                "Activities not yet chosen"}
            </p>
            <p>
              <Clock size={16} />
              {ctx.time}
            </p>
            <p>
              <MapPin size={16} />
              {academy.venue}
            </p>
            <Badge>
              {weekly.approved ? "Wording approved" : "Awaiting wording review"}
            </Badge>
            <p className="gw-review-note">
              {included
                ? "Selected child belongs to this batch."
                : "Selected child belongs to another batch. Select a player in this plan before review."}
            </p>
          </div>
          <p className="gw-review-note">
            Editable preview. Approval and parent-app publication are separate.
            WhatsApp is not connected.
          </p>
          <Go to="weekly-approval" primary>
            Review parent plans <ArrowRight size={16} />
          </Go>
          <Go to="whatsapp-preview">Preview WhatsApp wording</Go>
          <div className="gw-status">
            <CheckCircle2 size={17} />
            {weekly.published
              ? "Published in fictional parent app"
              : "Not published for this version"}
          </div>
        </section>
      </div>
    </>
  );
}
