"use client";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { Button, Badge, Go } from "./ui";
export function SessionRows() {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles);
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
        <Go to="session-summary">Open session</Go>
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
        <Go to="session-summary">View details</Go>
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
