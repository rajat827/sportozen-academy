"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import Link from "next/link";
import { previewRoute } from "./catalog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { previewAdapter, usePreviewState } from "./adapter";
import {
  previewDrills,
  money,
  resolvedAcademy,
  sessionViewContext,
  weekPlanContext,
} from "./fixtures";
import {
  Button,
  Card,
  Badge,
  Go,
  Head,
  Field,
  Check,
  Pitch,
  Context,
} from "./ui";
import { SessionRows, AgendaRows, PlayerFocusRows } from "./rows";
import { AdjustmentEditor } from "./planning-screens";
export function HomeScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    p = state.players.find((p) => p.id === state.playerId)!;
  if (s.role === "PARENT")
    return (
      <div className="dp-grid">
        <div className="dp-stack">
          <Card>
            <Head
              title={`A useful week for ${p.name}`}
              note={`${p.category} age category · ${p.batch}`}
            >
              <Badge>Coach-led</Badge>
            </Head>
            <div className="dp-focus">
              <p className="dp-overline">Current development focus</p>
              <strong>{p.goal}</strong>
              <p className="dp-note">
                {state.adjustments[p.id] ||
                  "Following batch plan · Individual focus not yet set"}
              </p>
            </div>
            <div className="dp-row">
              <span className="dp-avatar">20</span>
              <div className="dp-copy">
                <strong>
                  {weekPlanContext(state.fields, state.players).first.label} ·{" "}
                  {weekPlanContext(state.fields, state.players).time}
                </strong>
                <p>
                  {academy.venue} · {academy.timezone}
                </p>
              </div>
              <Go to="parent-schedule">Schedule</Go>
            </div>
            <div className="dp-actions">
              <Go to="parent-weekly">This week’s plan</Go>
              <Go to="practice">Practise together</Go>
            </div>
          </Card>
          <Card>
            <Head title="Latest reviewed update" />
            <p>
              {p.id === "aarav"
                ? "The paired receiving task used a wider gate. The coach will keep those conditions before extending the task."
                : "No reviewed update has been recorded for this child. Ask the coach; no result is inferred."}
            </p>
            <div className="dp-actions">
              <Go to="conversation">Ask Maya a question</Go>
            </div>
          </Card>
        </div>
        <div className="dp-stack">
          <Card>
            <Head
              title="September report"
              note="What was practised, observed and what comes next."
            />
            <Go to="parent-report">Open reviewed report</Go>
          </Card>
          <Card>
            <Head
              title="October academy fee"
              note="Training fees are paid to the academy."
            />
            <p className="dp-metric">
              {money(academy, academy.monthlyFee - academy.discount)}
            </p>
            <p className="dp-note">
              Charge {money(academy, academy.monthlyFee)} − scholarship{" "}
              {money(academy, academy.discount)} · no payment processed
            </p>
            <Go to="parent-fees">View invoice</Go>
          </Card>
        </div>
      </div>
    );
  if (s.role === "OWNER")
    return (
      <div className="dp-grid">
        <div className="dp-stack">
          <Card>
            <Head
              title="Today at the academy"
              note="Tuesday, 20 October · two recorded batch sessions"
            />
            <SessionRows />
            <div className="dp-actions">
              <Go to="batches">Manage batches</Go>
              <Go to="weekly-plan">Review training plans</Go>
            </div>
          </Card>
          <Card>
            <Head title="Decisions needing attention" />
            <div className="dp-row">
              <div className="dp-copy">
                <strong>One payment reference awaits review</strong>
                <p>
                  A submitted reference does not reduce the verified balance.
                </p>
              </div>
              <Go to="reconciliation">Review</Go>
            </div>
            <div className="dp-row">
              <div className="dp-copy">
                <strong>New player guardian link</strong>
                <p>Record the relationship and independent contact check.</p>
              </div>
              <Go to="guardian-link">Open</Go>
            </div>
            <div className="dp-row">
              <div className="dp-copy">
                <strong>Weekly message setup is disconnected</strong>
                <p>Design preview only; no delivery provider is called.</p>
              </div>
              <Go to="whatsapp-setup">View setup</Go>
            </div>
          </Card>
        </div>
        <Card>
          <Head title="Academy essentials" />
          <div className="dp-stack">
            <Go to="staff">Staff and assignments</Go>
            <Go to="branches">Branches and venues</Go>
            <Go to="fee-overview">Training fees</Go>
            <Go to="academy-settings">Regional settings</Go>
          </div>
          <p className="dp-note">
            Software subscription billing lives in Sportozen administration,
            separately.
          </p>
        </Card>
      </div>
    );
  return (
    <div className="dp-grid">
      <div className="dp-stack">
        <Card>
          <Head
            title={weekPlanContext(state.fields, state.players).batch}
            note={`${weekPlanContext(state.fields, state.players).first.label} · ${weekPlanContext(state.fields, state.players).time} · ${academy.venue}`}
          >
            <Badge>Confirmed session</Badge>
          </Head>
          <div className="dp-focus">
            <p className="dp-overline">Shared session focus</p>
            <strong>{state.batchFocus}</strong>
            <p className="dp-note">
              Maya Rao ·{" "}
              {weekPlanContext(state.fields, state.players).playerIds.length}{" "}
              players in this preview roster · all attendance starts unmarked
            </p>
          </div>
          <div className="dp-actions">
            <Go to="session-agenda" primary>
              Open today’s session
            </Go>
            <Go to="weekly-plan">View weekly plan</Go>
          </div>
          <div className="dp-tabs" style={{ marginTop: 24 }}>
            <Go to="session-agenda">Before training</Go>
            <Go to="session-attendance">During training</Go>
            <Go to="session-review">After training</Go>
          </div>
          <AgendaRows />
        </Card>
        <Card>
          <Head title="Keep the follow-up simple" />
          <div className="dp-row">
            <div className="dp-copy">
              <strong>September report ready to review</strong>
              <p>Attendance basis and reviewed source remain explicit.</p>
            </div>
            <Go to="report-queue">Review</Go>
          </div>
          <div className="dp-row">
            <div className="dp-copy">
              <strong>Neha asked about practice</strong>
              <p>Reply privately with the child’s context retained.</p>
            </div>
            <Go to="parent-questions">Open question</Go>
          </div>
        </Card>
      </div>
      <div className="dp-stack">
        <Card>
          <Head title="Receive and turn" note="Current activity · receiving" />
          <Pitch />
          <p className="dp-overline">One coaching cue</p>
          <h3>Look, open, receive</h3>
          <Go to="drill-detail">Setup and instructions</Go>
        </Card>
        <Card>
          <Head title="Player focuses" />
          <PlayerFocusRows compact />
        </Card>
      </div>
    </div>
  );
}

