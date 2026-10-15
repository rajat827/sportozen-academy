"use client";
import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { WorkspacePlayer } from "@/domain/workspace";
import type { TrialPayload, TrialView } from "@/domain/trial";
import { useTrials, type TrialAction } from "@/hooks/use-trials";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  financeAmountInput,
  formatFinanceMoney,
  parseFinanceAmount,
} from "@/services/finance-rules";
import { academyDate, playerBatch } from "@/services/portal-records";
import type { PortalController } from "./portal-types";
import "./portal-trials.css";

const title: Record<TrialAction, string> = {
  create: "Create trial enrolment",
  policy: "Academy trial rules",
  transition: "Update trial status",
  feedback: "Record trial feedback",
  review: "Review trial summary",
  publish: "Publish reviewed trial summary",
  convert: "Convert to regular enrolment",
  invoice: "Issue trial invoice",
};
const label = (value: string) => value.toLowerCase().replaceAll("_", " ");
const nextStatuses: Record<string, string[]> = {
  SCHEDULED: ["ACTIVE", "CANCELLED", "EXPIRED", "NOT_CONVERTED"],
  ACTIVE: ["COMPLETED", "EXPIRED", "CANCELLED", "NOT_CONVERTED"],
  COMPLETED: ["NOT_CONVERTED"],
  EXPIRED: ["NOT_CONVERTED"],
};
function endDate(start: string, duration: number | null) {
  if (!duration) return "";
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + duration - 1);
  return date.toISOString().slice(0, 10);
}
type Props = { workspace: PortalController; player: WorkspacePlayer };
export function PortalTrials({ workspace, player }: Props) {
  const trials = useTrials(workspace, player.id),
    data = workspace.data!;
  const [editor, setEditor] = useState<{
      action: TrialAction;
      trial?: TrialView;
    } | null>(null),
    [notice, setNotice] = useState("");
  if (!["OWNER", "ADMIN", "COACH"].includes(data.membership.role)) return null;
  const account = trials.data,
    admin = account?.canManage;
  const open = (action: TrialAction, trial?: TrialView) => {
    setNotice("");
    setEditor({ action, trial });
  };
  return (
    <section className="portal-card portal-trials" aria-label="Trial enrolment">
      <div className="portal-card-heading">
        <h3>Trial enrolment</h3>
        {admin && (
          <button className="portal-link" onClick={() => open("policy")}>
            Academy trial rules
          </button>
        )}
      </div>
      {trials.error && <p role="alert">{trials.error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!account ? (
        trials.error ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => trials.reload().catch(() => {})}
          >
            Retry trial records
          </button>
        ) : (
          <p>Loading authorised trial records…</p>
        )
      ) : (
        <>
          {!account.enrolments.length && <p>No trial enrolment recorded.</p>}
          {account.enrolments.map((trial) => (
            <div className="portal-trial-record" key={trial.id}>
              <p>
                <span className="portal-status">
                  {label(trial.effectiveStatus)}
                </span>{" "}
                · {trial.startDate} – {trial.endDate}
              </p>
              <p>
                {trial.pricing === "FREE"
                  ? "Free trial"
                  : `${formatFinanceMoney(trial.feeMinor, trial.currency, data.academy.dateLocale)} trial fee`}
                {trial.invoiceId
                  ? " · Invoice issued separately"
                  : " · No invoice issued"}
              </p>
              <details>
                <summary>Trial records and actions</summary>
                <p>
                  {trial.sources.sessionIds.length} completed sessions ·{" "}
                  {trial.sources.attendanceIds.length} attendance records ·{" "}
                  {trial.sources.evidenceIds.length} eligible reviewed
                  observations.
                </p>
                <p>{trial.feedback || "No coach trial feedback recorded."}</p>
                {trial.reviewedSummary && (
                  <p>
                    <strong>Reviewed summary:</strong>{" "}
                    {trial.reviewedSummary.body}
                  </p>
                )}
                <p>
                  {trial.publishedSummary
                    ? "Reviewed summary published to linked parents."
                    : "Trial summary has not been published to parents."}
                </p>
                <div className="portal-actions">
                  {(admin || trial.coachId === data.membership.userId) && (
                    <button
                      className="button secondary"
                      onClick={() => open("feedback", trial)}
                    >
                      Record trial feedback
                    </button>
                  )}
                  {admin && (
                    <>
                      {!!nextStatuses[trial.status]?.length && (
                        <button
                          className="button secondary"
                          onClick={() => open("transition", trial)}
                        >
                          Update trial status
                        </button>
                      )}
                      <button
                        className="button secondary"
                        onClick={() => open("review", trial)}
                      >
                        Review trial summary
                      </button>
                      <button
                        className="button secondary"
                        disabled={!trial.reviewedSummary}
                        onClick={() => open("publish", trial)}
                      >
                        Publish reviewed trial summary
                      </button>
                      {["ACTIVE", "COMPLETED", "EXPIRED"].includes(
                        trial.effectiveStatus,
                      ) && (
                        <button
                          className="button secondary"
                          onClick={() => open("convert", trial)}
                        >
                          Convert to regular enrolment
                        </button>
                      )}
                      {trial.pricing === "PAID" &&
                        !trial.invoiceId &&
                        !["CANCELLED", "NOT_CONVERTED"].includes(
                          trial.status,
                        ) &&
                        data.academy.modules.includes("fees") && (
                          <button
                            className="button secondary"
                            onClick={() => open("invoice", trial)}
                          >
                            Issue trial invoice
                          </button>
                        )}
                    </>
                  )}
                </div>
                <details>
                  <summary>Decision history</summary>
                  {trial.history.map((event, index) => (
                    <p key={`${event.at}:${index}`}>
                      <time>{event.at.slice(0, 10)}</time> ·{" "}
                      {label(event.status)} · {event.reason}
                    </p>
                  ))}
                </details>
              </details>
            </div>
          ))}
          {admin && (
            <>
              <button
                className="button secondary"
                disabled={
                  !player.squadId ||
                  !player.coachId ||
                  player.status === "INACTIVE"
                }
                onClick={() => open("create")}
              >
                Create trial enrolment
              </button>
              {(!player.squadId || !player.coachId) && (
                <p>
                  Assign this player to an academy batch and coach before
                  creating a trial.
                </p>
              )}
            </>
          )}
        </>
      )}
      {editor && account && (
        <TrialDialog
          key={`${editor.action}:${editor.trial?.id ?? "new"}`}
          workspace={workspace}
          player={player}
          account={account}
          action={editor.action}
          trial={editor.trial}
          busy={trials.busy}
          error={trials.error}
          onClose={() => setEditor(null)}
          onSave={async (action, values, extra) => {
            const result = await trials.mutate(action, values, extra);
            if (result) {
              setNotice(
                action === "convert"
                  ? "Converted to regular enrolment. Player identity and history are preserved; no fees were charged."
                  : action === "invoice"
                    ? "Trial invoice issued. No payment has been collected."
                    : "Trial record saved.",
              );
              return true;
            }
            return false;
          }}
        />
      )}
    </section>
  );
}

