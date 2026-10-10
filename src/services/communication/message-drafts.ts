import type { DemoState, MessageDraft } from "@/domain/entities";

export const messageTemplates = [
  "Session-day update",
  "Attendance check",
  "Schedule change",
  "Fee reminder",
  "Weekly progress update",
  "Report-card notification",
  "Academy announcement",
];
export type RelatedType = "player" | "squad" | "session";

export function prepareMessage(
  state: DemoState,
  template: string,
  type: RelatedType,
  id: string,
) {
  const player =
    type === "player" ? state.players.find((p) => p.id === id) : undefined;
  const session =
    type === "session" ? state.sessions.find((s) => s.id === id) : undefined;
  const squad =
    type === "squad" ? state.squads.find((s) => s.id === id) : undefined;
  const players = player
    ? [player]
    : state.players.filter((p) => p.squad === (squad?.name ?? session?.squad));
  const ids = new Set(players.map((p) => p.id));
  const sources: NonNullable<MessageDraft["sources"]> = [
    { id: state.academy.id, label: "Academy", text: state.academy.name },
  ];
  if (player)
    sources.push({ id: player.id, label: "Player", text: player.name });
  if (squad) sources.push({ id: squad.id, label: "Squad", text: squad.name });
  if (session)
    sources.push({
      id: session.id,
      label: "Session",
      text: `${session.title} · ${session.date} ${session.time} · ${session.venue}`,
    });
  if (
    !session &&
    ["Session-day update", "Schedule change"].includes(template)
  ) {
    state.sessions
      .filter(
        (s) => players.some((p) => p.squad === s.squad) && s.status !== "Draft",
      )
      .forEach((s) =>
        sources.push({
          id: s.id,
          label: "Session",
          text: `${s.title} · ${s.date} ${s.time} · ${s.venue} · ${s.status}`,
        }),
      );
  }
  if (template === "Attendance check") {
    state.attendance
      .filter(
        (a) => ids.has(a.playerId) && (!session || a.sessionId === session.id),
      )
      .forEach((a) =>
        sources.push({
          id: a.id,
          label: "Attendance",
          text: `${state.players.find((p) => p.id === a.playerId)?.name} · ${state.sessions.find((s) => s.id === a.sessionId)?.title} · ${a.status}`,
        }),
      );
  }
  if (template === "Fee reminder") {
    state.charges
      .filter((c) => ids.has(c.playerId))
      .forEach((c) =>
        sources.push({
          id: c.id,
          label: "Charge record",
          text: `${state.players.find((p) => p.id === c.playerId)?.name} · ${c.label} · ₹${c.amount} · due ${c.dueDate}`,
        }),
      );
    state.payments
      .filter((p) => ids.has(p.playerId))
      .forEach((p) =>
        sources.push({
          id: p.id,
          label: "Payment reference",
          text: `${p.reference} · ₹${p.amount} · ${p.date}`,
        }),
      );
  }
  if (template === "Weekly progress update") {
    state.evidence
      .filter((e) => ids.has(e.playerId) && e.status === "Coach Reviewed")
      .forEach((e) =>
        sources.push({
          id: e.id,
          label: "Reviewed evidence",
          text: `${e.title}: ${e.note}`,
        }),
      );
  }
  if (template === "Report-card notification") {
    state.reports
      .filter((r) => ids.has(r.playerId) && r.status === "Approved")
      .forEach((r) =>
        sources.push({
          id: r.id,
          label: "Approved report",
          text: `${state.players.find((p) => p.id === r.playerId)?.name} · ${r.period}`,
        }),
      );
  }
  const context =
    player?.name ?? squad?.name ?? session?.title ?? state.academy.name;
  const details = sources
    .filter((s) => !["Academy", "Player", "Squad"].includes(s.label))
    .map((s) => s.text)
    .join("\n");
  const instruction =
    template === "Schedule change"
      ? "Add and verify the revised date, time and venue before approval."
      : template === "Academy announcement"
        ? "Add the announcement details for review."
        : template === "Fee reminder"
          ? "Check charge and payment references before requesting payment."
          : "Review these fictional records before approval.";
  return {
    sources,
    recipient: player
      ? (state.guardians.find((g) => g.id === player.guardianId)?.name ??
        "Guardian not recorded")
      : `${context} · internal audience draft`,
    body: `${template} — ${context}\n${details || "No supporting activity record available."}\n${instruction}`,
  };
}

export function newDraft(state: DemoState): MessageDraft {
  return {
    id: crypto.randomUUID(),
    academyId: state.academy.id,
    playerId: "p1",
    relatedType: "player",
    relatedId: "p1",
    recipient: "",
    template: messageTemplates[0],
    channel: "Manual copy",
    body: "",
    status: "DRAFT",
    deliveryStatus: "NOT_SENT",
    scheduledAt: "",
    sources: [],
    history: [],
    sourceVerified: false,
  };
}

export function transitionDraft(
  current: MessageDraft,
  edited: MessageDraft,
  action: "save" | "submit" | "approve" | "reject" | "copy",
  at = new Date().toISOString(),
): MessageDraft {
  const history = [...(current.history ?? [])];
  const event = (status: MessageDraft["status"], text: string) =>
    history.push({ at, status, action: text });
  if (action === "copy") {
    if (!current.approvedAt || current.status !== "NOT_SENT")
      throw new Error("Only approved drafts can be copied.");
    event("NOT_SENT", "Copied manually; no delivery recorded");
    return { ...current, history };
  }
  if (action === "approve" || action === "reject") {
    if (current.status !== "PENDING_APPROVAL")
      throw new Error("Submit the draft for review first.");
    if (action === "reject") {
      event("REJECTED", "Draft rejected for revision");
      return { ...current, status: "REJECTED", approvedAt: undefined, history };
    }
    if (
      !current.sourceVerified ||
      !current.body.trim() ||
      !current.sources?.length
    )
      throw new Error("Verify source records before approval.");
    event("APPROVED", "Draft approved internally");
    event(
      "NOT_SENT",
      "No provider connected; retained internally for manual copying",
    );
    return {
      ...current,
      status: "NOT_SENT",
      approvedAt: at,
      deliveryStatus: "NOT_SENT",
      history,
    };
  }
  if (
    action === "submit" &&
    (!edited.body.trim() || !edited.sourceVerified || !edited.sources?.length)
  )
    throw new Error(
      "Add a message and verify its source records before requesting approval.",
    );
  const status = action === "submit" ? "PENDING_APPROVAL" : "DRAFT";
  event(
    status,
    action === "submit"
      ? "Source records verified; submitted for internal review"
      : "Draft saved; previous approval cleared",
  );
  return {
    ...edited,
    status,
    approvedAt: undefined,
    parentDemo: false,
    deliveryStatus: "NOT_SENT",
    history,
  };
}
