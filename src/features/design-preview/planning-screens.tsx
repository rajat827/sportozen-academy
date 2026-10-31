"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { previewAdapter, usePreviewState, playerWeeklyState } from "./adapter";
import { previewDrills, weekPlanContext } from "./fixtures";
import {
  Button,
  Card,
  Badge,
  Go,
  Head,
  Field,
  Check,
  Pitch,
  PreviewDrawer,
  Context,
} from "./ui";
import { PlayerFocusRows } from "./rows";
export function AdjustmentEditor({ group = false }: { group?: boolean }) {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!,
    [focus, setFocus] = useState(state.adjustments[p.id] ?? ""),
    [selected, setSelected] = useState<string[]>([p.id]),
    [saved, setSaved] = useState(false);
  const dirty = !saved && focus !== (state.adjustments[p.id] ?? "");
  useUnsavedChanges(dirty);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const adjustments = { ...state.adjustments };
        for (const id of group ? selected : [p.id]) {
          if (focus.trim()) adjustments[id] = focus.trim();
          else delete adjustments[id];
        }
        previewAdapter.save({
          adjustments,
          notice:
            "Selected adaptation saved. Batch plan and long-term goal retained.",
        });
        setSaved(true);
      }}
    >
      <p className="dp-note">Long-term goal: {p.goal}</p>
      {group &&
        state.players
          .filter((p) =>
            weekPlanContext(state.fields, state.players).playerIds.includes(
              p.id,
            ),
          )
          .map((p) => (
            <Check
              key={p.id}
              label={p.name}
              checked={selected.includes(p.id)}
              onChange={(v) =>
                setSelected(
                  v
                    ? [...selected, p.id]
                    : selected.filter((id) => id !== p.id),
                )
              }
            />
          ))}
      <Field
        label="Session-specific adjustment"
        value={focus}
        onChange={(v) => {
          setFocus(v);
          setSaved(false);
        }}
        area
      />
      <p className="dp-note">
        Leave blank to follow the batch plan. No individual weakness is
        inferred.
      </p>
      <div className="dp-actions">
        <Button type="submit" disabled={group && !selected.length}>
          Save adjustment
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const next = { ...state.adjustments };
            for (const id of group ? selected : [p.id]) delete next[id];
            previewAdapter.save({
              adjustments: next,
              notice:
                "Selected players reset to batch plan; development goals unchanged.",
            });
            setFocus("");
            setSaved(true);
          }}
        >
          Reset to batch
        </Button>
      </div>
      {saved && <p role="status">Adjustment saved in the fictional preview.</p>}
    </form>
  );
}

