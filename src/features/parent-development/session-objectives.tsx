"use client";
import Link from "next/link";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useState } from "react";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { getPlan } from "@/services/development/plans";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { TextField } from "./plan-editor";
import type { SessionPersonalisation } from "@/domain/parent-development";
export function IndividualSessionObjectives({
  sessionId,
  initialPlayer = "",
}: {
  sessionId: string;
  initialPlayer?: string;
}) {
  const { data, ready, actor, mutate } = useDevelopmentWorkspace();
  const [edited, setEdited] = useState<SessionPersonalisation[] | null>(null);
  const [saveState, setSaveState] = useState("");
  useUnsavedChanges(edited !== null);
  if (!ready) return <p>Loading individual objectives…</p>;
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return <p>Session unavailable. Choose an assigned session.</p>;
  const objectives =
    edited ??
    data.players
      .filter((p) => p.squad === session.squad)
      .map(
        (p) =>
          data.personalisations.find(
            (x) => x.playerId === p.id && x.sessionId === sessionId,
          ) ?? {
            id: `${sessionId}-${p.id}-objective`,
            academyId: p.academyId,
            sportId: p.sportId,
            sessionId,
            playerId: p.id,
            goalId: getPlan(data, p.id).goalIds[0] ?? "",
            focus: session.focuses[p.id] ?? getPlan(data, p.id).parentSummary,
            drillId:
              getPlan(data, p.id).assignments[0]?.drillId ??
              session.drillIds[0] ??
              "",
            cue: getPlan(data, p.id).assignments[0]?.cue ?? "",
            evidenceMethod:
              getPlan(data, p.id).assignments[0]?.evidenceMethod ??
              "Coach observation",
            reviewStatus: "NEEDS_REVIEW" as const,
          },
      );
  const patch = (id: string, value: Partial<SessionPersonalisation>) =>
    setEdited(objectives.map((o) => (o.id === id ? { ...o, ...value } : o)));
  return (
    <Card>
      <h2>Today’s personal objectives</h2>
      <p>
        One shared session, with each player’s goal, drill and evidence method.
      </p>
      {objectives.map((o) => {
        const p = data.players.find((p) => p.id === o.playerId)!;
        return (
          <details key={o.id} open={p.id === (initialPlayer || "p1")}>
            <summary>
              {p.name} · {o.focus || "Focus not recorded"}
            </summary>
            <div className="form-stack">
              <p>
                Current player goal:{" "}
                {data.goals.find((g) => g.id === o.goalId)?.title ||
                  "No linked goal"}
              </p>
              <Link
                href={`/coach/development/${p.id}?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent(p.id)}`}
              >
                View current player plan
              </Link>
              <label>
                Related goal
                <select
                  aria-label={`Related goal for ${p.name}`}
                  value={o.goalId}
                  onChange={(e) => patch(o.id, { goalId: e.target.value })}
                >
                  {data.goals
                    .filter((g) => g.playerId === p.id)
                    .map((g, index) => (
                      <option value={g.id} key={g.id}>
                        {g.title} · Plan goal {index + 1} · Review{" "}
                        {g.reviewDate}
                      </option>
                    ))}
                </select>
              </label>
              <p>
                Selected drill:{" "}
                {data.drills.find((d) => d.id === o.drillId)?.name ||
                  "No drill selected"}
              </p>
              <TextField
                label={`Today’s personal focus for ${p.name}`}
                multiline
                value={o.focus}
                onChange={(focus) => patch(o.id, { focus })}
              />
              <details>
                <summary>Drill, cue and evidence details</summary>
                <label>
                  Assigned drill
                  <select
                    aria-label={`Objective drill for ${p.name}`}
                    value={o.drillId}
                    onChange={(e) => patch(o.id, { drillId: e.target.value })}
                  >
                    {data.drills
                      .filter(
                        (d) =>
                          session.drillIds.includes(d.id) ||
                          getPlan(data, p.id).assignments.some(
                            (a) => a.drillId === d.id,
                          ),
                      )
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                <TextField
                  multiline
                  label={`Objective coaching cue for ${p.name}`}
                  value={o.cue}
                  onChange={(cue) => patch(o.id, { cue })}
                />
                <TextField
                  multiline
                  label={`Objective evidence method for ${p.name}`}
                  value={o.evidenceMethod}
                  onChange={(evidenceMethod) => patch(o.id, { evidenceMethod })}
                />
                <label>
                  Review status
                  <select
                    aria-label={`Objective review status for ${p.name}`}
                    value={o.reviewStatus}
                    onChange={(e) =>
                      patch(o.id, {
                        reviewStatus: e.target
                          .value as SessionPersonalisation["reviewStatus"],
                      })
                    }
                  >
                    <option>NEEDS_REVIEW</option>
                    <option>COACH_REVIEWED</option>
                  </select>
                </label>
                <Badge>{o.reviewStatus}</Badge>
              </details>
            </div>
          </details>
        );
      })}
      <Button
        onClick={() => {
          setSaveState("Saving…");
          if (
            mutate((s) => {
              if (actor.role === "parent")
                throw new Error("Staff access required");
              if (
                objectives.some(
                  (o) =>
                    !s.players.some(
                      (p) =>
                        p.id === o.playerId &&
                        p.squad === session.squad &&
                        p.academyId === o.academyId,
                    ) ||
                    !s.drills.some(
                      (d) => d.id === o.drillId && d.sportId === o.sportId,
                    ) ||
                    !s.goals.some(
                      (g) => g.id === o.goalId && g.playerId === o.playerId,
                    ),
                )
              )
                throw new Error("Check player, drill and goal links");
              return {
                ...s,
                personalisations: [
                  ...s.personalisations.filter(
                    (o) => o.sessionId !== sessionId,
                  ),
                  ...objectives,
                ],
                sessions: s.sessions.map((x) =>
                  x.id === sessionId
                    ? {
                        ...x,
                        focuses: {
                          ...x.focuses,
                          ...Object.fromEntries(
                            objectives.map((o) => [o.playerId, o.focus]),
                          ),
                        },
                        drillIds: [
                          ...new Set([
                            ...x.drillIds,
                            ...objectives.map((o) => o.drillId),
                          ]),
                        ],
                      }
                    : x,
                ),
              };
            })
          ) {
            setEdited(null);
            setSaveState("Saved session objectives.");
          } else
            setSaveState("Save failed. Your draft is retained; please retry.");
        }}
      >
        Save session objectives
      </Button>
      <p role="status">{saveState}</p>
    </Card>
  );
}
