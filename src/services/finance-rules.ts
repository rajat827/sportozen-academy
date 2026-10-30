import type {
  FinanceBillingFrequency,
  FinanceBatchAssignment,
  FinancePlayerOverride,
  FinancePlan,
  FinanceInvoiceSuggestion,
} from "@/domain/finance";
export function currencyDigits(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
/** Exact editable major-unit value, without grouping or float rounding. */
export function financeAmountInput(amountMinor: number, currency: string) {
  const digits = currencyDigits(currency),
    scale = 10n ** BigInt(digits),
    amount = BigInt(amountMinor);
  return `${amount / scale}${digits ? "." + (amount % scale).toString().padStart(digits, "0") : ""}`;
}
/** Parse major units without a floating-point multiplication or rounding. */
export function parseFinanceAmount(
  value: string,
  currency: string,
  allowZero = false,
) {
  const digits = currencyDigits(currency);
  const valid = digits ? new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`) : /^\d+$/;
  if (!valid.test(value.trim()))
    throw new Error(
      `Enter a positive ${currency} amount with at most ${digits} decimal places.`,
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const amount =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (
    (allowZero ? amount < 0n : amount <= 0n) ||
    amount > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("Enter an amount within the supported positive range.");
  return Number(amount);
}
/** Keep the final minor digits exact even near Number.MAX_SAFE_INTEGER. */
export function formatFinanceMoney(
  amountMinor: number,
  currency: string,
  locale = "en-IN",
) {
  if (!Number.isSafeInteger(amountMinor)) return "Amount unavailable";
  const digits = currencyDigits(currency),
    scale = 10n ** BigInt(digits);
  const absolute = BigInt(Math.abs(amountMinor));
  const fraction = (absolute % scale).toString().padStart(digits, "0");
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).formatToParts(absolute / scale);
  return (
    (amountMinor < 0 ? "−" : "") +
    parts
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("")
  );
}

/** Date-only billing calendars avoid timezone shifts and clamp to the anchor month. */
export function financeDateAddDays(value: string, days: number) {
  const parsed = new Date(`${value}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function financeBillingPeriod(
  start: string,
  frequency: FinanceBillingFrequency,
  customDays?: number,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !Number.isFinite(Date.parse(`${start}T12:00:00Z`)) ||
    new Date(`${start}T12:00:00Z`).toISOString().slice(0, 10) !== start
  )
    throw new Error("Choose a valid billing start date.");
  const months =
    frequency === "QUARTERLY"
      ? 3
      : frequency === "HALF_YEARLY"
        ? 6
        : frequency === "YEARLY"
          ? 12
          : frequency === "MONTHLY" || frequency === "FREE"
            ? 1
            : 0;
  let end = start;
  if (months) {
    const anchor = new Date(`${start}T12:00:00Z`);
    const last = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + months + 1,
        0,
        12,
      ),
    );
    const next = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + months,
        Math.min(anchor.getUTCDate(), last.getUTCDate()),
        12,
      ),
    );
    end = financeDateAddDays(next.toISOString().slice(0, 10), -1);
  } else if (frequency === "WEEKLY") end = financeDateAddDays(start, 6);
  else if (frequency === "CUSTOM" || frequency === "TERM") {
    if (!Number.isInteger(customDays) || customDays! < 1 || customDays! > 3660)
      throw new Error(
        "Record a custom billing duration before suggesting this period.",
      );
    end = financeDateAddDays(start, customDays! - 1);
  }
  return { periodStart: start, periodEnd: end };
}
export function financePeriodsOverlap(
  a: { effectiveFrom: string; effectiveTo?: string },
  b: { effectiveFrom: string; effectiveTo?: string },
) {
  return (
    a.effectiveFrom <= (b.effectiveTo ?? "9999-12-31") &&
    b.effectiveFrom <= (a.effectiveTo ?? "9999-12-31")
  );
}
/** A suggestion never issues a charge. The server rechecks the same facts on confirmation. */
export function financeInvoiceSuggestion(input: {
  playerId: string;
  squadIds: string[];
  date: string;
  currency: string;
  plans: FinancePlan[];
  assignments: FinanceBatchAssignment[];
  overrides: FinancePlayerOverride[];
  squadId?: string;
  sessionDate?: string;
  trial?: boolean;
}): FinanceInvoiceSuggestion {
  const unavailable = (reason: string): FinanceInvoiceSuggestion => ({
    available: false,
    reason,
    playerId: input.playerId,
    asOfDate: input.date,
  });
  if (input.trial)
    return unavailable(
      "Trial fees follow the reviewed trial policy; use the explicit paid-trial invoice action.",
    );
  const applies = (record: {
    active: boolean;
    effectiveFrom: string;
    effectiveTo?: string;
  }) =>
    record.active &&
    record.effectiveFrom <= input.date &&
    (!record.effectiveTo || record.effectiveTo >= input.date);
  const override = input.overrides.find(
    (item) => item.playerId === input.playerId && applies(item),
  );
  const assignments = input.assignments.filter(
    (item) =>
      applies(item) &&
      input.squadIds.includes(item.squadId) &&
      (!input.squadId || item.squadId === input.squadId),
  );
  if (input.squadId && !input.squadIds.includes(input.squadId))
    return unavailable("Choose a batch currently assigned to this player.");
  if (assignments.length > 1 && !override?.planId)
    return unavailable(
      "Choose the training batch before suggesting its fee plan.",
    );
  const assignment = assignments[0];
  const planId = override?.planId ?? assignment?.planId;
  const plan = input.plans.find((item) => item.id === planId);
  const zero = override?.kind === "SCHOLARSHIP" || override?.kind === "WAIVER";
  if (!plan && !zero)
    return unavailable(
      "No applicable batch fee plan or player override is recorded for this date.",
    );
  if (
    plan &&
    (!plan.active ||
      (plan.applicableStartDate && input.date < plan.applicableStartDate) ||
      (plan.applicableEndDate && input.date > plan.applicableEndDate))
  )
    return unavailable(
      "The applicable fee plan is archived or outside its effective dates.",
    );
  const frequency = plan?.billingFrequency ?? plan?.cadence ?? "FREE";
  if (frequency === "PER_SESSION" && !input.sessionDate)
    return unavailable(
      "Choose an actual scheduled or completed session for per-session billing.",
    );
  const start = frequency === "PER_SESSION" ? input.sessionDate! : input.date;
  let period: { periodStart: string; periodEnd: string };
  try {
    period = financeBillingPeriod(start, frequency, plan?.customPeriodDays);
  } catch (error) {
    return unavailable(
      error instanceof Error
        ? error.message
        : "The billing period needs review.",
    );
  }
  if (
    (assignment?.effectiveTo && period.periodEnd > assignment.effectiveTo) ||
    (override?.effectiveTo && period.periodEnd > override.effectiveTo) ||
    (plan?.applicableEndDate && period.periodEnd > plan.applicableEndDate)
  )
    return unavailable(
      "This billing period extends beyond the applicable plan or assignment dates.",
    );
  let amount = plan?.amountMinor ?? 0;
  if (override?.kind === "PLAN" && override.amountMinor !== undefined)
    amount = override.amountMinor;
  if (override?.kind === "DISCOUNT") {
    const reduction =
      override.discountMinor ??
      Number(
        (BigInt(amount) * BigInt(override.discountBasisPoints ?? 0)) / 10000n,
      );
    if (reduction > amount)
      return unavailable(
        "The recorded discount exceeds the current fee plan; review the override.",
      );
    amount -= reduction;
  }
  if (zero) amount = 0;
  const currency = plan?.currency ?? override?.currency ?? input.currency;
  if (override && override.currency !== currency)
    return unavailable(
      "Player override currency must match the applicable fee plan.",
    );
  return {
    available: true,
    reason:
      "Review and confirm this proposed charge; no invoice has been issued.",
    playerId: input.playerId,
    asOfDate: input.date,
    planId: plan?.id,
    planVersion: plan?.version,
    planName: plan?.name,
    assignmentId: assignment?.id,
    assignmentVersion: assignment?.version,
    overrideId: override?.id,
    overrideVersion: override?.version,
    squadId: assignment?.squadId,
    billingFrequency: frequency,
    chargeMinor: amount,
    currency,
    ...period,
    dueDate: financeDateAddDays(start, plan?.dueAfterDays ?? 0),
    zeroChargeReason:
      amount === 0
        ? zero
          ? (override!.kind as "SCHOLARSHIP" | "WAIVER")
          : frequency === "FREE"
            ? "FREE"
            : "WAIVER"
        : undefined,
  };
}
