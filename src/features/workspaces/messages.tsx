"use client";
import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { useWorkspace } from "@/hooks/use-workspace";
import type {
  WorkspacePlayer,
  WorkspaceConversation,
} from "@/domain/workspace";
import { generalNutritionGuidance } from "@/config/communication/nutrition-guidance";
type Controller = ReturnType<typeof useWorkspace>;
export function WorkspaceMessages({
  workspace: w,
  player,
  sportId,
}: {
  workspace: Controller;
  player: WorkspacePlayer;
  sportId: string;
}) {
  const data = w.data!,
    parent = data.membership.role === "PARENT",
    plans = data.records.plan.filter(
      (p) => p.playerId === player.id && p.sportId === sportId,
    ),
    reports = data.records.report.filter(
      (r) =>
        r.playerId === player.id &&
        r.sportId === sportId &&
        r.status === "Approved",
    ),
    updates = data.records.update.filter(
      (u) => u.playerId === player.id && u.sportId === sportId,
    ),
    conversations = data.records.conversation.filter(
      (c) => c.playerId === player.id,
    );
  const [type, setType] = useState("DEVELOPMENT"),
    [body, setBody] = useState(""),
    [reportId, setReportId] = useState(reports[0]?.id ?? ""),
    [verified, setVerified] = useState(""),
    [subject, setSubject] = useState(""),
    [guardian, setGuardian] = useState(parent ? data.membership.userId : ""),
    [open, setOpen] = useState("");
  function prefill() {
    if (type === "NUTRITION_HYDRATION") {
      setBody(generalNutritionGuidance);
      return;
    }
    const report = reports.find((r) => r.id === reportId)?.snapshot;
    if (report)
      setBody(
        `Hi, here is ${report.player}'s coach-reviewed development update for ${report.period}.\n\nWhat was practised: ${report.practised}\n\nWhat the coach observed: ${report.evidence.map((e) => `${e.text} (Source: ${e.source})`).join("\n")}\n\nNext focus: ${report.nextStep}\n\nReview: ${report.reviewDate ?? "To be confirmed"}\n\nYou can reply privately in Sportozen Academy.\n— ${report.academy}`,
      );
  }
  return (
    <>
      {!parent && data.membership.role !== "SUPPORT" && (
        <Card>
          <h2>Create parent development update</h2>
          <p>
            Approved report → source verification → internal approval → private
            in-app publication. External delivery remains NOT_SENT.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!plans[0]) return;
              await w.save("update", {
                playerId: player.id,
                sportId,
                planId: plans[0].id,
                messageBody: body,
                type,
                sourceReportId: type === "DEVELOPMENT" ? reportId : undefined,
              });
            }}
          >
            <label>
              Update category
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setBody("");
                }}
              >
                <option value="DEVELOPMENT">Development update</option>
                <option value="NUTRITION_HYDRATION">
                  Nutrition & hydration
                </option>
              </select>
            </label>
            {type === "DEVELOPMENT" && (
              <label>
                Approved source report
                <select
                  required
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                >
                  <option value="">Select reviewed report</option>
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.period}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button type="button" variant="secondary" onClick={prefill}>
              Prepare from approved sources
            </Button>
            <label>
              Parent-friendly message
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            {type === "NUTRITION_HYDRATION" && (
              <p>
                Use the approved general guideline without clinical changes.
                Nutrition messages require academy-admin approval and parent
                opt-in.
              </p>
            )}
            <Button disabled={w.busy || !plans.length}>
              Save update draft
            </Button>
          </form>
        </Card>
      )}
      {updates.map((update) => (
        <Card key={update.id}>
          <h2>
            {update.type === "NUTRITION_HYDRATION"
              ? "Nutrition & hydration"
              : "Development update"}
          </h2>
          <div className="inline">
            <Badge>{update.approvalStatus}</Badge>
            <Badge>{update.inAppPublicationStatus}</Badge>
            <Badge>External delivery: {update.externalDeliveryStatus}</Badge>
          </div>
          <p className="message-body">
            {parent ? update.approvedBody : update.messageBody}
          </p>
          {!parent && data.membership.role !== "SUPPORT" && (
            <div className="form-stack">
              {update.sourceReportId && (
                <details>
                  <summary>Source records used</summary>
                  <p>Approved report: {update.sourceReportId}</p>
                  <p>
                    {
                      reports.find((r) => r.id === update.sourceReportId)
                        ?.snapshot?.focus
                    }
                  </p>
                </details>
              )}
              {update.approvalStatus === "DRAFT" ||
              update.approvalStatus === "REJECTED" ? (
                <Button
                  disabled={w.busy}
                  onClick={() => w.action("submitUpdate", update.id)}
                >
                  Send for approval
                </Button>
              ) : update.approvalStatus === "PENDING_APPROVAL" ? (
                <>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={verified === update.id}
                      onChange={(e) =>
                        setVerified(e.target.checked ? update.id : "")
                      }
                    />
                    I verified the correct player, authorised guardian, approved
                    source records and guidance
                  </label>
                  <Button
                    disabled={verified !== update.id || w.busy}
                    onClick={() =>
                      w.action("approveUpdate", update.id, undefined, true)
                    }
                  >
                    Approve update
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={w.busy}
                    onClick={() => w.action("rejectUpdate", update.id)}
                  >
                    Reject update
                  </Button>
                </>
              ) : (
                <p>
                  Published only to authorised, opted-in in-app recipients. No
                  external message was sent.
                </p>
              )}
            </div>
          )}
        </Card>
      ))}
      <Card>
        <h2>{parent ? "Message your coach" : "Private conversations"}</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = await w.save<WorkspaceConversation>("conversation", {
              playerId: player.id,
              guardianId: guardian,
              subject,
            });
            if (c) setOpen(c.id);
          }}
        >
          <label>
            Conversation topic
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          {!parent && (
            <label>
              Linked guardian
              <select
                required
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
              >
                <option value="">Choose authorised guardian</option>
                {data.members
                  .filter((m) => m.role === "PARENT" && m.active)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <Button disabled={w.busy || data.membership.role === "SUPPORT"}>
            Start private conversation
          </Button>
        </form>
        {conversations.map((c) => (
          <Button variant="secondary" key={c.id} onClick={() => setOpen(c.id)}>
            {c.subject} · {c.status}
            {c.messages.at(-1)?.senderRole === "PARENT" && !parent
              ? " · Parent replied"
              : ""}
          </Button>
        ))}
      </Card>
      {conversations
        .filter((c) => c.id === open)
        .map((c) => (
          <ConversationThread key={c.id} workspace={w} conversation={c} />
        ))}
    </>
  );
}
function ConversationThread({
  workspace: w,
  conversation: c,
}: {
  workspace: Controller;
  conversation: WorkspaceConversation;
}) {
  const [body, setBody] = useState(""),
    [internal, setInternal] = useState(false),
    parent = w.data!.membership.role === "PARENT";
  return (
    <Card>
      <h2>{c.subject}</h2>
      <Badge>{c.status}</Badge>
      <div className="conversation-thread">
        {c.messages.map((m) => (
          <article
            className={m.internal ? "notice amber" : "thread-message"}
            key={m.id}
          >
            <div>
              <strong>
                {m.senderRole}
                {m.internal ? " · Staff-only note" : ""}
              </strong>
              <time>
                {new Intl.DateTimeFormat(w.data!.academy.dateLocale, {
                  timeZone: w.data!.academy.timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(m.at))}
              </time>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await w.action("reply", c.id, {
            body,
            internal,
            action: "reply",
          });
          if (result) setBody("");
        }}
      >
        <label>
          {parent ? "Reply to coach" : "Conversation reply"}
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {!parent && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Staff-only internal note
          </label>
        )}
        <Button disabled={w.busy || c.status !== "OPEN"}>
          {internal ? "Save private note" : "Post reply"}
        </Button>
      </form>
      <Button
        variant="secondary"
        disabled={w.busy}
        onClick={() =>
          w.action("reply", c.id, {
            body: "Status change",
            internal: false,
            action: c.status === "OPEN" ? "close" : "reopen",
          })
        }
      >
        {c.status === "OPEN" ? "Close conversation" : "Reopen conversation"}
      </Button>
    </Card>
  );
}
