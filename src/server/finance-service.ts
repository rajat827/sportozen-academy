import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  FinanceActionResult,
  FinanceBatchAssignment,
  FinancePlayerOverride,
  FinanceInvoiceSuggestion,
  FinanceInvoice,
  FinanceInvoiceView,
  FinancePayload,
  FinancePlan,
  FinanceReceipt,
  FinanceSummary,
} from "@/domain/finance";
import { financeBillingFrequencies } from "@/domain/finance";
import {
  financeInvoiceSuggestion as suggestInvoice,
  financePeriodsOverlap,
} from "@/services/finance-rules";
import { database, atomic, audit } from "./database";
import { WorkspaceError } from "./auth";
import { workspaceRepository as workspaceRepo } from "./workspace-repository";
import {
  requireModule,
  requirePlayer,
  requireRole,
  requireSport,
  visibleRecords,
  type WorkspaceAccess,
} from "./workspace-access";
import { financeRepository as repo, referenceKey } from "./finance-repository";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(2000);
const minor = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine(
    (value) => Intl.supportedValuesOf("currency").includes(value),
    "Choose a supported currency.",
  );
const date = z.iso.date();
const optionalDate = date
  .or(z.literal(""))
  .transform((value) => value || undefined)
  .optional();
const nonnegativeMinor = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const commandSchema = z.object({
  requestId: z.uuid(),
  action: z.enum([
    "plan",
    "batchAssignment",
    "playerOverride",
    "invoice",
    "reference",
    "verify",
    "reject",
    "adjustment",
    "reminder",
  ]),
  id: id.optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
  data: z.unknown(),
});
function fail(message: string, status = 400): never {
  throw new WorkspaceError(status, message);
}
function current(ctx: WorkspaceAccess): WorkspaceAccess {
  const academy = workspaceRepo.academy(ctx.academy.id);
  const membership = workspaceRepo.membership(ctx.academy.id, ctx.user.id);
  const entitlement = database()
    .prepare("SELECT status FROM platform_entitlements WHERE academyId=?")
    .get(ctx.academy.id);
  if (
    !academy ||
    !membership ||
    membership.role !== ctx.membership.role ||
    entitlement?.status !== "ACTIVE"
  )
    fail("Current active academy membership is required for finance.", 403);
  const fresh = { ...ctx, academy, membership };
  requireRole(fresh, ["OWNER", "ADMIN", "PARENT"]);
  requireModule(fresh, "fee");
  requireSport(fresh, "football");
  return fresh;
}
function today(ctx: WorkspaceAccess) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: ctx.academy.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function sum(values: number[]) {
  const result = values.reduce((total, value) => {
    const next = total + value;
    if (!Number.isSafeInteger(next))
      fail("Financial total exceeds the supported safe minor-unit range.");
    return next;
  }, 0);
  return result;
}
function invoiceFor(ctx: WorkspaceAccess, invoiceId: string) {
  const invoice = repo.find(ctx.academy.id, "invoice", invoiceId);
  if (!invoice) fail("Invoice unavailable in this academy.", 404);
  requirePlayer(ctx, invoice.playerId);
  return invoice;
}
function projected(invoice: FinanceInvoice, asOf: string): FinanceInvoiceView {
  const adjustments = repo
    .list(invoice.academyId, "adjustment")
    .filter((item) => item.invoiceId === invoice.id);
  const payments = repo
    .list(invoice.academyId, "payment")
    .filter((item) => item.invoiceId === invoice.id);
  const adjustmentMinor = sum(
    adjustments.map((item) =>
      item.direction === "CREDIT" ? -item.amountMinor : item.amountMinor,
    ),
  );
  const billedMinor = sum([invoice.chargeMinor, adjustmentMinor]);
  const paidMinor = sum(
    payments
      .filter((item) => item.status === "VERIFIED")
      .map((item) => item.amountMinor),
  );
  const outstandingMinor = sum([billedMinor, -paidMinor]);
  if (billedMinor < 0 || outstandingMinor < 0)
    fail("Stored invoice balance requires finance reconciliation.", 409);
  const overdue = outstandingMinor > 0 && invoice.dueDate < asOf;
  return {
    ...invoice,
    adjustmentMinor,
    billedMinor,
    paidMinor,
    outstandingMinor,
    pendingReferenceMinor: sum(
      payments
        .filter((item) => item.status === "PENDING")
        .map((item) => item.amountMinor),
    ),
    status:
      billedMinor === 0
        ? invoice.chargeMinor === 0 && invoice.zeroChargeReason === "FREE"
          ? "FREE"
          : "WAIVED"
        : outstandingMinor === 0
          ? "PAID"
          : paidMinor > 0
            ? "PARTIAL"
            : overdue
              ? "OVERDUE"
              : "PENDING",
    overdue,
  };
}
function sameCurrency(expected: string, actual: string) {
  if (expected !== actual)
    fail("Currency must match the selected invoice or academy plan.");
}
function requiredVersion(expected: number | undefined, actual: number) {
  if (expected === undefined || expected !== actual)
    fail("Finance record changed. Reload and review its current version.", 409);
}
function saveInvoiceVersion(ctx: WorkspaceAccess, invoice: FinanceInvoice) {
  return repo.save(
    ctx.academy.id,
    "invoice",
    invoice,
    invoice.version,
    ctx.user.id,
  );
}

