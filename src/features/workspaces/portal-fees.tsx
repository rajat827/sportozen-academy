"use client";
import { useState } from "react";
import {
  BadgeCheck,
  ClipboardList,
  Download,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import type {
  FinanceBatchAssignment,
  FinanceInvoiceSuggestion,
  FinancePayment,
  FinancePlan,
  FinancePlayerOverride,
} from "@/domain/finance";
import { useWorkspace } from "@/hooks/use-workspace";
import { useFinance } from "@/hooks/use-finance";
import {
  formatFinanceMoney as money,
  financeFrequencyLabel,
  financeOverrideSummary,
  financePerSessionNotice,
} from "@/services/finance-rules";
import { playerBatch } from "@/services/portal-records";
import { PortalFeeEditor, type FeeEditorMode } from "./portal-fee-editor";
import { PortalFeeDetail } from "./portal-fee-detail";
import "./portal-fees.css";

const savedNotices: Partial<Record<FeeEditorMode, string>> = {
  plan: "Fee plan saved. Existing players have not been charged.",
  batchAssignment: "Batch default plan saved. No invoice has been issued.",
  playerOverride: "Player fee exception saved. No invoice has been issued.",
  suggestion: "Invoice issued from the reviewed suggestion.",
  oneTime: "One-time charge issued.",
};

export function PortalFees({
  workspace,
  playerId,
  onPlayer,
  onMessageParent,
  onViewPlayer,
}: {
  workspace: ReturnType<typeof useWorkspace>;
  playerId?: string;
  onPlayer?: (id: string) => void;
  onMessageParent?: (id: string) => void;
  onViewPlayer?: (id: string) => void;
}) {
  const finance = useFinance(workspace);
  const [tab, setTab] = useState("Overview"),
    [search, setSearch] = useState(""),
    [batch, setBatch] = useState(""),
    [status, setStatus] = useState(""),
    [period, setPeriod] = useState("");
  const [selectedId, setSelectedId] = useState(""),
    [closed, setClosed] = useState(false);
  const [editor, setEditor] = useState<{
    mode: FeeEditorMode;
    payment?: FinancePayment;
    plan?: FinancePlan;
    assignment?: FinanceBatchAssignment;
    override?: FinancePlayerOverride;
    suggestion?: FinanceInvoiceSuggestion;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [currencyChoice, setCurrencyChoice] = useState("");
  const account = finance.data,
    data = workspace.data;
  if (!data) return null;
  if (!account)
    return (
      <div className="portal-fees">
        <h1>Fees</h1>
        {finance.error ? (
          <div className="pf-empty" role="alert">
            <p>{finance.error}</p>
            <button
              className="pf-button"
              onClick={() => finance.reload().catch(() => {})}
            >
              Retry fee account
            </button>
          </div>
        ) : (
          <p role="status">Loading authorised fee records…</p>
        )}
      </div>
    );
  const playerMap = new Map(
    data.records.player.map((player) => [player.id, player]),
  );
  const batchOf = (playerId: string) => {
    const player = playerMap.get(playerId);
    return player && playerBatch(data, player);
  };
  const currencies = [
    ...new Set(account.invoices.map((invoice) => invoice.currency)),
  ];
  const selectedCurrency =
    currencyChoice ||
    (currencies.includes(data.academy.currency)
      ? data.academy.currency
      : currencies[0]) ||
    data.academy.currency;
  const periodInvoices = account.invoices.filter(
    (invoice) =>
      invoice.currency === selectedCurrency &&
      (!period || invoice.periodStart.startsWith(period)) &&
      (account.canManage || !playerId || invoice.playerId === playerId),
  );
  const invoices = periodInvoices.filter((invoice) => {
    const player = playerMap.get(invoice.playerId);
    return (
      (!batch || batchOf(invoice.playerId) === batch) &&
      (!status ||
        (status === "OVERDUE" ? invoice.overdue : invoice.status === status)) &&
      (!search ||
        `${player?.name} ${invoice.number}`
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });
  const selected = closed
    ? undefined
    : (invoices.find(
        (invoice) =>
          invoice.id === selectedId &&
          (!playerId || invoice.playerId === playerId),
      ) ??
      (playerId
        ? invoices.find((invoice) => invoice.playerId === playerId)
        : invoices[0]));
  const total = (key: "paidMinor" | "outstandingMinor" | "billedMinor") =>
    periodInvoices.reduce((sum, invoice) => sum + invoice[key], 0);
  const billed = total("billedMinor"),
    paid = total("paidMinor"),
    outstanding = total("outstandingMinor");
  const format = (value: number, currency = selectedCurrency) =>
    money(value, currency, data.academy.dateLocale);
  const players = data.records.player;
  const availableTabs = account.canManage
    ? ["Overview", "Payments", "Invoices", "Fee Plans", "Reminders", "Settings"]
    : ["Overview", "Payments", "Invoices", "Reminders"];
  const payments = account.payments.filter((payment) =>
    invoices.some((invoice) => invoice.id === payment.invoiceId),
  );
  function edit(mode: FeeEditorMode, payment?: FinancePayment) {
    setNotice("");
    setEditor({ mode, payment });
  }
  function configure(next: NonNullable<typeof editor>) {
    setNotice("");
    setEditor(next);
  }
  const frequencyOf = (plan: FinancePlan) =>
    plan.billingFrequency ?? plan.cadence;
  const planName = (id?: string) =>
    account.plans.find((plan) => plan.id === id)?.name;
  const playerName = (id: string) =>
    playerMap.get(id)?.name ?? "Authorised player";
  const readySuggestions = account.invoiceSuggestions.filter(
    (item) => item.available,
  );
  const waitingSuggestions = account.invoiceSuggestions.filter(
    (item) => !item.available,
  );
  const adjustmentOf = (suggestion: FinanceInvoiceSuggestion) => {
    const exception = account.playerOverrides.find(
      (item) => item.id === suggestion.overrideId,
    );
    return exception
      ? financeOverrideSummary(
          exception,
          planName(exception.planId),
          data.academy.dateLocale,
        )
      : "None";
  };
  function exportCSV() {
    const quoted = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const rows = [
      [
        "Invoice",
        "Player",
        "Currency",
        "Billed minor",
        "Verified paid minor",
        "Outstanding minor",
        "Due",
        "Status",
      ],
      ...invoices.map((invoice) => [
        invoice.number,
        playerMap.get(invoice.playerId)?.name ?? invoice.snapshot.playerName,
        invoice.currency,
        String(invoice.billedMinor),
        String(invoice.paidMinor),
        String(invoice.outstandingMinor),
        invoice.dueDate,
        invoice.status,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(quoted).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "academy-training-fees.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={`portal-fees ${selected ? "has-detail" : ""}`}>
      <div className="pf-main">
        <header className="pf-heading">
          <div>
            <h1>Fees</h1>
            <p>Manage fee plans, track payments and send reminders.</p>
          </div>
          {account.canManage && (
            <button
              className="pf-button primary"
              disabled={Boolean(selected && !selected.outstandingMinor)}
              onClick={() => edit(selected ? "reference" : "invoice")}
            >
              <Plus size={18} />
              {selected ? "Collect Payment" : "Create Invoice"}
            </button>
          )}
        </header>
        <nav className="pf-tabs" aria-label="Fee sections">
          {availableTabs.map((name) => (
            <button
              key={name}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        {playerId && !selected && !closed && (
          <p role="status" className="pf-note">
            The selected player has no invoice matching these filters. Choose an
            authorised fee account to open its details.
          </p>
        )}
        {(finance.error || workspace.error) && (
          <p role="alert" className="pf-error">
            {workspace.error || finance.error}
          </p>
        )}
        {notice && (
          <p role="status" className="pf-note">
            {notice}
          </p>
        )}
        <div className="pf-summary">
          <section>
            <span className="pf-metric-icon green">
              <Wallet size={22} />
            </span>
            <div>
              <strong>{format(paid)}</strong>
              <p>Verified collections</p>
              <small>{period || "All recorded periods"}</small>
            </div>
          </section>
          <section>
            <span className="pf-metric-icon red">
              <ClipboardList size={22} />
            </span>
            <div>
              <strong>{format(outstanding)}</strong>
              <p>Outstanding balance</p>
              <small>
                {
                  periodInvoices.filter(
                    (invoice) => invoice.outstandingMinor > 0,
                  ).length
                }{" "}
                invoices
              </small>
            </div>
          </section>
          <section>
            <span className="pf-metric-icon amber">
              <ClipboardList size={22} />
            </span>
            <div>
              <strong>{format(billed)}</strong>
              <p>Total billed</p>
              <small>{period || "All recorded periods"}</small>
            </div>
          </section>
          <section>
            <span className="pf-metric-icon purple">
              <BadgeCheck size={22} />
            </span>
            <div>
              <strong>
                {billed ? `${Math.round((paid / billed) * 100)}%` : "—"}
              </strong>
              <p>Collection rate</p>
              <small>
                {billed
                  ? "Verified value / billed value"
                  : "No billed value recorded"}
              </small>
            </div>
          </section>
        </div>
        <div className="pf-controls">
          <label>
            <span className="pf-sr">Filter batch</span>
            <select
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
            >
              <option value="">All Batches</option>
              {[
                ...new Set(players.map((player) => playerBatch(data, player))),
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="pf-sr">Filter fee status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All Status</option>
              {["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED", "FREE"].map(
                (name) => (
                  <option key={name}>{name}</option>
                ),
              )}
            </select>
          </label>
          <label>
            <span className="pf-sr">Billing month</span>
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </label>
          <label className="pf-search">
            <Search size={16} />
            <span className="pf-sr">Search fee accounts</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by player name…"
            />
          </label>
          <button
            className="pf-button"
            onClick={exportCSV}
            disabled={!invoices.length}
          >
            <Download size={17} />
            Export
          </button>
        </div>
        {currencies.length > 1 && (
          <label className="pf-currency">
            Currency
            <select
              value={selectedCurrency}
              onChange={(event) => setCurrencyChoice(event.target.value)}
            >
              {currencies.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <small>Separate balances; no currency conversion.</small>
          </label>
        )}
        {tab === "Invoices" && account.canManage && (
          <section
            className="pf-list pf-suggestions"
            aria-labelledby="pf-suggestions-title"
          >
            <div className="pf-card-title">
              <h2 id="pf-suggestions-title">Suggested invoices</h2>
              <button
                className="pf-button"
                disabled={finance.busy}
                onClick={() => configure({ mode: "oneTime" })}
              >
                Issue one-time charge
              </button>
            </div>
            <p>
              Charges suggested by batch default plans and player exceptions as
              of {account.asOfDate}. Each suggested billing period starts on
              that date. Nothing is issued until you review and confirm each
              charge.
            </p>
            {account.plans.some(
              (plan) => plan.active && frequencyOf(plan) === "PER_SESSION",
            ) && <p className="pf-note">{financePerSessionNotice}</p>}
            {!readySuggestions.length && (
              <p>No suggested charge is waiting for review.</p>
            )}
            {readySuggestions.map((suggestion) => {
              const player = playerMap.get(suggestion.playerId);
              const code = suggestion.currency ?? data.academy.currency;
              return (
                <div className="pf-event" key={suggestion.playerId}>
                  <strong>{playerName(suggestion.playerId)}</strong>
                  <p>
                    {suggestion.planName ?? "No plan"} ·{" "}
                    {suggestion.periodStart} to {suggestion.periodEnd}
                    {player && ` · ${playerBatch(data, player)}`}
                  </p>
                  <p>
                    Original {format(suggestion.baseChargeMinor ?? 0, code)} ·
                    Adjustment: {adjustmentOf(suggestion)} · Final{" "}
                    <strong>{format(suggestion.chargeMinor ?? 0, code)}</strong>
                  </p>
                  <button
                    className="pf-button primary"
                    disabled={finance.busy}
                    aria-label={`Review suggested invoice for ${playerName(suggestion.playerId)}`}
                    onClick={() =>
                      configure({ mode: "suggestion", suggestion })
                    }
                  >
                    Review suggestion
                  </button>
                </div>
              );
            })}
            {!!waitingSuggestions.length && (
              <details className="pf-legacy">
                <summary>
                  Players without a suggestion ({waitingSuggestions.length})
                </summary>
                {waitingSuggestions.map((suggestion) => (
                  <p key={suggestion.playerId}>
                    {playerName(suggestion.playerId)} · {suggestion.reason}
                  </p>
                ))}
              </details>
            )}
          </section>
        )}
        {(tab === "Overview" || tab === "Invoices") && (
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Batch</th>
                  <th>Training Fee</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>
                    <span className="pf-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={selected?.id === invoice.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        className="pf-player-button"
                        onClick={() => {
                          setSelectedId(invoice.id);
                          setClosed(false);
                          onPlayer?.(invoice.playerId);
                        }}
                        aria-label={`Open ${playerMap.get(invoice.playerId)?.name ?? invoice.snapshot.playerName} fee details`}
                      >
                        <Avatar
                          name={
                            playerMap.get(invoice.playerId)?.name ??
                            invoice.snapshot.playerName
                          }
                        />
                        <span>
                          <strong>
                            {playerMap.get(invoice.playerId)?.name ??
                              invoice.snapshot.playerName}
                          </strong>
                          <small>{invoice.label}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="pf-batch">
                        {batchOf(invoice.playerId) ?? "Not recorded"}
                      </span>
                    </td>
                    <td>{format(invoice.billedMinor, invoice.currency)}</td>
                    <td>{invoice.dueDate}</td>
                    <td>
                      <span
                        className={`pf-status ${invoice.status.toLowerCase()}`}
                      >
                        {invoice.status === "PARTIAL" && invoice.overdue
                          ? "Partial · overdue"
                          : invoice.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        className="pf-icon"
                        aria-label={`View invoice ${invoice.number}`}
                        onClick={() => {
                          setSelectedId(invoice.id);
                          setClosed(false);
                        }}
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoices.length && (
              <div className="pf-empty">
                <ClipboardList size={30} />
                <h2>No matching invoices</h2>
                <p>
                  {account.invoices.length
                    ? "Adjust the filters to find an existing fee account."
                    : "No academy training invoice has been issued. No payment or balance is assumed."}
                </p>
                {account.canManage && (
                  <button
                    className="pf-button primary"
                    onClick={() => edit("invoice")}
                  >
                    Issue first invoice
                  </button>
                )}
              </div>
            )}
            <footer className="pf-table-footer">
              {invoices.length} of {account.invoices.length} recorded invoices ·{" "}
              {selectedCurrency}
            </footer>
          </div>
        )}
        {tab === "Payments" && (
          <section className="pf-list">
            <h2>Payment references</h2>
            {!payments.length && (
              <p>No payment references recorded for these filters.</p>
            )}
            {payments.map((payment) => (
              <div className="pf-event" key={payment.id}>
                <strong>{format(payment.amountMinor, payment.currency)}</strong>
                <p>
                  {payment.reference} · {payment.paidOn}
                </p>
                <span className="pf-status">
                  {payment.status.toLowerCase()}
                </span>
                <button
                  className="pf-button"
                  onClick={() => {
                    setSelectedId(payment.invoiceId);
                    setClosed(false);
                  }}
                >
                  Open fee account
                </button>
              </div>
            ))}
          </section>
        )}
        {tab === "Fee Plans" && account.canManage && (
          <div className="pf-stack">
            <section className="pf-list">
              <div className="pf-card-title">
                <h2>Academy fee plans</h2>
                <button
                  className="pf-button primary"
                  onClick={() => edit("plan")}
                >
                  Create fee plan
                </button>
              </div>
              {!account.plans.length && (
                <p>
                  No fee plans yet. Create a reusable plan or issue an
                  individual charge.
                </p>
              )}
              {account.plans.map((plan) => (
                <div className="pf-event" key={plan.id}>
                  <strong>{plan.name}</strong>
                  <p>
                    {format(plan.amountMinor, plan.currency)} ·{" "}
                    {financeFrequencyLabel(frequencyOf(plan))}
                    {plan.customPeriodDays &&
                      ["CUSTOM", "TERM"].includes(frequencyOf(plan)) &&
                      ` (${plan.customPeriodDays} days)`}
                    {" · "}
                    {plan.applicableStartDate
                      ? `Applies from ${plan.applicableStartDate}`
                      : "Start date not recorded"}
                    {plan.applicableEndDate &&
                      ` until ${plan.applicableEndDate}`}
                    {plan.dueAfterDays !== undefined &&
                      ` · Due ${plan.dueAfterDays} days after each period starts`}
                    {frequencyOf(plan) === "PER_SESSION" &&
                      " · Not suggested automatically; invoice each session manually"}
                    {!plan.active && " · Archived"}
                  </p>
                  <button
                    className="pf-button"
                    disabled={finance.busy}
                    onClick={() => configure({ mode: "plan", plan })}
                  >
                    Edit fee plan
                  </button>
                  <button
                    className="pf-button"
                    disabled={finance.busy}
                    onClick={() =>
                      finance.mutate(
                        "plan",
                        {
                          name: plan.name,
                          amountMinor: plan.amountMinor,
                          currency: plan.currency,
                          cadence: plan.cadence,
                          customPeriodDays: plan.customPeriodDays,
                          active: !plan.active,
                        },
                        { id: plan.id, expectedVersion: plan.version },
                      )
                    }
                  >
                    {plan.active ? "Archive plan" : "Activate plan"}
                  </button>
                </div>
              ))}
              <button className="pf-button" onClick={() => edit("invoice")}>
                Issue player invoice
              </button>
            </section>
            <section className="pf-list">
              <div className="pf-card-title">
                <h2>Batch default plans</h2>
                <button
                  className="pf-button primary"
                  disabled={
                    finance.busy ||
                    !data.records.squad.length ||
                    !account.plans.some((plan) => plan.active)
                  }
                  onClick={() => configure({ mode: "batchAssignment" })}
                >
                  Assign batch plan
                </button>
              </div>
              {!account.batchAssignments.length && (
                <p>
                  No batch has a default plan. Players receive a suggested
                  charge only from a batch default or a player exception.
                </p>
              )}
              {account.batchAssignments.map((assignment) => {
                const batchName =
                  data.records.squad.find(
                    (squad) => squad.id === assignment.squadId,
                  )?.name ?? "Archived batch";
                const assigned = account.plans.find(
                  (plan) => plan.id === assignment.planId,
                );
                return (
                  <div className="pf-event" key={assignment.id}>
                    <strong>{batchName}</strong>
                    <p>
                      {assigned
                        ? `${assigned.name} · ${format(assigned.amountMinor, assigned.currency)} · ${financeFrequencyLabel(frequencyOf(assigned))}`
                        : "Plan unavailable"}
                      {" · "}From {assignment.effectiveFrom}
                      {assignment.effectiveTo
                        ? ` until ${assignment.effectiveTo}`
                        : " with no end date"}
                    </p>
                    <span
                      className={`pf-status ${assignment.active ? "paid" : ""}`}
                    >
                      {assignment.active ? "active" : "inactive"}
                    </span>
                    <button
                      className="pf-button"
                      disabled={finance.busy}
                      aria-label={`Edit batch plan for ${batchName}`}
                      onClick={() =>
                        configure({ mode: "batchAssignment", assignment })
                      }
                    >
                      Edit batch plan
                    </button>
                  </div>
                );
              })}
            </section>
            <section className="pf-list">
              <div className="pf-card-title">
                <h2>Player fee exceptions</h2>
                <button
                  className="pf-button primary"
                  disabled={finance.busy || !players.length}
                  onClick={() => configure({ mode: "playerOverride" })}
                >
                  Add player exception
                </button>
              </div>
              {!account.playerOverrides.length && (
                <p>
                  No individual plans, discounts, scholarships or waivers are
                  recorded.
                </p>
              )}
              {account.playerOverrides.map((exception) => (
                <div className="pf-event" key={exception.id}>
                  <strong>{playerName(exception.playerId)}</strong>
                  <p>
                    {financeOverrideSummary(
                      exception,
                      planName(exception.planId),
                      data.academy.dateLocale,
                    )}
                    {" · "}From {exception.effectiveFrom}
                    {exception.effectiveTo
                      ? ` until ${exception.effectiveTo}`
                      : " with no end date"}
                  </p>
                  <small>Reason: {exception.reason}</small>{" "}
                  <span
                    className={`pf-status ${exception.active ? "paid" : ""}`}
                  >
                    {exception.active ? "active" : "inactive"}
                  </span>
                  <button
                    className="pf-button"
                    disabled={finance.busy}
                    aria-label={`Edit fee exception for ${playerName(exception.playerId)}`}
                    onClick={() =>
                      configure({ mode: "playerOverride", override: exception })
                    }
                  >
                    Edit fee exception
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}
        {tab === "Reminders" && (
          <section className="pf-list">
            <h2>Private fee reminders</h2>
            {!account.reminders.length && (
              <p>No reminders recorded. External delivery is not connected.</p>
            )}
            {account.reminders
              .filter(
                (reminder) =>
                  account.canManage ||
                  !playerId ||
                  reminder.playerId === playerId,
              )
              .map((reminder) => (
                <div className="pf-event" key={reminder.id}>
                  <strong>{playerMap.get(reminder.playerId)?.name}</strong>
                  <p>{reminder.body}</p>
                  <small>
                    Published in app · {reminder.createdAt.slice(0, 10)} ·
                    External not sent
                  </small>
                </div>
              ))}
          </section>
        )}
        {tab === "Settings" && (
          <section className="pf-list">
            <h2>Fee settings</h2>
            <p>
              Academy currency: {data.academy.currency}. Fee plans and issued
              invoices keep their recorded currencies.
            </p>
            <p>
              Online collection: <strong>Not connected</strong>. Use manual
              reference recording and explicit verification.
            </p>
            <p>
              Training fees belong to {data.academy.name}. The academy
              subscription to Sportozen is separate.
            </p>
          </section>
        )}
        {!!account.legacyRecords.length && (
          <details className="pf-legacy">
            <summary>
              Historical unclassified fee records (
              {account.legacyRecords.length})
            </summary>
            <p>
              Preserved records have no invoice, due-date or verification
              information. They are not counted as verified collections or new
              invoices.
            </p>
            {account.legacyRecords
              .filter(
                (record) =>
                  account.canManage ||
                  !playerId ||
                  record.playerId === playerId,
              )
              .map((record) => (
                <p key={record.id}>
                  {playerMap.get(record.playerId)?.name} · {record.label} ·{" "}
                  {format(record.amountMinor, record.currency)}
                </p>
              ))}
          </details>
        )}
      </div>
      {selected && (
        <PortalFeeDetail
          invoice={selected}
          account={account}
          workspace={data}
          onAction={edit}
          onClose={() => setClosed(true)}
          onMessageParent={onMessageParent}
          onViewPlayer={onViewPlayer}
        />
      )}
      {editor && account.canManage && (
        <PortalFeeEditor
          mode={editor.mode}
          account={account}
          workspace={data}
          invoice={selected}
          payment={editor.payment}
          plan={editor.plan}
          assignment={editor.assignment}
          override={editor.override}
          suggestion={editor.suggestion}
          initialPlayer={playerId ?? selected?.playerId}
          busy={finance.busy || workspace.busy}
          error={workspace.error || finance.error}
          onClose={() => setEditor(null)}
          onSave={async (action, values, extra) => {
            const saved = Boolean(await finance.mutate(action, values, extra));
            const outcome = savedNotices[editor.mode];
            if (saved && outcome) setNotice(outcome);
            return saved;
          }}
        />
      )}
    </div>
  );
}