export function DrillScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    [query, setQuery] = useState(""),
    [skill, setSkill] = useState("All"),
    detail = s.id === "drill-detail";
  const selectedDrill =
    previewDrills.find((d) => d.id === state.fields["drill-context"]?.id) ??
    previewDrills[0];
  const drills = previewDrills.filter(
    (d) =>
      (skill === "All" || d.skill === skill) &&
      `${d.name} ${d.purpose}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="dp-grid">
      <div className="dp-stack">
        <Card>
          <Head
            title={detail ? selectedDrill.name : "Academy drill library"}
            note="Approved fictional curriculum · no AI-generated assessment"
          />
          {!detail && (
            <div className="dp-fields">
              <Field
                label="Search activities"
                value={query}
                onChange={setQuery}
              />
              <Field
                label="Skill"
                value={skill}
                onChange={setSkill}
                options={["All", "Receiving", "Passing", "Decision making"]}
              />
            </div>
          )}
          {(detail ? [selectedDrill] : drills).map((d) => (
            <article key={d.id} className="dp-row">
              <div className="dp-copy">
                <h3>{d.name}</h3>
                <p>
                  {d.skill} · {d.minutes} minutes
                </p>
                <p>{d.purpose}</p>
                {detail && (
                  <>
                    {d.id === "receive" && <Pitch />}
                    <h3>Setup</h3>
                    <p>{d.setup}</p>
                    <h3>Instructions</h3>
                    <p>{d.instructions}</p>
                    <h3>Adaptations</h3>
                    <p>{d.adaptation}</p>
                    <h3>One coaching cue</h3>
                    <p>{d.cue}</p>
                  </>
                )}
              </div>
              {!detail && (
                <Button
                  variant="secondary"
                  disabled={state.drills.includes(d.id)}
                  onClick={() =>
                    previewAdapter.save({
                      drills: [...state.drills, d.id],
                      notice: `${d.name} added to the shared agenda`,
                    })
                  }
                >
                  {state.drills.includes(d.id)
                    ? "In shared plan"
                    : "Add to shared plan"}
                </Button>
              )}
              {detail ? (
                <Go to="drill-edit">Edit academy wording</Go>
              ) : (
                <Link
                  className="dp-link"
                  href={previewRoute("drill-detail")}
                  onClick={() =>
                    previewAdapter.save({
                      fields: {
                        ...state.fields,
                        "drill-context": { id: d.id },
                      },
                    })
                  }
                >
                  Drill detail
                </Link>
              )}
            </article>
          ))}
          <div className="dp-actions">
            <Go to="weekly-plan">Return to weekly agenda</Go>
          </div>
        </Card>
      </div>
      <Card>
        <Head title="One useful cue" />
        <div className="dp-focus">
          <strong>{detail ? selectedDrill.cue : previewDrills[0].cue}</strong>
          <p className="dp-note">
            Simplify the task before adding complexity; observe the recorded
            conditions.
          </p>
        </div>
        {(!detail || selectedDrill.id === "receive") && <Pitch />}
      </Card>
    </div>
  );
}

export function SessionScreen({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!,
    session = sessionViewContext(
      state.fields,
      state.players,
      state.academyId,
      state.playerId,
    ),
    [observation, setObservation] = useState(state.observation),
    [defined, setDefined] = useState(
      Boolean(state.fields[`session:${p.id}`]?.result),
    ),
    [attempts, setAttempts] = useState(
      state.fields[`session:${p.id}`]?.result ?? "",
    ),
    [conditions, setConditions] = useState(
      state.fields[`session:${p.id}`]?.conditions ??
        "Paired task · widened gate · short pass",
    ),
    [next, setNext] = useState(state.nextStep),
    [error, setError] = useState("");
  const dirty = observation !== state.observation || next !== state.nextStep;
  useUnsavedChanges(dirty);
  const stage = s.id.includes("attendance")
    ? "attendance"
    : s.id.includes("observation")
      ? "observation"
      : s.id.includes("review")
        ? "review"
        : s.id.includes("next-step")
          ? "next"
          : "agenda";
  if (session.stale)
    return (
      <Card>
        <Head title="Selected session unavailable" />
        <p>
          The selected session does not match the current academy, batch, player
          or recorded plan date. Choose the correct session rather than opening
          another one.
        </p>
        <Go to="sessions">View Calendar</Go>
      </Card>
    );
  return (
    <>
      <div className="dp-tabs">
        {[
          ["Before training", "session-agenda"],
          ["Objectives", "session-objectives"],
          ["Attendance", "session-attendance"],
          ["Observation", "session-observation"],
          ["Review", "session-review"],
        ].map(([label, id]) => (
          <Go key={id} to={id}>
            {label}
          </Go>
        ))}
      </div>
      <div className="dp-grid">
        <div className="dp-stack">
          <Card>
            <Head
              title={`${session.batch} · ${session.label}`}
              note={`${session.time} · Maya Rao · recorded venue`}
            />
            <Context />
            {stage === "attendance" ? (
              <>
                {state.players
                  .filter((p) =>
                    weekPlanContext(
                      state.fields,
                      state.players,
                    ).playerIds.includes(p.id),
                  )
                  .map((p) => (
                    <div className="dp-row" key={p.id}>
                      <div className="dp-copy">
                        <strong>{p.name}</strong>
                        <p>
                          {p.category} age category · {p.batch}
                        </p>
                      </div>
                      <Field
                        label={`Attendance for ${p.name}`}
                        value={state.attendance[p.id] ?? "Unmarked"}
                        onChange={(v) =>
                          previewAdapter.save({
                            attendance: { ...state.attendance, [p.id]: v },
                            notice:
                              "Fictional attendance saved for the selected player",
                          })
                        }
                        options={["Unmarked", "Present", "Absent", "Excused"]}
                      />
                    </div>
                  ))}
                <p className="dp-note">
                  No result is inferred from unmarked attendance.
                </p>
              </>
            ) : stage === "observation" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!observation.trim()) {
                    setError(
                      "Record an observation, or leave it honestly not recorded.",
                    );
                    return;
                  }
                  if (scenario === "failed-save") {
                    setError(
                      "Design scenario: save failed. Observation retained for retry.",
                    );
                    return;
                  }
                  previewAdapter.save({
                    observation,
                    fields: {
                      ...state.fields,
                      [`session:${p.id}`]: {
                        observation,
                        conditions,
                        result: defined ? attempts : "",
                        nextStep: next,
                      },
                    },
                    notice: `Observation saved once for ${p.name}; review remains separate`,
                  });
                  setError("");
                }}
              >
                <p className="dp-overline">Long-term goal · context only</p>
                <h3>{p.goal}</h3>
                <p className="dp-note">
                  Session adaptation:{" "}
                  {state.adjustments[p.id] ?? state.batchFocus}
                </p>
                <Field
                  label="Coach observation"
                  value={observation}
                  onChange={setObservation}
                  area
                />
                <Field
                  label="Recorded task conditions"
                  value={conditions}
                  onChange={setConditions}
                />
                <Check
                  label="Add an optional defined result"
                  checked={defined}
                  onChange={setDefined}
                />
                {defined && (
                  <Field
                    label="Defined attempts/result (with conditions)"
                    value={attempts}
                    onChange={setAttempts}
                  />
                )}
                <p className="dp-note">
                  Observation-only is valid. No observation means not recorded,
                  not failed.
                </p>
                {error && (
                  <p role="alert" className="dp-alert error">
                    {error}
                  </p>
                )}
                <Button type="submit">Save observation</Button>
              </form>
            ) : stage === "next" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  previewAdapter.save({
                    nextStep: next,
                    notice: "Next development step saved in the prototype",
                  });
                }}
              >
                <Field
                  label="Next development step"
                  value={next}
                  onChange={setNext}
                  area
                />
                <p>Coach will observe: first touch toward the free gate.</p>
                <Button type="submit">Save next step</Button>
              </form>
            ) : stage === "review" ? (
              <>
                <div className="dp-focus">
                  <p className="dp-overline">Recorded observation</p>
                  <strong>{state.observation || "Not recorded"}</strong>
                  <p className="dp-note">
                    {state.observation
                      ? "Recorded today · review the task conditions before approval"
                      : "No observation is treated as missing; no failure is inferred."}
                  </p>
                </div>
                <div className="dp-row">
                  <div className="dp-copy">
                    <strong>Attendance remains explicit</strong>
                    <p>
                      {Object.entries(state.attendance)
                        .filter(([id]) =>
                          weekPlanContext(
                            state.fields,
                            state.players,
                          ).playerIds.includes(id),
                        )
                        .map(
                          ([id, status]) =>
                            `${state.players.find((p) => p.id === id)?.name}: ${status}`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <p>Next step: {state.nextStep}</p>
                <div className="dp-actions">
                  <Go to="session-next-step">Edit next step</Go>
                  <Go to="report-queue">Review monthly sources</Go>
                </div>
              </>
            ) : (
              <>
                <div className="dp-focus">
                  <p className="dp-overline">Shared session focus</p>
                  <strong>{state.batchFocus}</strong>
                </div>
                <AgendaRows />
                {s.id === "session-objectives" && <AdjustmentEditor />}
              </>
            )}
            <div className="dp-actions">
              {s.next && <Go to={s.next}>Continue session</Go>}
            </div>
          </Card>
        </div>
        <div className="dp-stack">
          <Card>
            <Head
              title="Current activity"
              note="Receive and turn · 15 minutes"
            />
            <Pitch />
            <h3>Look, open, receive</h3>
            <p className="dp-note">{previewDrills[0].instructions}</p>
            <Go to="drill-detail">Full drill details</Go>
          </Card>
          <Card>
            <Head title="Selected player" />
            <h3>{p.name}</h3>
            <p className="dp-note">
              {p.category} · {p.batch}
            </p>
            <p className="dp-note">
              {state.adjustments[p.id]
                ? "Personalised adjustment"
                : "Following batch plan"}
            </p>
            <Go to="current-plan">Open development context</Go>
          </Card>
        </div>
      </div>
    </>
  );
}