/** Resolve a proposal only; reads and assignment changes never generate invoices. */
export function financeInvoiceProposal(
  context: WorkspaceAccess,
  playerId: string,
  dateValue?: string,
  squadId?: string,
  sessionId?: string,
): FinanceInvoiceSuggestion {
  const ctx = current(context);
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const player = requirePlayer(ctx, playerId);
  const squads = workspaceRepo.list(ctx.academy.id, "squad");
  const squadIds = player.squadId
    ? squads.filter((item) => item.id === player.squadId).map((item) => item.id)
    : squads
        .filter((item) => item.playerIds.includes(playerId))
        .map((item) => item.id);
  let sessionDate: string | undefined;
  if (sessionId) {
    const session = workspaceRepo.find(ctx.academy.id, "session", sessionId);
    if (
      !session ||
      session.sportId !== "football" ||
      !["SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(session.status) ||
      !session.roster.some((item) => item.playerId === playerId)
    )
      fail(
        "Choose an actual authorised player session for per-session billing.",
        404,
      );
    if (squadId && session.squadId !== squadId)
      fail("The session must belong to the selected training batch.");
    sessionDate = session.startLocal.slice(0, 10);
    if (dateValue && dateValue !== sessionDate)
      fail("Per-session billing must use the actual session date.");
    if (!squadIds.includes(session.squadId)) squadIds.push(session.squadId);
    squadId = session.squadId;
  }
  return suggestInvoice({
    playerId,
    squadIds,
    date: dateValue ?? sessionDate ?? today(ctx),
    currency: ctx.academy.currency,
    plans: repo.list(ctx.academy.id, "plan"),
    assignments: repo.list(ctx.academy.id, "batchAssignment"),
    overrides: repo.list(ctx.academy.id, "playerOverride"),
    squadId,
    sessionDate,
    trial: player.status === "TRIAL",
  });
}
function effectiveRange(from: string, to?: string) {
  if (to && to < from) fail("Effective end date must follow its start date.");
}
export function financeView(
  context: WorkspaceAccess,
  playerId?: string,
): FinancePayload {
  const ctx = current(context);
  if (playerId) requirePlayer(ctx, playerId);
  const canManage = ctx.membership.role !== "PARENT";
  const playerIds = new Set(
    visibleRecords(ctx, "player").map((player) => player.id),
  );
  const visible = (record: { playerId: string }) =>
    playerIds.has(record.playerId) &&
    (!playerId || record.playerId === playerId);
  const asOfDate = today(ctx);
  const invoices = repo
    .list(ctx.academy.id, "invoice")
    .filter(visible)
    .map((invoice) => projected(invoice, asOfDate));
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const payments = repo
    .list(ctx.academy.id, "payment")
    .filter((item) => visible(item) && invoiceIds.has(item.invoiceId))
    .map((item) => (canManage ? item : { ...item, decisionNote: undefined }));
  const summary = new Map<string, FinanceSummary>();
  for (const invoice of invoices) {
    const row = summary.get(invoice.currency) ?? {
      currency: invoice.currency,
      billedMinor: 0,
      collectedMinor: 0,
      outstandingMinor: 0,
      overdueMinor: 0,
      invoiceCount: 0,
      paidInvoiceCount: 0,
    };
    row.billedMinor = sum([row.billedMinor, invoice.billedMinor]);
    row.collectedMinor = sum([row.collectedMinor, invoice.paidMinor]);
    row.outstandingMinor = sum([
      row.outstandingMinor,
      invoice.outstandingMinor,
    ]);
    row.overdueMinor = sum([
      row.overdueMinor,
      invoice.overdue ? invoice.outstandingMinor : 0,
    ]);
    row.invoiceCount++;
    if (invoice.status === "PAID") row.paidInvoiceCount++;
    summary.set(invoice.currency, row);
  }
  return {
    academyId: ctx.academy.id,
    onlineCollection: "NOT_CONNECTED",
    canManage,
    asOfDate,
    plans: canManage ? repo.list(ctx.academy.id, "plan") : [],
    batchAssignments: canManage
      ? repo.list(ctx.academy.id, "batchAssignment")
      : [],
    playerOverrides: canManage
      ? repo.list(ctx.academy.id, "playerOverride")
      : [],
    invoiceSuggestions: canManage
      ? [...playerIds]
          .filter((id) => !playerId || id === playerId)
          .map((id) => financeInvoiceProposal(ctx, id, asOfDate))
      : [],
    invoices,
    payments,
    adjustments: repo
      .list(ctx.academy.id, "adjustment")
      .filter((item) => visible(item) && invoiceIds.has(item.invoiceId)),
    receipts: repo
      .list(ctx.academy.id, "receipt")
      .filter((item) => visible(item) && invoiceIds.has(item.invoiceId)),
    reminders: repo
      .list(ctx.academy.id, "reminder")
      .filter(
        (item) =>
          visible(item) &&
          invoiceIds.has(item.invoiceId) &&
          (canManage || item.guardianIds.includes(ctx.user.id)),
      )
      .map((item) =>
        canManage ? item : { ...item, guardianIds: [ctx.user.id] },
      ),
    summary: [...summary.values()],
    legacyRecords: visibleRecords(ctx, "fee").filter(visible),
  };
}

export function financeAction(
  context: WorkspaceAccess,
  input: unknown,
): FinanceActionResult {
  return atomic(() => financeActionInTransaction(context, input));
}
/** Compose with another academy operation inside its existing atomic transaction. */
export function financeActionInTransaction(
  context: WorkspaceAccess,
  input: unknown,
): FinanceActionResult {
  const command = commandSchema.parse(input);
  const digest = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  const ctx = current(context);
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const prior = database()
    .prepare(
      "SELECT digest,response FROM academy_finance_submissions WHERE academyId=? AND userId=? AND requestId=?",
    )
    .get(ctx.academy.id, ctx.user.id, command.requestId);
  if (prior) {
    if (prior.digest !== digest)
      fail("Submission key already used for different finance content.", 409);
    const response = JSON.parse(String(prior.response)) as FinanceActionResult;
    if ("playerId" in response) requirePlayer(ctx, response.playerId);
    return response;
  }
  const recordId = randomUUID(),
    at = new Date().toISOString();
  const base = { id: recordId, academyId: ctx.academy.id };
  let result: FinanceActionResult;
  switch (command.action) {
    case "plan": {
      const data = z
        .object({
          name: text.max(200),
          amountMinor: nonnegativeMinor,
          currency,
          cadence: z.enum(financeBillingFrequencies).optional(),
          billingFrequency: z.enum(financeBillingFrequencies).optional(),
          applicableStartDate: date.optional(),
          applicableEndDate: optionalDate,
          customPeriodDays: z.number().int().min(1).max(3660).optional(),
          dueAfterDays: z.number().int().min(0).max(366).optional(),
          active: z.boolean(),
        })
        .parse(command.data);
      const old = command.id
        ? repo.find(ctx.academy.id, "plan", command.id)
        : undefined;
      if (command.id && !old) fail("Fee plan unavailable.", 404);
      if (old) sameCurrency(old.currency, data.currency);
      const billingFrequency = data.billingFrequency ?? data.cadence;
      if (!billingFrequency) fail("Choose a billing frequency.");
      if (
        data.billingFrequency &&
        data.cadence &&
        data.billingFrequency !== data.cadence
      )
        fail("Billing frequency and legacy cadence must agree.");
      if (data.billingFrequency && !data.applicableStartDate)
        fail("Enter the applicable start date.");
      if (
        billingFrequency === "FREE"
          ? data.amountMinor !== 0
          : data.amountMinor <= 0
      )
        fail(
          "Free plans must have a zero amount; other plans require a positive amount.",
        );
      if (billingFrequency === "CUSTOM" && !data.customPeriodDays)
        fail("Enter a custom billing duration.");
      if (data.applicableStartDate)
        effectiveRange(data.applicableStartDate, data.applicableEndDate);
      if (old) requiredVersion(command.expectedVersion, old.version);
      const plan: FinancePlan = {
        ...old,
        ...base,
        ...data,
        cadence: billingFrequency,
        billingFrequency,
        applicableStartDate:
          data.applicableStartDate ?? old?.applicableStartDate,
        id: old?.id ?? recordId,
        version: (old?.version ?? 0) + 1,
        createdAt: old?.createdAt ?? at,
        updatedAt: at,
      };
      result = repo.save(
        ctx.academy.id,
        "plan",
        plan,
        old?.version ?? 0,
        ctx.user.id,
      );
      break;
    }
    case "batchAssignment": {
      const data = z
        .object({
          squadId: id,
          planId: id,
          effectiveFrom: date,
          effectiveTo: optionalDate,
          active: z.boolean(),
        })
        .parse(command.data);
      effectiveRange(data.effectiveFrom, data.effectiveTo);
      const squad = workspaceRepo.find(ctx.academy.id, "squad", data.squadId);
      if (!squad || squad.sportId !== "football")
        fail("Choose a saved football batch in this academy.", 404);
      const plan = repo.find(ctx.academy.id, "plan", data.planId);
      if (!plan || (data.active && !plan.active))
        fail("Choose an active academy fee plan.", 404);
      if (
        plan.applicableStartDate &&
        data.effectiveFrom < plan.applicableStartDate
      )
        fail("Assignment cannot start before the fee plan.");
      if (
        plan.applicableEndDate &&
        (!data.effectiveTo || data.effectiveTo > plan.applicableEndDate)
      )
        fail("Assignment must end within the fee plan's effective dates.");
      const old = command.id
        ? repo.find(ctx.academy.id, "batchAssignment", command.id)
        : undefined;
      if (command.id && !old) fail("Batch fee assignment unavailable.", 404);
      if (old) requiredVersion(command.expectedVersion, old.version);
      if (
        data.active &&
        repo
          .list(ctx.academy.id, "batchAssignment")
          .some(
            (item) =>
              item.id !== old?.id &&
              item.active &&
              item.squadId === data.squadId &&
              financePeriodsOverlap(item, data),
          )
      )
        fail(
          "This batch already has a default fee plan for an overlapping effective period.",
          409,
        );
      const assignment: FinanceBatchAssignment = {
        ...base,
        ...data,
        id: old?.id ?? recordId,
        version: (old?.version ?? 0) + 1,
        createdAt: old?.createdAt ?? at,
        updatedAt: at,
      };
      result = repo.save(
        ctx.academy.id,
        "batchAssignment",
        assignment,
        old?.version ?? 0,
        ctx.user.id,
      );
      break;
    }
    case "playerOverride": {
      const data = z
        .object({
          playerId: id,
          kind: z.enum(["PLAN", "DISCOUNT", "SCHOLARSHIP", "WAIVER"]),
          planId: id.optional(),
          amountMinor: nonnegativeMinor.optional(),
          discountBasisPoints: z.number().int().min(1).max(10000).optional(),
          discountMinor: minor.optional(),
          currency: currency.optional(),
          effectiveFrom: date,
          effectiveTo: optionalDate,
          reason: text,
          reviewed: z.literal(true),
          active: z.boolean(),
        })
        .parse(command.data);
      requirePlayer(ctx, data.playerId);
      effectiveRange(data.effectiveFrom, data.effectiveTo);
      const plan = data.planId
        ? repo.find(ctx.academy.id, "plan", data.planId)
        : undefined;
      if (data.planId && (!plan || (data.active && !plan.active)))
        fail("Choose an active academy fee plan for this player.", 404);
      if (
        data.kind === "PLAN" &&
        !data.planId &&
        data.amountMinor === undefined
      )
        fail("Choose an override plan or an individual amount.");
      if (data.kind === "PLAN" && data.amountMinor === 0)
        fail("Use Scholarship or Waiver for a genuine zero-charge override.");
      if (
        data.kind === "DISCOUNT" &&
        Number(data.discountBasisPoints !== undefined) +
          Number(data.discountMinor !== undefined) !==
          1
      )
        fail("Choose one authorised percentage or fixed discount.");
      if (
        data.kind !== "DISCOUNT" &&
        (data.discountMinor !== undefined ||
          data.discountBasisPoints !== undefined)
      )
        fail("Discount fields apply only to a discount override.");
      if (data.kind !== "PLAN" && data.amountMinor !== undefined)
        fail("Use the appropriate override type for an individual amount.");
      const old = command.id
        ? repo.find(ctx.academy.id, "playerOverride", command.id)
        : undefined;
      if (command.id && !old) fail("Player fee override unavailable.", 404);
      if (old) requiredVersion(command.expectedVersion, old.version);
      const overrideCurrency =
        data.currency ??
        plan?.currency ??
        old?.currency ??
        ctx.academy.currency;
      if (old) sameCurrency(old.currency, overrideCurrency);
      if (plan) sameCurrency(plan.currency, overrideCurrency);
      if (
        data.active &&
        repo
          .list(ctx.academy.id, "playerOverride")
          .some(
            (item) =>
              item.id !== old?.id &&
              item.active &&
              item.playerId === data.playerId &&
              financePeriodsOverlap(item, data),
          )
      )
        fail(
          "This player already has a fee override for an overlapping effective period.",
          409,
        );
      const { reviewed: _reviewed, ...values } = data;
      void _reviewed;
      const override: FinancePlayerOverride = {
        ...base,
        ...values,
        currency: overrideCurrency,
        id: old?.id ?? recordId,
        version: (old?.version ?? 0) + 1,
        createdAt: old?.createdAt ?? at,
        updatedAt: at,
      };
      result = repo.save(
        ctx.academy.id,
        "playerOverride",
        override,
        old?.version ?? 0,
        ctx.user.id,
      );
      break;
    }
    case "invoice": {
      const data = z
        .object({
          playerId: id,
          planId: id.optional(),
          label: text,
          chargeMinor: nonnegativeMinor,
          currency,
          assignmentId: id.optional(),
          assignmentVersion: z.number().int().positive().optional(),
          overrideId: id.optional(),
          overrideVersion: z.number().int().positive().optional(),
          planVersion: z.number().int().positive().optional(),
          squadId: id.optional(),
          sessionId: id.optional(),
          useApplicablePlan: z.boolean().optional(),
          confirmed: z.boolean().optional(),
          reviewed: z.boolean().optional(),
          zeroChargeReason: z
            .enum(["FREE", "SCHOLARSHIP", "WAIVER"])
            .optional(),
          oneTimeKey: z.string().trim().min(3).max(160).optional(),
          periodStart: date,
          periodEnd: date,
          dueDate: date,
        })
        .parse(command.data);
      const player = requirePlayer(ctx, data.playerId);
      if (data.periodEnd < data.periodStart)
        fail("Billing period end must follow its start.");
      const derived = !!(
        data.useApplicablePlan ||
        data.assignmentId ||
        data.overrideId
      );
      let billingSource: FinanceInvoice["billingSource"];
      if (derived) {
        if (!data.confirmed)
          fail(
            "Review and confirm the proposed charge before issuing this invoice.",
          );
        const proposal = financeInvoiceProposal(
          ctx,
          player.id,
          data.periodStart,
          data.squadId,
          data.sessionId,
        );
        if (!proposal.available) fail(proposal.reason);
        if (
          data.assignmentId !== proposal.assignmentId ||
          data.overrideId !== proposal.overrideId ||
          (data.planId && data.planId !== proposal.planId)
        )
          fail(
            "The applicable fee assignment changed. Review a current suggestion.",
            409,
          );
        if (
          data.planVersion !== proposal.planVersion ||
          data.assignmentVersion !== proposal.assignmentVersion ||
          data.overrideVersion !== proposal.overrideVersion
        )
          fail(
            "The fee plan or assignment changed. Review the current amounts before confirming.",
            409,
          );
        if (
          data.chargeMinor !== proposal.chargeMinor ||
          data.currency !== proposal.currency ||
          data.periodStart !== proposal.periodStart ||
          data.periodEnd !== proposal.periodEnd
        )
          fail(
            "Use the applicable suggested amount, currency and billing period.",
          );
        data.planId = proposal.planId;
        data.zeroChargeReason = proposal.zeroChargeReason;
        billingSource = {
          kind: proposal.overrideId ? "PLAYER_OVERRIDE" : "BATCH_PLAN",
          planId: proposal.planId,
          planVersion: proposal.planVersion,
          planName: proposal.planName,
          assignmentId: proposal.assignmentId,
          assignmentVersion: proposal.assignmentVersion,
          overrideId: proposal.overrideId,
          overrideVersion: proposal.overrideVersion,
          squadId: proposal.squadId,
          sessionId: data.sessionId,
          billingFrequency: proposal.billingFrequency!,
        };
      }
      if (data.oneTimeKey && (!data.confirmed || !data.reviewed))
        fail("Explicitly review and confirm this distinct one-time charge.");
      if (data.oneTimeKey && derived)
        fail(
          "A default recurring charge cannot be relabelled as a one-time exception.",
        );
      if (data.chargeMinor === 0 && (!data.zeroChargeReason || !data.confirmed))
        fail(
          "A zero-charge invoice requires a confirmed free, scholarship or waiver rule.",
        );
      if (data.chargeMinor > 0 && data.zeroChargeReason)
        fail("A free or waived invoice must have a genuine zero charge.");
      if (player.status === "TRIAL") {
        const policyRow = database()
          .prepare("SELECT body FROM academy_trial_policies WHERE academyId=?")
          .get(ctx.academy.id);
        const policy = policyRow
          ? (JSON.parse(String(policyRow.body)) as {
              paidTrialsAllowed?: boolean;
              defaultFeeMinor?: number;
              currency?: string;
              feeRuleNote?: string;
            })
          : undefined;
        const paidTrial = database()
          .prepare(
            "SELECT body FROM academy_trial_enrolments WHERE academyId=? AND playerId=?",
          )
          .all(ctx.academy.id, player.id)
          .map(
            (row) =>
              JSON.parse(String(row.body)) as {
                id: string;
                pricing: string;
                feeMinor: number;
                currency: string;
                startDate: string;
                endDate: string;
                status: string;
              },
          )
          .find(
            (trial) =>
              trial.pricing === "PAID" &&
              !["CANCELLED", "NOT_CONVERTED"].includes(trial.status) &&
              data.label === `Trial enrolment ${trial.id}` &&
              data.chargeMinor === trial.feeMinor &&
              data.currency === trial.currency &&
              data.periodStart === trial.startDate &&
              data.periodEnd === trial.endDate,
          );
        if (
          !paidTrial ||
          !policy?.paidTrialsAllowed ||
          !policy.feeRuleNote ||
          policy.defaultFeeMinor !== paidTrial.feeMinor ||
          policy.currency !== paidTrial.currency
        )
          fail(
            "Trial charges require the current reviewed paid-trial policy and explicit trial invoice action.",
          );
      }
      if (data.planId) {
        const plan = repo.find(ctx.academy.id, "plan", data.planId);
        if (!plan?.active) fail("Choose an active academy fee plan.");
        if (
          (plan.applicableStartDate &&
            data.periodStart < plan.applicableStartDate) ||
          (plan.applicableEndDate && data.periodEnd > plan.applicableEndDate)
        )
          fail(
            "The billing period cannot begin before the fee plan's applicable start date.",
          );
        sameCurrency(plan.currency, data.currency);
        if (
          data.oneTimeKey &&
          (plan.billingFrequency ?? plan.cadence) !== "ONE_TIME"
        )
          fail("Choose a one-time plan for a separate one-time charge.");
        if (!derived && plan.amountMinor !== data.chargeMinor)
          fail(
            "Issue the plan amount; record any approved adjustment separately.",
          );
      } else sameCurrency(ctx.academy.currency, data.currency);
      const existingInvoices = repo
        .list(ctx.academy.id, "invoice")
        .filter((item) => item.playerId === data.playerId);
      if (
        data.oneTimeKey &&
        existingInvoices.some((item) => item.oneTimeKey === data.oneTimeKey)
      )
        fail("This one-time charge has already been issued.", 409);
      if (
        !data.oneTimeKey &&
        existingInvoices.some(
          (item) =>
            !item.oneTimeKey &&
            (derived ||
              !!item.billingSource ||
              (!!data.planId && !!item.planId)) &&
            data.periodStart <= item.periodEnd &&
            item.periodStart <= data.periodEnd &&
            !(
              billingSource?.billingFrequency === "PER_SESSION" &&
              item.billingSource?.billingFrequency === "PER_SESSION" &&
              data.sessionId !== item.billingSource.sessionId
            ),
        )
      )
        fail(
          "An invoice already covers this player's underlying billing period. Review existing charges before issuing another.",
          409,
        );
      if (
        repo
          .list(ctx.academy.id, "invoice")
          .some(
            (item) =>
              item.playerId === data.playerId &&
              item.periodStart === data.periodStart &&
              item.periodEnd === data.periodEnd &&
              item.label.toLowerCase() === data.label.toLowerCase(),
          )
      )
        fail(
          "An invoice for this player, label and billing period already exists.",
          409,
        );
      sum([
        ...repo
          .list(ctx.academy.id, "invoice")
          .filter((item) => item.currency === data.currency)
          .map((item) => projected(item, today(ctx)).billedMinor),
        data.chargeMinor,
      ]);
      const {
        assignmentId: _assignmentId,
        assignmentVersion: _assignmentVersion,
        overrideId: _overrideId,
        overrideVersion: _overrideVersion,
        planVersion: _planVersion,
        squadId: _squadId,
        sessionId: _sessionId,
        useApplicablePlan: _useApplicablePlan,
        confirmed: _confirmed,
        reviewed: _reviewed,
        ...invoiceData
      } = data;
      void [
        _assignmentId,
        _assignmentVersion,
        _overrideId,
        _overrideVersion,
        _planVersion,
        _squadId,
        _sessionId,
        _useApplicablePlan,
        _confirmed,
        _reviewed,
      ];
      result = repo.save(
        ctx.academy.id,
        "invoice",
        {
          ...base,
          ...invoiceData,
          billingSource,
          number: `INV-${recordId.toUpperCase()}`,
          version: 1,
          createdAt: at,
          issuedBy: ctx.user.id,
          snapshot: {
            academyName: ctx.academy.name,
            contactEmail: ctx.academy.contactEmail,
            logoData: ctx.academy.logoData,
            playerName: player.name,
          },
        },
        0,
        ctx.user.id,
      );
      break;
    }
    case "reference": {
      const data = z
        .object({
          invoiceId: id,
          amountMinor: minor,
          currency,
          reference: z.string().trim().min(3).max(160),
          method: z.enum(["BANK_TRANSFER", "UPI", "CASH", "OTHER"]),
          paidOn: date,
        })
        .parse(command.data);
      const invoice = invoiceFor(ctx, data.invoiceId);
      sameCurrency(invoice.currency, data.currency);
      if (data.paidOn > today(ctx))
        fail("Payment date cannot be in the future.");
      const balance = projected(invoice, today(ctx));
      if (data.amountMinor > balance.outstandingMinor)
        fail("Reference amount exceeds the outstanding balance.");
      sum([balance.pendingReferenceMinor, data.amountMinor]);
      if (
        repo
          .list(ctx.academy.id, "payment")
          .some(
            (item) =>
              referenceKey(item.reference) === referenceKey(data.reference),
          )
      )
        fail("This payment reference is already recorded in the academy.", 409);
      result = repo.save(
        ctx.academy.id,
        "payment",
        {
          ...base,
          ...data,
          playerId: invoice.playerId,
          status: "PENDING",
          version: 1,
          submittedAt: at,
          submittedBy: ctx.user.id,
        },
        0,
        ctx.user.id,
      );
      break;
    }
    case "verify":
    case "reject": {
      const data = z
        .object({ reviewed: z.literal(true), note: text })
        .parse(command.data);
      const payment = command.id
        ? repo.find(ctx.academy.id, "payment", command.id)
        : undefined;
      if (!payment) fail("Payment reference unavailable.", 404);
      const invoice = invoiceFor(ctx, payment.invoiceId);
      requiredVersion(command.expectedVersion, payment.version);
      if (payment.status !== "PENDING")
        fail("This reference already has a recorded decision.", 409);
      if (
        command.action === "verify" &&
        payment.amountMinor > projected(invoice, today(ctx)).outstandingMinor
      )
        fail("Verification would exceed the current invoice balance.", 409);
      result = repo.save(
        ctx.academy.id,
        "payment",
        {
          ...payment,
          status: command.action === "verify" ? "VERIFIED" : "REJECTED",
          version: payment.version + 1,
          decisionAt: at,
          decisionBy: ctx.user.id,
          decisionNote: data.note,
        },
        payment.version,
        ctx.user.id,
      );
      if (command.action === "verify") {
        const receipt: FinanceReceipt = {
          ...base,
          playerId: invoice.playerId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          number: `RCT-${recordId.toUpperCase()}`,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          reference: payment.reference,
          method: payment.method,
          paidOn: payment.paidOn,
          verifiedAt: at,
          snapshot: {
            ...invoice.snapshot,
            invoiceNumber: invoice.number,
            invoiceLabel: invoice.label,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
          },
        };
        repo.save(ctx.academy.id, "receipt", receipt, 0, ctx.user.id);
        saveInvoiceVersion(ctx, invoice);
      }
      break;
    }
    case "adjustment": {
      const data = z
        .object({
          invoiceId: id,
          direction: z.enum(["CREDIT", "DEBIT"]),
          amountMinor: minor,
          currency,
          reason: text,
          reviewed: z.literal(true),
        })
        .parse(command.data);
      const invoice = invoiceFor(ctx, data.invoiceId);
      sameCurrency(invoice.currency, data.currency);
      requiredVersion(command.expectedVersion, invoice.version);
      const balance = projected(invoice, today(ctx));
      if (
        data.direction === "CREDIT" &&
        data.amountMinor > balance.outstandingMinor
      )
        fail("Credit cannot exceed the remaining invoice balance.");
      sum([
        balance.billedMinor,
        data.direction === "CREDIT" ? -data.amountMinor : data.amountMinor,
      ]);
      sum([
        ...repo
          .list(ctx.academy.id, "invoice")
          .filter((item) => item.currency === data.currency)
          .map((item) => projected(item, today(ctx)).billedMinor),
        data.direction === "CREDIT" ? -data.amountMinor : data.amountMinor,
      ]);
      const { reviewed: _reviewed, ...event } = data;
      void _reviewed;
      result = repo.save(
        ctx.academy.id,
        "adjustment",
        {
          ...base,
          ...event,
          playerId: invoice.playerId,
          approvedAt: at,
          approvedBy: ctx.user.id,
        },
        0,
        ctx.user.id,
      );
      saveInvoiceVersion(ctx, invoice);
      break;
    }
    case "reminder": {
      const data = z.object({ invoiceId: id, body: text }).parse(command.data);
      const invoice = invoiceFor(ctx, data.invoiceId);
      if (projected(invoice, today(ctx)).outstandingMinor <= 0)
        fail("A settled invoice does not need a payment reminder.");
      const guardianIds = database()
        .prepare(
          "SELECT DISTINCT g.userId FROM guardian_relationships g JOIN academy_memberships m ON m.academyId=g.academyId AND m.userId=g.userId WHERE g.academyId=? AND g.playerId=? AND m.role='PARENT' AND m.active=1 AND (m.expiresAt IS NULL OR m.expiresAt>?)",
        )
        .all(ctx.academy.id, invoice.playerId, at)
        .map((row) => String(row.userId));
      if (!guardianIds.length)
        fail("No current linked parent is available for an in-app reminder.");
      result = repo.save(
        ctx.academy.id,
        "reminder",
        {
          ...base,
          ...data,
          playerId: invoice.playerId,
          guardianIds,
          createdAt: at,
          createdBy: ctx.user.id,
          inAppStatus: "PUBLISHED",
          externalStatus: "NOT_SENT",
        },
        0,
        ctx.user.id,
      );
      break;
    }
  }
  audit(
    ctx.academy.id,
    ctx.user.id,
    `Academy finance ${command.action}`,
    result.id,
  );
  database()
    .prepare(
      "INSERT INTO academy_finance_submissions(academyId,userId,requestId,digest,response) VALUES(?,?,?,?,?)",
    )
    .run(
      ctx.academy.id,
      ctx.user.id,
      command.requestId,
      digest,
      JSON.stringify(result),
    );
  return result;
}
