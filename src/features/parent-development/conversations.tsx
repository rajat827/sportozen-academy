"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { Card, Badge, Button, PageTitle } from "@/components/ui/primitives";
import { TextField } from "./plan-editor";
import { ConversationList } from "./centre";
import {
  parentProjection,
  startConversation,
  addConversationMessage,
  canReadConversation,
  changeConversation,
} from "@/services/communication/conversations";
import type { ConversationTopic } from "@/domain/parent-development";
export function ParentInbox() {
  const { data, actor, ready, mutate } = useDevelopmentWorkspace();
  const [topic, setTopic] = useState<ConversationTopic>("GENERAL"),
    [body, setBody] = useState("");
  if (!ready) return <p>Loading private inbox…</p>;
  const records = parentProjection(data, actor.id),
    player = records.players[0];
  if (!player) return <p>No linked player.</p>;
  return (
    <div className="parent-content">
      <PageTitle
        title="Parent inbox"
        description="Private in-app messages · External delivery: NOT_SENT"
      />
      {records.updates.map((u) => (
        <Card key={u.id}>
          <h2>{u.updateType.replaceAll("_", " ")}</h2>
          <Badge>Approval: {u.approvalStatus}</Badge>
          <Badge>In app: {u.inAppPublicationStatus}</Badge>
          <Badge>External: {u.externalDeliveryStatus}</Badge>
          <p className="message-body">{u.approvalSnapshot?.body}</p>
          <div className="actions">
            <Link className="button secondary" href="/parent/progress">
              View Plan
            </Link>
            <Link
              className="button secondary"
              href={`/parent/messages/${records.conversations.find((c) => c.updateId === u.id)?.id ?? ""}`}
            >
              Open Update and Reply
            </Link>
          </div>
        </Card>
      ))}
      <ConversationList />
      <Card>
        <h2>Message Coach</h2>
        <div className="form-stack">
          <label>
            Conversation topic
            <select
              aria-label="Conversation topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as ConversationTopic)}
            >
              {[
                "PLAYER_DEVELOPMENT",
                "DRILLS",
                "HOME_PRACTICE",
                "NUTRITION",
                "ATTENDANCE",
                "SCHEDULE",
                "FEES",
                "GENERAL",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <TextField
            label="Question for coach"
            value={body}
            onChange={setBody}
            multiline
          />
          <Button
            disabled={!body.trim()}
            onClick={() => {
              if (
                mutate((s) =>
                  startConversation(s, actor, player.id, topic, body),
                )
              )
                setBody("");
            }}
          >
            Start Private Conversation
          </Button>
        </div>
        <p>
          Only this linked child’s guardian and assigned staff can view this
          conversation in the demo UI.
        </p>
      </Card>
    </div>
  );
}
export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const { data, actor, ready, mutate } = useDevelopmentWorkspace();
  const [body, setBody] = useState(""),
    [note, setNote] = useState("");
  const c = data.conversations.find((c) => c.id === conversationId);
  const allowed = !!c && canReadConversation(data, actor, c);
  const messages = allowed
    ? data.conversationMessages.filter(
        (m) => m.conversationId === conversationId,
      )
    : [];
  const last = messages.at(-1)?.id;
  const read = actor.role === "parent" ? c?.lastReadParent : c?.lastReadStaff;
  useEffect(() => {
    if (ready && allowed && last && read !== last)
      mutate((s) =>
        changeConversation(s, actor, conversationId, "read"),
      ); /* The stored last message id makes this operation idempotent. */
  }, [ready, allowed, last, read, conversationId, actor, mutate]);
  if (!ready) return <p>Loading conversation…</p>;
  if (!c || !allowed)
    return (
      <Card>
        <h1>Conversation access denied</h1>
        <p>No messages are available for this account.</p>
      </Card>
    );
  const player = data.players.find((p) => p.id === c.playerId)!;
  const parent = actor.role === "parent";
  return (
    <div className={parent ? "parent-content" : ""}>
      <PageTitle
        title={c.title}
        description={`${player.name} · ${data.coaches.find((x) => x.id === c.coachId)?.name} · ${c.status}`}
      />
      <Link
        className="button secondary"
        href={parent ? "/parent/messages" : "/coach/messages"}
      >
        Back to Inbox
      </Link>
      <Card>
        <Badge>Private in-app thread</Badge>
        <Badge>External: NOT_SENT</Badge>
        {c.updateId && (
          <Link
            className="text-link"
            href={
              parent ? "/parent/progress" : `/coach/development/${player.id}`
            }
          >
            View related development plan
          </Link>
        )}
        {messages.map((m) => (
          <article className={`thread-message ${m.senderRole}`} key={m.id}>
            <strong>
              {m.senderRole === "parent" ? "Parent" : "Coach / Staff"}
            </strong>
            <p className="message-body">{m.body}</p>
            <small>{new Date(m.createdAt).toLocaleString()}</small>
          </article>
        ))}
        <div className="form-stack">
          <TextField label="Reply" value={body} onChange={setBody} multiline />
          <Button
            disabled={!body.trim() || c.status === "CLOSED"}
            onClick={() => {
              if (mutate((s) => addConversationMessage(s, actor, c.id, body)))
                setBody("");
            }}
          >
            Reply In App
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              mutate((s) =>
                changeConversation(
                  s,
                  actor,
                  c.id,
                  c.status === "OPEN" ? "close" : "reopen",
                ),
              )
            }
          >
            {c.status === "OPEN" ? "Close Conversation" : "Reopen Conversation"}
          </Button>
        </div>
      </Card>
      {!parent && (
        <Card>
          <h2>Staff-only internal notes</h2>
          {data.internalNotes
            .filter((n) => n.conversationId === c.id)
            .map((n) => (
              <p key={n.id}>{n.body}</p>
            ))}
          <TextField
            label="Internal note"
            value={note}
            onChange={setNote}
            multiline
          />
          <Button
            variant="secondary"
            disabled={!note.trim() || c.status === "CLOSED"}
            onClick={() => {
              if (
                mutate((s) =>
                  addConversationMessage(s, actor, c.id, note, true),
                )
              )
                setNote("");
            }}
          >
            Save Internal Note
          </Button>
          <h3>Activity history</h3>
          {c.history.map((h, i) => (
            <p key={i}>
              {h.action} · {h.actor} · {new Date(h.at).toLocaleString()}
            </p>
          ))}
          <h3>Restricted guardian information</h3>
          {data.dietaryRestrictions
            .filter(
              (r) => r.playerId === player.id && r.guardianId === c.guardianId,
            )
            .map((r) => (
              <p key={r.id}>{r.note}</p>
            ))}
        </Card>
      )}
    </div>
  );
}
