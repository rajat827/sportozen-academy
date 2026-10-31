import {
  test,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence-path";
import type {
  FinanceInvoiceSuggestion,
  FinanceInvoiceView,
  FinancePayload,
  FinancePayment,
  FinancePlan,
} from "../../src/domain/finance";
import { financeBillingFrequencies } from "../../src/domain/finance";
import { financePerSessionNotice } from "../../src/services/finance-rules";
import type {
  WorkspacePayload,
  WorkspacePlayer,
} from "../../src/domain/workspace";
import type { FootballSquad } from "../../src/domain/training";

test("configured batch fees, player exceptions, reviewed suggestions and one-time extras stay safe across roles", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(600000);
  const origin = String(testInfo.project.use.baseURL),
    suffix = crypto.randomUUID(),
    shots = evidencePath("docs/screenshots/fee-configuration");
  await mkdir(shots, { recursive: true });
  let registrations = 0;
  async function register(name: string) {
    // Better Auth applies its normal registration throttle to this synthetic QA host.
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const email = `${name}-${suffix}@example.test`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password: `Synthetic-only-${crypto.randomUUID()}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    return { api, email, id: (await response.json()).user.id as string };
  }
  const owner = await register("FeeOwner"),
    coach = await register("FeeCoach"),
    parent = await register("FeeParent");
  async function post<T>(
    api: APIRequestContext,
    path: string,
    data: unknown,
    status = 200,
  ): Promise<T> {
    const response = await api.post(path, { data });
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  }
  const academy = await post<{ id: string }>(
    owner.api,
    "/api/workspaces",
    {
      name: "Fee Configuration QA Academy",
      contactEmail: "fictional-fee-configuration@example.test",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      ageGroups: ["U12", "U14"],
      modules: ["development", "reports", "communication", "fees"],
      demo: false,
    },
    201,
  );
  const root = `/api/workspaces/${academy.id}`,
    route = `/workspace/${academy.id}?section=fees`;
  const finance = async (api = owner.api) => {
    const response = await api.get(`${root}/finance`);
    expect(response.status()).toBe(200);
    return response.json() as Promise<FinancePayload>;
  };
  const fee = <T>(
    action: string,
    data: unknown,
    status = 200,
    id?: string,
    expectedVersion?: number,
    api = owner.api,
  ) =>
    post<T>(
      api,
      `${root}/finance`,
      { requestId: crypto.randomUUID(), action, id, expectedVersion, data },
      status,
    );
  const save = <T>(kind: string, data: unknown) =>
    post<T>(owner.api, `${root}/records/${kind}`, data, 201);
  const invitation = async (
    person: typeof coach,
    role: "COACH" | "PARENT",
    playerIds: string[] = [],
  ) => {
    const invite = await post<{ token: string }>(owner.api, `${root}/actions`, {
      action: "invite",
      data: {
        email: person.email,
        role,
        playerIds,
        guardianVerified: role === "PARENT",
      },
      verified: true,
    });
    await post(person.api, "/api/invitations/accept", { token: invite.token });
  };
  await invitation(coach, "COACH");
  const branch = await save<{ id: string }>("branch", {
    name: "Main ground",
    timezone: "Asia/Kolkata",
  });
  const batch = async (name: string) =>
    post<FootballSquad>(owner.api, `${root}/training`, {
      requestId: crypto.randomUUID(),
      action: "squad",
      data: { name, branchId: branch.id, playerIds: [] },
    });
  const u14 = await batch("U14 Squad"),
    u12 = await batch("U12 Free Starters");
  const player = (name: string, squadId: string, status = "ACTIVE") =>
    save<WorkspacePlayer>("player", {
      name,
      coachId: coach.id,
      squadId,
      status,
    });
  const discounted = await player("Fee Child Discount", u14.id),
    scholar = await player("Fee Child Scholarship", u14.id),
    individual = await player("Fee Child Individual", ""),
    trial = await player("Fee Child Trial", u14.id, "TRIAL"),
    free = await player("Fee Child Free", u12.id),
    waived = await player("Fee Child Waiver", u14.id);
  await invitation(parent, "PARENT", [discounted.id]);

  const context = await browser.newContext({
    storageState: await owner.api.storageState(),
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Cancelling a changed fee draft asks for confirmation before discarding it.
  page.on("dialog", (prompt) => prompt.accept());
  const tab = async (name: string) => {
    await page.goto(route);
    await page.getByRole("button", { name, exact: true }).click();
  };
  const dialog = (name: string) =>
    page.getByRole("dialog", { name, exact: true });
  const shot = (
    name: string,
    target: Page | ReturnType<typeof dialog> = page,
  ) => target.screenshot({ path: `${shots}/${name}.png` });
  async function submit(name: string, button: string, outcome: RegExp) {
    await dialog(name)
      .getByRole("button", { name: button, exact: true })
      .click();
    await expect(dialog(name)).toBeHidden();
    await expect(page.getByRole("status")).toContainText(outcome);
  }

  // 1. Create fee plans with every backend frequency available.
  await tab("Fee Plans");
  await page
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  let editor = dialog("Create fee plan");
  expect(
    await editor
      .getByLabel("Billing frequency", { exact: true })
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual([...financeBillingFrequencies]);
  await editor.getByLabel("Plan name", { exact: true }).fill("Holiday block");
  await editor
    .getByLabel("Billing frequency", { exact: true })
    .selectOption("CUSTOM");
  await editor
    .getByLabel("Applicable start date", { exact: true })
    .fill("2026-10-01");
  await editor.getByLabel("Amount (INR)", { exact: true }).fill("4500.00");
  await editor
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  const length = editor.getByLabel("Billing length (days)", { exact: true });
  expect(
    await length.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);
  await length.fill("45");
  await editor
    .getByLabel("Payment due after (days)", { exact: true })
    .fill("7");
  await shot("01-plan-editor-custom", editor);
  await submit("Create fee plan", "Save Fee Plan", /Fee plan saved/);
  await page
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  editor = dialog("Create fee plan");
  await editor
    .getByLabel("Plan name", { exact: true })
    .fill("U14 Monthly Training");
  await editor
    .getByLabel("Applicable start date", { exact: true })
    .fill("2026-10-01");
  await editor.getByLabel("Amount (INR)", { exact: true }).fill("2000.00");
  await editor
    .getByLabel("Payment due after (days)", { exact: true })
    .fill("5");
  await submit("Create fee plan", "Save Fee Plan", /Fee plan saved/);
  await page
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  editor = dialog("Create fee plan");
  await editor.getByLabel("Plan name", { exact: true }).fill("Free starter");
  await editor
    .getByLabel("Billing frequency", { exact: true })
    .selectOption("FREE");
  await expect(editor.getByLabel("Amount (INR)", { exact: true })).toHaveCount(
    0,
  );
  await editor
    .getByLabel("Applicable start date", { exact: true })
    .fill("2026-10-01");
  await submit("Create fee plan", "Save Fee Plan", /Fee plan saved/);
  let plans = (await finance()).plans;
  const byName = (name: string) => plans.find((plan) => plan.name === name)!;
  expect(byName("Holiday block")).toMatchObject({
    billingFrequency: "CUSTOM",
    customPeriodDays: 45,
    dueAfterDays: 7,
    amountMinor: 450000,
  });
  expect(byName("Free starter")).toMatchObject({
    billingFrequency: "FREE",
    amountMinor: 0,
  });
  // 2. Edit a fee plan; the server keeps the version history.
  await page
    .locator(".pf-event")
    .filter({ hasText: "U14 Monthly Training" })
    .getByRole("button", { name: "Edit fee plan", exact: true })
    .click();
  editor = dialog("Edit fee plan");
  await editor.getByLabel("Amount (INR)", { exact: true }).fill("2200.00");
  await editor.getByLabel("Plan end date", { exact: true }).fill("2030-12-31");
  await submit("Edit fee plan", "Save Fee Plan", /Fee plan saved/);
  plans = (await finance()).plans;
  const monthly = byName("U14 Monthly Training");
  expect(monthly).toMatchObject({
    amountMinor: 220000,
    applicableEndDate: "2030-12-31",
    dueAfterDays: 5,
    version: 2,
  });
  const goalkeeping = await fee<FinancePlan>("plan", {
      name: "Goalkeeper coaching",
      amountMinor: 80000,
      currency: "INR",
      billingFrequency: "MONTHLY",
      applicableStartDate: "2026-10-01",
      active: true,
    }),
    kit = await fee<FinancePlan>("plan", {
      name: "Home kit",
      amountMinor: 150000,
      currency: "INR",
      billingFrequency: "ONE_TIME",
      applicableStartDate: "2026-10-01",
      active: true,
    });

  // 3. Batch defaults, the overlap rule and a safe edit.
  await tab("Fee Plans");
  async function assign(
    batchId: string,
    planId: string,
    from: string,
    until = "",
  ) {
    await page
      .getByRole("button", { name: "Assign batch plan", exact: true })
      .click();
    const form = dialog("Assign batch fee plan");
    await form
      .getByLabel("Training batch", { exact: true })
      .selectOption(batchId);
    await form
      .getByLabel("Default fee plan", { exact: true })
      .selectOption(planId);
    await form.getByLabel("Effective from", { exact: true }).fill(from);
    if (until)
      await form.getByLabel("Effective until", { exact: true }).fill(until);
    return form;
  }
  // The plan now ends on 2030-12-31, so its batch default must end by then too.
  const ending = await assign(u14.id, monthly.id, "2026-10-01");
  await ending
    .getByRole("button", { name: "Save batch fee plan", exact: true })
    .click();
  await expect(ending.getByRole("alert")).toContainText(
    /must end within the fee plan/,
  );
  await ending
    .getByLabel("Effective until", { exact: true })
    .fill("2030-12-31");
  await shot("02-batch-assignment-dialog", dialog("Assign batch fee plan"));
  await submit(
    "Assign batch fee plan",
    "Save batch fee plan",
    /Batch default plan saved/,
  );
  const overlap = await assign(u14.id, goalkeeping.id, "2026-10-15");
  await overlap
    .getByRole("button", { name: "Save batch fee plan", exact: true })
    .click();
  await expect(overlap.getByRole("alert")).toContainText(/overlapping/);
  await overlap.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog("Assign batch fee plan")).toBeHidden();
  const free_ = byName("Free starter");
  await assign(u12.id, free_.id, "2026-10-01");
  await submit(
    "Assign batch fee plan",
    "Save batch fee plan",
    /Batch default plan saved/,
  );
  await page
    .getByRole("button", { name: "Edit batch plan for U14 Squad" })
    .click();
  await dialog("Edit batch fee plan")
    .getByLabel("Effective until", { exact: true })
    .fill("2029-12-31");
  await submit(
    "Edit batch fee plan",
    "Save batch fee plan",
    /Batch default plan saved/,
  );
  let account = await finance();
  expect(account.batchAssignments).toHaveLength(2);
  expect(
    account.batchAssignments.find((item) => item.squadId === u14.id),
  ).toMatchObject({
    planId: monthly.id,
    effectiveTo: "2029-12-31",
    version: 2,
  });
  expect(account.invoices).toEqual([]);

  // 4–7. Player exceptions: different plan, discount, scholarship and waiver.
  async function exception(
    playerId: string,
    kind: string,
    fill: (form: ReturnType<typeof dialog>) => Promise<void>,
  ) {
    await page
      .getByRole("button", { name: "Add player exception", exact: true })
      .click();
    const form = dialog("Add player fee exception");
    await form.getByLabel("Player", { exact: true }).selectOption(playerId);
    await form.getByLabel("Exception type", { exact: true }).selectOption(kind);
    await fill(form);
    await form.getByLabel("Effective from", { exact: true }).fill("2026-10-01");
    await form
      .getByLabel("Reason", { exact: true })
      .fill(`Reviewed fictional ${kind.toLowerCase()} exception`);
    await form
      .getByRole("checkbox", {
        name: "I reviewed this exception and its effect on future suggested charges",
      })
      .check();
    return form;
  }
  await exception(discounted.id, "DISCOUNT", async (form) => {
    await form
      .getByLabel("Discount type", { exact: true })
      .selectOption("PERCENT");
    await form.getByLabel("Discount percentage", { exact: true }).fill("10");
  });
  await shot("03-player-exception-dialog", dialog("Add player fee exception"));
  await submit(
    "Add player fee exception",
    "Save fee exception",
    /exception saved/,
  );
  await exception(scholar.id, "SCHOLARSHIP", async () => {});
  await submit(
    "Add player fee exception",
    "Save fee exception",
    /exception saved/,
  );
  await exception(waived.id, "WAIVER", async () => {});
  await submit(
    "Add player fee exception",
    "Save fee exception",
    /exception saved/,
  );
  await exception(individual.id, "PLAN", async (form) => {
    await form
      .getByLabel("Fee plan for this player", { exact: true })
      .selectOption(goalkeeping.id);
  });
  await submit(
    "Add player fee exception",
    "Save fee exception",
    /exception saved/,
  );
  await shot("04-fee-plans-tab");
  account = await finance();
  expect(account.playerOverrides.map((item) => item.kind).sort()).toEqual([
    "DISCOUNT",
    "PLAN",
    "SCHOLARSHIP",
    "WAIVER",
  ]);
  expect(
    account.playerOverrides.find((item) => item.kind === "DISCOUNT"),
  ).toMatchObject({ discountBasisPoints: 1000, playerId: discounted.id });

  // 8. Suggested invoices use only the server's calculation.
  const suggestion = (id: string) =>
    account.invoiceSuggestions.find((item) => item.playerId === id)!;
  expect(suggestion(discounted.id)).toMatchObject({
    available: true,
    baseChargeMinor: 220000,
    chargeMinor: 198000,
  });
  expect(suggestion(scholar.id)).toMatchObject({
    available: true,
    chargeMinor: 0,
    zeroChargeReason: "SCHOLARSHIP",
  });
  expect(suggestion(waived.id)).toMatchObject({
    chargeMinor: 0,
    zeroChargeReason: "WAIVER",
  });
  expect(suggestion(free.id)).toMatchObject({
    chargeMinor: 0,
    zeroChargeReason: "FREE",
  });
  expect(suggestion(individual.id)).toMatchObject({
    planId: goalkeeping.id,
    baseChargeMinor: 80000,
    chargeMinor: 80000,
  });
  // 16. Trial players never receive a recurring suggestion or a manual charge.
  expect(suggestion(trial.id)).toMatchObject({ available: false });
  expect(suggestion(trial.id).reason).toMatch(/Trial/);
  const reviewed: Record<string, FinanceInvoiceSuggestion> = {};
  for (const item of account.invoiceSuggestions) reviewed[item.playerId] = item;
  await tab("Invoices");
  const suggestions = page.locator(".pf-suggestions");
  await expect(
    suggestions.locator(".pf-event").filter({ hasText: "Fee Child Discount" }),
  ).toContainText(
    "Original ₹2,200.00 · Adjustment: 10% discount · Final ₹1,980.00",
  );
  await suggestions.locator("summary").click();
  await expect(suggestions.locator("details")).toContainText("Fee Child Trial");
  await shot("05-suggested-invoices");

  // 9. Review and confirm; nothing is issued without explicit confirmation.
  async function issueSuggestion(name: string) {
    await page
      .getByRole("button", { name: `Review suggested invoice for ${name}` })
      .click();
    return dialog("Review suggested invoice");
  }
  let review = await issueSuggestion("Fee Child Discount");
  await expect(review.locator(".pf-breakdown")).toContainText("₹2,200.00");
  await expect(review.locator(".pf-breakdown")).toContainText(
    "10% discount (−₹220.00)",
  );
  await expect(review.locator(".pf-breakdown")).toContainText("₹1,980.00");
  await shot("06-suggestion-review", review);
  await review
    .getByRole("button", { name: "Issue reviewed invoice", exact: true })
    .click();
  await expect(review).toBeVisible();
  expect((await finance()).invoices).toEqual([]);
  await review
    .getByRole("checkbox", {
      name: "I reviewed the player, plan, billing period and final charge",
    })
    .check();
  await submit(
    "Review suggested invoice",
    "Issue reviewed invoice",
    /Invoice issued/,
  );
  account = await finance();
  const issued = account.invoices.find(
    (item) => item.playerId === discounted.id,
  )!;
  const reviewedDiscount = reviewed[discounted.id];
  expect(issued).toMatchObject({
    chargeMinor: reviewedDiscount.chargeMinor,
    currency: reviewedDiscount.currency,
    periodStart: reviewedDiscount.periodStart,
    periodEnd: reviewedDiscount.periodEnd,
    planId: monthly.id,
    billingSource: {
      kind: "PLAYER_OVERRIDE",
      overrideId: reviewedDiscount.overrideId,
      assignmentId: reviewedDiscount.assignmentId,
      planVersion: 2,
    },
  });
  for (const name of [
    "Fee Child Scholarship",
    "Fee Child Waiver",
    "Fee Child Free",
    "Fee Child Individual",
  ]) {
    review = await issueSuggestion(name);
    await review
      .getByRole("checkbox", {
        name: "I reviewed the player, plan, billing period and final charge",
      })
      .check();
    await submit(
      "Review suggested invoice",
      "Issue reviewed invoice",
      /Invoice issued/,
    );
  }
  account = await finance();
  expect(account.invoices).toHaveLength(5);
  const invoiceOf = (id: string) =>
    account.invoices.find((item) => item.playerId === id)!;
  // 14–15. FREE and WAIVED remain distinct, server-derived states.
  expect(invoiceOf(free.id)).toMatchObject({
    status: "FREE",
    billedMinor: 0,
    zeroChargeReason: "FREE",
  });
  expect(invoiceOf(scholar.id)).toMatchObject({
    status: "WAIVED",
    zeroChargeReason: "SCHOLARSHIP",
  });
  expect(invoiceOf(waived.id)).toMatchObject({
    status: "WAIVED",
    zeroChargeReason: "WAIVER",
  });
  expect(account.receipts).toEqual([]);

  // 10. Duplicate issuance is refused by the server, through the API and the UI.
  expect(
    account.invoiceSuggestions.find((item) => item.playerId === discounted.id),
  ).toMatchObject({ available: false, coveringInvoiceId: issued.id });
  await fee(
    "invoice",
    {
      ...reviewedDiscount,
      label: "Renamed duplicate",
      useApplicablePlan: true,
      confirmed: true,
    },
    409,
  );
  await tab("Fee Plans");
  async function manualInvoice(planId: string, label: string) {
    await page
      .getByRole("button", { name: "Issue player invoice", exact: true })
      .click();
    const form = dialog("Issue player invoice");
    await form
      .getByLabel("Player", { exact: true })
      .selectOption(discounted.id);
    await form.getByLabel("Fee plan", { exact: true }).selectOption(planId);
    await form.getByLabel("Invoice label", { exact: true }).fill(label);
    await form
      .getByLabel("Billing period start", { exact: true })
      .fill(issued.periodStart);
    await form
      .getByLabel("Billing period end", { exact: true })
      .fill(issued.periodEnd);
    await form.getByLabel("Due date", { exact: true }).fill(issued.dueDate);
    await form
      .getByRole("button", { name: "Issue player invoice", exact: true })
      .click();
    return form;
  }
  const duplicate = await manualInvoice(monthly.id, "Same training plan again");
  await expect(duplicate.getByRole("alert")).toContainText(
    /underlying billing period/,
  );
  await duplicate.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await finance()).invoices).toHaveLength(5);
  // A different plan is a separate, legitimately billable service.
  const separate = await manualInvoice(goalkeeping.id, "Goalkeeper coaching");
  await expect(separate).toBeHidden();
  account = await finance();
  expect(account.invoices).toHaveLength(6);

  // 11. Reviewed one-time extras: unique references, never the recurring fee.
  await tab("Invoices");
  async function oneTime(
    fill: (form: ReturnType<typeof dialog>) => Promise<void>,
  ) {
    await page
      .getByRole("button", { name: "Issue one-time charge", exact: true })
      .click();
    const form = dialog("Issue one-time charge");
    await form
      .getByLabel("Player", { exact: true })
      .selectOption(discounted.id);
    await fill(form);
    await form.getByLabel("Due date", { exact: true }).fill(issued.dueDate);
    await form
      .getByRole("checkbox", { name: /I reviewed this separate charge/ })
      .check();
    return form;
  }
  await oneTime(async (form) => {
    await form
      .getByLabel("One-time fee plan", { exact: true })
      .selectOption(kit.id);
    await form
      .getByLabel("Charge description", { exact: true })
      .fill("Home kit 2026");
    await form
      .getByLabel("Charge reference", { exact: true })
      .fill("home-kit-2026");
  });
  await shot("07-one-time-charge", dialog("Issue one-time charge"));
  await submit(
    "Issue one-time charge",
    "Issue one-time charge",
    /One-time charge issued/,
  );
  const repeat = await oneTime(async (form) => {
    await form
      .getByLabel("Charge description", { exact: true })
      .fill("Home kit again");
    await form
      .getByLabel("Charge reference", { exact: true })
      .fill("home-kit-2026");
    await form.getByLabel("Amount (INR)", { exact: true }).fill("1500.00");
  });
  await repeat
    .getByRole("button", { name: "Issue one-time charge", exact: true })
    .click();
  await expect(repeat.getByRole("alert")).toContainText(/already been issued/);
  await repeat.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog("Issue one-time charge")).toBeHidden();
  await oneTime(async (form) => {
    await form
      .getByLabel("Charge description", { exact: true })
      .fill("Extra finishing coaching");
    await form
      .getByLabel("Charge reference", { exact: true })
      .fill("extra-finishing-2026");
    await form.getByLabel("Amount (INR)", { exact: true }).fill("500.00");
  });
  await submit(
    "Issue one-time charge",
    "Issue one-time charge",
    /One-time charge issued/,
  );
  account = await finance();
  expect(account.invoices).toHaveLength(8);
  expect(
    account.invoices
      .filter((item) => item.oneTimeKey)
      .map((item) => [item.oneTimeKey, item.chargeMinor])
      .sort(),
  ).toEqual([
    ["extra-finishing-2026", 50000],
    ["home-kit-2026", 150000],
  ]);

  // 13. Decided payments stay protected.
  const reference = await fee<FinancePayment>("reference", {
    invoiceId: issued.id,
    amountMinor: 50000,
    currency: "INR",
    reference: `UPI-${suffix.slice(0, 8)}`,
    method: "UPI",
    paidOn: (await finance()).asOfDate,
  });
  const verified = await fee<FinancePayment>(
    "verify",
    { reviewed: true, note: "Matched against the academy record" },
    200,
    reference.id,
    reference.version,
  );
  expect(verified.status).toBe("VERIFIED");
  for (const action of ["verify", "reject"])
    await fee(
      action,
      { reviewed: true, note: "Second decision attempt" },
      409,
      reference.id,
      verified.version,
    );
  expect(
    (await finance()).payments.find((item) => item.id === reference.id),
  ).toMatchObject({
    status: "VERIFIED",
    decisionNote: "Matched against the academy record",
  });

  // 12 and 17. Later configuration changes never recalculate issued invoices.
  const before = (await finance()).invoices;
  await fee(
    "plan",
    {
      name: monthly.name,
      amountMinor: 250000,
      currency: "INR",
      billingFrequency: "MONTHLY",
      applicableStartDate: "2026-10-01",
      applicableEndDate: "2030-12-31",
      active: true,
    },
    200,
    monthly.id,
    2,
  );
  const discount = (await finance()).playerOverrides.find(
    (item) => item.kind === "DISCOUNT",
  )!;
  await fee(
    "playerOverride",
    {
      playerId: discount.playerId,
      kind: "DISCOUNT",
      discountBasisPoints: 1000,
      currency: "INR",
      effectiveFrom: discount.effectiveFrom,
      reason: discount.reason,
      reviewed: true,
      active: false,
    },
    200,
    discount.id,
    discount.version,
  );
  const after = (await finance()).invoices;
  const stable = (items: FinanceInvoiceView[]) =>
    items.map(
      ({
        paidMinor: _paid,
        outstandingMinor: _outstanding,
        status: _status,
        ...rest
      }) => {
        void [_paid, _outstanding, _status];
        return rest;
      },
    );
  expect(stable(after)).toEqual(stable(before));
  expect(after.find((item) => item.id === issued.id)?.chargeMinor).toBe(198000);
  // Trial charges still need the explicit paid-trial workflow.
  await fee(
    "invoice",
    {
      playerId: trial.id,
      label: "Manual trial charge",
      chargeMinor: 50000,
      currency: "INR",
      periodStart: issued.periodStart,
      periodEnd: issued.periodEnd,
      dueDate: issued.dueDate,
    },
    400,
  );

  // Batch column, batch filter, status filters and fee details with saved data.
  await tab("Invoices");
  const rows = page.locator(".pf-table tbody tr");
  const rowFor = (name: string) => rows.filter({ hasText: name });
  await expect(rowFor("Fee Child Discount").first()).toContainText("U14 Squad");
  await expect(rowFor("Fee Child Individual")).toContainText(
    "Not assigned yet",
  );
  await expect(rowFor("Fee Child Free")).toContainText("U12 Free Starters");
  await page.getByLabel("Filter batch").selectOption("U12 Free Starters");
  await expect(rows).toHaveCount(1);
  await page.getByLabel("Filter batch").selectOption("U14 Squad");
  await expect(rows).toHaveCount(6);
  await page.getByLabel("Filter batch").selectOption("");
  const status = page.getByLabel("Filter fee status");
  expect(await status.locator("option").allTextContents()).toContain("FREE");
  await status.selectOption("FREE");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Fee Child Free");
  await expect(rows.first().locator(".pf-status")).toHaveText("free");
  await shot("08-free-status-filter");
  await status.selectOption("WAIVED");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Fee Child Free" })).toHaveCount(0);
  await status.selectOption("");
  await page
    .getByRole("button", { name: "Open Fee Child Individual fee details" })
    .click();
  const detail = page.getByRole("complementary", {
    name: "Selected player fee account",
  });
  await expect(detail).toContainText("Not assigned yet");
  await expect(detail).toContainText("₹800.00");

  // Parent: only the linked child's issued invoices; no configuration, no writes.
  const parentView = await finance(parent.api);
  expect(parentView.canManage).toBe(false);
  expect(parentView.plans).toEqual([]);
  expect(parentView.batchAssignments).toEqual([]);
  expect(parentView.playerOverrides).toEqual([]);
  expect(parentView.invoiceSuggestions).toEqual([]);
  expect(new Set(parentView.invoices.map((item) => item.playerId))).toEqual(
    new Set([discounted.id]),
  );
  for (const action of ["plan", "batchAssignment", "playerOverride", "invoice"])
    expect(
      (
        await parent.api.post(`${root}/finance`, {
          data: { requestId: crypto.randomUUID(), action, data: {} },
        })
      ).status(),
    ).toBe(403);
  const parentContext = await browser.newContext({
    storageState: await parent.api.storageState(),
    viewport: { width: 390, height: 844 },
  });
  const parentPage = await parentContext.newPage();
  parentPage.on("pageerror", (error) => errors.push(error.message));
  await parentPage.goto(`${route}&player=${discounted.id}`);
  await expect(
    parentPage.getByRole("heading", { name: "Fees", exact: true }),
  ).toBeVisible();
  await expect(
    parentPage.getByRole("button", { name: "Fee Plans", exact: true }),
  ).toHaveCount(0);
  await expect(
    parentPage.getByRole("button", { name: "Invoices", exact: true }),
  ).toBeVisible();
  await parentPage
    .getByRole("button", { name: "Invoices", exact: true })
    .click();
  await expect(parentPage.locator(".pf-suggestions")).toHaveCount(0);
  const parentText = await parentPage.locator("body").innerText();
  for (const hidden of [
    "Fee Child Scholarship",
    "Fee Child Free",
    "Fee Child Individual",
    "Batch default plans",
    "Player fee exceptions",
    "Suggested invoices",
  ])
    expect(parentText).not.toContain(hidden);
  // Coach: no finance read, write or navigation.
  expect((await coach.api.get(`${root}/finance`)).status()).toBe(403);
  expect(
    (
      await coach.api.post(`${root}/finance`, {
        data: { requestId: crypto.randomUUID(), action: "plan", data: {} },
      })
    ).status(),
  ).toBe(403);
  const coachContext = await browser.newContext({
    storageState: await coach.api.storageState(),
  });
  const coachPage = await coachContext.newPage();
  coachPage.on("pageerror", (error) => errors.push(error.message));
  await coachPage.goto(route);
  await expect(
    coachPage.getByRole("button", { name: "Fees", exact: true }).first(),
  ).toBeDisabled();
  await expect(coachPage.locator(".portal-fees")).toHaveCount(0);
  expect(await coachPage.locator("body").innerText()).not.toContain("₹");
  const workspace = (await (
    await owner.api.get(root)
  ).json()) as WorkspacePayload;
  expect(workspace.records.player).toHaveLength(6);
  expect(errors).toEqual([]);
  await Promise.all([
    context.close(),
    parentContext.close(),
    coachContext.close(),
  ]);
});

test("plan numbers can be cleared, per-session plans stay manual and fee dialogs fit 390px and 320px phones", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(300000);
  const origin = String(testInfo.project.use.baseURL),
    shots = evidencePath("docs/screenshots/fee-configuration/phones");
  await mkdir(shots, { recursive: true });
  const api = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const signUp = await api.post("/api/auth/sign-up/email", {
    data: {
      name: "FeePhoneOwner",
      email: `fee-phone-owner-${crypto.randomUUID()}@example.test`,
      password: `Synthetic-only-${crypto.randomUUID()}`,
    },
  });
  expect(signUp.status(), await signUp.text()).toBe(200);
  const ownerId = (await signUp.json()).user.id as string;
  async function post<T>(path: string, data: unknown, status = 200) {
    const response = await api.post(path, { data });
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  }
  const academy = await post<{ id: string }>(
    "/api/workspaces",
    {
      name: "Fee Phone Layout QA Academy",
      contactEmail: "fictional-fee-phones@example.test",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      ageGroups: ["U10", "U16"],
      modules: ["development", "fees"],
      demo: false,
    },
    201,
  );
  const root = `/api/workspaces/${academy.id}`,
    route = `/workspace/${academy.id}?section=fees`;
  const finance = async () => {
    const response = await api.get(`${root}/finance`);
    expect(response.status()).toBe(200);
    return response.json() as Promise<FinancePayload>;
  };
  const fee = <T>(action: string, data: unknown) =>
    post<T>(`${root}/finance`, {
      requestId: crypto.randomUUID(),
      action,
      data,
    });
  const branch = await post<{ id: string }>(
    `${root}/records/branch`,
    { name: "Phone ground", timezone: "Asia/Kolkata" },
    201,
  );
  const batch = (name: string) =>
    post<FootballSquad>(`${root}/training`, {
      requestId: crypto.randomUUID(),
      action: "squad",
      data: { name, branchId: branch.id, playerIds: [] },
    });
  const monthlyBatch = await batch("U10 Phone Batch"),
    sessionBatch = await batch("U16 Session Batch");
  const player = (name: string, squadId: string) =>
    post<WorkspacePlayer>(
      `${root}/records/player`,
      { name, coachId: ownerId, squadId, status: "ACTIVE" },
      201,
    );
  const monthlyChild = await player("Phone Child Monthly", monthlyBatch.id),
    sessionChild = await player("Phone Child Sessions", sessionBatch.id);
  const plan = (
    name: string,
    amountMinor: number,
    billingFrequency: string,
    extra = {},
  ) =>
    fee<FinancePlan>("plan", {
      name,
      amountMinor,
      currency: "INR",
      billingFrequency,
      applicableStartDate: "2026-10-01",
      active: true,
      ...extra,
    });
  const monthly = await plan("Phone monthly training", 150000, "MONTHLY", {
      dueAfterDays: 5,
    }),
    term = await plan("Spring term", 900000, "TERM", {
      customPeriodDays: 90,
      dueAfterDays: 7,
    }),
    perSession = await plan("Per session coaching", 30000, "PER_SESSION");
  await plan("Phone kit", 120000, "ONE_TIME");
  for (const [squadId, planId] of [
    [monthlyBatch.id, monthly.id],
    [sessionBatch.id, perSession.id],
  ])
    await fee("batchAssignment", {
      squadId,
      planId,
      effectiveFrom: "2026-10-01",
      active: true,
    });
  await fee("playerOverride", {
    playerId: monthlyChild.id,
    kind: "DISCOUNT",
    discountBasisPoints: 1000,
    currency: "INR",
    effectiveFrom: "2026-10-01",
    active: true,
    reason: "Fictional sibling discount for layout review",
    reviewed: true,
  });

  const context = await browser.newContext({
    storageState: await api.storageState(),
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Cancelling a changed fee draft asks for confirmation before discarding it.
  page.on("dialog", (prompt) => prompt.accept());
  const tab = async (name: string) => {
    await page.goto(route);
    await page.getByRole("button", { name, exact: true }).click();
  };
  const dialog = (name: string) =>
    page.getByRole("dialog", { name, exact: true });
  const planRow = (name: string) =>
    page.locator(".pf-event").filter({
      hasText: name,
      has: page.getByRole("button", { name: "Edit fee plan", exact: true }),
    });
  async function cancel(form: Locator) {
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).toBeHidden();
  }

  // 1. Untouched optional plan numbers persist; emptied ones are cleared.
  await tab("Fee Plans");
  await expect(planRow("Spring term")).toContainText("Term (90 days)");
  await expect(planRow("Spring term")).toContainText(
    "Due 7 days after each period starts",
  );
  const editTerm = async () => {
    await planRow("Spring term")
      .getByRole("button", { name: "Edit fee plan", exact: true })
      .click();
    return dialog("Edit fee plan");
  };
  let editor = await editTerm();
  await expect(
    editor.getByLabel("Billing length (days)", { exact: true }),
  ).toHaveValue("90");
  await editor.getByLabel("Amount (INR)", { exact: true }).fill("9500.00");
  await editor
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(editor).toBeHidden();
  const termPlan = async () =>
    (await finance()).plans.find((item) => item.id === term.id)!;
  expect(await termPlan()).toMatchObject({
    amountMinor: 950000,
    customPeriodDays: 90,
    dueAfterDays: 7,
    version: 2,
  });
  editor = await editTerm();
  await editor.getByLabel("Billing length (days)", { exact: true }).fill("");
  await editor.getByLabel("Payment due after (days)", { exact: true }).fill("");
  await editor
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(editor).toBeHidden();
  const cleared = await termPlan();
  expect(cleared).toMatchObject({ amountMinor: 950000, version: 3 });
  expect(cleared).not.toHaveProperty("customPeriodDays");
  expect(cleared).not.toHaveProperty("dueAfterDays");
  await expect(planRow("Spring term")).not.toContainText("days");
  // The monthly plan's due period was never touched.
  expect(
    (await finance()).plans.find((item) => item.id === monthly.id),
  ).toMatchObject({ dueAfterDays: 5, version: 1 });

  // 2. Per session plans are never presented as automatically suggested.
  await expect(planRow("Per session coaching")).toContainText(
    "Not suggested automatically; invoice each session manually",
  );
  await page
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  editor = dialog("Create fee plan");
  await expect(editor.getByText(financePerSessionNotice)).toHaveCount(0);
  await editor
    .getByLabel("Billing frequency", { exact: true })
    .selectOption("PER_SESSION");
  await expect(editor.getByText(financePerSessionNotice)).toBeVisible();
  await cancel(editor);
  await page
    .getByRole("button", { name: "Assign batch plan", exact: true })
    .click();
  const assigning = dialog("Assign batch fee plan");
  await assigning
    .getByLabel("Default fee plan", { exact: true })
    .selectOption(perSession.id);
  await expect(assigning.getByText(financePerSessionNotice)).toBeVisible();
  await assigning
    .getByLabel("Default fee plan", { exact: true })
    .selectOption(monthly.id);
  await expect(assigning.getByText(financePerSessionNotice)).toHaveCount(0);
  await cancel(assigning);
  await tab("Invoices");
  const suggestions = page.locator(".pf-suggestions");
  await expect(suggestions).toContainText(
    "Each suggested billing period starts on that date.",
  );
  await expect(suggestions.locator(".pf-note")).toHaveText(
    financePerSessionNotice,
  );
  await expect(
    page.getByRole("button", {
      name: "Review suggested invoice for Phone Child Sessions",
    }),
  ).toHaveCount(0);
  await suggestions.getByText(/Players without a suggestion/).click();
  await expect(suggestions.locator("details")).toContainText(
    `Phone Child Sessions · ${financePerSessionNotice}`,
  );
  // The manual route the notice describes works and keeps duplicate protection.
  await tab("Fee Plans");
  async function sessionInvoice(day: string, label: string) {
    await page
      .getByRole("button", { name: "Issue player invoice", exact: true })
      .click();
    const form = dialog("Issue player invoice");
    await form
      .getByLabel("Player", { exact: true })
      .selectOption(sessionChild.id);
    await form
      .getByLabel("Fee plan", { exact: true })
      .selectOption(perSession.id);
    await form.getByLabel("Invoice label", { exact: true }).fill(label);
    await form.getByLabel("Billing period start", { exact: true }).fill(day);
    await form.getByLabel("Billing period end", { exact: true }).fill(day);
    await form.getByLabel("Due date", { exact: true }).fill(day);
    await form
      .getByRole("button", { name: "Issue player invoice", exact: true })
      .click();
    return form;
  }
  await expect(
    await sessionInvoice("2026-10-27", "Session 27 October"),
  ).toBeHidden();
  await expect(
    await sessionInvoice("2026-10-29", "Session 29 October"),
  ).toBeHidden();
  const repeat = await sessionInvoice("2026-10-27", "Session 27 again");
  await expect(repeat.getByRole("alert")).toContainText(
    /underlying billing period/,
  );
  await cancel(repeat);
  expect(
    (await finance()).invoices
      .filter((item) => item.planId === perSession.id)
      .map((item) => [item.periodStart, item.periodEnd, item.chargeMinor])
      .sort(),
  ).toEqual([
    ["2026-10-27", "2026-10-27", 30000],
    ["2026-10-29", "2026-10-29", 30000],
  ]);

  // 3. Each new fee dialog fits phone widths with every control reachable.
  async function fits(form: Locator) {
    await expect(form).toBeVisible();
    const problems = await form.evaluate((root) => {
      const width = window.innerWidth,
        box = root.getBoundingClientRect(),
        found: string[] = [];
      if (document.documentElement.scrollWidth > width)
        found.push(`page is ${document.documentElement.scrollWidth}px wide`);
      if (box.left < 0 || box.right > width)
        found.push(`dialog spans ${box.left}-${box.right}px`);
      for (const element of [root, ...root.querySelectorAll("*")]) {
        if (element.tagName === "OPTION") continue;
        const rect = element.getBoundingClientRect(),
          name = `${element.tagName} "${(element.textContent ?? "").trim().slice(0, 40)}"`;
        if (!rect.width) continue;
        if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5)
          found.push(`${name} is clipped`);
        if (
          !["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName) &&
          element.clientWidth &&
          element.scrollWidth > element.clientWidth + 1
        )
          found.push(`${name} overflows horizontally`);
      }
      return found;
    });
    expect(problems).toEqual([]);
    for (const control of await form
      .locator("button, input, select, textarea")
      .all()) {
      if (!(await control.isVisible())) continue;
      await control.scrollIntoViewIfNeeded();
      await control.evaluate((element) =>
        element.scrollIntoView({ block: "center", inline: "nearest" }),
      );
      await expect(control).toBeInViewport({ ratio: 1 });
      // Saved plan currency is intentionally locked; action buttons must work.
      if ((await control.evaluate((element) => element.tagName)) === "BUTTON")
        await expect(control).toBeEnabled();
      // Nothing (such as the pinned actions) covers the control's centre.
      expect(
        await control.evaluate((element) => {
          const rect = element.getBoundingClientRect(),
            hit = document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
            );
          return !!hit && (hit === element || element.contains(hit));
        }),
      ).toBe(true);
      const size = await control.boundingBox();
      expect(Math.min(size!.width, size!.height)).toBeGreaterThanOrEqual(22);
    }
  }
  async function capture(form: Locator, name: string) {
    const fields = form.locator(".pf-form-fields");
    await fields.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `${shots}/${name}.png` });
    await fields.evaluate((element) =>
      element.scrollTo(0, element.scrollHeight),
    );
    await page.screenshot({ path: `${shots}/${name}-end.png` });
  }
  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    const check = async (form: Locator, name: string) => {
      await fits(form);
      await capture(form, `${width}-${name}`);
    };
    await tab("Fee Plans");
    await check(await editTerm(), "1-plan-editor");
    await cancel(dialog("Edit fee plan"));
    await page
      .getByRole("button", {
        name: "Edit batch plan for U10 Phone Batch",
        exact: true,
      })
      .click();
    await check(dialog("Edit batch fee plan"), "2-batch-assignment");
    await cancel(dialog("Edit batch fee plan"));
    await page
      .getByRole("button", {
        name: "Edit fee exception for Phone Child Monthly",
        exact: true,
      })
      .click();
    await check(dialog("Edit player fee exception"), "3-player-exception");
    await cancel(dialog("Edit player fee exception"));
    await tab("Invoices");
    await page
      .getByRole("button", {
        name: "Review suggested invoice for Phone Child Monthly",
        exact: true,
      })
      .click();
    const review = dialog("Review suggested invoice");
    await check(review, "4-suggestion-review");
    await expect(review).toContainText("Final charge");
    if (width === 320) {
      // The narrowest layout still completes the reviewed invoice workflow.
      await review
        .getByRole("checkbox", {
          name: /I reviewed the player, plan, billing period and final charge/,
        })
        .check();
      await review
        .getByRole("button", { name: "Issue reviewed invoice", exact: true })
        .click();
      await expect(review).toBeHidden();
      await expect(page.getByRole("status")).toContainText(
        /Invoice issued from the reviewed suggestion/,
      );
    } else await cancel(review);
    await page
      .getByRole("button", { name: "Issue one-time charge", exact: true })
      .click();
    await check(dialog("Issue one-time charge"), "5-one-time-charge");
    await cancel(dialog("Issue one-time charge"));
  }
  const issued = (await finance()).invoices.find(
    (item) => item.playerId === monthlyChild.id,
  );
  expect(issued).toMatchObject({
    planId: monthly.id,
    chargeMinor: 135000,
    status: "PENDING",
  });
  expect(errors).toEqual([]);
  await context.close();
});
