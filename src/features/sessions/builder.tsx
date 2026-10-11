"use client";
import { IndividualSessionObjectives } from "@/features/parent-development/session-objectives";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import { Button, Card, PageTitle, Badge } from "@/components/ui/primitives";
const steps = [
  "Basic Details",
  "Select Drills",
  "Player Personalisation",
  "Evidence Plan",
  "Review and Publish",
];
export function SessionBuilder() {
  const { data, update } = useAcademy();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("Passing with purpose");
  const [date, setDate] = useState("2026-10-08");
  const [time, setTime] = useState("16:00");
  const [squad, setSquad] = useState("U-13");
  const [venue, setVenue] = useState(data.venues[0].name);
  const [drillIds, setDrillIds] = useState<string[]>(["d1"]);
  const [focuses, setFocuses] = useState<Record<string, string>>(
    Object.fromEntries(data.players.map((p) => [p.id, p.goal])),
  );
  const [evidence, setEvidence] = useState(
    "Coach observation · scan before receiving",
  );
  const [points, setPoints] = useState(
    "Scan, open body shape, receive across the body.",
  );
  const [error, setError] = useState("");
  const players = data.players.filter((p) => p.squad === squad);
  const total = drillIds.reduce(
    (sum, id) => sum + (data.drills.find((d) => d.id === id)?.duration ?? 0),
    0,
  );
  function reorder(index: number, delta: number) {
    const next = [...drillIds];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setDrillIds(next);
  }
  function valid() {
    if (!title.trim() || !date || !time) {
      setError("Enter a session title, date and time.");
      setStep(0);
      return false;
    }
    if (!drillIds.length) {
      setError("Select at least one drill.");
      setStep(1);
      return false;
    }
    setError("");
    return true;
  }
  function save(status: "Draft" | "Published") {
    if (!valid()) return;
    const id = `s-${crypto.randomUUID()}`;
    update((s) => ({
      ...s,
      sessions: [
        ...s.sessions,
        {
          id,
          academyId: s.academy.id,
          sportId: "football",
          title,
          date,
          time,
          squad,
          venue,
          status,
          drillIds,
          focuses,
          evidencePlan: evidence,
          coachingPoints: points,
        },
      ],
      attendance: [
        ...s.attendance,
        ...players.map((p) => ({
          id: `${id}-${p.id}`,
          academyId: s.academy.id,
          sportId: p.sportId,
          playerId: p.id,
          sessionId: id,
          status: "Unmarked" as const,
          reason: "",
          checkIn: null,
        })),
      ],
    }));
    router.push("/coach/sessions");
  }
  return (
    <>
      <PageTitle
        eyebrow="ONE SESSION. MANY PERSONAL GOALS."
        title="Build a session"
        description="Bring the team together and give every player a purpose."
      >
        <Button variant="secondary" onClick={() => save("Draft")}>
          Save draft
        </Button>
      </PageTitle>
      <div className="stepper">
        {steps.map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
            aria-current={step === i ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="builder-grid">
        <Card>
          <h2>{steps[step]}</h2>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {step === 0 ? (
            <div className="form-grid">
              <label className="full">
                Session theme
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <label>
                Squad
                <select
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                >
                  {data.squads.map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Venue
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                >
                  {data.venues.map((v) => (
                    <option key={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : step === 1 ? (
            <>
              <div className="selected-drills">
                {drillIds.map((id, i) => {
                  const d = data.drills.find((d) => d.id === id)!;
                  return (
                    <div className="list-row" key={id}>
                      <span className="goal-number">{i + 1}</span>
                      <div>
                        <strong>{d.name}</strong>
                        <p>
                          {d.duration} min · {d.skill}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Move ${d.name} up`}
                        disabled={i === 0}
                        onClick={() => reorder(i, -1)}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Move ${d.name} down`}
                        disabled={i === drillIds.length - 1}
                        onClick={() => reorder(i, 1)}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${d.name}`}
                        onClick={() =>
                          setDrillIds(drillIds.filter((x) => x !== id))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {data.drills
                .filter((d) => !drillIds.includes(d.id))
                .map((d) => (
                  <div className="list-row" key={d.id}>
                    <div>
                      <strong>{d.name}</strong>
                      <p>
                        {d.duration} min · {d.ageGroup}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setDrillIds([...drillIds, d.id])}
                    >
                      <Plus size={15} />
                      Add
                    </Button>
                  </div>
                ))}
            </>
          ) : step === 2 ? (
            <FocusFields
              players={players}
              focuses={focuses}
              onChange={(id, focus) => setFocuses({ ...focuses, [id]: focus })}
            />
          ) : step === 3 ? (
            <div className="form-stack">
              <label>
                Evidence method
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </label>
              <label>
                Coaching points
                <textarea
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </label>
              <p className="muted">
                Video recording and voice capture are Not Connected. Plan coach
                observations instead.
              </p>
            </div>
          ) : (
            <div className="review-summary">
              <Badge tone="green">Ready for coach review</Badge>
              <h3>{title}</h3>
              <p>
                {date} · {time} · {squad}
              </p>
              <p>{venue}</p>
              <p>
                {drillIds.length} drills · {total} minutes · {players.length}{" "}
                individual objectives
              </p>
              <h3>Evidence plan</h3>
              <p>{evidence}</p>
              <h3>Coaching points</h3>
              <p>{points}</p>
              <Button onClick={() => save("Published")}>
                Publish demo session
              </Button>
            </div>
          )}
          <div className="builder-controls">
            <Button
              variant="secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
            {step < 4 && (
              <Button
                onClick={() => {
                  if (step === 0 && (!title.trim() || !date || !time)) {
                    setError("Enter a session title, date and time.");
                    return;
                  }
                  setError("");
                  setStep(step + 1);
                }}
              >
                Continue
              </Button>
            )}
          </div>
        </Card>
        <Card className="builder-preview">
          <Badge tone="blue">SESSION PREVIEW</Badge>
          <h2>{title}</h2>
          <p>
            {squad} · {venue}
          </p>
          <div className="preview-duration">
            <strong>{total}</strong>
            <span>minutes of practice</span>
          </div>
          {drillIds.map((id) => (
            <p className="list-row" key={id}>
              {data.drills.find((d) => d.id === id)?.name}
            </p>
          ))}
          <p className="muted">
            {players.length} players with personal objectives
          </p>
        </Card>
      </div>
    </>
  );
}
export function FocusFields({
  players,
  focuses,
  onChange,
}: {
  players: { id: string; name: string; goal: string }[];
  focuses: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="focus-fields">
      {players.map((p) => (
        <label key={p.id}>
          <span>
            <strong>{p.name}</strong>
            <small>Team focus: Passing & receiving</small>
          </span>
          <input
            aria-label={`Individual focus for ${p.name}`}
            value={focuses[p.id] ?? p.goal}
            onChange={(e) => onChange(p.id, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
export function SessionPersonaliser({ sessionId }: { sessionId: string }) {
  const { data, update } = useAcademy();
  const session = data.sessions.find((s) => s.id === sessionId);
  const [focuses, setFocuses] = useState(session?.focuses ?? {});
  if (!session) return <p>Session not found.</p>;
  return (
    <>
      <PageTitle
        title="One team. Individual purpose."
        description={`${session.title} · ${session.squad}`}
      >
        <Button
          onClick={() =>
            update((s) => ({
              ...s,
              sessions: s.sessions.map((x) =>
                x.id === sessionId ? { ...x, focuses } : x,
              ),
            }))
          }
        >
          Save objectives
        </Button>
      </PageTitle>
      <Card>
        <FocusFields
          players={data.players.filter((p) => p.squad === session.squad)}
          focuses={focuses}
          onChange={(id, value) => setFocuses({ ...focuses, [id]: value })}
        />
      </Card>
      <IndividualSessionObjectives sessionId={sessionId} />
    </>
  );
}
