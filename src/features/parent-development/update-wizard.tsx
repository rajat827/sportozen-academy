"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { Card, Button, Badge, PageTitle } from "@/components/ui/primitives";
import { TextField } from "./plan-editor";
import {
  draftParentUpdate,
  parentMessage,
  saveParentUpdate,
  updateSources,
} from "@/services/communication/parent-updates";
import { getPlan, updateTypes } from "@/services/development/plans";
import type {
  ParentDevelopmentUpdate,
  ParentUpdateSource,
} from "@/domain/parent-development";
export function SourceRecord({ source }: { source: ParentUpdateSource }) {
  let text = source.text;
  if (source.kind === "PLAN") {
    try {
      const p = JSON.parse(text);
      text = `${p.focusAreas.join(", ")} · ${p.reason} · review ${p.reviewDate} · ${p.frequency} · ${p.homePractice || "No home practice"}`;
    } catch {}
  }
  return (
    <div className="source-record">
      <strong>
        {source.label} · {source.id}
      </strong>
      <p>
        {source.evidenceType && `[${source.evidenceType}] `}
        {text}
      </p>
    </div>
  );
}
const steps = [
  "Select Update Type",
  "Select Development Focus",
  "Select Assigned Drills",
  "Explain Why",
  "Define Coach Observations",
  "Optional Home Practice",
  "Nutrition & Hydration",
  "Select Source Records",
  "Set Review Date",
  "Preview Parent Message",
];
export function UpdateWizard({ playerId }: { playerId: string }) {
  const workspace = useDevelopmentWorkspace();
  const query = useSearchParams();
  if (!workspace.ready) return <p>Loading update wizard…</p>;
  const existing = workspace.data.parentUpdates.find(
    (u) => u.id === query.get("draft") && u.playerId === playerId,
  );
  if (!workspace.data.players.some((p) => p.id === playerId))
    return <p>Player not found.</p>;
  return (
    <UpdateForm
      key={`${playerId}-${existing?.id ?? "new"}`}
      playerId={playerId}
      initial={
        existing ?? draftParentUpdate(workspace.data, workspace.actor, playerId)
      }
    />
  );
}
function UpdateForm({
  playerId,
  initial,
}: {
  playerId: string;
  initial: ParentDevelopmentUpdate;
}) {
  const { data, actor, mutate } = useDevelopmentWorkspace();
  const router = useRouter();
  const [draft, setDraft] = useState(initial),
    [step, setStep] = useState(0),
    [verified, setVerified] = useState(false);
  const plan = getPlan(data, playerId),
    player = data.players.find((p) => p.id === playerId)!;
  function patch(fields: Partial<ParentDevelopmentUpdate>) {
    setDraft({ ...draft, ...fields });
    setVerified(false);
  }
  function save(submit: boolean) {
    if (mutate((s) => saveParentUpdate(s, actor, draft, submit))) {
      if (submit) router.push("/coach/messages");
      else
        router.replace(`/coach/players/${playerId}/update?draft=${draft.id}`);
    }
  }
  return (
    <>
      <PageTitle
        title="Create Parent Development Update"
        description={`${player.name} · ${data.guardians.find((g) => g.id === player.guardianId)?.name} · Private in-app update`}
      />
      <p>
        Step {step + 1} of {steps.length} · {steps[step]}
      </p>
      <div className="stepper wizard-steps">
        {steps.map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => {
              if (i === 9)
                setDraft({ ...draft, messageBody: parentMessage(data, draft) });
              setStep(i);
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>
      <Card>
        <div className="form-stack">
          {step === 0 && (
            <label>
              Update type
              <select
                aria-label="Update type"
                value={draft.updateType}
                onChange={(e) =>
                  patch({
                    updateType: e.target
                      .value as ParentDevelopmentUpdate["updateType"],
                  })
                }
              >
                {updateTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          {step === 1 && (
            <fieldset>
              <legend>Current plan focus</legend>
              {plan.focusAreas.map((f) => (
                <label className="check-row" key={f}>
                  <input
                    type="checkbox"
                    aria-label={`Update focus: ${f}`}
                    checked={draft.focusAreas.includes(f)}
                    onChange={(e) =>
                      patch({
                        focusAreas: e.target.checked
                          ? [...draft.focusAreas, f]
                          : draft.focusAreas.filter((x) => x !== f),
                      })
                    }
                  />
                  {f}
                </label>
              ))}
              {!plan.focusAreas.length && (
                <p>
                  Set focus areas in the individual plan before preparing an
                  update.
                </p>
              )}
            </fieldset>
          )}
          {step === 2 && (
            <fieldset>
              <legend>Drills assigned to this player</legend>
              {plan.assignments.map((a) => {
                const d = data.drills.find((d) => d.id === a.drillId)!;
                return (
                  <label className="check-row" key={a.drillId}>
                    <input
                      aria-label={`Update drill: ${d.name}`}
                      type="checkbox"
                      checked={draft.assignedDrillIds.includes(a.drillId)}
                      onChange={(e) =>
                        patch({
                          assignedDrillIds: e.target.checked
                            ? [...draft.assignedDrillIds, a.drillId]
                            : draft.assignedDrillIds.filter(
                                (id) => id !== a.drillId,
                              ),
                        })
                      }
                    />
                    <span>
                      {d.name}
                      <small>{a.reason}</small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {step === 3 && (
            <TextField
              label="Why this focus was selected"
              value={draft.coachReason}
              onChange={(coachReason) => patch({ coachReason })}
              multiline
            />
          )}
          {step === 4 && (
            <>
              <TextField
                label="What the coach will observe"
                value={draft.successCriteria}
                onChange={(successCriteria) => patch({ successCriteria })}
                multiline
              />
              <TextField
                label="Next development goal"
                value={draft.nextGoal}
                onChange={(nextGoal) => patch({ nextGoal })}
              />
            </>
          )}
          {step === 5 && (
            <TextField
              label="Optional home practice"
              value={draft.homePractice}
              onChange={(homePractice) => patch({ homePractice })}
              multiline
            />
          )}
          {step === 6 && (
            <>
              <p>
                Only general academy-approved guidance is available. Clinical or
                personalised diet recommendations are outside this workflow.
              </p>
              <label>
                Approved nutrition guidance
                <select
                  aria-label="Approved nutrition guidance"
                  value={draft.nutritionGuidanceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    patch({
                      nutritionGuidanceId: id,
                      sourceRecords: [
                        ...draft.sourceRecords.filter(
                          (s) => s.kind !== "NUTRITION",
                        ),
                        ...updateSources(data, playerId).filter(
                          (s) => s.kind === "NUTRITION" && s.id === id,
                        ),
                      ],
                    });
                  }}
                >
                  <option value="">No guidance selected</option>
                  {data.nutritionGuidance
                    .filter(
                      (g) =>
                        g.approval === "ACADEMY_APPROVED" && !g.personalised,
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} · {g.approval}
                      </option>
                    ))}
                </select>
              </label>
              {data.nutritionGuidance
                .filter((g) => g.id === draft.nutritionGuidanceId)
                .map((g) => (
                  <div key={g.id}>
                    <p>{g.body}</p>
                    <Badge>{g.approval}</Badge>
                    <p>{g.disclaimer}</p>
                  </div>
                ))}
            </>
          )}
          {step === 7 && (
            <>
              <h2>Source Records Used</h2>
              <Button
                variant="secondary"
                onClick={() => {
                  patch({
                    sourceRecords: updateSources(data, playerId).filter(
                      (s) =>
                        s.kind !== "NUTRITION" ||
                        s.id === draft.nutritionGuidanceId,
                    ),
                  });
                }}
              >
                Refresh Source Records
              </Button>
              {updateSources(data, playerId)
                .filter(
                  (s) =>
                    s.kind !== "NUTRITION" ||
                    s.id === draft.nutritionGuidanceId,
                )
                .map((s) => (
                  <label key={`${s.kind}-${s.id}`} className="check-row">
                    <input
                      type="checkbox"
                      aria-label={`Source ${s.kind}: ${s.id}`}
                      checked={draft.sourceRecords.some(
                        (x) => x.id === s.id && x.kind === s.kind,
                      )}
                      onChange={(e) =>
                        patch({
                          sourceRecords: e.target.checked
                            ? [...draft.sourceRecords, s]
                            : draft.sourceRecords.filter(
                                (x) => x.id !== s.id || x.kind !== s.kind,
                              ),
                        })
                      }
                    />
                    <SourceRecord source={s} />
                  </label>
                ))}
            </>
          )}
          {step === 8 && (
            <TextField
              label="Update review date"
              type="date"
              value={draft.reviewDate}
              onChange={(reviewDate) => patch({ reviewDate })}
            />
          )}
          {step === 9 && (
            <>
              <h2>Message preview</h2>
              <Badge>{draft.approvalStatus}</Badge>
              <Badge>External: NOT_SENT</Badge>
              <TextField
                label="Parent message"
                value={draft.messageBody}
                onChange={(messageBody) => patch({ messageBody })}
                multiline
              />
              <Button
                variant="secondary"
                onClick={() =>
                  patch({ messageBody: parentMessage(data, draft) })
                }
              >
                Regenerate Preview
              </Button>
              <label className="check-row">
                <input
                  type="checkbox"
                  aria-label="Source records verified"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />{" "}
                I checked the selected records and edited message; all claims
                have evidence.
              </label>
              <div className="actions">
                <Button variant="secondary" onClick={() => save(false)}>
                  Save Draft
                </Button>
                <Button disabled={!verified} onClick={() => save(true)}>
                  Submit for Approval
                </Button>
              </div>
            </>
          )}
          <div className="actions">
            <Button
              variant="secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
            {step < 9 && (
              <Button
                onClick={() => {
                  if (step === 8)
                    setDraft({
                      ...draft,
                      messageBody: parentMessage(data, draft),
                    });
                  setStep(step + 1);
                }}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
