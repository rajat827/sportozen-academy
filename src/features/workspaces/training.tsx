"use client";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useId, useRef, useState } from "react";
import { Card, Button, Badge } from "@/components/ui/primitives";
import type { useWorkspace } from "@/hooks/use-workspace";
import type { FootballSession, FootballEvidence } from "@/domain/training";
import {
  measurementText,
  comparableEvidence,
  sessionDraftInput,
  resolveSessionTime,
} from "@/services/training-rules";
import "./session-editor.css";
import { SessionLocationSearch } from "./session-location-search";
import { sessionThemes } from "@/services/session-themes";
type Controller = ReturnType<typeof useWorkspace>;
export function useTraining(w: Controller) {
  const pending = useRef(new Map<string, string>()),
    notice = w.trainingNotice,
    setNotice = w.setTrainingNotice;
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
export type TrainingSubmit = ReturnType<typeof useTraining>["submit"];
type Submit = TrainingSubmit;
export function FootballTraining({
  workspace: w,
  selected,
  onSelect: setSelected,
  onViewPlan,
  section,
  onSection,
  selectedPlayer,
  onSelectPlayer,
  currentDrill,
  onDrill,
}: {
  workspace: Controller;
  selected: string;
  onSelect: (id: string) => void;
  onViewPlan: (playerId: string) => void;
  section: string;
  onSection: (section: string) => void;
  selectedPlayer: string;
  onSelectPlayer: (id: string) => void;
  currentDrill: number;
  onDrill: (index: number) => void;
}) {
  const d = w.data!,
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
      {selected && !session && (
        <p role="alert">
          The selected session is unavailable. Choose an assigned session.
        </p>
      )}
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
          <SessionEditor
            workspace={w}
            submit={t.submit}
            onSaved={(saved) => setSelected(saved.id)}
          />
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => setSelected("")}>
            Back to sessions
          </Button>
          <SessionDesk
            workspace={w}
            session={session}
            submit={t.submit}
            onViewPlan={onViewPlan}
            section={section}
            onSection={onSection}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={onSelectPlayer}
            currentDrill={currentDrill}
            onDrill={onDrill}
          />
        </>
      )}
    </>
  );
}
export function SquadSetup({
  workspace: w,
  submit,
  onBatchSaved,
}: {
  workspace: Controller;
  submit: Submit;
  onBatchSaved?: (id: string) => void;
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
          const saved = await submit("squad", {
            name,
            branchId: branch,
            playerIds: players,
          });
          if (saved) {
            setName("");
            onBatchSaved?.((saved as { id: string }).id);
          }
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
        <Button disabled={w.busy || !branch}>Save squad</Button>
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
type SessionEditorProps = {
  workspace: Controller;
  submit: Submit;
  initial?: FootballSession;
  onSaved?: (session: FootballSession) => void;
};

export function SessionEditor(props: SessionEditorProps) {
  return props.initial ? (
    <SessionPlanEditor {...props} />
  ) : (
    <QuickSessionEditor {...props} />
  );
}

function QuickSessionEditor({
  workspace: w,
  submit,
  onSaved,
}: SessionEditorProps) {
  const d = w.data!;
  const admin = ["OWNER", "ADMIN"].includes(d.membership.role);
  function assignedCoaches(batchId: string) {
    const batch = d.records.squad.find((item) => item.id === batchId);
    if (!batch) return [];
    const roster = batch.playerIds.map((id) =>
      d.records.player.find((p) => p.id === id),
    );
    if (
      d.membership.role === "COACH" &&
      roster.every((p) => p?.coachId === d.membership.userId)
    )
      return [d.membership.userId];
    if (!roster.length || roster.some((p) => !p)) return [];
    const ids = [...new Set(roster.map((p) => p!.coachId))];
    return ids.length === 1 &&
      d.members.some(
        (member) =>
          member.active && member.role === "COACH" && member.userId === ids[0],
      )
      ? ids
      : [];
  }
  const [squadId, setSquad] = useState(d.records.squad[0]?.id ?? ""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [duration, setDuration] = useState("90"),
    [venueId, setVenue] = useState(""),
    [location, setLocation] = useState(""),
    [theme, setTheme] = useState(""),
    [title, setTitle] = useState(""),
    [coaches, setCoaches] = useState<string[]>(() =>
      assignedCoaches(d.records.squad[0]?.id ?? ""),
    ),
    [placeConfirmation, setPlaceConfirmation] = useState<string | undefined>(),
    [setup, setSetup] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [saveState, setSaveState] = useState<
      "idle" | "saving" | "failed" | "saved"
    >("idle");
  const form = useRef<HTMLFormElement>(null),
    pending = useRef(false),
    errorId = useId(),
    themeListId = useId();
  const squad = d.records.squad.find((item) => item.id === squadId),
    branch = d.records.branch.find((item) => item.id === squad?.branchId),
    venues = d.records.venue.filter((item) => item.branchId === branch?.id);
  const generatedTitle =
    `${squad?.name ?? "Football"}${theme.trim() ? ` · ${theme.trim()}` : " Training"}`.slice(
      0,
      200,
    );
  const content = JSON.stringify({
    squadId,
    date,
    time,
    duration,
    venueId,
    location,
    theme,
    title,
    coaches,
    placeConfirmation,
  });
  const [savedContent, setSavedContent] = useState(content);
  useUnsavedChanges(content !== savedContent);
  const fieldState = (field: string) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${errorId}-${field}` : undefined,
  });
  const fieldError = (field: string) =>
    errors[field] ? (
      <small className="session-field-error" id={`${errorId}-${field}`}>
        {errors[field]}
      </small>
    ) : null;
  function chooseBatch(id: string) {
    setSquad(id);
    setVenue("");
    setLocation("");
    setPlaceConfirmation(undefined);
    setCoaches(assignedCoaches(id));
  }
  return (
    <Card className="quick-session-card">
      <h2>Quick Create Session</h2>
      <p>
        Save the date now. Add activities and complete the shared batch plan
        afterwards.
      </p>
      {!d.records.squad.length && (
        <div className="quick-session-empty" role="status">
          <strong>No training batch created yet</strong>
          <p>
            {admin
              ? "Create a batch, then return here to save your session."
              : "Ask an academy owner or administrator to create a training batch."}
          </p>
          {admin && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSetup(!setup)}
            >
              {setup ? "Return to session form" : "Create training batch"}
            </Button>
          )}
        </div>
      )}
      {setup ? (
        <SquadSetup
          workspace={w}
          submit={submit}
          onBatchSaved={(id) => {
            chooseBatch(id);
            setSetup(false);
          }}
        />
      ) : (
        <form
          ref={form}
          className="form-stack quick-session-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              pending.current ||
              w.busy ||
              (saveState === "saved" && content === savedContent)
            )
              return;
            const nextErrors: Record<string, string> = {};
            if (!squad || !branch)
              nextErrors.squadId =
                "Choose an authorised training batch with a recorded branch.";
            if (!date) nextErrors.date = "Choose a session date.";
            if (!time) nextErrors.time = "Enter a start time.";
            const minutes = Number(duration);
            if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480)
              nextErrors.duration = "Enter a duration from 1 to 480 minutes.";
            const startLocal = date && time ? `${date}T${time}` : "";
            let endLocal = "";
            if (startLocal && branch && !nextErrors.duration) {
              try {
                const end = new Date(
                  Date.parse(resolveSessionTime(startLocal, branch.timezone)) +
                    minutes * 60_000,
                );
                const parts = Object.fromEntries(
                  new Intl.DateTimeFormat("en-GB", {
                    timeZone: branch.timezone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })
                    .formatToParts(end)
                    .map((part) => [part.type, part.value]),
                );
                endLocal = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
              } catch (error) {
                nextErrors.time =
                  error instanceof Error
                    ? error.message
                    : "Choose a valid session date and start time.";
              }
            }
            const candidate = {
              squadId,
              branchId: branch?.id,
              timezone: branch?.timezone,
              startLocal,
              endLocal,
              venueId:
                venueId && venueId !== "__manual__" ? venueId : undefined,
              location,
              theme,
              title: title.trim() || generatedTitle,
              coachIds: coaches,
              agenda: [],
              placeConfirmation,
            };
            const parsed = Object.keys(nextErrors).length
              ? undefined
              : sessionDraftInput.safeParse(candidate);
            if (parsed && !parsed.success)
              for (const issue of parsed.error.issues) {
                const raw = String(issue.path[0]);
                const field = ["branchId", "timezone"].includes(raw)
                  ? "squadId"
                  : raw === "startLocal"
                    ? "time"
                    : raw === "endLocal"
                      ? "duration"
                      : raw === "location" || raw === "placeConfirmation"
                        ? "venue"
                        : raw;
                nextErrors[field] ??= issue.message;
              }
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length || !parsed?.success) {
              requestAnimationFrame(() =>
                form.current
                  ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                  ?.focus(),
              );
              return;
            }
            pending.current = true;
            setSaveState("saving");
            let saved: Awaited<ReturnType<Submit>>;
            try {
              saved = await submit("session", parsed.data);
            } catch {
              setSaveState("failed");
              return;
            } finally {
              pending.current = false;
            }
            if (!saved) {
              setSaveState("failed");
              return;
            }
            setSavedContent(content);
            setSaveState("saved");
            w.setTrainingNotice("Session draft saved");
            onSaved?.(saved as FootballSession);
          }}
        >
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="session-field-error">
              Check the labelled fields. Your session draft has not been saved.
            </p>
          )}
          <div className="quick-session-grid">
            <label>
              Training batch
              <select
                required
                aria-label="Training batch"
                value={squadId}
                {...fieldState("squadId")}
                onChange={(event) => chooseBatch(event.target.value)}
              >
                <option value="">Select training batch</option>
                {d.records.squad.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {fieldError("squadId")}
            </label>
            <label>
              Date
              <input
                required
                type="date"
                aria-label="Session date"
                value={date}
                {...fieldState("date")}
                onChange={(event) => setDate(event.target.value)}
              />
              {fieldError("date")}
            </label>
            <label>
              Start time
              <input
                required
                type="time"
                aria-label="Start time"
                value={time}
                {...fieldState("time")}
                onChange={(event) => setTime(event.target.value)}
              />
              {fieldError("time")}
            </label>
            <label>
              Duration (minutes)
              <input
                required
                type="number"
                min={1}
                max={480}
                step={1}
                aria-label="Duration (minutes)"
                value={duration}
                {...fieldState("duration")}
                onChange={(event) => setDuration(event.target.value)}
              />
              {fieldError("duration")}
            </label>
            <div className="quick-session-venue">
              <label>
                Venue (optional)
                <select
                  aria-label="Session venue"
                  value={venueId}
                  {...fieldState("venue")}
                  onChange={(event) => {
                    setVenue(event.target.value);
                    setPlaceConfirmation(undefined);
                    setLocation(
                      d.records.venue.find(
                        (item) => item.id === event.target.value,
                      )?.location ?? "",
                    );
                  }}
                >
                  <option value="">Not decided yet</option>
                  {venues.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.parentVenueId
                        ? `${venues.find((parent) => parent.id === item.parentVenueId)?.name ?? "Venue"} · `
                        : ""}
                      {item.name}
                    </option>
                  ))}
                  <option value="__manual__">Enter a location</option>
                </select>
                {fieldError("venue")}
              </label>
              {venueId === "__manual__" && (
                <label>
                  Training location
                  <input
                    aria-label="Training location"
                    maxLength={2000}
                    value={location}
                    {...fieldState("venue")}
                    onChange={(event) => {
                      setLocation(event.target.value);
                      setPlaceConfirmation(undefined);
                    }}
                  />
                </label>
              )}
              {!venues.length && (
                <small>
                  No saved venues in this branch. You can enter a location.
                </small>
              )}
              {venueId === "__manual__" && (
                <SessionLocationSearch
                  key={squadId}
                  academyId={d.academy.id}
                  squadId={squadId}
                  operationalLocation={location}
                  onSelect={(place) => setPlaceConfirmation(place.confirmation)}
                />
              )}
              {placeConfirmation && (
                <small role="status">
                  Map selection confirmed. Your recorded location will be saved.
                </small>
              )}
            </div>
            <label>
              Training focus (optional)
              <input
                aria-label="Training focus"
                list={themeListId}
                maxLength={2000}
                value={theme}
                {...fieldState("theme")}
                placeholder="Choose a suggestion or enter a focus"
                onChange={(event) => setTheme(event.target.value)}
              />
              <datalist id={themeListId}>
                {sessionThemes(d.academy).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {fieldError("theme")}
            </label>
          </div>
          <p className="quick-session-context">
            {branch
              ? `${branch.name} · ${branch.timezone}`
              : "The batch supplies its branch and time zone."}{" "}
            · End time is calculated from the duration.
          </p>
          <details className="quick-session-optional">
            <summary>Optional details</summary>
            <label>
              Custom session title
              <input
                aria-label="Custom session title"
                maxLength={200}
                placeholder={generatedTitle}
                value={title}
                {...fieldState("title")}
                onChange={(event) => setTitle(event.target.value)}
              />
              {fieldError("title")}
            </label>
            {admin && (
              <label>
                Assigned coach (optional)
                <select
                  aria-label="Assigned session coach"
                  value={coaches[0] ?? ""}
                  {...fieldState("coachIds")}
                  onChange={(event) =>
                    setCoaches(event.target.value ? [event.target.value] : [])
                  }
                >
                  <option value="">Not assigned yet</option>
                  {d.members
                    .filter(
                      (member) =>
                        member.active &&
                        ["OWNER", "ADMIN", "COACH"].includes(member.role) &&
                        (member.role !== "COACH" ||
                          !!squad?.playerIds.every(
                            (id) =>
                              d.records.player.find((p) => p.id === id)
                                ?.coachId === member.userId,
                          )),
                    )
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                </select>
                {fieldError("coachIds")}
              </label>
            )}
          </details>
          <p className="quick-session-coach">
            Coach:{" "}
            {coaches
              .map(
                (id) =>
                  d.members.find((member) => member.userId === id)?.name ??
                  "Assigned coach",
              )
              .join(", ") || "Not assigned yet"}
            .{" "}
            {!coaches.length &&
              "An authorised coach and a venue or recorded location are required before scheduling or starting."}
          </p>
          <footer className="quick-session-footer">
            <p role="status" aria-live="polite">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "failed"
                  ? "Save failed — retry"
                  : saveState === "saved"
                    ? "Session draft saved"
                    : "Activities and personalisation can be added later."}
            </p>
            <Button
              disabled={
                w.busy ||
                saveState === "saving" ||
                (saveState === "saved" && content === savedContent)
              }
            >
              {saveState === "saving" ? "Saving..." : "Save Session Draft"}
            </Button>
          </footer>
        </form>
      )}
    </Card>
  );
}

function SessionPlanEditor({
  workspace: w,
  submit,
  initial,
  onSaved,
}: {
  workspace: Controller;
  submit: Submit;
  initial?: FootballSession;
  onSaved?: (session: FootballSession) => void;
}) {
  const d = w.data!,
    [title, setTitle] = useState(initial?.title ?? ""),
    [squadId, setSquad] = useState(
      initial?.squadId ?? d.records.squad[0]?.id ?? "",
    ),
    [venueId, setVenue] = useState(initial?.venueId ?? ""),
    [location, setLocation] = useState(initial?.location ?? ""),
    [placeConfirmation, setPlaceConfirmation] = useState<string | undefined>(),
    [theme, setTheme] = useState(initial?.theme ?? ""),
    [customTheme, setCustomTheme] = useState(
      Boolean(
        initial?.theme && !sessionThemes(d.academy).includes(initial.theme),
      ),
    ),
    [start, setStart] = useState(initial?.startLocal ?? ""),
    [end, setEnd] = useState(initial?.endLocal ?? ""),
    [coaches, setCoaches] = useState<string[]>(initial?.coachIds ?? []),
    [agenda, setAgenda] = useState<{ drillId: string; duration: number }[]>(
      initial?.agenda.map((item) => ({
        drillId: item.drill.id,
        duration: item.duration,
      })) ?? [],
    ),
    [sharedGoal, setSharedGoal] = useState(
      initial?.sharedObjective?.goal ?? "",
    ),
    [sharedCue, setSharedCue] = useState(initial?.sharedObjective?.cue ?? ""),
    [sharedObserve, setSharedObserve] = useState(
      initial?.sharedObjective?.observe ?? "",
    ),
    [preparation, setPreparation] = useState(
      initial?.preparation?.join("\n") ?? "",
    );
  const errorId = useId();
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function fieldError(field: string) {
    return errors[field] ? (
      <small id={`${errorId}-${field}`} className="session-field-error">
        {errors[field]}
      </small>
    ) : null;
  }
  function fieldState(field: string) {
    return {
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? `${errorId}-${field}` : undefined,
    };
  }
  const content = JSON.stringify({
    title,
    squadId,
    venueId,
    location,
    placeConfirmation,
    theme,
    start,
    end,
    coaches,
    agenda,
    sharedGoal,
    sharedCue,
    sharedObserve,
    preparation,
  });
  const [savedContent, setSavedContent] = useState(content);
  useUnsavedChanges(content !== savedContent);
  const squad = d.records.squad.find((s) => s.id === squadId),
    branch = d.records.branch.find((b) => b.id === squad?.branchId);
  return (
    <Card>
      <h2>Edit Training Plan</h2>
      <form
        ref={form}
        className="form-stack"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting.current || w.busy) return;
          const candidate = {
            title,
            squadId,
            branchId: branch?.id,
            venueId: venueId || undefined,
            location,
            placeConfirmation,
            coachIds: coaches,
            timezone: branch?.timezone,
            startLocal: start,
            endLocal: end,
            theme,
            agenda,
            sharedObjective:
              sharedGoal.trim() || sharedCue.trim() || sharedObserve.trim()
                ? { goal: sharedGoal, cue: sharedCue, observe: sharedObserve }
                : undefined,
            preparation: preparation
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          };
          const parsed = sessionDraftInput.safeParse(candidate);
          const nextErrors: Record<string, string> = {};
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              const field =
                issue.path[0] === "sharedObjective"
                  ? issue.path[1] === "cue"
                    ? "sharedCue"
                    : issue.path[1] === "observe"
                      ? "sharedObserve"
                      : "sharedGoal"
                  : issue.path[0] === "branchId" || issue.path[0] === "timezone"
                    ? "squadId"
                    : String(issue.path[0]);
              nextErrors[field] ??=
                field === "squadId"
                  ? "Choose an authorised session squad."
                  : issue.message;
            }
          }
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length) {
            requestAnimationFrame(() =>
              form.current
                ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                ?.focus(),
            );
            return;
          }
          submitting.current = true;
          let saved: Awaited<ReturnType<Submit>>;
          try {
            saved = await submit(
              "session",
              parsed.success ? parsed.data : candidate,
              initial?.id,
              initial?.version ?? 0,
            );
          } finally {
            submitting.current = false;
          }
          if (saved) {
            setSavedContent(content);
            onSaved?.(saved as FootballSession);
          }
        }}
      >
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="session-field-error">
            Check the labelled session fields. Your draft has not been saved.
          </p>
        )}
        <label>
          Custom session title
          <input
            aria-label="Custom session title"
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Session squad
          <select
            {...fieldState("squadId")}
            aria-label="Session squad"
            required
            value={squadId}
            onChange={(e) => {
              setSquad(e.target.value);
              setVenue("");
              setPlaceConfirmation(undefined);
            }}
          >
            <option value="">Select authorised squad</option>
            {d.records.squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldError("squadId")}
        </label>
        <label>
          Session venue
          <select
            aria-label="Session venue"
            value={venueId}
            onChange={(e) => {
              setVenue(e.target.value);
              setPlaceConfirmation(undefined);
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
            {...fieldState("location")}
            aria-label="Training location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPlaceConfirmation(undefined);
            }}
          />
          {fieldError("location")}
          {fieldError("placeConfirmation")}
        </label>
        <SessionLocationSearch
          key={squadId}
          academyId={d.academy.id}
          squadId={squadId}
          operationalLocation={location}
          onSelect={(place) => {
            setVenue("");
            setPlaceConfirmation(place.confirmation);
          }}
        />
        {placeConfirmation && (
          <p role="status">
            Map selection confirmed. The saved training location remains the
            academy text entered above.
          </p>
        )}
        <label>
          Session theme options
          <select
            aria-label="Session theme options"
            value={customTheme ? "__custom" : theme}
            onChange={(event) => {
              const custom = event.target.value === "__custom";
              setCustomTheme(custom);
              setTheme(custom ? "" : event.target.value);
            }}
          >
            <option value="">Choose a football theme</option>
            {sessionThemes(d.academy).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="__custom">Custom Theme</option>
          </select>
        </label>
        <label>
          Session theme
          <input
            {...fieldState("theme")}
            aria-label="Session theme"
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              setCustomTheme(
                !sessionThemes(d.academy).includes(e.target.value),
              );
            }}
          />
          {fieldError("theme")}
        </label>
        <p>
          Time zone: {branch?.timezone ?? "Select squad"}. Invalid or ambiguous
          daylight-saving times are rejected.
        </p>
        <label>
          Session start
          <input
            {...fieldState("startLocal")}
            aria-label="Session start"
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          {fieldError("startLocal")}
        </label>
        <label>
          Session end
          <input
            {...fieldState("endLocal")}
            aria-label="Session end"
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          {fieldError("endLocal")}
        </label>
        <fieldset
          {...fieldState("coachIds")}
          tabIndex={errors.coachIds ? -1 : undefined}
        >
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
          {fieldError("coachIds")}
        </fieldset>
        <fieldset>
          <legend>Ordered session drills</legend>
          <p>
            Optional for a draft. Add the shared activities when the plan is
            ready.
          </p>
          {fieldError("agenda")}
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
              aria-label="Add agenda drill"
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
        <fieldset>
          <legend>
            Shared batch focus · optional personalisation comes later
          </legend>
          <label>
            Shared development focus
            <input
              {...fieldState("sharedGoal")}
              aria-label="Shared development focus"
              value={sharedGoal}
              onChange={(event) => setSharedGoal(event.target.value)}
            />
            {fieldError("sharedGoal")}
          </label>
          <label>
            Shared coaching cue
            <input
              {...fieldState("sharedCue")}
              aria-label="Shared coaching cue"
              value={sharedCue}
              onChange={(event) => setSharedCue(event.target.value)}
            />
            {fieldError("sharedCue")}
          </label>
          <label>
            Optional shared observation criteria
            <input
              {...fieldState("sharedObserve")}
              aria-label="Optional shared observation criteria"
              value={sharedObserve}
              onChange={(event) => setSharedObserve(event.target.value)}
            />
            {fieldError("sharedObserve")}
          </label>
          <label>
            Preparation · one item per line
            <textarea
              {...fieldState("preparation")}
              aria-label="Preparation · one item per line"
              value={preparation}
              onChange={(event) => setPreparation(event.target.value)}
            />
            {fieldError("preparation")}
          </label>
          <p>
            Every player follows this plan. Personal goals are optional;
            existing goals can be reused in the session desk.
          </p>
        </fieldset>
        <Button disabled={w.busy}>Save session draft</Button>
      </form>
    </Card>
  );
}
export function SessionDesk({
  workspace: w,
  session: s,
  submit,
  onViewPlan,
  section,
  onSection: setSection,
  selectedPlayer,
  onSelectPlayer,
  currentDrill: current,
  onDrill: setCurrent,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
  onViewPlan: (playerId: string) => void;
  section: string;
  onSection: (section: string) => void;
  selectedPlayer: string;
  onSelectPlayer: (id: string) => void;
  currentDrill: number;
  onDrill: (index: number) => void;
}) {
  const [reason, setReason] = useState(""),
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
            onViewPlan={onViewPlan}
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
        <EvidenceEditor
          workspace={w}
          session={s}
          submit={submit}
          selectedPlayer={selectedPlayer}
          onSelectPlayer={onSelectPlayer}
          selectedDrill={s.agenda[current]?.drill.id || ""}
        />
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
  onViewPlan,
}: {
  workspace: Controller;
  session: FootballSession;
  playerId: string;
  submit: Submit;
  onViewPlan: (playerId: string) => void;
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
  const [saved, setSaved] = useState(
    JSON.stringify({ goal, cue, observe, drill }),
  );
  useUnsavedChanges(saved !== JSON.stringify({ goal, cue, observe, drill }));
  return (
    <Card>
      <h3>{s.roster.find((p) => p.playerId === playerId)?.name}</h3>
      <p>
        {plan
          ? `Current plan: ${plan.focus}`
          : "Following the shared batch plan. Personalisation is optional; no individual weakness is inferred."}
      </p>
      <Button
        data-leave-editor
        variant="secondary"
        onClick={() => onViewPlan(playerId)}
      >
        View current player plan
      </Button>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await submit(
            "objective",
            { playerId, planId: plan?.id, goal, drillId: drill, cue, observe },
            s.id,
            s.version,
          );
          if (result) setSaved(JSON.stringify({ goal, cue, observe, drill }));
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
          <textarea
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
  useUnsavedChanges(
    JSON.stringify(draft) !== JSON.stringify(rows) || Boolean(reason.trim()),
  );
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
          disabled={w.busy || !draft.length || s.status === "CANCELLED"}
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
        {!draft.length && (
          <p>No players are recorded in this session roster.</p>
        )}
        <Button disabled={w.busy || !draft.length || s.status === "CANCELLED"}>
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
  selectedPlayer,
  onSelectPlayer,
  selectedDrill,
}: {
  workspace: Controller;
  session: FootballSession;
  submit: Submit;
  selectedPlayer: string;
  onSelectPlayer: (id: string) => void;
  selectedDrill: string;
}) {
  const [playerId, setPlayer] = useState(
      s.roster.some((p) => p.playerId === selectedPlayer) ? selectedPlayer : "",
    ),
    [drillId, setDrill] = useState(
      s.agenda.some((a) => a.drill.id === selectedDrill) ? selectedDrill : "",
    ),
    [observation, setObservation] = useState(""),
    [conditions, setConditions] = useState(""),
    [method, setMethod] = useState("Coach recorded during session"),
    [measurement, setMeasurement] = useState("OBSERVATION"),
    [attempts, setAttempts] = useState(""),
    [successes, setSuccesses] = useState(""),
    [elapsed, setElapsed] = useState(""),
    [staffNote, setNote] = useState(""),
    [visibility, setVisibility] = useState("PARENT_ELIGIBLE");
  const evidenceDraft = {
    observation,
    conditions,
    method,
    measurement,
    attempts,
    successes,
    elapsed,
    staffNote,
    visibility,
  };
  const [savedDraft, setSavedDraft] = useState(JSON.stringify(evidenceDraft));
  const dirty = savedDraft !== JSON.stringify(evidenceDraft);
  useUnsavedChanges(dirty);
  return (
    <Card>
      <h2>Record training evidence</h2>
      {selectedPlayer &&
        !s.roster.some((record) => record.playerId === selectedPlayer) && (
          <p role="alert">
            The selected player is not in this session roster. Choose an
            authorised session player.
          </p>
        )}
      <p>
        No video attached. Coach-recorded evidence only. AI Video Analysis —
        Coming soon.
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
          ) {
            setSavedDraft(
              JSON.stringify({
                ...evidenceDraft,
                observation: "",
                staffNote: "",
              }),
            );
            setObservation("");
            setNote("");
          }
        }}
      >
        <label>
          Evidence player
          <select
            aria-label="Evidence player"
            required
            value={playerId}
            onChange={(e) => {
              if (
                dirty &&
                !window.confirm(
                  "Discard this unsaved observation and choose another player?",
                )
              )
                return;
              setPlayer(e.target.value);
              onSelectPlayer(e.target.value);
              setObservation("");
              setNote("");
              setConditions("");
              setAttempts("");
              setSuccesses("");
              setElapsed("");
              setSavedDraft(
                JSON.stringify({
                  ...evidenceDraft,
                  observation: "",
                  staffNote: "",
                  conditions: "",
                  attempts: "",
                  successes: "",
                  elapsed: "",
                }),
              );
            }}
          >
            <option value="">Choose a session player</option>
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
