"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, X, AlertTriangle, Play } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import type { ReviewState } from "@/domain/entities";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  EvidenceBadge,
  SectionTitle,
  Empty,
} from "@/components/ui/primitives";
import { demoMediaFor } from "./demo-media";
import { EvidenceVideo } from "./video-player";
export function Evidence({ evidenceId }: { evidenceId?: string }) {
  const { data, update } = useAcademy();
  const item = data.evidence.find((e) => e.id === evidenceId);
  const [filter, setFilter] = useState("");
  const [player, setPlayer] = useState("");
  const [note, setNote] = useState(item?.note ?? "");
  const [goalId, setGoalId] = useState(item?.goalId ?? "");
  function review(status: ReviewState) {
    update((s) => ({
      ...s,
      evidence: s.evidence.map((e) =>
        e.id === evidenceId ? { ...e, status, note, goalId } : e,
      ),
    }));
  }
  if (evidenceId && !item)
    return (
      <Empty>
        Evidence not found.{" "}
        <Link href="/coach/evidence">Return to library</Link>
      </Empty>
    );
  if (item) {
    const media = demoMediaFor(item.id);
    return (
      <>
        <PageTitle
          title={item.title}
          description="Review the source, link the goal, and record what was observed."
        >
          <Link className="button secondary" href="/coach/evidence">
            Evidence library
          </Link>
        </PageTitle>
        <div className="two-columns">
          <div>
            {media ? (
              <EvidenceVideo
                src={media.src}
                poster={media.poster}
                bookmarks={item.bookmarks}
                onBookmark={(seconds) =>
                  update((s) => ({
                    ...s,
                    evidence: s.evidence.map((e) =>
                      e.id === item.id
                        ? {
                            ...e,
                            bookmarks: [...new Set([...e.bookmarks, seconds])],
                          }
                        : e,
                    ),
                  }))
                }
              />
            ) : (
              <Card>
                <SectionTitle title="Coach observation" />
                <EvidenceBadge type={item.type} />
                <p className="coach-note">{item.note}</p>
                <Badge>No video attached</Badge>
                <p className="muted">
                  This record contains a coach note. Video capture and uploads
                  are Not Connected.
                </p>
              </Card>
            )}
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
                tone={
                  item.status === "Coach Reviewed"
                    ? "green"
                    : item.status === "Rejected"
                      ? "red"
                      : "amber"
                }
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
  }
  const filtered = data.evidence.filter(
    (e) =>
      (!filter || e.status === filter) && (!player || e.playerId === player),
  );
  return (
    <>
      <PageTitle
        eyebrow="OBSERVE → REVIEW → ADAPT"
        title="Video & evidence"
        description="Playable fictional demo clips and coach observations, with clear review states."
      />
      <div className="notice blue">
        Demo clips are illustrative animations. Real player video capture and
        uploads are Not Connected.
      </div>
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
            "Superseded",
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
        <Badge>{filtered.length} records</Badge>
        {(filter || player) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilter("");
              setPlayer("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      {filtered.length ? (
        <div className="drills-grid">
          {filtered.map((e) => {
            const media = demoMediaFor(e.id);
            return (
              <Card className="drill-card" key={e.id}>
                {media ? (
                  <Link
                    className="evidence-thumbnail"
                    href={`/coach/evidence/${e.id}`}
                    aria-label={`Play demo clip: ${e.title}`}
                  >
                    <div
                      className="evidence-poster"
                      role="img"
                      aria-label="Fictional receiving practice animation"
                      style={{ backgroundImage: `url(${media.poster})` }}
                    />
                    <span className="evidence-play">
                      <Play size={22} />
                    </span>
                    <span className="media-label">DEMO ANIMATION · 0:32</span>
                  </Link>
                ) : (
                  <div className="observation-preview">
                    <EvidenceBadge type={e.type} />
                    <strong>Coach observation</strong>
                    <span>No video attached</span>
                  </div>
                )}
                <div className="drill-card-body">
                  <EvidenceBadge type={e.type} />
                  <h3>{e.title}</h3>
                  <p>{e.note}</p>
                  <Badge
                    tone={
                      e.status === "Coach Reviewed"
                        ? "green"
                        : e.status === "Rejected"
                          ? "red"
                          : "amber"
                    }
                  >
                    {e.status}
                  </Badge>
                  <Link className="text-link" href={`/coach/evidence/${e.id}`}>
                    {media
                      ? "Play & review evidence →"
                      : "Review observation →"}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty>
            No evidence matches these filters.
            <br />
            <Button
              variant="secondary"
              onClick={() => {
                setFilter("");
                setPlayer("");
              }}
            >
              Clear filters
            </Button>
          </Empty>
        </Card>
      )}
    </>
  );
}
