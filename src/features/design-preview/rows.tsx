"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { previewRoute } from "./catalog";
import { deriveHomeDashboard, homeSessionPatch } from "./home-dashboard-model";
import { Button, Badge } from "./ui";
export function SessionRows() {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles);
  function selectSession(
    event: MouseEvent<HTMLAnchorElement>,
    slot: "first" | "second",
  ) {
    const session = deriveHomeDashboard(state).sessions.find(
      (record) => record.slot === slot,
    );
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
      <div className="dp-row">
        <span className="dp-avatar">
          {weekPlanContext(state.fields, state.players).first.number}
        </span>
        <div className="dp-copy">
          <strong>
            {weekPlanContext(state.fields, state.players).batch} ·{" "}
            {weekPlanContext(state.fields, state.players).first.label} ·{" "}
            {weekPlanContext(state.fields, state.players).time}
          </strong>
          <p>Maya Rao · {academy.venue} · Confirmed</p>
        </div>
        <Link
          className="dp-link"
          href={previewRoute("session-summary")}
          onClick={(event) => selectSession(event, "first")}
        >
          Open session
        </Link>
      </div>
      <div className="dp-row">
        <span className="dp-avatar">
          {weekPlanContext(state.fields, state.players).second.number}
        </span>
        <div className="dp-copy">
          <strong>
            {weekPlanContext(state.fields, state.players).batch} ·{" "}
            {weekPlanContext(state.fields, state.players).second.label} ·{" "}
            {weekPlanContext(state.fields, state.players).time}
          </strong>
          <p>Receiving and passing · {academy.timezone}</p>
        </div>
        <Link
          className="dp-link"
          href={previewRoute("session-summary")}
          onClick={(event) => selectSession(event, "second")}
        >
          View details
        </Link>
      </div>
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