function TrialDialog({
  workspace,
  player,
  account,
  action,
  trial,
  busy,
  error,
  onClose,
  onSave,
}: Props & {
  account: TrialPayload;
  action: TrialAction;
  trial?: TrialView;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (
    action: TrialAction,
    values: unknown,
    extra?: { id?: string; expectedVersion?: number },
  ) => Promise<boolean>;
}) {
  const [dirty, setDirty] = useState(false),
    [validation, setValidation] = useState(""),
    [paid, setPaid] = useState(false),
    [paidAllowed, setPaidAllowed] = useState(account.policy.paidTrialsAllowed);
  useUnsavedChanges(dirty);
  const data = workspace.data!,
    policy = account.policy,
    today = academyDate(data),
    assignedCoach = data.members.find(
      (member) => member.userId === player.coachId,
    );
  function close() {
    if (!busy && (!dirty || window.confirm("Discard the unsaved trial draft?")))
      onClose();
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="portal-overlay" />
        <Dialog.Content
          className="portal-dialog portal-trial-dialog"
          style={
            {
              "--portal-trial-accent": data.academy.brandAccent,
            } as CSSProperties
          }
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            close();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title>{title[action]}</Dialog.Title>
          <Dialog.Description>
            {player.name} · {data.academy.name}. Training history stays with the
            existing player.
          </Dialog.Description>
          <button
            type="button"
            className="portal-icon close"
            aria-label="Close trial editor"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
          <form
            className="form-stack portal-trial-form"
            onChange={() => setDirty(true)}
            onSubmit={async (event) => {
              event.preventDefault();
              setValidation("");
              const form = new FormData(event.currentTarget),
                value = (name: string) => String(form.get(name) ?? "").trim();
              try {
                let values: unknown;
                if (action === "create")
                  values = {
                    playerId: player.id,
                    squadId: player.squadId,
                    coachId: player.coachId,
                    startDate: value("start"),
                    endDate: value("end"),
                    pricing: paid ? "PAID" : "FREE",
                    feeMinor: paid ? policy.defaultFeeMinor : 0,
                    currency: policy.currency,
                  };
                else if (action === "policy")
                  values = {
                    defaultDurationDays: value("duration")
                      ? Number(value("duration"))
                      : null,
                    paidTrialsAllowed: paidAllowed,
                    defaultFeeMinor: paidAllowed
                      ? parseFinanceAmount(value("fee"), policy.currency)
                      : 0,
                    currency: policy.currency,
                    feeRuleNote: value("rule"),
                  };
                else if (action === "feedback")
                  values = { feedback: value("feedback") };
                else if (action === "review")
                  values = {
                    summary: value("summary"),
                    reviewed: form.get("reviewed") === "on",
                  };
                else if (action === "publish")
                  values = { publish: form.get("reviewed") === "on" };
                else if (action === "convert")
                  values = {
                    reviewed: form.get("reviewed") === "on",
                    reason: value("reason"),
                  };
                else if (action === "invoice")
                  values = {
                    reviewed: form.get("reviewed") === "on",
                    dueDate: value("dueDate"),
                  };
                else
                  values = { status: value("status"), reason: value("reason") };
                if (
                  await onSave(action, values, {
                    id: trial?.id,
                    expectedVersion:
                      action === "policy" ? policy.version : trial?.version,
                  })
                ) {
                  setDirty(false);
                  onClose();
                }
              } catch (cause) {
                setValidation(
                  cause instanceof Error
                    ? cause.message
                    : "Check the trial fields.",
                );
              }
            }}
          >
            <div className="portal-trial-fields">
              {action === "create" && (
                <>
                  <label>
                    Training batch
                    <input readOnly value={playerBatch(data, player)} />
                  </label>
                  <label>
                    Responsible coach
                    <input
                      readOnly
                      value={assignedCoach?.name ?? "Assigned academy coach"}
                    />
                  </label>
                  <div className="portal-form-grid">
                    <label>
                      Trial start date
                      <input
                        name="start"
                        type="date"
                        required
                        defaultValue={today}
                      />
                    </label>
                    <label>
                      Trial end date
                      <input
                        name="end"
                        type="date"
                        required
                        defaultValue={endDate(
                          today,
                          policy.defaultDurationDays,
                        )}
                      />
                    </label>
                  </div>
                  <p>
                    {policy.defaultDurationDays
                      ? `Academy default: ${policy.defaultDurationDays} days. Confirm the actual dates above.`
                      : "The academy has no default trial duration. Enter both actual dates."}
                  </p>
                  <label>
                    Trial pricing
                    <select
                      aria-label="Trial pricing"
                      value={paid ? "PAID" : "FREE"}
                      onChange={(event) =>
                        setPaid(event.target.value === "PAID")
                      }
                    >
                      <option value="FREE">Free trial</option>
                      <option value="PAID" disabled={!policy.paidTrialsAllowed}>
                        Paid trial under academy rules
                      </option>
                    </select>
                  </label>
                  {paid && (
                    <p>
                      {formatFinanceMoney(
                        policy.defaultFeeMinor,
                        policy.currency,
                        data.academy.dateLocale,
                      )}{" "}
                      · {policy.feeRuleNote}
                    </p>
                  )}
                  <p>
                    Saving the trial does not issue an invoice, charge the
                    player or change historical fees. Attendance and coach
                    evidence use the normal Training workflow.
                  </p>
                </>
              )}
              {action === "policy" && (
                <>
                  <label>
                    Default trial duration in days (optional)
                    <input
                      name="duration"
                      type="number"
                      min="1"
                      max="366"
                      step="1"
                      defaultValue={policy.defaultDurationDays ?? ""}
                    />
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={paidAllowed}
                      onChange={(event) => setPaidAllowed(event.target.checked)}
                    />
                    Allow paid trials under the academy fee rule
                  </label>
                  {paidAllowed && (
                    <>
                      <label>
                        Trial fee amount ({policy.currency})
                        <input
                          name="fee"
                          required
                          inputMode="decimal"
                          defaultValue={financeAmountInput(
                            policy.defaultFeeMinor,
                            policy.currency,
                          )}
                        />
                      </label>
                      <label>
                        Approved trial fee rule
                        <textarea
                          name="rule"
                          required
                          maxLength={2000}
                          rows={4}
                          defaultValue={policy.feeRuleNote}
                        />
                      </label>
                    </>
                  )}
                  <p>
                    These are academy defaults. Existing enrolments and
                    financial transactions are retained. Invoices require a
                    separate explicit review.
                  </p>
                </>
              )}
              {action === "feedback" && (
                <label>
                  Coach trial feedback
                  <textarea
                    name="feedback"
                    required
                    maxLength={4000}
                    rows={5}
                    defaultValue={trial?.feedback}
                  />
                </label>
              )}
              {action === "review" && (
                <>
                  <p>
                    {trial?.sources.evidenceIds.length ?? 0} eligible reviewed
                    observations. When evidence is insufficient, state
                    “insufficient reviewed evidence”; do not invent a monthly
                    assessment.
                  </p>
                  <label>
                    Reviewed trial summary
                    <textarea
                      name="summary"
                      required
                      maxLength={4000}
                      rows={6}
                      defaultValue={trial?.reviewedSummary?.body ?? ""}
                    />
                  </label>
                </>
              )}
              {action === "publish" && (
                <>
                  <p>{trial?.reviewedSummary?.body}</p>
                  <p>
                    Publish only this reviewed summary to the player&apos;s
                    linked parents. No WhatsApp message is sent.
                  </p>
                </>
              )}
              {action === "convert" && (
                <p>
                  Convert this trial to a regular enrolment using the same
                  player ID. Guardian links, attendance, feedback, observations
                  and financial history are retained. No retrospective invoice
                  or charge is created.
                </p>
              )}
              {action === "invoice" && (
                <>
                  <p>
                    Issue one manual invoice for{" "}
                    {formatFinanceMoney(
                      trial?.feeMinor ?? 0,
                      trial?.currency ?? policy.currency,
                      data.academy.dateLocale,
                    )}{" "}
                    under the approved academy rule: {policy.feeRuleNote}. No
                    payment is collected.
                  </p>
                  <label>
                    Trial invoice due date
                    <input
                      type="date"
                      name="dueDate"
                      required
                      defaultValue={today}
                    />
                  </label>
                </>
              )}
              {action === "transition" && (
                <label>
                  Trial status
                  <select name="status" aria-label="Trial status" required>
                    {(nextStatuses[trial?.status ?? ""] ?? []).map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {["transition", "convert"].includes(action) && (
                <label>
                  Decision reason
                  <textarea name="reason" required maxLength={4000} rows={3} />
                </label>
              )}
              {["review", "publish", "convert", "invoice"].includes(action) && (
                <label className="check-row">
                  <input name="reviewed" type="checkbox" required />I reviewed
                  this{" "}
                  {action === "publish"
                    ? "summary and its parent publication"
                    : action === "invoice"
                      ? "trial fee rule, amount and invoice"
                      : action === "convert"
                        ? "conversion and preserved player history"
                        : "summary against the recorded trial evidence"}
                </label>
              )}
              {(validation || error) && (
                <p role="alert">{validation || error}</p>
              )}
            </div>
            <div className="portal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={close}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : action === "create"
                    ? "Save Trial Enrolment"
                    : action === "policy"
                      ? "Save Trial Rules"
                      : title[action]}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function PortalTrialParentSummary({ workspace, player }: Props) {
  const trials = useTrials(workspace, player.id);
  const published = trials.data?.enrolments.filter(
    (trial) => trial.publishedSummary,
  );
  if (!published?.length) return null;
  return (
    <section
      className="portal-card portal-trials"
      aria-label="Reviewed trial summary"
    >
      <h3>Reviewed trial summary</h3>
      {published.map((trial) => (
        <div key={trial.id}>
          <p>
            {trial.startDate} – {trial.endDate}
          </p>
          <p>{trial.publishedSummary!.body}</p>
        </div>
      ))}
    </section>
  );
}
