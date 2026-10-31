"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { previewRoute } from "./catalog";
import { deriveHomeDashboard, homeSessionPatch } from "./home-dashboard-model";
import { Button, Badge } from "./ui";
import { parentScheduleSessions } from "./preview-session-records";
export function SessionRows({ parent = false }: { parent?: boolean }) {
  return parent ? <ParentSessionRows /> : <StaffSessionRows />;
}

function ParentSessionRows() {
  const state = usePreviewState();
  const sessions = parentScheduleSessions(state);
  return (
    <>
      {sessions.map((session, index) => (
        <div className="dp-row" key={session.id}>
          <span className="dp-avatar">{Number(session.date.slice(8))}</span>
          <div className="dp-copy">
            <strong>
              {session.batch} ·{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${session.date}T12:00:00Z`))}{" "}
              · {session.start}–{session.end}
            </strong>
            <p>
              {index === 0
                ? "Reviewed linked-child schedule"
                : `Shared weekly plan · ${session.timezone}`}
            </p>
          </div>
          <Link className="dp-link" href={previewRoute("parent-weekly")}>
            {index === 0 ? "Open session" : "View details"}
          </Link>
        </div>
      ))}
      {!sessions.length && (
        <p className="dp-note">
          Your next schedule is awaiting coach review. Only approved sessions
          published for your linked child appear here.
        </p>
      )}
    </>
  );
}

function StaffSessionRows() {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    sessions = deriveHomeDashboard(state).sessions;
  function selectSession(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const session = sessions.find((record) => record.id === id);
    const patch = session ? homeSessionPatch(state, session) : null;
    if (!patch) {
      event.preventDefault();
      previewAdapter.save({
        notice:
          "Session context is unavailable for the selected player. Choose the matching batch plan.",
      });
      return;
    }
    previewAdapter.save(patch);
  }
  return (
    <>
      {sessions.map((session, index) => (
        <div className="dp-row" key={session.id}>
          <span className="dp-avatar">{Number(session.date.slice(8))}</span>
          <div className="dp-copy">
            <strong>
              {session.batch} ·{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${session.date}T12:00:00Z`))}{" "}
              · {session.start}–{session.end}
            </strong>
            <p>
              {index === 0
                ? `Maya Rao · ${session.venue} · ${session.status === "Scheduled" ? "Confirmed" : session.status}`
                : `Receiving and passing · ${academy.timezone}`}
            </p>
          </div>
          <Link
            className="dp-link"
            href={previewRoute("session-summary")}
            onClick={(event) => selectSession(event, session.id)}
          >
            {index === 0 ? "Open session" : "View details"}
          </Link>
        </div>
      ))}
      {!sessions.length && (
        <p className="dp-note">
          No accessible recorded sessions in this batch plan.
        </p>
      )}
    </>
  );
}

export function AgendaRows() {
  const state = usePreviewState();
  return (
    <div className="dp-agenda">
      {state.drills.map((id) => {
        const d = previewDrills.find((d) => d.id === id)!;
        return (
          <div className="dp-row" key={id}>
            <div className="dp-copy">
              <strong>{d.name}</strong>
              <p>{d.purpose}</p>
            </div>
            <Badge>{d.minutes} min</Badge>
          </div>
        );
      })}
    </div>
  );
}

export function PlayerFocusRows({ compact = false }: { compact?: boolean }) {
  const state = usePreviewState();
  return (
    <>
      {state.players
        .filter((p) =>
          weekPlanContext(state.fields, state.players).playerIds.includes(p.id),
        )
        .map((p) => (
          <div className="dp-row" key={p.id}>
            <span className="dp-avatar">{p.initials}</span>
            <div className="dp-copy">
              <strong>{p.name}</strong>
              <p>
                {p.category} age category · {p.batch}
              </p>
              <p>{state.adjustments[p.id] || "Individual focus not yet set"}</p>
              <Badge>
                {state.adjustments[p.id]
                  ? "Personalised adjustment"
                  : "Following batch plan"}
              </Badge>
            </div>
            {!compact && (
              <Button
                variant="secondary"
                onClick={() => previewAdapter.save({ playerId: p.id })}
              >
                Select {p.name.split(" ")[0]}
              </Button>
            )}
          </div>
        ))}
    </>
  );
}
