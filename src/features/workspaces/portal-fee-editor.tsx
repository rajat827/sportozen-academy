"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type {
  FinanceBatchAssignment,
  FinanceBillingFrequency,
  FinanceCommand,
  FinanceInvoiceSuggestion,
  FinanceInvoiceView,
  FinancePayload,
  FinancePayment,
  FinancePlan,
  FinancePlayerOverride,
} from "@/domain/finance";
import { financeBillingFrequencies } from "@/domain/finance";
import type { WorkspacePayload } from "@/domain/workspace";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  parseFinanceAmount,
  currencyDigits,
  formatFinanceMoney,
  financeAmountInput,
  financeFrequencyLabel,
  financeOverrideSummary,
  financePerSessionNotice,
  parseDiscountPercent,
} from "@/services/finance-rules";
import { playerBatch } from "@/services/portal-records";

export type FeeEditorMode =
  | Extract<
      FinanceCommand["action"],
      | "plan"
      | "batchAssignment"
      | "playerOverride"
      | "invoice"
      | "reference"
      | "verify"
      | "reject"
      | "adjustment"
      | "reminder"
    >
  // Reviewed invoice workflows that submit the existing invoice command.
  | "suggestion"
  | "oneTime";
const titles: Record<FeeEditorMode, string> = {
  plan: "Create fee plan",
  batchAssignment: "Assign batch fee plan",
  playerOverride: "Add player fee exception",
  suggestion: "Review suggested invoice",
  oneTime: "Issue one-time charge",
  invoice: "Issue player invoice",
  reference: "Record payment reference",
  verify: "Verify payment reference",
  reject: "Reject payment reference",
  adjustment: "Approve invoice adjustment",
  reminder: "Send private in-app reminder",
};
const zeroChargeLabels = {
  FREE: "Free plan",
  SCHOLARSHIP: "Scholarship",
  WAIVER: "Waiver",
};
const frequencyOf = (plan: FinancePlan) =>
  plan.billingFrequency ?? plan.cadence;
