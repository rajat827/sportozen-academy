"use client";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
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
  initialFeedback = "",
  initialReportId = "",
  onFeedbackSent,
}: {
  workspace: Controller;
  player: WorkspacePlayer;
  sportId: string;
  initialFeedback?: string;
  initialReportId?: string;
  onFeedbackSent?: () => void;
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
        r.status === "Approved" &&
        r.snapshot,
    ),
    updates = data.records.update.filter(
      (u) => u.playerId === player.id && u.sportId === sportId,
    ),
    conversations = data.records.conversation.filter(
      (c) => c.playerId === player.id,
    );
  const [type, setType] = useState("DEVELOPMENT"),
    [body, setBody] = useState(""),
    [reportId, setReportId] = useState(initialReportId || reports[0]?.id || ""),
    [verified, setVerified] = useState(""),
    [subject, setSubject] = useState(
      initialFeedback ? "Parent-submitted practice feedback" : "",
    ),
    [guardian, setGuardian] = useState(parent ? data.membership.userId : ""),
    [firstMessage, setFirstMessage] = useState(initialFeedback),
    [open, setOpen] = useState(
      initialFeedback
        ? conversations.find((c) => c.status === "OPEN")?.id || ""
        : "",
    );
  useUnsavedChanges(!!body.trim() || !!firstMessage.trim());
  const sourceReport = reports.find((report) => report.id === reportId),
    sourceUnavailable =
      !!initialReportId &&
      !reports.some((report) => report.id === initialReportId),
    canDraft =
      type === "NUTRITION_HYDRATION"
        ? !!plans.length
        : !!sourceReport &&
          (!!sourceReport.planId || !!sourceReport.monthlySources) &&
          (type !== "UPCOMING_TRAINING" || !!sourceReport.approvedPlan) &&
          (type !== "REVIEWED_SESSION" ||
            !!sourceReport.sourceEvidenceIds?.length);
  function prefill() {
    if (type === "NUTRITION_HYDRATION") {
      setBody(generalNutritionGuidance);
      return;
    }
    const report = reports.find((r) => r.id === reportId)?.snapshot;
    if (report)
      setBody(
        type === "UPCOMING_TRAINING"
          ? `Hi, here is ${report.player}'s upcoming training focus from the approved plan.\n\nPlanned focus: ${report.focus}\nWhy: ${report.reviewedReason}\nPlanned drills: ${report.activities.map((a) => `${a.name}: intended to support ${a.purpose}`).join("\n")}\nWhat the coach will observe: ${report.observationCriteria}\nReview: ${report.reviewDate ?? "To be confirmed"}\nThese are planned activities, not completed results.\n— ${report.academy}`
          : `Hi, here is ${report.player}'s coach-reviewed ${type === "REVIEWED_SESSION" ? "session" : "development"} update for ${report.period}.\n\nWhat was practised: ${report.practised}\n\nReviewed evidence and coach notes: ${report.evidence.map((e) => `${e.text} (Source: ${e.source})`).join("\n")}\n\nNext focus: ${report.nextStep}\n\nReview: ${report.reviewDate ?? "To be confirmed"}\n\nYou can reply privately in Sportozen Academy.\n— ${report.academy}`,
      );
  }
  return (
    <>
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
            if (c) {
              setOpen(c.id);
            }
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
          {parent && !open && (
            <label>
              Parent-submitted practice feedback
              <textarea
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
              />
            </label>
          )}
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
              if (!canDraft || sourceUnavailable) return;
              const saved = await w.save("update", {
                playerId: player.id,
                sportId,
                planId:
                  type === "NUTRITION_HYDRATION"
                    ? plans[0].id
                    : sourceReport!.planId,
                messageBody: body,
                type,
                sourceReportId:
                  type !== "NUTRITION_HYDRATION" ? reportId : undefined,
              });
              if (saved) setBody("");
            }}
          >
            {sourceUnavailable && (
              <p role="alert">
                The selected approved report is unavailable for this child.
                Return to Reports and select an authorised source.
              </p>
            )}
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
                <option value="UPCOMING_TRAINING">
                  Upcoming training update
                </option>
                <option value="REVIEWED_SESSION">
                  Reviewed session update
                </option>
                <option value="NUTRITION_HYDRATION">
                  Nutrition & hydration
                </option>
              </select>
            </label>
            {type !== "NUTRITION_HYDRATION" && (
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
            <Button disabled={w.busy || !canDraft || sourceUnavailable}>
              Save update draft
            </Button>
            {!canDraft && (
              <p>
                This category needs its recorded approved source. Development
                updates can use an approved batch-only monthly report; upcoming
                training uses an approved plan, and reviewed session updates
                need reviewed session evidence.
              </p>
            )}
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
            {parent ? (
              <Badge>Shared in your parent app</Badge>
            ) : (
              <>
                <Badge>{update.approvalStatus}</Badge>
                <Badge>{update.inAppPublicationStatus}</Badge>
                <Badge>
                  External delivery: {update.externalDeliveryStatus}
                </Badge>
              </>
            )}
          </div>
          {parent ? (
            <>
              <p>
                {player.name} · {data.academy.name}
              </p>
              <p>
                Current focus:{" "}
                {"focus" in (update.approvedSource || {})
                  ? (
                      update.approvedSource as import("@/domain/report").ReportViewModel
                    ).focus
                  : "Academy guidance"}
              </p>
              {update.approvedSource && "nextStep" in update.approvedSource && (
                <>
                  <p>
                    Coach: {update.approvedSource.coach || data.academy.name} ·{" "}
                    {update.approvedSource.period}
                  </p>
                  <p>Next step: {update.approvedSource.nextStep}</p>
                  <p>
                    Review:{" "}
                    {update.approvedSource.reviewDate || "To be confirmed"}
                  </p>
                  {update.type !== "UPCOMING_TRAINING" &&
                    update.approvedSource.evidence[0] && (
                      <p>
                        Recorded source evidence:{" "}
                        {update.approvedSource.evidence[0].text}
                        <br />
                        Evidence source:{" "}
                        {update.approvedSource.evidence[0].source.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                    )}
                </>
              )}
              {update.type === "UPCOMING_TRAINING" && (
                <p>
                  Upcoming practice · planned activities, not completed results.
                </p>
              )}
              <details>
                <summary>Read full coach message</summary>
                <p className="message-body">{update.approvedBody}</p>
              </details>
              <Button
                variant="secondary"
                disabled={w.busy}
                onClick={async () => {
                  const conversation = conversations.find(
                    (c) => c.updateId === update.id && c.status === "OPEN",
                  );
                  if (conversation) setOpen(conversation.id);
                  else {
                    const created = await w.save<WorkspaceConversation>(
                      "conversation",
                      {
                        playerId: player.id,
                        guardianId: data.membership.userId,
                        updateId: update.id,
                        subject: `Question about ${player.name}'s coach update`,
                      },
                    );
                    if (created) setOpen(created.id);
                  }
                }}
              >
                Message coach
              </Button>
            </>
          ) : (
            <p className="message-body">{update.messageBody}</p>
          )}
          {!parent && data.membership.role !== "SUPPORT" && (
            <div className="form-stack">
              {update.sourceReportId && (
                <details>
                  <summary>Source records used</summary>
                  <p>Approved report: {update.sourceReportId}</p>
                  {reports
                    .find((r) => r.id === update.sourceReportId)
                    ?.snapshot?.evidence.map((source, i) => (
                      <p key={i}>
                        {source.text} · {source.source} · {source.reference}
                      </p>
                    ))}
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
                  onClick={() =>
                    w.action("submitUpdate", update.id, {
                      expectedVersion: update.recordVersion,
                    })
                  }
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
                      w.action(
                        "approveUpdate",
                        update.id,
                        { expectedVersion: update.recordVersion },
                        true,
                      )
                    }
                  >
                    Approve update
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={w.busy}
                    onClick={() =>
                      w.action("rejectUpdate", update.id, {
                        expectedVersion: update.recordVersion,
                      })
                    }
                  >
                    Reject update
                  </Button>
                </>
              ) : update.inAppPublicationStatus !== "PUBLISHED" ? (
                <Button
                  disabled={w.busy}
                  onClick={() =>
                    w.action("publishUpdate", update.id, {
                      expectedVersion: update.recordVersion,
                    })
                  }
                >
                  Share in parent app
                </Button>
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
      {conversations
        .filter((c) => c.id === open)
        .map((c) => (
          <ConversationThread
            key={c.id}
            workspace={w}
            conversation={c}
            initialBody={firstMessage}
            onSent={() => {
              setFirstMessage("");
              onFeedbackSent?.();
            }}
          />
        ))}
    </>
  );
}
function ConversationThread({
  workspace: w,
  conversation: c,
  initialBody = "",
  onSent,
}: {
  workspace: Controller;
  conversation: WorkspaceConversation;
  initialBody?: string;
  onSent?: () => void;
}) {
  const [body, setBody] = useState(initialBody),
    [internal, setInternal] = useState(false),
    parent = w.data!.membership.role === "PARENT";
  useUnsavedChanges(!!body.trim());
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
                {m.channel === "WHATSAPP" ? " · WhatsApp" : " · In-app"}
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
            {!parent && !m.internal && m.senderRole !== "PARENT" && (
              <Button
                variant="secondary"
                disabled={w.busy}
                onClick={() =>
                  w.communication({
                    action: "whatsappReply",
                    data: {
                      conversationId: c.id,
                      messageId: m.id,
                      verified: true,
                    },
                  })
                }
              >
                Send this reply via WhatsApp
              </Button>
            )}
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
          if (result) {
            setBody("");
            onSent?.();
          }
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
