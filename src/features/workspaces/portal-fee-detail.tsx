"use client";
import {
  FileText,
  MessageCircle,
  Receipt,
  Send,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type {
  FinanceInvoiceView,
  FinancePayload,
  FinancePayment,
} from "@/domain/finance";
import type { WorkspacePayload } from "@/domain/workspace";
import { Avatar } from "@/components/ui/primitives";
import { formatFinanceMoney as money } from "@/services/finance-rules";
import { playerBatch } from "@/services/portal-records";
import type { FeeEditorMode } from "./portal-fee-editor";

export function PortalFeeDetail({
  invoice,
  account,
  workspace,
  onAction,
  onClose,
  onMessageParent,
  onViewPlayer,
}: {
  invoice: FinanceInvoiceView;
  account: FinancePayload;
  workspace: WorkspacePayload;
  onAction: (mode: FeeEditorMode, payment?: FinancePayment) => void;
  onClose: () => void;
  onMessageParent?: (id: string) => void;
  onViewPlayer?: (id: string) => void;
}) {
  const player = workspace.records.player.find(
    (item) => item.id === invoice.playerId,
  );
  const payments = account.payments.filter(
    (item) => item.invoiceId === invoice.id,
  );
  const receipts = account.receipts.filter(
    (item) => item.invoiceId === invoice.id,
  );
  const reminders = account.reminders.filter(
    (item) => item.invoiceId === invoice.id,
  );
  const guardians = (workspace.guardians ?? []).filter(
    (guardian) => guardian.playerId === invoice.playerId,
  );
  const guardianNames = [
    ...new Set(guardians.map((guardian) => guardian.name)),
  ];
  const format = (amount: number) =>
    money(amount, invoice.currency, workspace.academy.dateLocale);
  const url = (kind: "invoice" | "receipt", id: string) =>
    `/api/workspaces/${workspace.academy.id}/finance/${kind}/${id}/pdf`;
  return (
    <aside className="pf-detail" aria-label="Selected player fee account">
      <button
        className="pf-icon pf-detail-close"
        aria-label="Close player fee details"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <div className="pf-player-head">
        <Avatar name={player?.name ?? invoice.snapshot.playerName} large />
        <div>
          <h2>{player?.name ?? invoice.snapshot.playerName}</h2>
          <p>
            {player ? playerBatch(workspace, player) : "Batch not recorded"}
          </p>
        </div>
      </div>
      <div className="pf-guardian">
        <span className="pf-guardian-icon">
          <UserRound size={23} />
        </span>
        <div>
          <p>{guardianNames.length > 1 ? "Parents" : "Parent"}</p>
          <strong>
            {guardianNames.join(", ") || "No linked parent recorded"}
          </strong>
          <small>Phone not recorded</small>
        </div>
      </div>
      <section className="pf-detail-card">
        <div className="pf-card-title">
          <h3>Fee Summary</h3>
          <span className={`pf-status ${invoice.status.toLowerCase()}`}>
            {invoice.status === "PARTIAL" && invoice.overdue
              ? "Partial · overdue"
              : invoice.status.toLowerCase()}
          </span>
        </div>
        <dl>
          <div>
            <dt>Training fee</dt>
            <dd>{format(invoice.chargeMinor)}</dd>
          </div>
          <div>
            <dt>Billing period</dt>
            <dd>
              {invoice.periodStart} – {invoice.periodEnd}
            </dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{invoice.dueDate}</dd>
          </div>
          <div>
            <dt>Approved adjustments</dt>
            <dd>{format(invoice.adjustmentMinor)}</dd>
          </div>
          <div>
            <dt>Verified payments</dt>
            <dd>{format(invoice.paidMinor)}</dd>
          </div>
          <div>
            <dt>Amount due</dt>
            <dd className={invoice.outstandingMinor ? "pf-due" : ""}>
              {format(invoice.outstandingMinor)}
            </dd>
          </div>
        </dl>
        {account.canManage && invoice.outstandingMinor > 0 && (
          <button
            className="pf-button primary pf-wide"
            onClick={() => onAction("reference")}
          >
            <Wallet size={17} />
            Record payment reference
          </button>
        )}
        <p className="pf-note">
          Online collection is not connected. Pending references do not reduce
          the balance.
        </p>
      </section>
      <section className="pf-detail-card">
        <h3>Payment History</h3>
        {!payments.length ? (
          <div className="pf-empty compact">
            <Receipt size={29} />
            <strong>No payments yet</strong>
            <p>No payment reference is recorded for this invoice.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <div className="pf-event" key={payment.id}>
              <div>
                <strong>{format(payment.amountMinor)}</strong>
                <p>{payment.reference}</p>
                <small>
                  {payment.paidOn} ·{" "}
                  {payment.method.toLowerCase().replaceAll("_", " ")}
                </small>
              </div>
              <span className="pf-status">{payment.status.toLowerCase()}</span>
              {account.canManage && payment.status === "PENDING" && (
                <div className="pf-actions">
                  <button
                    className="pf-button"
                    onClick={() => onAction("verify", payment)}
                  >
                    Verify reference
                  </button>
                  <button
                    className="pf-button"
                    onClick={() => onAction("reject", payment)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {receipts.map((receipt) => (
          <a
            className="pf-document"
            key={receipt.id}
            href={url("receipt", receipt.id)}
          >
            <Receipt size={16} />
            Download verified receipt · {format(receipt.amountMinor)}
          </a>
        ))}
      </section>
      <section className="pf-detail-card">
        <h3>Communication</h3>
        {account.canManage && (
          <div className="pf-actions">
            <button
              className="pf-button"
              disabled={!invoice.outstandingMinor}
              onClick={() => onAction("reminder")}
            >
              <Send size={16} />
              Send Reminder
            </button>
            {onMessageParent && (
              <button
                className="pf-button"
                disabled={!guardians.length}
                onClick={() => onMessageParent(invoice.playerId)}
              >
                <MessageCircle size={16} />
                Message Parent
              </button>
            )}
          </div>
        )}
        {!reminders.length && (
          <p className="pf-note">No private fee reminders recorded.</p>
        )}
        {reminders.map((reminder) => (
          <div key={reminder.id} className="pf-event">
            <p>{reminder.body}</p>
            <small>
              In app · {reminder.createdAt.slice(0, 10)} · External not sent
            </small>
          </div>
        ))}
      </section>
      <section className="pf-detail-card">
        <h3>Actions</h3>
        <div className="pf-actions pf-account-actions">
          <a className="pf-button" href={url("invoice", invoice.id)}>
            <FileText size={16} />
            Download Invoice
          </a>
          {account.canManage && onViewPlayer && (
            <button
              className="pf-button"
              onClick={() => onViewPlayer(invoice.playerId)}
            >
              <UserRound size={16} />
              View Player Profile
            </button>
          )}
          {account.canManage && (
            <button
              className="pf-button pf-adjustment-action"
              onClick={() => onAction("adjustment")}
            >
              Approve adjustment
            </button>
          )}
        </div>
        <small className="pf-note">{invoice.number}</small>
      </section>
    </aside>
  );
}
