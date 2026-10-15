import { test, expect } from "@playwright/test";
import { evidencePath } from "./evidence-path";
import { mkdir, writeFile } from "node:fs/promises";
import type {
  FinancePayload,
  FinancePlan,
  FinanceInvoice,
} from "../../src/domain/finance";

test("QA-15 visible Fee Plan Save validates, retains failed drafts and persists across mobile editing and a fresh login", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(180000);
  const origin = String(testInfo.project.use.baseURL),
    suffix = crypto.randomUUID(),
    email = `fee-save-${suffix}@example.test`,
    password = `Synthetic-only-${crypto.randomUUID()}`;
  const api = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const registered = await api.post("/api/auth/sign-up/email", {
    data: { name: "Fictional Finance Owner", email, password },
  });
  expect(registered.status(), await registered.text()).toBe(200);
  const created = await api.post("/api/workspaces", {
    data: {
      name: "Fee Save QA Academy",
      contactEmail: "fictional-fees@example.test",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      ageGroups: ["U12"],
      demo: false,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const academy = await created.json(),
    endpoint = `/api/workspaces/${academy.id}/finance`,
    route = `/workspace/${academy.id}?section=fees`;
  const context = await browser.newContext({
      storageState: await api.storageState(),
      viewport: { width: 1536, height: 1024 },
    }),
    page = await context.newPage(),
    errors: string[] = [],
    metrics: unknown[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const evidence = evidencePath("docs/screenshots/final-fee-save/after");
  await mkdir(evidence, { recursive: true });
  async function finance() {
    const response = await api.get(endpoint);
    expect(response.status()).toBe(200);
    return response.json() as Promise<FinancePayload>;
  }
  async function openPlans() {
    await page.goto(route);
    await page.getByRole("button", { name: "Fee Plans", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create fee plan", exact: true }),
    ).toBeVisible();
  }
  await openPlans();
  await page
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Create fee plan",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  expect(
    await dialog
      .getByLabel("Plan name", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  expect((await finance()).plans).toHaveLength(0);
  await dialog
    .getByLabel("Plan name", { exact: true })
    .fill("Autumn football <fictional> & preparation");
  await dialog.getByLabel("Currency", { exact: true }).selectOption("GBP");
  await dialog
    .getByLabel("Billing frequency", { exact: true })
    .selectOption("TERM");
  await dialog
    .getByLabel("Applicable start date", { exact: true })
    .fill("2026-11-01");
  await dialog.getByLabel("Amount (GBP)", { exact: true }).fill("-1");
  await dialog
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("positive");
  expect((await finance()).plans).toHaveLength(0);
  await dialog.getByLabel("Amount (GBP)", { exact: true }).fill("199.99");
  for (const [width, height] of [
    [1536, 1024],
    [1440, 1024],
    [768, 1024],
    [390, 844],
    [320, 568],
    [390, 350],
  ]) {
    await page.setViewportSize({ width, height });
    const save = dialog.getByRole("button", {
      name: "Save Fee Plan",
      exact: true,
    });
    await expect(save).toBeVisible();
    await expect(save).toBeEnabled();
    const bounds = await save.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    const styles = await save.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
    }));
    expect(styles.background).toBe("rgb(0, 153, 109)");
    expect(styles.color).toBe("rgb(255, 255, 255)");
    const receivesPointer = await save.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        ),
      );
    });
    expect(receivesPointer).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await dialog.locator(".pf-form-fields").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const afterScroll = await save.boundingBox();
    expect(afterScroll!.y + afterScroll!.height).toBeLessThanOrEqual(height);
    const amount = dialog.getByLabel("Amount (GBP)", { exact: true });
    await amount.focus();
    await amount.scrollIntoViewIfNeeded();
    const focusSpace = await amount.evaluate((element) => {
      const fields = element.closest(".pf-form-fields")!,
        input = element.getBoundingClientRect(),
        container = fields.getBoundingClientRect(),
        style = getComputedStyle(element);
      return {
        left: input.left - container.left,
        right: container.right - input.right,
        required:
          parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
      };
    });
    expect(focusSpace.left).toBeGreaterThanOrEqual(focusSpace.required);
    expect(focusSpace.right).toBeGreaterThanOrEqual(focusSpace.required);
    await page.screenshot({
      path: `${evidence}/fee-plan-${width}x${height}.png`,
    });
    metrics.push({
      width,
      height,
      bounds,
      styles,
      saveVisibleAfterFieldScroll: true,
      focusSpace,
      receivesPointer,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`**${endpoint}`, async (intercepted) => {
    if (intercepted.request().method() === "POST") {
      await intercepted.abort("failed");
      await page.unroute(`**${endpoint}`);
    } else await intercepted.continue();
  });
  await dialog
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Plan name", { exact: true })).toHaveValue(
    "Autumn football <fictional> & preparation",
  );
  await expect(dialog.getByLabel("Amount (GBP)", { exact: true })).toHaveValue(
    "199.99",
  );
  expect((await finance()).plans).toHaveLength(0);
  let posts = 0;
  await page.route(`**${endpoint}`, async (intercepted) => {
    if (intercepted.request().method() === "POST") {
      posts++;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await intercepted.continue();
  });
  const response = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === endpoint &&
      value.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .dblclick();
  expect((await response).status()).toBe(200);
  await expect(dialog).toBeHidden();
  expect(posts).toBe(1);
  await page.unroute(`**${endpoint}`);
  await expect(page.getByRole("status")).toContainText("Fee plan saved");
  const saved = (await finance()).plans[0];
  expect(saved).toMatchObject({
    amountMinor: 19999,
    currency: "GBP",
    billingFrequency: "TERM",
    applicableStartDate: "2026-11-01",
  });
  expect((await finance()).invoices).toHaveLength(0);
  expect((await finance()).payments).toHaveLength(0);
  await page.reload();
  await page.getByRole("button", { name: "Fee Plans", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit fee plan", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit fee plan", exact: true });
  await expect(dialog.getByLabel("Plan name", { exact: true })).toHaveValue(
    saved.name,
  );
  await expect(dialog.getByLabel("Amount (GBP)", { exact: true })).toHaveValue(
    "199.99",
  );
  await expect(
    dialog.getByLabel("Applicable start date", { exact: true }),
  ).toHaveValue("2026-11-01");
  await dialog
    .getByLabel("Plan name", { exact: true })
    .fill("Reviewed autumn football");
  await dialog
    .getByRole("button", { name: "Save Fee Plan", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const updated = (await finance()).plans[0];
  expect(updated.id).toBe(saved.id);
  expect(updated.version).toBe(saved.version + 1);
  await context.close();
  const fresh = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const signedIn = await fresh.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  expect(signedIn.status()).toBe(200);
  const reloaded = await fresh.get(endpoint);
  expect(reloaded.status()).toBe(200);
  expect(((await reloaded.json()) as FinancePayload).plans).toEqual([updated]);
  const freshContext = await browser.newContext({
      storageState: await fresh.storageState(),
      viewport: { width: 320, height: 568 },
    }),
    freshPage = await freshContext.newPage();
  await freshPage.goto(route);
  await freshPage
    .getByRole("button", { name: "Fee Plans", exact: true })
    .click();
  await freshPage
    .getByRole("button", { name: "Edit fee plan", exact: true })
    .click();
  await expect(
    freshPage
      .getByRole("dialog", { name: "Edit fee plan" })
      .getByLabel("Plan name", { exact: true }),
  ).toHaveValue(updated.name);
  await freshPage.screenshot({
    path: `${evidence}/fee-plan-fresh-login-320.png`,
  });
  expect(errors).toEqual([]);
  await writeFile(
    `${evidence}/qa-15.json`,
    JSON.stringify(
      {
        test: "QA-15",
        academyId: academy.id,
        planId: updated.id,
        metrics,
        savePosts: posts,
        persistedAfterFreshLogin: true,
        invoices: 0,
        payments: 0,
      },
      null,
      2,
    ),
  );
  await freshContext.close();
  await fresh.dispose();
  await api.dispose();
});

test("a new invoice uses its selected fee-plan currency while another currency account stays selected", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  // Honour the normal signup throttle when following the separate QA-15 case.
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const origin = String(testInfo.project.use.baseURL),
    api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
  const registration = await api.post("/api/auth/sign-up/email", {
    data: {
      name: "Fictional Currency Owner",
      email: `fee-currency-${crypto.randomUUID()}@example.test`,
      password: `Synthetic-only-${crypto.randomUUID()}`,
    },
  });
  expect(registration.status(), await registration.text()).toBe(200);
  const ownerId = (await registration.json()).user.id as string;
  const created = await api.post("/api/workspaces", {
    data: {
      name: "Fictional Currency Context Academy",
      contactEmail: "currency-qa@example.test",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      modules: ["development", "reports", "communication", "fees"],
      demo: false,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const academy = await created.json(),
    root = `/api/workspaces/${academy.id}`,
    endpoint = `${root}/finance`;
  const childResponse = await api.post(`${root}/records/player`, {
    data: {
      name: "Fictional Currency Context Player",
      squad: "U12",
      coachId: ownerId,
    },
  });
  expect(childResponse.status(), await childResponse.text()).toBe(201);
  const child = await childResponse.json();
  async function fee<T>(action: string, data: unknown): Promise<T> {
    const response = await api.post(endpoint, {
      data: { requestId: crypto.randomUUID(), action, data },
    });
    expect(response.status(), await response.text()).toBe(200);
    return response.json() as Promise<T>;
  }
  async function finance(): Promise<FinancePayload> {
    const response = await api.get(endpoint);
    expect(response.status()).toBe(200);
    return response.json();
  }
  const existing = await fee<FinanceInvoice>("invoice", {
    playerId: child.id,
    label: "Existing academy-currency invoice",
    chargeMinor: 50000,
    currency: "INR",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    dueDate: "2026-11-05",
  });
  const plan = await fee<FinancePlan>("plan", {
    name: "Reviewed GBP football term",
    amountMinor: 120050,
    currency: "GBP",
    billingFrequency: "TERM",
    applicableStartDate: "2026-11-01",
    active: true,
  });
  expect((await finance()).invoices).toHaveLength(1);
  expect((await finance()).payments).toEqual([]);
  const context = await browser.newContext({
      storageState: await api.storageState(),
      viewport: { width: 1536, height: 1024 },
    }),
    page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/workspace/${academy.id}?section=fees`);
  const selectedAccount = page.getByRole("complementary", {
    name: "Selected player fee account",
    exact: true,
  });
  await expect(selectedAccount).toContainText("₹500.00");
  await page.getByRole("button", { name: "Fee Plans", exact: true }).click();
  await page
    .getByRole("button", { name: "Issue player invoice", exact: true })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Issue player invoice",
    exact: true,
  });
  await dialog.getByLabel("Player", { exact: true }).selectOption(child.id);
  await dialog.getByLabel("Fee plan", { exact: true }).selectOption(plan.id);
  await dialog
    .getByLabel("Invoice label", { exact: true })
    .fill("Explicit GBP plan invoice");
  await dialog
    .getByLabel("Billing period start", { exact: true })
    .fill("2026-11-01");
  await dialog
    .getByLabel("Billing period end", { exact: true })
    .fill("2026-11-30");
  await dialog.getByLabel("Due date", { exact: true }).fill("2026-11-05");
  const evidence = evidencePath(
    "docs/screenshots/final-fee-save/currency-context",
  );
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/gbp-plan-with-inr-account-1536.png`,
  });
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === endpoint &&
      response.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Issue player invoice", exact: true })
    .click();
  const response = await saved;
  expect(response.status(), await response.text()).toBe(200);
  const issued = (await response.json()) as FinanceInvoice;
  expect(issued).toMatchObject({
    playerId: child.id,
    planId: plan.id,
    currency: "GBP",
    chargeMinor: 120050,
  });
  await expect(dialog).toBeHidden();
  const account = await finance();
  expect(account.invoices).toHaveLength(2);
  expect(account.payments).toEqual([]);
  expect(
    account.invoices.find((invoice) => invoice.id === existing.id),
  ).toMatchObject({
    currency: "INR",
    chargeMinor: 50000,
    paidMinor: 0,
    outstandingMinor: 50000,
    version: 1,
  });
  expect(account.summary.map((summary) => summary.currency).sort()).toEqual([
    "GBP",
    "INR",
  ]);
  // The inverse context must also use the academy currency for an individual charge.
  await page.locator(".pf-currency select").selectOption("GBP");
  await expect(selectedAccount).toContainText("£1,200.50");
  await page
    .getByRole("button", { name: "Issue player invoice", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Issue player invoice",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Amount (INR)", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/individual-inr-with-gbp-account-1536.png`,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await finance()).invoices).toHaveLength(2);
  expect((await finance()).payments).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(
    `${evidence}/invoice-currency-context.json`,
    JSON.stringify(
      {
        academyId: academy.id,
        selectedBefore: { invoiceId: existing.id, currency: "INR" },
        chosenPlan: {
          id: plan.id,
          currency: plan.currency,
          amountMinor: plan.amountMinor,
        },
        issuedInvoice: {
          id: issued.id,
          currency: issued.currency,
          chargeMinor: issued.chargeMinor,
        },
        explicitInvoiceCount: 2,
        automaticInvoiceCount: 0,
        paymentCount: 0,
        existingInvoiceUnchanged: true,
        individualChargeCurrencyWithGbpAccount: "INR",
      },
      null,
      2,
    ),
  );
  await context.close();
  await api.dispose();
});
