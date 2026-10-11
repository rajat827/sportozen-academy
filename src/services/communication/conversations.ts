import type { DemoState } from "@/domain/entities";
import type { Actor } from "./parent-updates";
import { assertStaff } from "./parent-updates";
import type {
  ConversationTopic,
  Conversation,
} from "@/domain/parent-development";
export function canReadConversation(
  state: DemoState,
  actor: Actor,
  c: Conversation,
) {
  const p = state.players.find(
    (p) => p.id === c.playerId && p.academyId === c.academyId,
  );
  return (
    !!p &&
    (actor.role === "parent"
      ? c.guardianId === actor.id &&
        p.guardianId === actor.id &&
        !!state.guardians
          .find((g) => g.id === actor.id)
          ?.playerIds.includes(p.id)
      : actor.role === "owner" || c.coachId === actor.id)
  );
}
export function parentProjection(state: DemoState, guardianId: string) {
  const guardian = state.guardians.find((g) => g.id === guardianId);
  const ids = new Set(
    guardian?.playerIds.filter((id) =>
      state.players.some((p) => p.id === id && p.guardianId === guardianId),
    ) ?? [],
  );
  const updates = state.parentUpdates.filter(
    (u) =>
      ids.has(u.playerId) &&
      u.guardianId === guardianId &&
      u.approvalStatus === "APPROVED" &&
      u.inAppPublicationStatus === "PUBLISHED" &&
      !!u.approvalSnapshot,
  );
  const conversations = state.conversations.filter((c) =>
    canReadConversation(state, { role: "parent", id: guardianId }, c),
  );
  const conversationIds = new Set(conversations.map((c) => c.id));
  return {
    players: state.players.filter((p) => ids.has(p.id)),
    updates,
    conversations,
    messages: state.conversationMessages.filter((m) =>
      conversationIds.has(m.conversationId),
    ),
    preferences: state.preferences.find((p) => p.guardianId === guardianId),
  };
}
export function unreadMessages(
  state: DemoState,
  c: Conversation,
  role: Actor["role"],
) {
  const messages = state.conversationMessages.filter(
    (m) => m.conversationId === c.id,
  );
  const index = messages.findIndex(
    (m) => m.id === (role === "parent" ? c.lastReadParent : c.lastReadStaff),
  );
  return messages
    .slice(index + 1)
    .filter((m) =>
      role === "parent" ? m.senderRole !== "parent" : m.senderRole === "parent",
    ).length;
}
export function startConversation(
  state: DemoState,
  actor: Actor,
  playerId: string,
  topic: ConversationTopic,
  body: string,
): DemoState {
  const p = state.players.find((p) => p.id === playerId);
  if (!p || !body.trim())
    throw new Error("Choose a linked player and enter a message");
  if (
    actor.role === "parent" &&
    (p.guardianId !== actor.id ||
      !state.guardians
        .find((g) => g.id === actor.id)
        ?.playerIds.includes(playerId))
  )
    throw new Error("Parent access denied");
  if (actor.role !== "parent") assertStaff(state, actor, playerId);
  const plan = state.plans.find((p) => p.playerId === playerId)!,
    at = new Date().toISOString(),
    id = crypto.randomUUID();
  const c: Conversation = {
    id,
    academyId: p.academyId,
    playerId,
    guardianId: p.guardianId,
    coachId: plan.coachId,
    planId: plan.id,
    topic,
    title: `${topic.replaceAll("_", " ")} · ${p.name}`,
    status: "OPEN",
    participants: [
      { id: p.guardianId, role: "parent" },
      { id: plan.coachId, role: "coach" },
    ],
    history: [{ at, actor: actor.id, action: "Private conversation opened" }],
  };
  return addConversationMessage(
    { ...state, conversations: [...state.conversations, c] },
    actor,
    id,
    body,
  );
}
export function addConversationMessage(
  state: DemoState,
  actor: Actor,
  id: string,
  body: string,
  internal = false,
): DemoState {
  const c = state.conversations.find((c) => c.id === id);
  if (
    !c ||
    !canReadConversation(state, actor, c) ||
    (internal && actor.role === "parent")
  )
    throw new Error("Conversation access denied");
  if (c.status === "CLOSED" || !body.trim())
    throw new Error("Reopen the conversation and enter a message");
  const at = new Date().toISOString(),
    recordId = crypto.randomUUID();
  const next = {
    ...state,
    conversations: state.conversations.map((x) =>
      x.id === id
        ? {
            ...x,
            history: [
              ...x.history,
              {
                at,
                actor: actor.id,
                action: internal
                  ? "Staff-only note added"
                  : actor.role === "parent"
                    ? "Parent Replied"
                    : "Staff responded in app",
              },
            ],
          }
        : x,
    ),
  };
  if (internal)
    return {
      ...next,
      internalNotes: [
        ...state.internalNotes,
        {
          id: recordId,
          academyId: c.academyId,
          conversationId: id,
          body: body.trim(),
          authorId: actor.id,
          createdAt: at,
        },
      ],
    };
  return {
    ...next,
    conversationMessages: [
      ...state.conversationMessages,
      {
        id: recordId,
        academyId: c.academyId,
        conversationId: id,
        body: body.trim(),
        senderId: actor.id,
        senderRole: actor.role,
        createdAt: at,
      },
    ],
  };
}
export function changeConversation(
  state: DemoState,
  actor: Actor,
  id: string,
  action: "read" | "close" | "reopen",
) {
  const c = state.conversations.find((c) => c.id === id);
  if (!c || !canReadConversation(state, actor, c))
    throw new Error("Conversation access denied");
  const last = state.conversationMessages
    .filter((m) => m.conversationId === id)
    .at(-1)?.id;
  return {
    ...state,
    conversations: state.conversations.map((x) =>
      x.id !== id
        ? x
        : action === "read"
          ? {
              ...x,
              ...(actor.role === "parent"
                ? { lastReadParent: last }
                : { lastReadStaff: last }),
            }
          : {
              ...x,
              status:
                action === "close" ? ("CLOSED" as const) : ("OPEN" as const),
              history: [
                ...x.history,
                { at: new Date().toISOString(), actor: actor.id, action },
              ],
            },
    ),
  };
}
