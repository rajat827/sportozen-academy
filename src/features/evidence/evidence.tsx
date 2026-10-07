"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Pause, Bookmark, Check, X, AlertTriangle } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import type { ReviewState } from "@/domain/entities";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  EvidenceBadge,
  SectionTitle,
} from "@/components/ui/primitives";
import { DrillVisual } from "@/features/drills/drills";
export function Evidence({ evidenceId }: { evidenceId?: string }) {
  const { data, update } = useAcademy();
  const item = data.evidence.find((e) => e.id === evidenceId);
  const [filter, setFilter] = useState("");
  const [player, setPlayer] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [note, setNote] = useState(item?.note ?? "");
  const [goalId, setGoalId] = useState(item?.goalId ?? "");
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTime((t) => (t >= 60 ? 0 : t + 1)), 1000);
    return () => clearInterval(id);
  }, [playing]);
  function review(status: ReviewState) {
    update((s) => ({
      ...s,
      evidence: s.evidence.map((e) =>
        e.id === evidenceId ? { ...e, status, note, goalId } : e,
      ),
    }));
  }
  if (evidenceId && !item) return <p>Evidence not found.</p>;
  if (item)
    return (
      <>
        <PageTitle
          title={item.title}
          description="Demo evidence viewer · illustrative timeline; no video or automated analysis connected."
        >
          <Link className="button secondary" href="/coach/evidence">
            Evidence library
          </Link>
        </PageTitle>
        <div className="two-columns">
          <div>
            <div className="demo-viewer">
              <DrillVisual />
              <span className="demo-overlay">
                FICTIONAL DEMO MEDIA · timeline simulation
              </span>
            </div>
            <Card>
              <div className="video-controls">
                <Button
                  variant="secondary"
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                  {playing ? "Pause" : "Play demo"}
                </Button>
                <label className="timeline">
                  <span className="sr-only">Demo timeline</span>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={time}
                    onChange={(e) => setTime(Number(e.target.value))}
                  />
                </label>
                <span>0:{String(time).padStart(2, "0")} / 1:00</span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      evidence: s.evidence.map((e) =>
                        e.id === item.id
                          ? {
                              ...e,
                              bookmarks: [...new Set([...e.bookmarks, time])],
                            }
                          : e,
                      ),
                    }))
                  }
                >
                  <Bookmark size={16} />
                  Bookmark
                </Button>
              </div>
              <div className="inline">
                {item.bookmarks.map((b) => (
                  <button
                    key={b}
                    className="badge blue"
                    onClick={() => setTime(b)}
                  >
                    0:{String(b).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle title="Source & context" />
              <EvidenceBadge type={item.type} />
              <p>
                Player: {data.players.find((p) => p.id === item.playerId)?.name}
              </p>
              <p>
                Session:{" "}
                {data.sessions.find((s) => s.id === item.sessionId)?.title}
              </p>
              <Badge
                tone={item.status === "Coach Reviewed" ? "green" : "amber"}
              >
                {item.status}
              </Badge>
            </Card>
          </div>
          <Card>
            <SectionTitle
              title="Coach review"
              subtitle="Evidence supports a specific observation"
            />
            <div className="form-stack">
              <label>
                Linked development goal
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  <option value="">Not linked</option>
                  {data.goals
                    .filter((g) => g.playerId === item.playerId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Coach note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <Button onClick={() => review(item.status)}>Save note</Button>
              <Button onClick={() => review("Coach Reviewed")}>
                <Check size={16} />
                Approve evidence
              </Button>
              <Button
                variant="secondary"
                onClick={() => review("Unclear Footage")}
              >
                <AlertTriangle size={16} />
                Mark unclear
              </Button>
              <Button variant="secondary" onClick={() => review("Rejected")}>
                <X size={16} />
                Reject
              </Button>
              <p className="muted">
                Only Coach Reviewed evidence appears in the parent preview.
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="OBSERVE → REVIEW → ADAPT"
        title="Video & evidence"
        description="Keep the record, the observation, and the review together."
      />
      <div className="filters">
        <select
          aria-label="Evidence review filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All review states</option>
          {[
            "Awaiting Review",
            "Coach Reviewed",
            "Unclear Footage",
            "Rejected",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Evidence player filter"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        >
          <option value="">All players</option>
          {data.players.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Badge>Demo media · Not Connected</Badge>
      </div>
      <div className="drills-grid">
        {data.evidence
          .filter(
            (e) =>
              (!filter || e.status === filter) &&
              (!player || e.playerId === player),
          )
          .map((e, i) => (
            <Card className="drill-card" key={e.id}>
              <DrillVisual index={i} />
              <div className="drill-card-body">
                <EvidenceBadge type={e.type} />
                <h3>{e.title}</h3>
                <p>{e.note}</p>
                <Badge tone={e.status === "Coach Reviewed" ? "green" : "amber"}>
                  {e.status}
                </Badge>
                <Link className="text-link" href={`/coach/evidence/${e.id}`}>
                  Review evidence →
                </Link>
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
