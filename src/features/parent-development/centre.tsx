"use client";
import { useState } from "react";
import Link from "next/link";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { Card, Button, Badge, PageTitle } from "@/components/ui/primitives";
import { Communication } from "@/features/communication/communication";
import {
  parentProjection,
  unreadMessages,
  canReadConversation,
} from "@/services/communication/conversations";
import {
  reviewParentUpdate,
  saveParentUpdate,
  updateSources,
} from "@/services/communication/parent-updates";
import { orchestratePublication } from "@/services/communication/in-app-provider";
import { updateTypes } from "@/services/development/plans";
import { SourceRecord } from "./update-wizard";
import { TextField } from "./plan-editor";
import type { ParentDevelopmentUpdate } from "@/domain/parent-development";
const verification = [
  "Correct player",
  "Correct guardian",
  "Focus is current",
  "Drills are assigned",
  "Observations reviewed",
  "Attendance accurate",
  "Dates correct",
  "Evidence approved",
  "Nutrition authorised",
  "No unsupported progress claims",
];
const tabs = [
  "Development Updates",
  "Weekly Plans",
  "Session Summaries",
  "Nutrition & Hydration",
  "Attendance",
  "Schedule",
  "Fees",
  "Conversations",
];
export function DevelopmentCentre() {
  const { data, actor, ready, mutate } = useDevelopmentWorkspace();
  const [tab, setTab] = useState(tabs[0]),
    [squad, setSquad] = useState(""),
    [coach, setCoach] = useState(""),
    [focus, setFocus] = useState(""),
    [type, setType] = useState(""),
    [approval, setApproval] = useState(""),
    [replied, setReplied] = useState(false),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  if (!ready) return <p>Loading communication…</p>;
  const updates = data.parentUpdates
    .filter((u) => actor.role === "owner" || u.coachId === actor.id)
    .filter((u) => {
      const p = data.players.find((p) => p.id === u.playerId)!;
      const conversation = data.conversations.find((c) => c.updateId === u.id);
      return (
        (!squad || p.squad === squad) &&
        (!coach || u.coachId === coach) &&
        (!focus ||
          u.focusAreas.join(" ").toLowerCase().includes(focus.toLowerCase())) &&
        (!type || u.updateType === type) &&
        (!approval || u.approvalStatus === approval) &&
        (!date || u.reviewDate === date) &&
        (!replied ||
          data.conversationMessages.some(
            (m) =>
              m.conversationId === conversation?.id &&
              m.senderRole === "parent",
          )) &&
        (tab === "Weekly Plans"
          ? u.updateType === "WEEKLY_TRAINING_FOCUS"
          : tab === "Session Summaries"
            ? u.updateType === "SESSION_SUMMARY"
            : tab === "Nutrition & Hydration"
              ? u.updateType === "NUTRITION_HYDRATION"
              : true)
      );
    });
  const current = data.parentUpdates.find((u) => u.id === selected);
  return (
    <>
      <PageTitle
        title="Communication centre"
        description="Personalised plans → source verification → approval → private in-app inbox. External delivery: NOT_SENT."
      />
      <div className="tabs" role="tablist" aria-label="Communication sections">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Conversations" ? (
        <ConversationList />
      ) : (
        <>
          <Card>
            <div className="form-grid">
              <label>
                Squad filter
                <select
                  aria-label="Update squad filter"
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                >
                  <option value="">All squads</option>
                  {data.squads.map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Coach filter
                <select
                  aria-label="Update coach filter"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                >
                  <option value="">All coaches</option>
                  {data.coaches.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Focus filter"
                value={focus}
                onChange={setFocus}
              />
              <label>
                Update type filter
                <select
                  aria-label="Update type filter"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">All types</option>
                  {updateTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Approval filter
                <select
                  aria-label="Approval filter"
                  value={approval}
                  onChange={(e) => setApproval(e.target.value)}
                >
                  <option value="">All states</option>
                  {["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <TextField
                label="Review date filter"
                type="date"
                value={date}
                onChange={setDate}
              />
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={replied}
                  onChange={(e) => setReplied(e.target.checked)}
                />
                Parent replied
              </label>
            </div>
          </Card>
          <div className="updates-grid">
            {updates.map((u) => {
              const p = data.players.find((p) => p.id === u.playerId)!;
              const c = data.conversations.find((c) => c.updateId === u.id);
              const reply = data.conversationMessages.some(
                (m) => m.conversationId === c?.id && m.senderRole === "parent",
              );
              return (
                <Card key={u.id}>
                  <h2>{p.name}</h2>
                  <p>
                    {data.guardians.find((g) => g.id === u.guardianId)?.name}
                  </p>
                  <h3>{u.updateType}</h3>
                  <p>{u.focusAreas.join(", ")}</p>
                  <p>
                    Drills:{" "}
                    {u.assignedDrillIds
                      .map((id) => data.drills.find((d) => d.id === id)?.name)
                      .join(", ") || "None selected"}
                  </p>
                  <div className="inline">
                    <Badge>{u.approvalStatus}</Badge>
                    <Badge>In app: {u.inAppPublicationStatus}</Badge>
                    <Badge>External: {u.externalDeliveryStatus}</Badge>
                    {reply && <Badge tone="green">Parent Replied</Badge>}
                  </div>
                  <p>
                    Review {u.reviewDate} · Updated{" "}
                    {new Date(u.updatedAt).toLocaleString()}
                  </p>
                  <div className="actions">
                    <Button
                      variant="secondary"
                      onClick={() => setSelected(u.id)}
                    >
                      Review Update: {u.updateType}
                    </Button>
                    <Link
                      className="button secondary"
                      href={`/coach/players/${u.playerId}/update?draft=${u.id}`}
                    >
                      Edit Update
                    </Link>
                    {c && (
                      <Link
                        className="button secondary"
                        href={`/coach/messages/${c.id}`}
                      >
                        Open conversation
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {!updates.length && (
            <Card>
              <p>
                No updates match these filters. Create an update from a player
                profile.
              </p>
            </Card>
          )}
          {current && (
            <ReviewPanel
              key={`${current.id}-${current.messageVersion}-${current.approvalStatus}`}
              update={current}
              close={() => setSelected(null)}
            />
          )}
          {tab !== "Nutrition & Hydration" && (
            <details open>
              <summary>Manual draft preparation · internal only</summary>
              <Communication />
            </details>
          )}
        </>
      )}
    </>
  );
}
function ReviewPanel({
  update: u,
  close,
}: {
  update: ParentDevelopmentUpdate;
  close: () => void;
}) {
  const { data, actor, mutate } = useDevelopmentWorkspace();
  const [checks, setChecks] = useState<string[]>([]),
    [body, setBody] = useState(u.messageBody);
  return (
    <Card>
      <h2>Source Records Used</h2>
      <p>
        Player: {data.players.find((p) => p.id === u.playerId)?.name} ·
        Guardian: {data.guardians.find((g) => g.id === u.guardianId)?.name} ·
        Version {u.messageVersion}
      </p>
      {u.sourceRecords.map((s) => (
        <SourceRecord key={`${s.kind}-${s.id}`} source={s} />
      ))}
      <TextField
        label="Review message"
        value={body}
        onChange={setBody}
        multiline
      />
      <Button
        variant="secondary"
        onClick={() =>
          mutate((s) => saveParentUpdate(s, actor, { ...u, messageBody: body }))
        }
      >
        Save Revision as Draft
      </Button>
      <p>
        Saving edits clears approval and publication. Changed source records
        must be refreshed in the wizard.
      </p>
      <fieldset>
        <legend>Reviewer verification</legend>
        {verification.map((item) => (
          <label className="check-row" key={item}>
            <input
              type="checkbox"
              aria-label={`Verify: ${item}`}
              checked={checks.includes(item)}
              onChange={(e) =>
                setChecks(
                  e.target.checked
                    ? [...checks, item]
                    : checks.filter((x) => x !== item),
                )
              }
            />
            {item}
          </label>
        ))}
      </fieldset>
      <div className="actions">
        <Button
          disabled={
            u.approvalStatus !== "PENDING_APPROVAL" ||
            body !== u.messageBody ||
            checks.length !== verification.length
          }
          onClick={() =>
            mutate((s) => reviewParentUpdate(s, actor, u.id, true, true))
          }
        >
          Approve Update
        </Button>
        <Button
          variant="secondary"
          disabled={u.approvalStatus !== "PENDING_APPROVAL"}
          onClick={() =>
            mutate((s) => reviewParentUpdate(s, actor, u.id, false, false))
          }
        >
          Reject Update
        </Button>
        <Button
          variant="secondary"
          disabled={u.approvalStatus !== "APPROVED"}
          onClick={() =>
            mutate((s) => {
              const live = s.parentUpdates.find((x) => x.id === u.id)!;
              return orchestratePublication(s, live);
            })
          }
        >
          Publish Approved Update In App
        </Button>
        <Button variant="secondary" onClick={close}>
          Close Review
        </Button>
      </div>
      <Badge>External: NOT_SENT</Badge>
      {u.inAppPublicationStatus === "WITHHELD" && (
        <p>
          Publication withheld by parent preferences or consent. It can be
          retried after the parent opts in.
        </p>
      )}
      <h3>Approval activity</h3>
      {u.history.map((h, i) => (
        <p key={i}>
          {h.action} · version {h.version} · {h.actor} ·{" "}
          {new Date(h.at).toLocaleString()}
        </p>
      ))}
    </Card>
  );
}
export function ConversationList() {
  const { data, actor } = useDevelopmentWorkspace();
  const records =
    actor.role === "parent" ? parentProjection(data, actor.id) : null;
  const conversations =
    records?.conversations ??
    data.conversations.filter((c) => canReadConversation(data, actor, c));
  return (
    <>
      <h2>Private conversations</h2>
      {conversations.map((c) => (
        <Card key={c.id}>
          <h3>{c.title}</h3>
          <p>
            {data.players.find((p) => p.id === c.playerId)?.name} ·{" "}
            {data.coaches.find((x) => x.id === c.coachId)?.name} · {c.status}
          </p>
          <Badge>{unreadMessages(data, c, actor.role)} unread</Badge>
          {actor.role !== "parent" &&
            data.conversationMessages.some(
              (m) => m.conversationId === c.id && m.senderRole === "parent",
            ) && <Badge tone="green">Parent Replied</Badge>}
          <Link
            className="button secondary"
            href={`/${actor.role === "parent" ? "parent" : "coach"}/messages/${c.id}`}
          >
            Open {c.title}
          </Link>
        </Card>
      ))}
    </>
  );
}