export function WeeklyScreen({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    [focus, setFocus] = useState(state.batchFocus),
    [batch, setBatch] = useState(
      state.fields["weekly-context"]?.batch ?? "U10 Foundations",
    ),
    [week, setWeek] = useState(
      state.fields["weekly-context"]?.week ?? "2026-10-19",
    ),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  useUnsavedChanges(dirty);
  const parent = s.role === "PARENT";
  if (parent && !playerWeeklyState(state).published)
    return (
      <div className="dp-empty">
        <h2>Your next plan is awaiting coach review</h2>
        <p>
          A changed plan is not shown as approved. The previous review remains a
          historical design example.
        </p>
        <Go to="conversation">Ask the coach</Go>
      </div>
    );
  return (
    <div className="dp-grid">
      <div className="dp-stack">
        <Card>
          <Head
            title={`${weekPlanContext(state.fields, state.players).batch} · Week of ${weekPlanContext(state.fields, state.players).week}`}
            note={`${weekPlanContext(state.fields, state.players).first.label} and ${weekPlanContext(state.fields, state.players).second.label} · ${weekPlanContext(state.fields, state.players).time} · academy timezone`}
          >
            <Badge>{state.weeklyStatus}</Badge>
          </Head>
          {state.weeklyStatus === "Review needed" && (
            <p className="dp-alert">
              Batch plan changed. Players without an override inherit the new
              wording; approved parent messages need a new review.
            </p>
          )}
          {!parent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!week || new Date(`${week}T12:00Z`).getUTCDay() !== 1) {
                  setError("Choose a Monday for the shared training week.");
                  return;
                }
                if (!focus.trim()) {
                  setError("Record a shared batch focus.");
                  return;
                }
                if (scenario === "failed-save") {
                  setError(
                    "Simulated save failed. The entered focus is retained.",
                  );
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
              }}
            >
              <div className="dp-fields">
                <Field
                  label="Batch"
                  value={batch}
                  onChange={(v) => {
                    setBatch(v);
                    setDirty(true);
                  }}
                  options={["U10 Foundations", "U12 Development"]}
                />
                <Field
                  label="Week starting"
                  value={week}
                  onChange={(v) => {
                    setWeek(v);
                    setDirty(true);
                  }}
                  type="date"
                />
              </div>
              <Field
                label="Shared batch focus"
                value={focus}
                onChange={(v) => {
                  setFocus(v);
                  setDirty(true);
                }}
                area
              />
              {error && (
                <p role="alert" className="dp-alert error">
                  {error}
                </p>
              )}
              <div className="dp-actions">
                <Button type="submit">Save batch plan</Button>
                <Button
                  variant="secondary"
                  type="button"
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
            <div className="dp-focus">
              <p className="dp-overline">Planned squad work</p>
              <strong>{state.batchFocus}</strong>
              <p>
                {state.adjustments[state.playerId]
                  ? `Personal focus: ${state.adjustments[state.playerId]}`
                  : "Following batch plan · Individual focus not yet set"}
              </p>
            </div>
          )}
        </Card>
        <Card>
          <Head
            title="Shared session activities"
            note="Approved academy drills and their intended purpose"
          >
            {!parent && <Go to="weekly-drills">Choose drills</Go>}
          </Head>
          {state.drills.map((id, i) => {
            const d = previewDrills.find((d) => d.id === id)!;
            return (
              <div className="dp-row" key={id}>
                <span className="dp-avatar">{i + 1}</span>
                <div className="dp-copy">
                  <strong>{d.name}</strong>
                  <p>
                    {d.purpose} · {d.minutes} min
                  </p>
                </div>
                {!parent && (
                  <div className="dp-actions" style={{ margin: 0 }}>
                    <Button
                      variant="ghost"
                      disabled={i === 0}
                      aria-label={`Move ${d.name} up`}
                      onClick={() => {
                        const order = [...state.drills];
                        [order[i - 1], order[i]] = [order[i], order[i - 1]];
                        previewAdapter.save({ drills: order });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={i === state.drills.length - 1}
                      aria-label={`Move ${d.name} down`}
                      onClick={() => {
                        const order = [...state.drills];
                        [order[i + 1], order[i]] = [order[i], order[i + 1]];
                        previewAdapter.save({ drills: order });
                      }}
                    >
                      ↓
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          <div className="dp-actions">
            <Go to={parent ? "conversation" : "weekly-approval"}>
              {parent
                ? "Ask about this plan"
                : "Review resulting parent messages"}
            </Go>
          </div>
        </Card>
      </div>
      <div className="dp-stack">
        <Card>
          <Head
            title={
              parent ? "Your child’s adaptation" : "Optional player adjustments"
            }
            note="Every player follows the batch unless a specific part changes."
          />
          {parent ? <Context /> : <PlayerFocusRows />}
          {!parent && (
            <div className="dp-actions">
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
          )}
        </Card>
        {["personalisation", "group-adjustment", "reset-to-batch"].includes(
          s.id,
        ) && (
          <Card>
            <Head title={s.title} />
            <AdjustmentEditor group={s.id === "group-adjustment"} />
          </Card>
        )}
        <Card>
          <Head title="Confirmed schedule" />
          <p>
            {weekPlanContext(state.fields, state.players).first.label} and{" "}
            {weekPlanContext(state.fields, state.players).second.label} ·{" "}
            {weekPlanContext(state.fields, state.players).time}
          </p>
          <p className="dp-note">
            Locations and timezone are recorded, not guessed. Optional practice:
            a short, comfortable paired receiving task with the coach’s cue.
          </p>
          <Pitch />
        </Card>
      </div>
    </div>
  );
}
