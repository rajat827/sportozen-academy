"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Flag, ArrowRight, CalendarDays } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import type { GoalStatus } from "@/domain/entities";
import { football } from "@/config/sports/football";
import { PlanEditor } from "@/features/parent-development/plan-editor";
import {
  Card,
  Badge,
  Button,
  PageTitle,
  SectionTitle,
  EvidenceBadge,
} from "@/components/ui/primitives";
export function PlayerPath({ playerId }: { playerId: string }) {
  const { data } = useAcademy();
  const path = data.paths.find((p) => p.playerId === playerId);
  return (
    <Card>
      <SectionTitle
        title="Player Path"
        subtitle="Development · a step at a time"
      />
      <div className="pathway">
        {path?.stages.map((s, i) => (
          <div
            className={`path-stage stage-${s.status.replaceAll(" ", "-")}`}
            key={s.title}
          >
            <span className="stage-number">
              {s.status === "Completed" ? <Check size={17} /> : i + 1}
            </span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.status}</p>
            </div>
          </div>
        )) ?? <p>Not Recorded</p>}
      </div>
      <p className="muted">
        Stages describe practice progress and coach verification.
      </p>
    </Card>
  );
}
export function DevelopmentPlan({ playerId = "p1" }: { playerId?: string }) {
  const { data, update } = useAcademy();
  const player = data.players.find((p) => p.id === playerId);
  const plan = data.plans.find((p) => p.playerId === playerId);
  const [weekly, setWeekly] = useState(plan?.weeklyPlan ?? "");
  const [newGoal, setNewGoal] = useState("");
  if (!player) return <p className="empty">Player not found.</p>;
  const goals = data.goals.filter((g) => g.playerId === playerId);
  return (
    <>
      <Suspense fallback={null}>
        <SessionReturn playerId={playerId} />
      </Suspense>
      <PageTitle
        eyebrow="PLAN → PERSONALISE → PRACTISE"
        title={`${player.name.split(" ")[0]}’s development plan`}
        description="Specific goals. Clear success criteria. Evidence you can review."
      >
        <Link className="button secondary" href={`/coach/players/${playerId}`}>
          Player profile
        </Link>
        <Link className="button primary" href="/coach/sessions/s1/personalise">
          Personalise session <ArrowRight size={16} />
        </Link>
      </PageTitle>
      <div className="two-columns">
        <div className="full">
          <PlanEditor playerId={playerId} />
        </div>
        <div>
          <Card>
            <SectionTitle
              title="Current priorities"
              subtitle="Coach Rahul · next review 14 October 2026"
            />
            {goals.map((g, i) => (
              <div className="goal-card" key={g.id}>
                <div className="inline">
                  <span className="goal-number">{i + 1}</span>
                  <h3>{g.title}</h3>
                </div>
                <p>{g.criteria}</p>
                <div className="inline">
                  <EvidenceBadge type="Coach Observation" />
                  <label className="status-field">
                    <span>Stage</span>
                    <select
                      aria-label={`Goal status: ${g.title}`}
                      value={g.status}
                      onChange={(e) =>
                        update((s) => ({
                          ...s,
                          goals: s.goals.map((goal) =>
                            goal.id === g.id
                              ? {
                                  ...goal,
                                  status: e.target.value as GoalStatus,
                                }
                              : goal,
                          ),
                        }))
                      }
                    >
                      {football.stages.map((stage) => (
                        <option key={stage}>{stage}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newGoal.trim()) return;
                const goalId = crypto.randomUUID();
                update((s) => ({
                  ...s,
                  goals: [
                    ...s.goals,
                    {
                      id: goalId,
                      academyId: player.academyId,
                      sportId: player.sportId,
                      playerId,
                      title: newGoal.trim(),
                      status: "Introduced",
                      criteria: "Review observed practice with the coach.",
                      reviewDate: "2026-10-14",
                    },
                  ],
                  plans: s.plans.map((p) =>
                    p.playerId === playerId
                      ? { ...p, goalIds: [...p.goalIds, goalId] }
                      : p,
                  ),
                  players: s.players.map((p) =>
                    p.id === playerId && p.goal === "Not Recorded"
                      ? { ...p, goal: newGoal.trim() }
                      : p,
                  ),
                }));
                setNewGoal("");
              }}
            >
              <input
                aria-label="New development goal"
                placeholder="Add a specific development goal"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
              <Button type="submit">
                <Flag size={15} />
                Add goal
              </Button>
            </form>
          </Card>
          <Card>
            <SectionTitle
              title="Weekly plan"
              subtitle="Connect team training to personal priorities"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update((s) => ({
                  ...s,
                  plans: s.plans.map((p) =>
                    p.playerId === playerId ? { ...p, weeklyPlan: weekly } : p,
                  ),
                }));
              }}
              className="form-stack"
            >
              <label>
                Practice and review plan
                <textarea
                  value={weekly}
                  onChange={(e) => setWeekly(e.target.value)}
                />
              </label>
              <Button type="submit">Save plan</Button>
            </form>
            {data.sessions
              .filter((s) => s.squad === player.squad)
              .map((s) => (
                <div className="list-row" key={s.id}>
                  <CalendarDays size={20} />
                  <div>
                    <strong>{s.title}</strong>
                    <p>
                      {s.date} · Personal objective:{" "}
                      {s.focuses[playerId] ?? "Not Recorded"}
                    </p>
                  </div>
                </div>
              ))}
          </Card>
        </div>
        <div>
          <PlayerPath playerId={playerId} />
          <Card>
            <SectionTitle title="Evidence behind the plan" />
            {data.evidence
              .filter((e) => e.playerId === playerId)
              .map((e) => (
                <Link
                  className="evidence-link"
                  href={`/coach/evidence/${e.id}`}
                  key={e.id}
                >
                  <EvidenceBadge type={e.type} />
                  <h3>{e.title}</h3>
                  <p>{e.note}</p>
                  <Badge tone="green">{e.status}</Badge>
                </Link>
              ))}
          </Card>
          <div className="suggestion">
            <Badge tone="purple">AI Suggestion</Badge>
            <h3>Try receiving on the move</h3>
            <p>Demo suggestion based on the current practice goal.</p>
            <strong>AI suggestion — coach review required</strong>
          </div>
        </div>
      </div>
    </>
  );
}

function SessionReturn({ playerId }: { playerId: string }) {
  const query = useSearchParams();
  const { data } = useAcademy();
  const id = query.get("session");
  if (!id) return null;
  const session = data.sessions.find((s) => s.id === id);
  const player = data.players.find((p) => p.id === playerId);
  if (
    !session ||
    query.get("player") !== playerId ||
    session.squad !== player?.squad
  )
    return (
      <p role="alert">
        Session context is unavailable. Choose an assigned session from My
        Sessions.
      </p>
    );
  return (
    <Card>
      <p>
        {data.academy.name} · {session.title} · {session.squad} · {session.date}{" "}
        {session.time} · {player.name}
      </p>
      <p>
        Recorded session focus:{" "}
        {session.focuses[playerId] || "No focus recorded"}. Changing this
        long-term plan does not change the session objective.
      </p>
      <Link
        className="button secondary"
        href={`/coach/sessions/${session.id}/personalise?player=${encodeURIComponent(playerId)}`}
      >
        Return to selected session
      </Link>
    </Card>
  );
}
