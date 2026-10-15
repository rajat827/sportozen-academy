"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type {
  FinanceCommand,
  FinanceInvoiceView,
  FinancePayload,
  FinancePayment,
} from "@/domain/finance";
import type { WorkspacePayload } from "@/domain/workspace";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  parseFinanceAmount,
  currencyDigits,
  formatFinanceMoney,
} from "@/services/finance-rules";

export type FeeEditorMode = FinanceCommand["action"];
const titles: Record<FeeEditorMode, string> = {
  plan: "Create fee plan",
  invoice: "Issue player invoice",
  reference: "Record payment reference",
  verify: "Verify payment reference",
  reject: "Reject payment reference",
  adjustment: "Approve invoice adjustment",
  reminder: "Send private in-app reminder",
};
export function PortalFeeEditor({
  mode,
  account,
  workspace,
  invoice,
  payment,
  initialPlayer,
  busy,
  error,
  onClose,
  onSave,
}: {
  mode: FeeEditorMode;
  account: FinancePayload;
  workspace: WorkspacePayload;
  invoice?: FinanceInvoiceView;
  payment?: FinancePayment;
  initialPlayer?: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (
    action: FeeEditorMode,
    values: unknown,
    extra?: { id?: string; expectedVersion?: number },
  ) => Promise<boolean>;
}) {
  const [dirty, setDirty] = useState(false),
    [validation, setValidation] = useState("");
  const [planId, setPlanId] = useState("");
  useUnsavedChanges(dirty);
  const selectedPlan = account.plans.find((plan) => plan.id === planId);
  const currency =
    invoice?.currency ?? selectedPlan?.currency ?? workspace.academy.currency;
  function close() {
    if (!dirty || window.confirm("Discard the unsaved fee draft?")) onClose();
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="pf-dialog-overlay" />
        <Dialog.Content
          className="pf-dialog"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <Dialog.Title>{titles[mode]}</Dialog.Title>
          <Dialog.Description>
            Academy training fees · {workspace.academy.name}. Online collection
            is not connected.
          </Dialog.Description>
          <button
            className="pf-icon pf-close"
            aria-label="Close fee editor"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
          <form
            className="pf-form"
            onChange={() => setDirty(true)}
            onSubmit={async (event) => {
              event.preventDefault();
              setValidation("");
              const form = new FormData(event.currentTarget),
                value = (name: string) => String(form.get(name) ?? "").trim();
              try {
                let data: unknown;
                let extra: { id?: string; expectedVersion?: number } = {};
                if (mode === "plan")
                  data = {
                    name: value("name"),
                    amountMinor: parseFinanceAmount(value("amount"), currency),
                    currency,
                    cadence: value("cadence"),
                    active: true,
                  };
                else if (mode === "invoice")
                  data = {
                    playerId: value("player"),
                    planId: planId || undefined,
                    label: value("label"),
                    chargeMinor:
                      selectedPlan?.amountMinor ??
                      parseFinanceAmount(value("amount"), currency),
                    currency,
                    periodStart: value("start"),
                    periodEnd: value("end"),
                    dueDate: value("due"),
                  };
                else if (mode === "reference")
                  data = {
                    invoiceId: invoice?.id,
                    amountMinor: parseFinanceAmount(value("amount"), currency),
                    currency,
                    reference: value("reference"),
                    method: value("method"),
                    paidOn: value("paidOn"),
                  };
                else if (mode === "verify" || mode === "reject") {
                  data = {
                    reviewed: form.get("reviewed") === "on",
                    note: value("reason"),
                  };
                  extra = {
                    id: payment?.id,
                    expectedVersion: payment?.version,
                  };
                } else if (mode === "adjustment") {
                  data = {
                    invoiceId: invoice?.id,
                    direction: value("direction"),
                    amountMinor: parseFinanceAmount(value("amount"), currency),
                    currency,
                    reason: value("reason"),
                    reviewed: form.get("reviewed") === "on",
                  };
                  extra = { expectedVersion: invoice?.version };
                } else data = { invoiceId: invoice?.id, body: value("body") };
                if (await onSave(mode, data, extra)) {
                  setDirty(false);
                  onClose();
                }
              } catch (cause) {
                setValidation(
                  cause instanceof Error
                    ? cause.message
                    : "Check the fee fields.",
                );
              }
            }}
          >
            {mode === "plan" && (
              <>
                <label>
                  Plan name
                  <input name="name" required maxLength={200} />
                </label>
                <label>
                  Billing cadence
                  <select name="cadence" aria-label="Billing cadence">
                    <option value="MONTHLY">Monthly</option>
                    <option value="TERM">Term</option>
                    <option value="ONE_TIME">One time</option>
                  </select>
                </label>
              </>
            )}
            {mode === "invoice" && (
              <>
                <label>
                  Player
                  <select
                    name="player"
                    aria-label="Player"
                    required
                    defaultValue={initialPlayer ?? ""}
                  >
                    <option value="">Choose a player</option>
                    {workspace.records.player.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} · {player.squad}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fee plan
                  <select
                    aria-label="Fee plan"
                    value={planId}
                    onChange={(event) => setPlanId(event.target.value)}
                  >
                    <option value="">Individual charge</option>
                    {account.plans
                      .filter((plan) => plan.active)
                      .map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {plan.currency}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Invoice label
                  <input
                    name="label"
                    required
                    defaultValue="Football training"
                    maxLength={200}
                  />
                </label>
                <div className="pf-fields">
                  <label>
                    Billing period start
                    <input type="date" name="start" required />
                  </label>
                  <label>
                    Billing period end
                    <input type="date" name="end" required />
                  </label>
                </div>
                <label>
                  Due date
                  <input type="date" name="due" required />
                </label>
              </>
            )}
            {["plan", "invoice", "reference", "adjustment"].includes(mode) &&
              !(mode === "invoice" && selectedPlan) && (
                <label>
                  Amount ({currency})
                  <input
                    name="amount"
                    aria-label={`Amount (${currency})`}
                    required
                    inputMode="decimal"
                    placeholder={currencyDigits(currency) ? "0.00" : "0"}
                  />
                  <small>
                    Recorded in {currency}; no money is collected here.
                  </small>
                </label>
              )}
            {selectedPlan && mode === "invoice" && (
              <p>
                Uses the recorded plan amount. Scholarships and adjustments
                require a separate reviewed event.
              </p>
            )}
            {mode === "reference" && (
              <>
                <label>
                  Payment reference
                  <input
                    name="reference"
                    required
                    minLength={3}
                    maxLength={160}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Recorded method
                  <select name="method" aria-label="Recorded method">
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other manual method</option>
                  </select>
                </label>
                <label>
                  Payment date
                  <input
                    name="paidOn"
                    type="date"
                    required
                    max={account.asOfDate}
                    defaultValue={account.asOfDate}
                  />
                </label>
                <p className="pf-note">
                  A submitted reference remains pending. It does not reduce the
                  balance or create a receipt until separately verified.
                </p>
              </>
            )}
            {mode === "adjustment" && (
              <label>
                Adjustment type
                <select name="direction" aria-label="Adjustment type">
                  <option value="CREDIT">Credit / scholarship</option>
                  <option value="DEBIT">Additional approved charge</option>
                </select>
              </label>
            )}
            {["verify", "reject", "adjustment"].includes(mode) && (
              <>
                <label>
                  {mode === "adjustment"
                    ? "Adjustment reason"
                    : "Verification note"}
                  <textarea name="reason" required maxLength={2000} rows={3} />
                </label>
                <label className="pf-check">
                  <input
                    key={`${invoice?.version}:${payment?.version}`}
                    type="checkbox"
                    name="reviewed"
                    required
                  />
                  {mode === "adjustment"
                    ? "I reviewed and approved this amount and reason"
                    : mode === "reject"
                      ? "I reviewed this reference and recorded why it cannot be verified"
                      : "I matched this reference, invoice and amount against the academy record"}
                </label>
              </>
            )}
            {invoice && (
              <p className="pf-note">
                {invoice.snapshot.playerName} · {invoice.label} · Current amount
                due{" "}
                {formatFinanceMoney(
                  invoice.outstandingMinor,
                  invoice.currency,
                  workspace.academy.dateLocale,
                )}
              </p>
            )}
            {payment && (
              <p className="pf-note">
                Payment:{" "}
                {formatFinanceMoney(
                  payment.amountMinor,
                  payment.currency,
                  workspace.academy.dateLocale,
                )}{" "}
                · Reference: {payment.reference} · invoice {invoice?.number}
              </p>
            )}
            {mode === "reminder" && (
              <>
                <label>
                  Private reminder
                  <textarea
                    name="body"
                    required
                    maxLength={2000}
                    rows={4}
                    defaultValue="Please review the outstanding academy training invoice in your private fee account. Contact the academy if you need clarification."
                  />
                </label>
                <p className="pf-note">
                  Published only to current linked parents in this app. No
                  WhatsApp, SMS or email is sent.
                </p>
              </>
            )}
            {(validation || error) && (
              <p role="alert" className="pf-error">
                {validation || error}
              </p>
            )}
            <div className="pf-actions">
              <button
                className="pf-button"
                type="button"
                disabled={busy}
                onClick={close}
              >
                Cancel
              </button>
              <button
                className="pf-button primary"
                type="submit"
                disabled={busy}
              >
                {busy ? "Saving…" : titles[mode]}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