export function PortalFeeEditor({
  mode,
  account,
  workspace,
  invoice,
  payment,
  plan,
  assignment,
  override,
  suggestion,
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
  plan?: FinancePlan;
  assignment?: FinanceBatchAssignment;
  override?: FinancePlayerOverride;
  suggestion?: FinanceInvoiceSuggestion;
  initialPlayer?: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (
    action: FinanceCommand["action"],
    values: unknown,
    extra?: { id?: string; expectedVersion?: number },
  ) => Promise<boolean>;
}) {
  const [dirty, setDirty] = useState(false),
    [validation, setValidation] = useState("");
  const [planId, setPlanId] = useState(
    mode === "playerOverride"
      ? (override?.planId ?? "")
      : mode === "batchAssignment"
        ? (assignment?.planId ?? "")
        : "",
  );
  const [planCurrency, setPlanCurrency] = useState(
    plan?.currency ?? workspace.academy.currency,
  );
  const [frequency, setFrequency] = useState<FinanceBillingFrequency>(
    plan ? frequencyOf(plan) : "MONTHLY",
  );
  const [overrideKind, setOverrideKind] = useState<
    FinancePlayerOverride["kind"]
  >(override?.kind ?? "DISCOUNT");
  const [discountType, setDiscountType] = useState(
    override?.discountMinor !== undefined ? "FIXED" : "PERCENT",
  );
  useUnsavedChanges(dirty);
  const academyCurrency = workspace.academy.currency,
    locale = workspace.academy.dateLocale;
  const selectedPlan = account.plans.find((plan) => plan.id === planId);
  const perSessionNote = selectedPlan &&
    frequencyOf(selectedPlan) === "PER_SESSION" && (
      <p className="pf-note">{financePerSessionNotice}</p>
    );
  const currency =
    mode === "plan"
      ? planCurrency
      : mode === "invoice" || mode === "oneTime" || mode === "playerOverride"
        ? (selectedPlan?.currency ?? academyCurrency)
        : mode === "suggestion"
          ? (suggestion?.currency ?? academyCurrency)
          : (invoice?.currency ?? academyCurrency);
  const money = (amount: number, code = currency) =>
    formatFinanceMoney(amount, code, locale);
  const chargeablePlans = account.plans.filter(
    (plan) => plan.active && plan.amountMinor > 0,
  );
  const playerOptions = workspace.records.player.map((player) => (
    <option key={player.id} value={player.id}>
      {player.name} · {playerBatch(workspace, player)}
    </option>
  ));
  const suggestedPlayer = workspace.records.player.find(
    (player) => player.id === suggestion?.playerId,
  );
  const suggestedOverride = account.playerOverrides.find(
    (item) => item.id === suggestion?.overrideId,
  );
  const planName = (id?: string) =>
    account.plans.find((plan) => plan.id === id)?.name;
  const title =
    mode === "plan" && plan
      ? "Edit fee plan"
      : mode === "batchAssignment" && assignment
        ? "Edit batch fee plan"
        : mode === "playerOverride" && override
          ? "Edit player fee exception"
          : titles[mode];
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
          <Dialog.Title>{title}</Dialog.Title>
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
                value = (name: string) => String(form.get(name) ?? "").trim(),
                checked = (name: string) => form.get(name) === "on",
                // An emptied field clears its recorded value; a hidden one keeps it.
                clearable = (name: string) =>
                  form.has(name)
                    ? value(name)
                      ? Number(value(name))
                      : null
                    : undefined;
              try {
                let action: FinanceCommand["action"];
                let data: unknown;
                let extra: { id?: string; expectedVersion?: number } = {};
                if (mode === "plan") {
                  action = "plan";
                  data = {
                    name: value("name"),
                    amountMinor:
                      frequency === "FREE"
                        ? 0
                        : parseFinanceAmount(value("amount"), currency),
                    currency,
                    billingFrequency: frequency,
                    applicableStartDate: value("applicableStartDate"),
                    applicableEndDate: value("applicableEndDate"),
                    customPeriodDays: clearable("customPeriodDays"),
                    dueAfterDays: clearable("dueAfterDays"),
                    active: plan?.active ?? true,
                  };
                  extra = { id: plan?.id, expectedVersion: plan?.version };
                } else if (mode === "batchAssignment") {
                  action = "batchAssignment";
                  data = {
                    squadId: value("squadId"),
                    planId: value("assignmentPlanId"),
                    effectiveFrom: value("effectiveFrom"),
                    effectiveTo: value("effectiveTo"),
                    active: assignment ? checked("active") : true,
                  };
                  extra = {
                    id: assignment?.id,
                    expectedVersion: assignment?.version,
                  };
                } else if (mode === "playerOverride") {
                  action = "playerOverride";
                  const individual = value("overrideAmount");
                  data = {
                    playerId: value("overridePlayer"),
                    kind: overrideKind,
                    planId:
                      overrideKind === "PLAN" ? planId || undefined : undefined,
                    amountMinor:
                      overrideKind === "PLAN" && individual
                        ? parseFinanceAmount(individual, currency)
                        : undefined,
                    discountBasisPoints:
                      overrideKind === "DISCOUNT" && discountType === "PERCENT"
                        ? parseDiscountPercent(value("discountPercent"))
                        : undefined,
                    discountMinor:
                      overrideKind === "DISCOUNT" && discountType === "FIXED"
                        ? parseFinanceAmount(value("discountAmount"), currency)
                        : undefined,
                    effectiveFrom: value("effectiveFrom"),
                    effectiveTo: value("effectiveTo"),
                    reason: value("reason"),
                    reviewed: checked("reviewed"),
                    active: override ? checked("active") : true,
                  };
                  extra = {
                    id: override?.id,
                    expectedVersion: override?.version,
                  };
                } else if (mode === "suggestion" && suggestion) {
                  // The server recomputes the proposal and refuses any drift.
                  action = "invoice";
                  data = {
                    playerId: suggestion.playerId,
                    planId: suggestion.planId,
                    planVersion: suggestion.planVersion,
                    assignmentId: suggestion.assignmentId,
                    assignmentVersion: suggestion.assignmentVersion,
                    overrideId: suggestion.overrideId,
                    overrideVersion: suggestion.overrideVersion,
                    squadId: suggestion.squadId,
                    useApplicablePlan: true,
                    confirmed: checked("confirmed"),
                    label: value("label"),
                    chargeMinor: suggestion.chargeMinor,
                    currency: suggestion.currency,
                    periodStart: suggestion.periodStart,
                    periodEnd: suggestion.periodEnd,
                    dueDate: value("due"),
                  };
                } else if (mode === "oneTime") {
                  action = "invoice";
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
                    oneTimeKey: value("oneTimeKey"),
                    reviewed: checked("reviewed"),
                    confirmed: checked("reviewed"),
                  };
                } else if (mode === "invoice") {
                  action = "invoice";
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
                } else if (mode === "reference") {
                  action = "reference";
                  data = {
                    invoiceId: invoice?.id,
                    amountMinor: parseFinanceAmount(value("amount"), currency),
                    currency,
                    reference: value("reference"),
                    method: value("method"),
                    paidOn: value("paidOn"),
                  };
                } else if (mode === "verify" || mode === "reject") {
                  action = mode;
                  data = {
                    reviewed: checked("reviewed"),
                    note: value("reason"),
                  };
                  extra = {
                    id: payment?.id,
                    expectedVersion: payment?.version,
                  };
                } else if (mode === "adjustment") {
                  action = "adjustment";
                  data = {
                    invoiceId: invoice?.id,
                    direction: value("direction"),
                    amountMinor: parseFinanceAmount(value("amount"), currency),
                    currency,
                    reason: value("reason"),
                    reviewed: checked("reviewed"),
                  };
                  extra = { expectedVersion: invoice?.version };
                } else if (mode === "reminder") {
                  action = "reminder";
                  data = { invoiceId: invoice?.id, body: value("body") };
                } else throw new Error("This fee action is unavailable.");
                if (await onSave(action, data, extra)) {
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
            <div className="pf-form-fields">
              {mode === "plan" && (
                <>
                  <label>
                    Plan name
                    <input
                      name="name"
                      required
                      maxLength={200}
                      defaultValue={plan?.name}
                    />
                  </label>
                  <label>
                    Currency
                    <select
                      name="currency"
                      aria-label="Currency"
                      value={planCurrency}
                      onChange={(event) => setPlanCurrency(event.target.value)}
                      disabled={Boolean(plan)}
                    >
                      {[
                        ...new Set([
                          planCurrency,
                          ...Intl.supportedValuesOf("currency"),
                        ]),
                      ]
                        .sort()
                        .map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                    </select>
                    {plan && (
                      <small>
                        Issued currency is retained. Create a new plan to use
                        another currency.
                      </small>
                    )}
                  </label>
                  <label>
                    Billing frequency
                    <select
                      name="billingFrequency"
                      aria-label="Billing frequency"
                      required
                      value={frequency}
                      onChange={(event) =>
                        setFrequency(
                          event.target.value as FinanceBillingFrequency,
                        )
                      }
                    >
                      {financeBillingFrequencies.map((item) => (
                        <option key={item} value={item}>
                          {financeFrequencyLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="pf-fields">
                    <label>
                      Applicable start date
                      <input
                        type="date"
                        name="applicableStartDate"
                        required
                        defaultValue={plan?.applicableStartDate ?? ""}
                      />
                    </label>
                    <label>
                      End date (optional)
                      <input
                        type="date"
                        name="applicableEndDate"
                        aria-label="Plan end date"
                        defaultValue={plan?.applicableEndDate ?? ""}
                      />
                    </label>
                  </div>
                  {(frequency === "CUSTOM" || frequency === "TERM") && (
                    <label>
                      Billing length (days)
                      <input
                        type="number"
                        name="customPeriodDays"
                        aria-label="Billing length (days)"
                        required={frequency === "CUSTOM"}
                        min={1}
                        max={3660}
                        step={1}
                        defaultValue={plan?.customPeriodDays ?? ""}
                      />
                      <small>
                        {frequency === "TERM"
                          ? "Optional for a term. Record it to allow suggested invoices."
                          : "Each billing period lasts this many days."}
                      </small>
                    </label>
                  )}
                  <label>
                    Payment due after (days)
                    <input
                      type="number"
                      name="dueAfterDays"
                      aria-label="Payment due after (days)"
                      min={0}
                      max={366}
                      step={1}
                      defaultValue={plan?.dueAfterDays ?? ""}
                    />
                    <small>
                      Optional. Suggested invoices are due this many days after
                      their billing period starts.
                    </small>
                  </label>
                  {frequency === "FREE" && (
                    <p className="pf-note">
                      A free plan records no charge. Its suggested invoices are
                      shown as Free, not as waived fees.
                    </p>
                  )}
                  {frequency === "PER_SESSION" && (
                    <p className="pf-note">{financePerSessionNotice}</p>
                  )}
                  <p className="pf-note">
                    Saving a plan does not assign fees or charge existing
                    players. Issue an invoice separately when authorised.
                  </p>
                </>
              )}
              {mode === "batchAssignment" && (
                <>
                  <label>
                    Training batch
                    <select
                      name="squadId"
                      aria-label="Training batch"
                      required
                      defaultValue={assignment?.squadId ?? ""}
                    >
                      <option value="">Choose a batch</option>
                      {workspace.records.squad.map((squad) => (
                        <option key={squad.id} value={squad.id}>
                          {squad.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Default fee plan
                    <select
                      name="assignmentPlanId"
                      aria-label="Default fee plan"
                      required
                      value={planId}
                      onChange={(event) => setPlanId(event.target.value)}
                    >
                      <option value="">Choose an active plan</option>
                      {account.plans
                        .filter(
                          (plan) =>
                            plan.active || plan.id === assignment?.planId,
                        )
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ·{" "}
                            {money(plan.amountMinor, plan.currency)} ·{" "}
                            {financeFrequencyLabel(frequencyOf(plan))}
                          </option>
                        ))}
                    </select>
                  </label>
                  {perSessionNote}
                  <div className="pf-fields">
                    <label>
                      Effective from
                      <input
                        type="date"
                        name="effectiveFrom"
                        required
                        defaultValue={assignment?.effectiveFrom ?? ""}
                      />
                    </label>
                    <label>
                      Effective until (optional)
                      <input
                        type="date"
                        name="effectiveTo"
                        aria-label="Effective until"
                        defaultValue={assignment?.effectiveTo ?? ""}
                      />
                    </label>
                  </div>
                  {assignment && (
                    <label className="pf-check">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={assignment.active}
                      />
                      Assignment active
                    </label>
                  )}
                  <p className="pf-note">
                    A batch default never issues an invoice. Players placed in
                    this batch receive it as a suggested charge from the
                    effective date. A batch can have one active default for any
                    date.
                  </p>
                </>
              )}
              {mode === "playerOverride" && (
                <>
                  <label>
                    Player
                    <select
                      name="overridePlayer"
                      aria-label="Player"
                      required
                      defaultValue={override?.playerId ?? initialPlayer ?? ""}
                    >
                      <option value="">Choose a player</option>
                      {playerOptions}
                    </select>
                  </label>
                  <label>
                    Exception type
                    <select
                      aria-label="Exception type"
                      value={overrideKind}
                      onChange={(event) =>
                        setOverrideKind(
                          event.target.value as FinancePlayerOverride["kind"],
                        )
                      }
                    >
                      <option value="PLAN">Different fee plan or amount</option>
                      <option value="DISCOUNT">Discount</option>
                      <option value="SCHOLARSHIP">
                        Scholarship (no charge)
                      </option>
                      <option value="WAIVER">Waiver (no charge)</option>
                    </select>
                  </label>
                  {overrideKind === "PLAN" && (
                    <>
                      <label>
                        Fee plan for this player
                        <select
                          aria-label="Fee plan for this player"
                          value={planId}
                          onChange={(event) => setPlanId(event.target.value)}
                        >
                          <option value="">Keep the batch default plan</option>
                          {chargeablePlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} ·{" "}
                              {money(plan.amountMinor, plan.currency)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {perSessionNote}
                      <label>
                        Individual amount ({currency}, optional)
                        <input
                          name="overrideAmount"
                          aria-label={`Individual amount (${currency})`}
                          inputMode="decimal"
                          placeholder={currencyDigits(currency) ? "0.00" : "0"}
                          defaultValue={
                            override?.amountMinor !== undefined
                              ? financeAmountInput(
                                  override.amountMinor,
                                  override.currency,
                                )
                              : undefined
                          }
                        />
                        <small>
                          Choose a plan, an individual amount, or both. A zero
                          charge is recorded as a scholarship or waiver.
                        </small>
                      </label>
                    </>
                  )}
                  {overrideKind === "DISCOUNT" && (
                    <>
                      <label>
                        Discount type
                        <select
                          aria-label="Discount type"
                          value={discountType}
                          onChange={(event) =>
                            setDiscountType(event.target.value)
                          }
                        >
                          <option value="PERCENT">Percentage</option>
                          <option value="FIXED">Fixed amount</option>
                        </select>
                      </label>
                      {discountType === "PERCENT" ? (
                        <label>
                          Discount percentage
                          <input
                            name="discountPercent"
                            aria-label="Discount percentage"
                            required
                            inputMode="decimal"
                            placeholder="10"
                            defaultValue={
                              override?.discountBasisPoints !== undefined
                                ? String(override.discountBasisPoints / 100)
                                : undefined
                            }
                          />
                        </label>
                      ) : (
                        <label>
                          Discount amount ({currency})
                          <input
                            name="discountAmount"
                            aria-label={`Discount amount (${currency})`}
                            required
                            inputMode="decimal"
                            placeholder={
                              currencyDigits(currency) ? "0.00" : "0"
                            }
                            defaultValue={
                              override?.discountMinor !== undefined
                                ? financeAmountInput(
                                    override.discountMinor,
                                    override.currency,
                                  )
                                : undefined
                            }
                          />
                        </label>
                      )}
                    </>
                  )}
                  {(overrideKind === "SCHOLARSHIP" ||
                    overrideKind === "WAIVER") && (
                    <p className="pf-note">
                      Suggested invoices for this player become zero-charge{" "}
                      {overrideKind.toLowerCase()} records. Nothing is recorded
                      as collected cash.
                    </p>
                  )}
                  <div className="pf-fields">
                    <label>
                      Effective from
                      <input
                        type="date"
                        name="effectiveFrom"
                        required
                        defaultValue={override?.effectiveFrom ?? ""}
                      />
                    </label>
                    <label>
                      Effective until (optional)
                      <input
                        type="date"
                        name="effectiveTo"
                        aria-label="Effective until"
                        defaultValue={override?.effectiveTo ?? ""}
                      />
                    </label>
                  </div>
                  <label>
                    Reason
                    <textarea
                      name="reason"
                      aria-label="Reason"
                      required
                      maxLength={2000}
                      rows={3}
                      defaultValue={override?.reason}
                    />
                  </label>
                  {override && (
                    <label className="pf-check">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={override.active}
                      />
                      Exception active
                    </label>
                  )}
                  <label className="pf-check">
                    <input type="checkbox" name="reviewed" required />I reviewed
                    this exception and its effect on future suggested charges
                  </label>
                </>
              )}
              {mode === "suggestion" && suggestion && (
                <>
                  <dl className="pf-breakdown">
                    <div>
                      <dt>Player</dt>
                      <dd>
                        {suggestedPlayer?.name ?? "Authorised player"}
                        {suggestedPlayer &&
                          ` · ${playerBatch(workspace, suggestedPlayer)}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Applicable plan</dt>
                      <dd>
                        {suggestion.planName ?? "No plan"}
                        {suggestion.billingFrequency &&
                          ` · ${financeFrequencyLabel(suggestion.billingFrequency)}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>
                        {suggestion.overrideId
                          ? "Player fee exception"
                          : "Batch default plan"}
                      </dd>
                    </div>
                    <div>
                      <dt>Billing period</dt>
                      <dd>
                        {suggestion.periodStart} to {suggestion.periodEnd}
                      </dd>
                    </div>
                    <div>
                      <dt>Original fee</dt>
                      <dd>{money(suggestion.baseChargeMinor ?? 0)}</dd>
                    </div>
                    <div>
                      <dt>Adjustment</dt>
                      <dd>
                        {suggestedOverride
                          ? `${financeOverrideSummary(suggestedOverride, planName(suggestedOverride.planId), locale)} (${money((suggestion.chargeMinor ?? 0) - (suggestion.baseChargeMinor ?? 0))})`
                          : "None"}
                      </dd>
                    </div>
                    <div>
                      <dt>Final charge</dt>
                      <dd>
                        <strong>{money(suggestion.chargeMinor ?? 0)}</strong>
                        {suggestion.zeroChargeReason &&
                          ` · ${zeroChargeLabels[suggestion.zeroChargeReason]}`}
                      </dd>
                    </div>
                  </dl>
                  <label>
                    Invoice label
                    <input
                      name="label"
                      required
                      maxLength={200}
                      defaultValue={suggestion.planName ?? "Football training"}
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      name="due"
                      required
                      defaultValue={suggestion.dueDate}
                    />
                  </label>
                  <label className="pf-check">
                    <input type="checkbox" name="confirmed" required />I
                    reviewed the player, plan, billing period and final charge
                  </label>
                  <p className="pf-note">
                    Issuing records an immutable invoice. The server rechecks
                    the plan, batch default and exception versions; if anything
                    changed, nothing is issued.
                  </p>
                </>
              )}
              {(mode === "invoice" || mode === "oneTime") && (
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
                      {playerOptions}
                    </select>
                  </label>
                  <label>
                    {mode === "oneTime" ? "One-time fee plan" : "Fee plan"}
                    <select
                      aria-label={
                        mode === "oneTime" ? "One-time fee plan" : "Fee plan"
                      }
                      value={planId}
                      onChange={(event) => setPlanId(event.target.value)}
                    >
                      <option value="">Individual charge</option>
                      {chargeablePlans
                        .filter(
                          (plan) =>
                            mode === "invoice" ||
                            frequencyOf(plan) === "ONE_TIME",
                        )
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} · {plan.currency}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {mode === "oneTime"
                      ? "Charge description"
                      : "Invoice label"}
                    <input
                      name="label"
                      aria-label={
                        mode === "oneTime" ? "Charge description" : undefined
                      }
                      required
                      defaultValue={
                        mode === "oneTime" ? undefined : "Football training"
                      }
                      placeholder={
                        mode === "oneTime"
                          ? "e.g. Training kit or extra coaching"
                          : undefined
                      }
                      maxLength={200}
                    />
                  </label>
                  {mode === "oneTime" && (
                    <label>
                      Charge reference
                      <input
                        name="oneTimeKey"
                        aria-label="Charge reference"
                        required
                        minLength={3}
                        maxLength={160}
                        autoComplete="off"
                        placeholder="e.g. home-kit-2026"
                      />
                      <small>
                        Each reference is invoiced once for this player. Use a
                        new reference only for a genuinely different charge.
                      </small>
                    </label>
                  )}
                  <div className="pf-fields">
                    <label>
                      Billing period start
                      <input
                        type="date"
                        name="start"
                        required
                        defaultValue={
                          mode === "oneTime" ? account.asOfDate : undefined
                        }
                      />
                    </label>
                    <label>
                      Billing period end
                      <input
                        type="date"
                        name="end"
                        required
                        defaultValue={
                          mode === "oneTime" ? account.asOfDate : undefined
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Due date
                    <input type="date" name="due" required />
                  </label>
                </>
              )}
              {[
                "plan",
                "invoice",
                "oneTime",
                "reference",
                "adjustment",
              ].includes(mode) &&
                !(mode === "plan" && frequency === "FREE") &&
                !(
                  (mode === "invoice" || mode === "oneTime") &&
                  selectedPlan
                ) && (
                  <label>
                    Amount ({currency})
                    <input
                      name="amount"
                      aria-label={`Amount (${currency})`}
                      required
                      inputMode="decimal"
                      placeholder={currencyDigits(currency) ? "0.00" : "0"}
                      defaultValue={
                        mode === "plan" && plan
                          ? financeAmountInput(plan.amountMinor, plan.currency)
                          : undefined
                      }
                    />
                    <small>
                      Recorded in {currency}; no money is collected here.
                    </small>
                  </label>
                )}
              {selectedPlan && (mode === "invoice" || mode === "oneTime") && (
                <p>
                  Uses the recorded plan amount
                  {mode === "oneTime" &&
                    ` of ${money(selectedPlan.amountMinor, selectedPlan.currency)}`}
                  . Scholarships and adjustments require a separate reviewed
                  event.
                </p>
              )}
              {mode === "oneTime" && (
                <label className="pf-check">
                  <input type="checkbox" name="reviewed" required />I reviewed
                  this separate charge and confirm it is not the player’s
                  recurring training fee
                </label>
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
                    A submitted reference remains pending. It does not reduce
                    the balance or create a receipt until separately verified.
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
                    <textarea
                      name="reason"
                      required
                      maxLength={2000}
                      rows={3}
                    />
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
              {invoice &&
                ![
                  "batchAssignment",
                  "playerOverride",
                  "suggestion",
                  "oneTime",
                ].includes(mode) && (
                  <p className="pf-note">
                    {invoice.snapshot.playerName} · {invoice.label} · Current
                    amount due{" "}
                    {formatFinanceMoney(
                      invoice.outstandingMinor,
                      invoice.currency,
                      locale,
                    )}
                  </p>
                )}
              {payment && (
                <p className="pf-note">
                  Payment:{" "}
                  {formatFinanceMoney(
                    payment.amountMinor,
                    payment.currency,
                    locale,
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
            </div>
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
                {busy
                  ? "Saving…"
                  : mode === "plan"
                    ? "Save Fee Plan"
                    : mode === "batchAssignment"
                      ? "Save batch fee plan"
                      : mode === "playerOverride"
                        ? "Save fee exception"
                        : mode === "suggestion"
                          ? "Issue reviewed invoice"
                          : titles[mode]}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
