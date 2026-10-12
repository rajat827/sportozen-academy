"use client";
import Link from "next/link";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { parentProjection } from "@/services/communication/conversations";
import { Card } from "@/components/ui/primitives";
export function ParentPlan({ compact = false }: { compact?: boolean }) {
  const { data, actor, ready } = useDevelopmentWorkspace();
  if (!ready) return <p>Loading approved plan…</p>;
  const records = parentProjection(
    data,
    actor.role === "parent" ? actor.id : "g1",
  );
  const update = [...records.updates]
    .reverse()
    .find((u) => !!u.approvalSnapshot?.plan);
  const plan = update?.approvalSnapshot?.plan;
  if (!plan)
    return (
      <Card>
        <h2>No approved development plan yet</h2>
        <p>Your coach will publish a reviewed plan here.</p>
        <Link className="button secondary" href="/parent/messages">
          Message Coach
        </Link>
      </Card>
    );
  return (
    <Card>
      <h2>
        {
          records.players
            .find((p) => p.id === plan.playerId)
            ?.name.split(" ")[0]
        }
        ’s Current Focus
      </h2>
      <h3>{plan.parentSummary || plan.focusAreas.join(", ")}</h3>
      <p>Approved current focus · Planned activities, not completed results</p>
      <p>Why selected: {plan.reason}</p>
      <p>Training frequency: {plan.frequency}</p>
      <h3>Planned drills</h3>
      {plan.assignments.map((a) => (
        <div className="goal-card" key={a.drillId}>
          <strong>{data.drills.find((d) => d.id === a.drillId)?.name}</strong>
          <p>Purpose: {a.reason}</p>
          {!compact && (
            <>
              <p>Coaching cues: {a.cue}</p>
              <details>
                <summary>How the coach reviews this activity</summary>
                <p>Coach will observe: {a.successCriteria}</p>
                <p>Evidence method: {a.evidenceMethod}</p>
              </details>
            </>
          )}
        </div>
      ))}
      <p>Next goal: {plan.nextGoal}</p>
      <p>
        Review date: {plan.reviewDate} · {plan.period}
      </p>
      {!compact && (
        <>
          <h3>Optional home practice</h3>
          <p>{plan.homePractice || "Not assigned"}</p>
          <p>
            Only reviewed updates and approved evidence appear in your inbox.
            Missing information means more evidence is needed.
          </p>
        </>
      )}
      <div className="actions">
        <Link className="button primary" href="/parent/practice">
          Practise together
        </Link>
        <Link className="button secondary" href="/parent/progress">
          View Plan
        </Link>
        <Link className="button primary" href="/parent/messages">
          Message Coach
        </Link>
      </div>
    </Card>
  );
}
