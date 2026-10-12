"use client";
import { useRef, useState } from "react";
import { Card, Button, Badge } from "@/components/ui/primitives";
import type { useWorkspace } from "@/hooks/use-workspace";
import type { FootballSession, FootballEvidence } from "@/domain/training";
import { measurementText, comparableEvidence } from "@/services/training-rules";
type Controller = ReturnType<typeof useWorkspace>;
function useTraining(w: Controller) {
  const pending = useRef(new Map<string, string>()),
    [notice, setNotice] = useState("");
  async function submit(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) {
    const signature = JSON.stringify({ action, data, id, expectedVersion });
    const requestId = pending.current.get(signature) ?? crypto.randomUUID();
    pending.current.set(signature, requestId);
    setNotice("Saving…");
    const result = await w.training({
      action,
      data,
      id,
      expectedVersion,
      requestId,
    });
    if (result) {
      pending.current.delete(signature);
      setNotice("Saved to academy records.");
    } else
      setNotice(
        "Not confirmed. Your draft is retained; retry or reload after a conflict.",
      );
    return result;
  }
  return { submit, notice };
}
type Submit = ReturnType<typeof useTraining>["submit"];
export function FootballTraining({ workspace: w }: { workspace: Controller }) {
  const d = w.data!,
    [selected, setSelected] = useState(""),
    [onlyToday, setOnlyToday] = useState(false),
    t = useTraining(w);
  const session = d.records.session.find((s) => s.id === selected);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: d.academy.timezone,
  }).format(new Date());
  return (
    <>
      <p role="status" aria-live="polite">
        {t.notice}
      </p>
      {!session ? (
        <>
          <Card>
            <h2>Coach Today</h2>
            <label className="check-row">
              <input
                type="checkbox"
                checked={onlyToday}
                onChange={(e) => setOnlyToday(e.target.checked)}
              />
              Today only ({today}, {d.academy.timezone})
            </label>
            {d.records.session
              .filter((s) => !onlyToday || s.startLocal.slice(0, 10) === today)
              .map((s) => {
                const unmarked = d.records.attendance.filter(
                    (a) => a.sessionId === s.id && a.status === "UNMARKED",
                  ).length,
                  review = d.records.evidence.filter(
                    (e) =>
                      e.sessionId === s.id &&
                      ["DRAFT", "AWAITING_REVIEW"].includes(e.status),
                  ).length;
                return (
                  <div className="training-row" key={s.id}>
                    <h3>{s.theme}</h3>
                    <p>
                      {d.records.squad.find((q) => q.id === s.squadId)?.name} ·{" "}
                      {s.startLocal.replace("T", " ")} – {s.endLocal.slice(11)}{" "}
                      · {s.timezone}
                    </p>
                    <p>
                      {s.location} · {s.status} · Attendance unmarked:{" "}
                      {unmarked} · Awaiting review: {review}
                    </p>
                    <Button onClick={() => setSelected(s.id)}>
                      Open session desk
                    </Button>
                  </div>
                );
              })}
            {!d.records.session.length && (
              <p>
                No assigned sessions yet. Schedule an individual dated session
                below.
              </p>
            )}
          </Card>
          {["OWNER", "ADMIN"].includes(d.membership.role) && (
            <SquadSetup workspace={w} submit={t.submit} />
          )}
          <SessionEditor workspace={w} submit={t.submit} />
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => setSelected("")}>
            Back to sessions
          </Button>
          <SessionDesk workspace={w} session={session} submit={t.submit} />
        </>
      )}
    </>
  );
}
function SquadSetup({
  workspace: w,
  submit,
}: {
  workspace: Controller;
  submit: Submit;
}) {
  const d = w.data!,
    [branch, setBranch] = useState(d.records.branch[0]?.id ?? ""),
    [name, setName] = useState(""),
    [players, setPlayers] = useState<string[]>([]),
    [venue, setVenue] = useState(""),
    [location, setLocation] = useState("");
  return (
    <Card>
      <h2>Football squad and venue</h2>
      <p>
        Existing player squad labels are not automatically imported into
        rosters.
      </p>
      <label>
        Squad branch
        <select value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">Create a branch in Settings first</option>
          {d.records.branch.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await submit("squad", {
              name,
              branchId: branch,
              playerIds: players,
            })
          )
            setName("");
        }}
      >
        <label>
          Squad name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Squad roster</legend>
          {d.records.player.map((p) => (
            <label className="check-row" key={p.id}>
              <input
                type="checkbox"
                checked={players.includes(p.id)}
                onChange={(e) =>
                  setPlayers(
                    e.target.checked
                      ? [...players, p.id]
                      : players.filter((id) => id !== p.id),
                  )
                }
              />
              {p.name}
            </label>
          ))}
        </fieldset>
        <Button disabled={w.busy || !branch || !players.length}>
          Save squad
        </Button>
      </form>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await submit("venue", { name: venue, branchId: branch, location })
          )
            setVenue("");
        }}
      >
        <label>
          Venue name
          <input
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </label>
        <label>
          Venue location
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <Button disabled={w.busy || !branch}>Save venue</Button>
      </form>
    </Card>
  );
}
function SessionEditor({
  workspace: w,
  submit,
}: {
  workspace: Controller;
  submit: Submit;
}) {
  const d = w.data!,
    [squadId, setSquad] = useState(d.records.squad[0]?.id ?? ""),
    [venueId, setVenue] = useState(""),
    [location, setLocation] = useState(""),
    [theme, setTheme] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [coaches, setCoaches] = useState<string[]>([d.membership.userId]),
    [agenda, setAgenda] = useState<{ drillId: string; duration: number }[]>([]);
  const squad = d.records.squad.find((s) => s.id === squadId),
    branch = d.records.branch.find((b) => b.id === squad?.branchId);
  return (
    <Card>
      <h2>Schedule football session</h2>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await submit("session", {
              squadId,
              branchId: branch?.id,
              venueId: venueId || undefined,
              location,
              coachIds: coaches,
              timezone: branch?.timezone,
              startLocal: start,
              endLocal: end,
              theme,
              agenda,
            })
          )
            setTheme("");
        }}
      >
        <label>
          Session squad
          <select
            required
            value={squadId}
            onChange={(e) => {
              setSquad(e.target.value);
              setVenue("");
            }}
          >
            <option value="">Select authorised squad</option>
            {d.records.squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Session venue
          <select
            value={venueId}
            onChange={(e) => {
              setVenue(e.target.value);
              setLocation(
                d.records.venue.find((v) => v.id === e.target.value)
                  ?.location ?? "",
              );
            }}
          >
            <option value="">Recorded location</option>
            {d.records.venue
              .filter((v) => v.branchId === branch?.id)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Training location
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label>
          Session theme
          <input
            required
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </label>
        <p>
          Time zone: {branch?.timezone ?? "Select squad"}. Invalid or ambiguous
          daylight-saving times are rejected.
        </p>
        <label>
          Session start
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Session end
          <input
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Assigned session coaches</legend>
          {d.members
            .filter(
              (m) => m.active && ["COACH", "OWNER", "ADMIN"].includes(m.role),
            )
            .map((m) => (
              <label key={m.userId} className="check-row">
                <input
                  type="checkbox"
                  checked={coaches.includes(m.userId)}
                  onChange={(e) =>
                    setCoaches(
                      e.target.checked
                        ? [...coaches, m.userId]
                        : coaches.filter((id) => id !== m.userId),
                    )
                  }
                />
                {m.name}
              </label>
            ))}
        </fieldset>
        <fieldset>
          <legend>Ordered session drills</legend>
          {agenda.map((a, i) => (
            <div key={`${a.drillId}-${i}`} className="training-row">
              <p>
                {i + 1}. {d.records.drill.find((v) => v.id === a.drillId)?.name}
              </p>
              <label>
                Duration for drill {i + 1}
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={a.duration}
                  onChange={(e) =>
                    setAgenda(
                      agenda.map((v, j) =>
                        j === i
                          ? { ...v, duration: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAgenda(agenda.filter((_, j) => j !== i))}
              >
                Remove drill {i + 1}
              </Button>
            </div>
          ))}
          <label>
            Add agenda drill
            <select
              value=""
              onChange={(e) =>
                e.target.value &&
                setAgenda([
                  ...agenda,
                  { drillId: e.target.value, duration: 15 },
                ])
              }
            >
              <option value="">Select academy drill</option>
              {d.records.drill.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <Button disabled={w.busy || !branch || !agenda.length}>
          Save session draft
        </Button>
      </form>
    </Card>
  );
}
function SessionDesk({
  workspace: w,
  session: s,
  submit,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
}) {
  const [section, setSection] = useState("Objectives"),
    [current, setCurrent] = useState(0),
    [reason, setReason] = useState(""),
    d = w.data!;
  return (
    <>
      <Card>
        <h2>Session Desk · {s.theme}</h2>
        <Badge>{s.status}</Badge>
        <p>
          {s.startLocal.replace("T", " ")} · {s.timezone} · {s.location} ·
          Record version {s.version}
        </p>
        <nav
          className="workspace-tabs training-desk-tabs"
          aria-label="Session desk sections"
        >
          {["Objectives", "Attendance", "Agenda", "Evidence", "Review"].map(
            (v) => (
              <Button
                key={v}
                variant={v === section ? "primary" : "secondary"}
                onClick={() => setSection(v)}
              >
                {v}
              </Button>
            ),
          )}
        </nav>
        <div className="training-actions">
          {s.status === "DRAFT" && (
            <Button
              disabled={w.busy}
              onClick={() =>
                submit("status", { status: "SCHEDULED" }, s.id, s.version)
              }
            >
              Schedule session
            </Button>
          )}
          {s.status === "SCHEDULED" && (
            <Button
              disabled={w.busy}
              onClick={() =>
                submit("status", { status: "IN_PROGRESS" }, s.id, s.version)
              }
            >
              Start training
            </Button>
          )}
          {s.status === "IN_PROGRESS" && (
            <Button
              disabled={w.busy}
              onClick={() =>
                submit("status", { status: "COMPLETED" }, s.id, s.version)
              }
            >
              Complete reviewed session
            </Button>
          )}
        </div>
        {!["COMPLETED", "CANCELLED"].includes(s.status) && (
          <details>
            <summary>Cancel session</summary>
            <label>
              Cancellation reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button
              disabled={w.busy || !reason.trim()}
              variant="secondary"
              onClick={() =>
                submit(
                  "status",
                  { status: "CANCELLED", reason },
                  s.id,
                  s.version,
                )
              }
            >
              Confirm cancellation
            </Button>
          </details>
        )}
      </Card>
      {section === "Objectives" &&
        s.roster.map((p) => (
          <ObjectiveEditor
            key={p.playerId}
            workspace={w}
            session={s}
            playerId={p.playerId}
            submit={submit}
          />
        ))}
      {section === "Attendance" && (
        <AttendanceEditor
          key={d.records.attendance
            .filter((a) => a.sessionId === s.id)
            .map((a) => a.version)
            .join("-")}
          workspace={w}
          session={s}
          submit={submit}
        />
      )}
      {section === "Agenda" && (
        <Card>
          <h2>Ordered agenda</h2>
          {s.agenda.map((a, i) => (
            <div className="training-row" key={i}>
              <h3>
                {i + 1}. {a.drill.name}
              </h3>
              <p>
                {a.duration} minutes · Drill version {a.drillVersion} ·{" "}
                {a.drill.purpose}
              </p>
              <p>{a.drill.cue}</p>
              <Button
                variant={current === i ? "primary" : "secondary"}
                onClick={() => setCurrent(i)}
              >
                {current === i ? "Current drill" : "Set current drill"}
              </Button>
            </div>
          ))}
        </Card>
      )}
      {section === "Evidence" && (
        <EvidenceEditor workspace={w} session={s} submit={submit} />
      )}
      {section === "Review" && (
        <ReviewDesk workspace={w} session={s} submit={submit} />
      )}
    </>
  );
}
function ObjectiveEditor({
  workspace: w,
  session: s,
  playerId,
  submit,
}: {
  workspace: Controller;
  session: FootballSession;
  playerId: string;
  submit: Submit;
}) {
  const plan = w.data!.records.plan.find(
      (p) =>
        p.playerId === playerId &&
        ["ACTIVE", "CONTINUE", "ADAPT", "NEEDS_REVIEW"].includes(p.status),
    ),
    old = s.objectives.find((o) => o.playerId === playerId);
  const [goal, setGoal] = useState(old?.goal ?? plan?.focus ?? ""),
    [cue, setCue] = useState(old?.cue ?? ""),
    [observe, setObserve] = useState(old?.observe ?? plan?.observe ?? ""),
    [drill, setDrill] = useState(
      old?.drillId ??
        s.agenda.find((a) => plan?.drillIds.includes(a.drill.id))?.drill.id ??
        "",
    );
  return (
    <Card>
      <h3>{s.roster.find((p) => p.playerId === playerId)?.name}</h3>
      <p>
        {plan
          ? `Current plan: ${plan.focus}`
          : "No current plan. Assign an explicit session objective; no weakness is inferred."}
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(
            "objective",
            { playerId, planId: plan?.id, goal, drillId: drill, cue, observe },
            s.id,
            s.version,
          );
        }}
      >
        <label>
          Individual goal
          <textarea
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={!["DRAFT", "SCHEDULED"].includes(s.status)}
          />
        </label>
        <label>
          Objective drill
          <select
            required
            value={drill}
            onChange={(e) => setDrill(e.target.value)}
          >
            <option value="">Select assigned session drill</option>
            {s.agenda
              .filter((a) => !plan || plan.drillIds.includes(a.drill.id))
              .map((a, i) => (
                <option key={i} value={a.drill.id}>
                  {a.drill.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Personal coaching cue
          <input
            required
            value={cue}
            onChange={(e) => setCue(e.target.value)}
          />
        </label>
        <label>
          What to observe
          <textarea
            required
            value={observe}
            onChange={(e) => setObserve(e.target.value)}
          />
        </label>
        <Button disabled={w.busy || !["DRAFT", "SCHEDULED"].includes(s.status)}>
          Save personal objective
        </Button>
      </form>
    </Card>
  );
}
function AttendanceEditor({
  workspace: w,
  session: s,
  submit,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
}) {
  const rows = w.data!.records.attendance.filter((a) => a.sessionId === s.id),
    [draft, setDraft] = useState(rows),
    [reason, setReason] = useState("");
  return (
    <Card>
      <h2>Attendance ledger</h2>
      <p>
        Unmarked is not absent. Excused and cancelled sessions do not imply
        missed training. No seeded attendance percentage is used.
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(
            "attendance",
            {
              entries: draft.map((a) => ({
                playerId: a.playerId,
                status: a.status,
                expectedVersion: a.version,
              })),
              correctionReason: reason,
            },
            s.id,
            s.version,
          );
        }}
      >
        {draft.map((a) => (
          <label key={a.id}>
            {s.roster.find((p) => p.playerId === a.playerId)?.name} attendance
            <select
              value={a.status}
              onChange={(e) =>
                setDraft(
                  draft.map((v) =>
                    v.id === a.id
                      ? { ...v, status: e.target.value as typeof a.status }
                      : v,
                  ),
                )
              }
            >
              {["UNMARKED", "PRESENT", "ABSENT", "EXCUSED"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <small>
              Last recorded: {rows.find((v) => v.id === a.id)?.updatedAt} ·
              version {a.version}
            </small>
            <small>
              Correction: {a.correctionReason || "No correction recorded"}
            </small>
            <a
              href={`/api/workspaces/${w.data!.academy.id}/training?kind=attendance&id=${encodeURIComponent(a.id)}`}
              target="_blank"
              rel="noreferrer"
            >
              View attendance audit history
            </a>
          </label>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={w.busy}
          onClick={() =>
            setDraft(draft.map((a) => ({ ...a, status: "PRESENT" })))
          }
        >
          Mark all present
        </Button>
        <label>
          Attendance correction reason
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <Button disabled={w.busy || s.status === "CANCELLED"}>
          Save attendance
        </Button>
      </form>
    </Card>
  );
}
function EvidenceEditor({
  workspace: w,
  session: s,
  submit,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
}) {
  const [playerId, setPlayer] = useState(s.roster[0]?.playerId ?? ""),
    [drillId, setDrill] = useState(s.agenda[0]?.drill.id ?? ""),
    [observation, setObservation] = useState(""),
    [conditions, setConditions] = useState(""),
    [method, setMethod] = useState("Coach recorded during session"),
    [measurement, setMeasurement] = useState("OBSERVATION"),
    [attempts, setAttempts] = useState(""),
    [successes, setSuccesses] = useState(""),
    [elapsed, setElapsed] = useState(""),
    [staffNote, setNote] = useState(""),
    [visibility, setVisibility] = useState("PARENT_ELIGIBLE");
  return (
    <Card>
      <h2>Record training evidence</h2>
      <p>
        No video attached. Coach-recorded evidence only; automated analysis
        unavailable.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await submit("evidence", {
              sessionId: s.id,
              playerId,
              planId: s.objectives.find((o) => o.playerId === playerId)?.planId,
              drillId,
              observation,
              conditions,
              method,
              measurement,
              type:
                measurement === "OBSERVATION"
                  ? "COACH_OBSERVATION"
                  : "RAW_RECORD",
              visibility,
              staffNote,
              attempts:
                measurement === "ATTEMPTS" ? Number(attempts) : undefined,
              successes:
                measurement === "ATTEMPTS" ? Number(successes) : undefined,
              elapsedSeconds:
                measurement === "ELAPSED_TIME" ? Number(elapsed) : undefined,
            })
          )
            setObservation("");
        }}
      >
        <label>
          Evidence player
          <select value={playerId} onChange={(e) => setPlayer(e.target.value)}>
            {s.roster.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evidence drill
          <select value={drillId} onChange={(e) => setDrill(e.target.value)}>
            {s.agenda.map((a, i) => (
              <option key={i} value={a.drill.id}>
                {a.drill.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Session goal:{" "}
          {s.objectives.find((o) => o.playerId === playerId)?.goal ??
            "No objective recorded"}
        </p>
        <label>
          Coach observation
          <textarea
            required
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </label>
        <label>
          Course, target and conditions
          <textarea
            required
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </label>
        <label>
          How recorded
          <input
            required
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </label>
        <label htmlFor="training-measurement">Measurement</label>
        <select
          id="training-measurement"
          value={measurement}
          onChange={(e) => setMeasurement(e.target.value)}
        >
          <option value="OBSERVATION">Observation only</option>
          <option value="ATTEMPTS">Successful / recorded attempts</option>
          <option value="ELAPSED_TIME">Elapsed time in seconds</option>
        </select>
        {measurement === "ATTEMPTS" && (
          <>
            <label>
              Recorded attempts
              <input
                type="number"
                min="0"
                required
                value={attempts}
                onChange={(e) => setAttempts(e.target.value)}
              />
            </label>
            <label>
              Successful attempts
              <input
                type="number"
                min="0"
                required
                value={successes}
                onChange={(e) => setSuccesses(e.target.value)}
              />
            </label>
          </>
        )}
        {measurement === "ELAPSED_TIME" && (
          <label>
            Elapsed seconds
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={elapsed}
              onChange={(e) => setElapsed(e.target.value)}
            />
          </label>
        )}
        <label>
          Observation visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option>PARENT_ELIGIBLE</option>
            <option>STAFF_ONLY</option>
          </select>
        </label>
        <label>
          Separate staff-only evidence note
          <textarea
            value={staffNote}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <Button disabled={w.busy || s.status !== "IN_PROGRESS"}>
          Save evidence for review
        </Button>
      </form>
    </Card>
  );
}
function ReviewDesk({
  workspace: w,
  session: s,
  submit,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
}) {
  const records = w.data!.records.evidence.filter((e) => e.sessionId === s.id);
  return (
    <>
      <Card>
        <h2>Session review</h2>
        <p>
          Review the player, recorded attendance, drill version, conditions and
          observation. Changed conditions never automatically imply improvement.
        </p>
      </Card>
      {records.map((e) => (
        <EvidenceReview
          key={e.id}
          workspace={w}
          evidence={e}
          session={s}
          submit={submit}
        />
      ))}
      {!records.length && (
        <Card>
          <p>No evidence recorded. Missing evidence is not poor performance.</p>
        </Card>
      )}
    </>
  );
}
function EvidenceReview({
  workspace: w,
  evidence: e,
  session: s,
  submit,
}: {
  workspace: Controller;
  evidence: FootballEvidence;
  session: FootballSession;
  submit: Submit;
}) {
  const [verified, setVerified] = useState(false),
    [next, setNext] = useState(""),
    [period, setPeriod] = useState(""),
    [closing, setClosing] = useState(""),
    p = w.data!.records.plan.find((p) => p.id === e.planId);
  const previous = w.data!.records.evidence.filter(
    (v) => v.id !== e.id && v.playerId === e.playerId,
  );
  return (
    <Card>
      <h3>
        {s.roster.find((p) => p.playerId === e.playerId)?.name} · {e.drillName}
      </h3>
      <Badge>{e.status}</Badge>
      <p>{e.observation}</p>
      <p>
        {measurementText(e)} · {e.conditions} · {e.method} · {e.recordedAt}
      </p>
      <p>
        Source: {e.type} · Drill version {e.drillVersion} · {e.visibility} · No
        video attached
      </p>
      <p>
        Recorded by{" "}
        {w.data!.members.find((m) => m.userId === e.authorId)?.name ??
          e.authorId}
        {e.reviewedBy
          ? ` · Reviewed by ${w.data!.members.find((m) => m.userId === e.reviewedBy)?.name ?? e.reviewedBy}`
          : ""}
      </p>
      <p>Staff-only note: {e.staffNote || "None"}</p>
      <p>
        {previous.some((v) => comparableEvidence(e, v))
          ? "Comparable reviewed records exist for this player; coach interpretation required."
          : "No sufficiently comparable reviewed result. No improvement claim generated."}
      </p>
      {["DRAFT", "AWAITING_REVIEW"].includes(e.status) && (
        <>
          <label className="check-row">
            <input
              type="checkbox"
              checked={verified}
              onChange={(ev) => setVerified(ev.target.checked)}
            />
            I verified this player’s session evidence and conditions
          </label>
          <div className="training-actions">
            {["REVIEWED", "UNCLEAR", "REJECTED"].map((status) => (
              <Button
                key={status}
                disabled={w.busy || !verified}
                onClick={() =>
                  submit("review", { status, verified }, e.id, e.version)
                }
              >
                {status === "REVIEWED"
                  ? "Approve reviewed evidence"
                  : status === "UNCLEAR"
                    ? "Mark unclear"
                    : "Reject evidence"}
              </Button>
            ))}
          </div>
        </>
      )}
      {e.status === "REVIEWED" && p && (
        <>
          <form
            className="form-stack"
            onSubmit={(ev) => {
              ev.preventDefault();
              void submit(
                "nextStep",
                { evidenceId: e.id, nextStep: next, status: "CONTINUE" },
                p.id,
                p.recordVersion,
              );
            }}
          >
            <label>
              Reviewed next development step
              <textarea
                required
                value={next}
                onChange={(ev) => setNext(ev.target.value)}
              />
            </label>
            <Button disabled={w.busy}>Update plan next step</Button>
          </form>
          <form
            className="form-stack"
            onSubmit={(ev) => {
              ev.preventDefault();
              void submit("report", {
                playerId: e.playerId,
                planId: p.id,
                evidenceIds: [e.id],
                period,
                closingNote: closing,
              });
            }}
          >
            <label>
              Session report period
              <input
                required
                value={period}
                onChange={(ev) => setPeriod(ev.target.value)}
              />
            </label>
            <label>
              Session report closing note
              <textarea
                value={closing}
                onChange={(ev) => setClosing(ev.target.value)}
              />
            </label>
            <Button
              disabled={
                w.busy ||
                s.status !== "COMPLETED" ||
                e.visibility !== "PARENT_ELIGIBLE"
              }
            >
              Prepare report from reviewed session
            </Button>
          </form>
          <p>
            Approve the report in Reports, then prepare and approve the private
            parent update in Messages.
          </p>
        </>
      )}
    </Card>
  );
}
