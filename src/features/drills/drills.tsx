"use client";
import { useState } from "react";
import Link from "next/link";
import { Clock, Users, ArrowRight, Play, Plus } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  EvidenceBadge,
  SectionTitle,
} from "@/components/ui/primitives";
import { football } from "@/config/sports/football";
export function DrillVisual({ index = 0 }: { index?: number }) {
  return (
    <div
      className={`drill-visual visual-${index % 3}`}
      role="img"
      aria-label="Illustrative demo practice diagram"
    >
      <div className="field-line" />
      <div className="field-circle" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span className={`cone cone-${i}`} key={i} />
      ))}
      <span className="diagram-arrow">↗</span>
      <span className="media-label">DEMO PRACTICE DIAGRAM</span>
      <Play className="diagram-play" size={22} />
    </div>
  );
}
export function Drills({ drillId }: { drillId?: string }) {
  const { data, update, notify } = useAcademy();
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [sessionId, setSessionId] = useState("s1");
  const drill = data.drills.find((d) => d.id === drillId);
  if (drillId && !drill) return <p>Drill not found.</p>;
  if (drill)
    return (
      <>
        <PageTitle
          eyebrow={`${drill.skill.toUpperCase()} · ${drill.ageGroup}`}
          title={drill.name}
          description={`${drill.duration} minutes · ${drill.players} players · ${drill.difficulty}`}
        >
          <Link className="button secondary" href="/coach/drills">
            All drills
          </Link>
        </PageTitle>
        <div className="two-columns">
          <div>
            <DrillVisual />
            <Card>
              <SectionTitle title="Objective" />
              <p>{drill.objective}</p>
              <h3>Setup & equipment</h3>
              <p>{drill.equipment} · 15 × 15 metre area</p>
              <h3>Instructions</h3>
              <ol>
                {drill.instructions.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ol>
              <h3>Coaching points</h3>
              <ul>
                {drill.coachingPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <h3>Common mistakes</h3>
              <p>
                Receiving with a closed body shape; looking after the ball has
                arrived.
              </p>
            </Card>
          </div>
          <div>
            <Card>
              <SectionTitle title="Adapt the challenge" />
              <h3>Progression</h3>
              <p>{drill.progression}</p>
              <h3>Regression</h3>
              <p>{drill.regression}</p>
              <h3>Evidence method</h3>
              <p>{drill.evidenceMethod}</p>
              <EvidenceBadge type="Coach Observation" />
              <h3>Related goal</h3>
              <p>Scan before receiving</p>
            </Card>
            <Card>
              <SectionTitle title="Add to a session" />
              <label className="form-stack">
                Session
                <select
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  {data.sessions
                    .filter((s) => s.status !== "Completed")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                onClick={() => {
                  if (
                    data.sessions
                      .find((s) => s.id === sessionId)
                      ?.drillIds.includes(drill.id)
                  ) {
                    notify("This drill is already in the session.");
                    return;
                  }
                  update((s) => ({
                    ...s,
                    sessions: s.sessions.map((x) =>
                      x.id === sessionId
                        ? { ...x, drillIds: [...x.drillIds, drill.id] }
                        : x,
                    ),
                  }));
                }}
              >
                <Plus size={15} />
                Add to session
              </Button>
            </Card>
          </div>
        </div>
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="GOOD PRACTICE STARTS WITH PURPOSE"
        title="Drills & curriculum"
        description="A practical library for individual progress within team training."
      />
      <div className="filters">
        <input
          aria-label="Search drills"
          placeholder="Search drills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Drill skill filter"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        >
          <option value="">All skill areas</option>
          {football.skills.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="drills-grid">
        {data.drills
          .filter(
            (d) =>
              d.name.toLowerCase().includes(search.toLowerCase()) &&
              (!skill || d.skill === skill),
          )
          .map((d, i) => (
            <Card className="drill-card" key={d.id}>
              <DrillVisual index={i} />
              <div className="drill-card-body">
                <div className="inline">
                  <Badge tone="green">{d.skill}</Badge>
                  <Badge>{d.ageGroup}</Badge>
                </div>
                <h3>{d.name}</h3>
                <p>{d.objective}</p>
                <div className="inline muted">
                  <Clock size={14} />
                  {d.duration} min <Users size={14} />
                  {d.players}
                </div>
                <p className="muted">
                  {d.difficulty} · {d.equipment}
                </p>
                <EvidenceBadge type="Coach Observation" />
                <Link className="text-link" href={`/coach/drills/${d.id}`}>
                  View drill <ArrowRight size={15} />
                </Link>
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
