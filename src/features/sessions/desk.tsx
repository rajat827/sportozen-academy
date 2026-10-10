"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Pause, Mic, Bookmark, Plus, Check } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Avatar,
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import { Attendance } from "@/features/attendance/attendance";
export function SessionDesk({ sessionId }: { sessionId: string }) {
  const { data, update, notify } = useAcademy();
  const session = data.sessions.find((s) => s.id === sessionId);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState("Training");
  const [playerId, setPlayerId] = useState("p1");
  const [note, setNote] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [successes, setSuccesses] = useState(0);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);
  if (!session) return <p>Session not found.</p>;
  const drills = session.drillIds
    .map((id) => data.drills.find((d) => d.id === id)!)
    .filter(Boolean);
  const drill = drills[current];
  const players = data.players.filter((p) => p.squad === session.squad);
  function capture() {
    if (!note.trim() || !session) return;
    const id = crypto.randomUUID();
    update((s) => ({
      ...s,
      observations: [
        ...s.observations,
        {
          id,
          academyId: s.academy.id,
          sportId: session.sportId,
          playerId,
          sessionId,
          note,
          public: false,
        },
      ],
      evidence: [
        ...s.evidence,
        {
          id: `e-${id}`,
          academyId: s.academy.id,
          sportId: session.sportId,
          playerId,
          sessionId,
          goalId: s.goals.find((g) => g.playerId === playerId)?.id ?? "",
          title: `${data.players.find((p) => p.id === playerId)?.name} · session observation`,
          type: "Coach Observation",
          status: "Awaiting Review",
          note: `${note}${attempts ? ` Observed ${successes} successes in ${attempts} attempts.` : ""}`,
          bookmarks: [seconds],
        },
      ],
    }));
    setNote("");
    setAttempts(0);
    setSuccesses(0);
  }
  return (
    <>
      <PageTitle
        eyebrow="COACHING, IN THE MOMENT"
        title="Session Desk"
        description={`${session.title} · ${session.squad} · ${session.venue}`}
      >
        <Link
          className="button secondary"
          href={`/coach/sessions/${sessionId}/personalise`}
        >
          Personalise
        </Link>
        <Button
          variant="secondary"
          disabled={session.status === "Completed"}
          onClick={() => {
            setRunning(false);
            update((s) => ({
              ...s,
              sessions: s.sessions.map((x) =>
                x.id === sessionId ? { ...x, status: "Completed" } : x,
              ),
            }));
          }}
        >
          {session.status === "Completed" ? "Session completed" : "End session"}
        </Button>
      </PageTitle>
      <div className="tabs">
        <button
          className={tab === "Training" ? "active" : ""}
          onClick={() => setTab("Training")}
        >
          Training
        </button>
        <button
          className={tab === "Attendance" ? "active" : ""}
          onClick={() => setTab("Attendance")}
        >
          Attendance
        </button>
      </div>
      {tab === "Attendance" ? (
        <Attendance sessionId={sessionId} />
      ) : (
        <>
          <div className="desk-timer">
            <div>
              <Badge tone="green">{session.status}</Badge>
              <h2>{drill?.name ?? "No drill selected"}</h2>
              <p>{session.coachingPoints}</p>
            </div>
            <div className="timer-controls">
              <strong>
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </strong>
              <Button
                aria-label={running ? "Pause timer" : "Start timer"}
                disabled={session.status === "Completed"}
                onClick={() => setRunning(!running)}
              >
                {running ? <Pause size={19} /> : <Play size={19} />}
                {running ? "Pause" : "Start"}
              </Button>
            </div>
          </div>
          <div className="two-columns">
            <div>
              <Card>
                <SectionTitle title="Drill agenda" />
                {drills.map((d, i) => (
                  <button
                    key={d.id}
                    className={`agenda-row ${current === i ? "active" : ""}`}
                    onClick={() => setCurrent(i)}
                  >
                    <span className="goal-number">{i + 1}</span>
                    <strong>{d.name}</strong>
                    <span>{d.duration} min</span>
                  </button>
                ))}
              </Card>
              <Card>
                <SectionTitle title="Individual focus" />
                {players.map((p) => (
                  <div className="list-row" key={p.id}>
                    <Avatar name={p.name} />
                    <div>
                      <strong>{p.name}</strong>
                      <p>{session.focuses[p.id] ?? p.goal}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
            <div>
              <Card>
                <SectionTitle
                  title="Capture an observation"
                  subtitle="Specific actions make useful evidence"
                />
                <div className="form-stack">
                  <label>
                    Player
                    <select
                      value={playerId}
                      onChange={(e) => setPlayerId(e.target.value)}
                    >
                      {players.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Coach observation
                    <textarea
                      placeholder="What did you observe?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <div className="counter">
                    <Button
                      variant="secondary"
                      onClick={() => setAttempts(attempts + 1)}
                    >
                      <Plus size={15} />
                      Attempt · {attempts}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={successes >= attempts}
                      onClick={() => setSuccesses(successes + 1)}
                    >
                      <Check size={15} />
                      Success · {successes}
                    </Button>
                  </div>
                  <Button disabled={!note.trim()} onClick={capture}>
                    Save observation for review
                  </Button>
                  <div className="inline">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setNote(
                          `${note}${note ? " " : ""}Bookmark ${seconds}s.`,
                        );
                        notify(
                          "Timestamp added to observation. Save it for review.",
                        );
                      }}
                    >
                      <Bookmark size={15} />
                      Bookmark
                    </Button>
                    <Button
                      variant="secondary"
                      disabled
                      title="Voice recording is Not Connected"
                    >
                      <Mic size={15} />
                      Not Connected
                    </Button>
                  </div>
                </div>
              </Card>
              <Card>
                <SectionTitle title="Coaching points" />
                {drill?.coachingPoints.map((p) => (
                  <p className="coaching-point" key={p}>
                    ✓ {p}
                  </p>
                ))}
                <Badge tone="blue">
                  Coach observation · no automated analysis
                </Badge>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
