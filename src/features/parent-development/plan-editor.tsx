"use client";
import { useState } from "react";
import Link from "next/link";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { Card, Button, Badge } from "@/components/ui/primitives";
import {
  getPlan,
  savePlayerPlan,
  planStatuses,
  progressStates,
} from "@/services/development/plans";
import { assertStaff } from "@/services/communication/parent-updates";
import { sportConfiguration } from "@/config/sports";
import type { PlayerDevelopmentPlan } from "@/domain/parent-development";
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function PlanEditor({ playerId }: { playerId: string }) {
  const { data, ready, actor, mutate } = useDevelopmentWorkspace();
  const [edited, setEdited] = useState<PlayerDevelopmentPlan | null>(null);
  if (!ready) return <p>Loading plan…</p>;
  const plan = edited ?? getPlan(data, playerId),
    config = sportConfiguration(plan.sportId);
  const patch = (value: Partial<PlayerDevelopmentPlan>) =>
    setEdited({ ...plan, ...value });
  return (
    <Card>
      <h2>Individual player plan</h2>
      <p>One team. A different development path for every player.</p>
      <Badge>{plan.status}</Badge>
      <div className="form-stack">
        <fieldset>
          <legend>Current Focus Areas</legend>
          {config?.focusAreas?.map((f) => (
            <label className="check-row" key={f.id}>
              <input
                type="checkbox"
                aria-label={`Plan focus: ${f.name}`}
                checked={plan.focusAreas.includes(f.name)}
                onChange={(e) =>
                  patch({
                    focusAreas: e.target.checked
                      ? [...plan.focusAreas, f.name]
                      : plan.focusAreas.filter((x) => x !== f.name),
                  })
                }
              />
              {f.name}
            </label>
          ))}
        </fieldset>
        <TextField
          label="Why this focus was selected"
          value={plan.reason}
          onChange={(reason) => patch({ reason })}
          multiline
        />
        <div className="form-grid">
          <TextField
            label="Plan period"
            value={plan.period}
            onChange={(period) => patch({ period })}
          />
          <label>
            Assigned coach
            <select
              aria-label="Assigned coach"
              value={plan.coachId}
              onChange={(e) => patch({ coachId: e.target.value })}
            >
              {data.coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Start date"
            type="date"
            value={plan.startDate}
            onChange={(startDate) => patch({ startDate })}
          />
          <TextField
            label="Plan review date"
            type="date"
            value={plan.reviewDate}
            onChange={(reviewDate) => patch({ reviewDate })}
          />
        </div>
        <TextField
          label="Training frequency"
          value={plan.frequency}
          onChange={(frequency) => patch({ frequency })}
        />
        <fieldset>
          <legend>Assigned Drills</legend>
          {data.drills
            .filter((d) => d.sportId === plan.sportId)
            .map((d) => (
              <label className="check-row" key={d.id}>
                <input
                  aria-label={`Assign drill: ${d.name}`}
                  type="checkbox"
                  checked={plan.assignments.some((a) => a.drillId === d.id)}
                  onChange={(e) =>
                    patch({
                      assignments: e.target.checked
                        ? [
                            ...plan.assignments,
                            {
                              drillId: d.id,
                              reason: d.objective,
                              cue: d.coachingPoints.join("; "),
                              successCriteria:
                                "Coach reviews comparable attempts against this objective",
                              evidenceMethod: d.evidenceMethod,
                            },
                          ]
                        : plan.assignments.filter((a) => a.drillId !== d.id),
                    })
                  }
                />
                {d.name}
              </label>
            ))}
        </fieldset>
        {plan.assignments.map((a) => {
          const drill = data.drills.find((d) => d.id === a.drillId)!;
          const edit = (value: Partial<typeof a>) =>
            patch({
              assignments: plan.assignments.map((x) =>
                x.drillId === a.drillId ? { ...x, ...value } : x,
              ),
            });
          return (
            <div className="goal-card" key={a.drillId}>
              <h3>{drill.name}</h3>
              <Link className="text-link" href={`/coach/drills/${drill.id}`}>
                View drill instructions
              </Link>
              <TextField
                label={`Reason for ${drill.name}`}
                value={a.reason}
                onChange={(reason) => edit({ reason })}
              />
              <TextField
                label={`Coaching cue for ${drill.name}`}
                value={a.cue}
                onChange={(cue) => edit({ cue })}
              />
              <TextField
                label={`Success criteria for ${drill.name}`}
                value={a.successCriteria}
                onChange={(successCriteria) => edit({ successCriteria })}
              />
              <TextField
                label={`Evidence method for ${drill.name}`}
                value={a.evidenceMethod}
                onChange={(evidenceMethod) => edit({ evidenceMethod })}
              />
            </div>
          );
        })}
        <TextField
          label="Optional home practice"
          value={plan.homePractice}
          onChange={(homePractice) => patch({ homePractice })}
          multiline
        />
        <TextField
          label="Next development goal"
          value={plan.nextGoal}
          onChange={(nextGoal) => patch({ nextGoal })}
        />
        <TextField
          label="Parent-visible summary"
          value={plan.parentSummary}
          onChange={(parentSummary) => patch({ parentSummary })}
          multiline
        />
        <TextField
          label="Private coach notes"
          value={plan.coachNotes}
          onChange={(coachNotes) => patch({ coachNotes })}
          multiline
        />
        <div className="form-grid">
          <label>
            Plan status
            <select
              aria-label="Plan status"
              value={plan.status}
              onChange={(e) =>
                patch({
                  status: e.target.value as PlayerDevelopmentPlan["status"],
                })
              }
            >
              {planStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Current progress
            <select
              aria-label="Current progress"
              value={plan.progress}
              onChange={(e) =>
                patch({
                  progress: e.target.value as PlayerDevelopmentPlan["progress"],
                })
              }
            >
              {progressStates.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <Button
            onClick={() => {
              if (
                mutate((s) => {
                  assertStaff(s, actor, playerId);
                  return savePlayerPlan(s, plan);
                })
              )
                setEdited(null);
            }}
          >
            Save Individual Plan
          </Button>
          <Link
            className="button secondary"
            href={`/coach/players/${playerId}/update`}
          >
            Create Parent Development Update
          </Link>
        </div>
        <p>
          Parent plan views use approved update snapshots. Saving staff edits
          does not publish private or unreviewed changes.
        </p>
      </div>
    </Card>
  );
}
