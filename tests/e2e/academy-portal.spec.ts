import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import type {
  WorkspacePayload,
  WorkspacePlayer,
  WorkspacePlan,
  WorkspaceReport,
  WorkspaceUpdate,
} from "../../src/domain/workspace";
import type {
  FootballSession,
  FootballEvidence,
  FootballSquad,
} from "../../src/domain/training";
import type { WeeklyPlan } from "../../src/domain/communication";
import type {
  FinanceInvoice,
  FinancePayload,
  FinancePlan,
} from "../../src/domain/finance";
import { verifyWorkspaceRestart } from "./restart-workspace-check";

test.use({ actionTimeout: 15000 });
test("one authenticated academy portal preserves real training, parent approval and verified finance across roles and restart", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(600000);
  const origin = "http://127.0.0.1:3001",
    shots = "docs/screenshots/academy-portal",
    suffix = crypto.randomUUID();
  await mkdir(shots, { recursive: true });
  let registrations = 0;
  async function account(name: string) {
    // Better Auth applies its normal registration throttle to this synthetic QA host.
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const email = `${name}-${suffix}@example.test`;
    const password = `Synthetic-only-${crypto.randomUUID()}`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password },
    });
    expect(response.status(), await response.text()).toBe(200);
    return {
      api,
      email,
      password,
      id: (await response.json()).user.id as string,
    };
  }
  const owner = await account("PortalOwner"),
    coach = await account("PortalCoach"),
    parent = await account("PortalParent"),
    outsider = await account("IndependentOwner");
  const ownerContext = await browser.newContext({
    storageState: await owner.api.storageState(),
  });
  const contexts = [ownerContext];
  const op = await ownerContext.newPage();
  const pageErrors: string[] = [],
    externalRequests: string[] = [];
  function watchPage(page: Page) {
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== origin)
        externalRequests.push(url.origin + url.pathname);
    });
  }
  watchPage(op);
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
  // Exercise empty customer onboarding; never load the explicit fictional example.
  await op.goto("/workspace");
  await op.bringToFront();
  await op
    .getByLabel("Academy name", { exact: true })
    .fill("Synthetic Portal Academy");
  await op
    .getByLabel("Academy contact email", { exact: true })
    .fill("synthetic-academy@example.test");
  await op.getByLabel("Country code", { exact: true }).fill("IN");
  await op.getByLabel("Currency code", { exact: true }).fill("INR");
  await op
    .getByLabel("Default branch time zone", { exact: true })
    .fill("Asia/Kolkata");
  await op.getByLabel("Date and number locale", { exact: true }).fill("en-IN");
  await op.getByRole("checkbox", { name: "fees", exact: true }).check();
  await expect(
    op.getByRole("checkbox", {
      name: "Explicitly label this as a fictional demo academy",
      exact: true,
    }),
  ).not.toBeChecked();
  const createdResponse = op.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/workspaces" &&
      response.request().method() === "POST",
  );
  await op
    .getByRole("button", { name: "Create empty academy", exact: true })
    .click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const aid = (await created.json()).id as string,
    root = `/api/workspaces/${aid}`;
  const payload = async (api = owner.api) => {
    const response = await api.get(root);
    expect(response.status()).toBe(200);
    return response.json() as Promise<WorkspacePayload>;
  };
  const finance = async (api = owner.api) => {
    const response = await api.get(`${root}/finance`);
    expect(response.status()).toBe(200);
    return response.json() as Promise<FinancePayload>;
  };
  const save = <T>(kind: string, data: unknown, api = owner.api) =>
    post<T>(api, `${root}/records/${kind}`, data, 201);
  const action = <T>(
    name: string,
    id?: string,
    data?: unknown,
    api = owner.api,
  ) =>
    post<T>(api, `${root}/actions`, { action: name, id, data, verified: true });
  const training = <T>(
    name: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
    api = coach.api,
  ) =>
    post<T>(api, `${root}/training`, {
      requestId: crypto.randomUUID(),
      action: name,
      id,
      expectedVersion,
      data,
    });
  const period = <T>(
    name: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) =>
    post<T>(coach.api, `${root}/periods`, {
      requestId: crypto.randomUUID(),
      action: name,
      id,
      expectedVersion,
      data,
    });
  const fee = <T>(
    name: string,
    data: unknown,
    id?: string,
    expectedVersion?: number,
  ) =>
    post<T>(owner.api, `${root}/finance`, {
      requestId: crypto.randomUUID(),
      action: name,
      id,
      expectedVersion,
      data,
    });
  expect((await payload()).records.player).toEqual([]);
  expect((await payload()).records.session).toEqual([]);
  expect((await finance()).invoices).toEqual([]);
  expect((await finance()).legacyRecords).toEqual([]);
  const otherAcademy = await post<{ id: string }>(
    outsider.api,
    "/api/workspaces",
    {
      name: "Independent Synthetic Academy",
      contactEmail: "independent@example.test",
      country: "GB",
      language: "en",
      currency: "GBP",
      timezone: "Europe/London",
      dateLocale: "en-GB",
      measurementSystem: "METRIC",
      brandAccent: "#2364a1",
      modules: ["development", "reports", "communication", "fees"],
      demo: false,
    },
    201,
  );
  expect((await outsider.api.get(root)).status()).toBe(403);
  expect(
    (await owner.api.get(`/api/workspaces/${otherAcademy.id}`)).status(),
  ).toBe(403);
  async function invite(
    person: typeof coach,
    role: "COACH" | "PARENT",
    playerIds: string[] = [],
  ) {
    const invitation = await action<{ token: string }>("invite", undefined, {
      email: person.email,
      role,
      playerIds,
      guardianVerified: role === "PARENT",
    });
    await post(person.api, "/api/invitations/accept", {
      token: invitation.token,
    });
  }
  await invite(coach, "COACH");
  const child = await save<WorkspacePlayer>("player", {
    name: "Synthetic Portal Player A",
    squad: "U10",
    coachId: coach.id,
  });
  const unrelated = await save<WorkspacePlayer>("player", {
    name: "Synthetic Other Family Player",
    squad: "U10",
    coachId: coach.id,
  });
  await invite(parent, "PARENT", [child.id]);
  const branch = await save<{ id: string }>("branch", {
    name: "Synthetic Main Branch",
    timezone: "Asia/Kolkata",
  });
  const drill = await save<{ id: string }>(
    "drill",
    {
      name: "Recorded close-control turns",
      focusArea: "Dribbling",
      purpose: "Keep the ball close when changing direction",
      cue: "Small touches and look up",
      sportId: "football",
    },
    coach.api,
  );
  const batch = await training<FootballSquad>(
    "squad",
    {
      name: "U10 Shared Training",
      branchId: branch.id,
      playerIds: [child.id, unrelated.id],
    },
    undefined,
    0,
    owner.api,
  );
  const venue = await training<{ id: string }>(
    "venue",
    {
      name: "Recorded Main Pitch",
      branchId: branch.id,
      location: "Synthetic ground",
      exclusive: true,
    },
    undefined,
    0,
    owner.api,
  );
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`,
    calendarDate = new Date(`${today}T00:00:00Z`);
  const nextMondayDate = new Date(calendarDate);
  nextMondayDate.setUTCDate(
    nextMondayDate.getUTCDate() + ((8 - nextMondayDate.getUTCDay()) % 7 || 7),
  );
  const week = nextMondayDate.toISOString().slice(0, 10);
  const previousMonthDate = new Date(
    Date.UTC(calendarDate.getUTCFullYear(), calendarDate.getUTCMonth() - 1, 15),
  );
  const pastDate = previousMonthDate.toISOString().slice(0, 10),
    month = pastDate.slice(0, 7);
  async function session(date: string, theme: string) {
    const draft = await training<FootballSession>("session", {
      branchId: branch.id,
      squadId: batch.id,
      venueId: venue.id,
      location: "Recorded Main Pitch",
      coachIds: [coach.id],
      timezone: "Asia/Kolkata",
      startLocal: `${date}T23:00`,
      endLocal: `${date}T23:45`,
      theme,
      sharedObjective: {
        goal: "Keep close control when changing direction",
        cue: "Small touches",
        observe: "First touch when changing direction",
      },
      agenda: [{ drillId: drill.id, duration: 35 }],
    });
    return training<FootballSession>(
      "status",
      { status: "SCHEDULED" },
      draft.id,
      draft.version,
    );
  }
  const current = await session(today, "Recorded Today Training"),
    future = await session(week, "Recorded Upcoming Batch Training");
  // Independent batches may train simultaneously when coach, player and pitch scope do not conflict.
  const parallelPlayer = await save<WorkspacePlayer>("player", {
    name: "Synthetic U12 Player",
    squad: "U12",
    coachId: owner.id,
  });
  const parallelBatch = await training<FootballSquad>(
    "squad",
    {
      name: "U12 Parallel Training",
      branchId: branch.id,
      playerIds: [parallelPlayer.id],
    },
    undefined,
    0,
    owner.api,
  );
  const parallelVenue = await training<{ id: string }>(
    "venue",
    {
      name: "Independent Second Pitch",
      branchId: branch.id,
      location: "Synthetic second ground",
      exclusive: true,
    },
    undefined,
    0,
    owner.api,
  );
  const parallelDraft = await training<FootballSession>(
    "session",
    {
      branchId: branch.id,
      squadId: parallelBatch.id,
      venueId: parallelVenue.id,
      location: "Independent Second Pitch",
      coachIds: [owner.id],
      timezone: "Asia/Kolkata",
      startLocal: `${today}T23:00`,
      endLocal: `${today}T23:45`,
      theme: "Recorded Parallel U12 Training",
      agenda: [{ drillId: drill.id, duration: 35 }],
    },
    undefined,
    0,
    owner.api,
  );
  const parallel = await training<FootballSession>(
    "status",
    { status: "SCHEDULED" },
    parallelDraft.id,
    parallelDraft.version,
    owner.api,
  );
  expect(
    (await payload()).records.session.filter((record) =>
      record.startLocal.startsWith(today),
    ),
  ).toHaveLength(2);
  expect(
    (await payload(coach.api)).records.session
      .filter((record) => record.startLocal.startsWith(today))
      .map((record) => record.id),
  ).toEqual([current.id]);
  expect(current.objectives).toEqual([]);
  expect(current.sharedObjective?.goal).toBe(
    "Keep close control when changing direction",
  );
  const personalPlan = await save<WorkspacePlan>(
    "plan",
    {
      playerId: child.id,
      coachId: coach.id,
      focus: "Dribbling",
      reason: "Recorded own-player focus",
      drillIds: [drill.id],
      observe: "Watch first touch direction",
      homePractice: "Optional gentle touches in a safe space",
      reviewDate: week,
      nextStep: "Repeat the recorded activity before changing the task",
      status: "ACTIVE",
      privateNote: "PRIVATE_PORTAL_COACH_NOTE",
    },
    coach.api,
  );
  let historical = await session(pastDate, "Completed Recorded Training");
  historical = await training<FootballSession>(
    "status",
    { status: "IN_PROGRESS" },
    historical.id,
    historical.version,
  );
  const attendance = (await payload(coach.api)).records.attendance.filter(
    (record) => record.sessionId === historical.id,
  );
  await training(
    "attendance",
    {
      entries: attendance.map((record) => ({
        playerId: record.playerId,
        status: record.playerId === child.id ? "PRESENT" : "EXCUSED",
        expectedVersion: record.version,
      })),
      correctionReason: "",
    },
    historical.id,
    historical.version,
  );
  const evidence = await training<FootballEvidence>("evidence", {
    sessionId: historical.id,
    playerId: child.id,
    drillId: drill.id,
    conditions: "Recorded introductory course",
    observation:
      "Kept the ball close in three recorded turns; needs further comparable observation.",
    staffNote: "PRIVATE_PORTAL_EVIDENCE_NOTE",
    type: "COACH_OBSERVATION",
    visibility: "PARENT_ELIGIBLE",
    measurement: "OBSERVATION",
    method: "Coach watched the introductory course",
  });
  await training(
    "review",
    { status: "REVIEWED", verified: true },
    evidence.id,
    evidence.version,
  );
  historical = await training<FootballSession>(
    "status",
    { status: "COMPLETED" },
    historical.id,
    historical.version,
  );
  expect(historical.status).toBe("COMPLETED");
  // Batch defaults work without requiring a separate individual plan for every player.
  await period<WeeklyPlan[]>("weeklyPrepare", { squadId: batch.id, week });
  let weekly = (await payload(coach.api)).records.weekly.find(
    (record) => record.playerId === child.id,
  )!;
  const sharedOnly = (await payload(coach.api)).records.weekly.find(
    (record) => record.playerId === unrelated.id,
  )!;
  expect(sharedOnly.content.personalFocus).toBe("Following the batch plan");
  expect(sharedOnly.content.missing).toEqual([]);
  await period(
    "weeklyApprove",
    { verified: true },
    weekly.id,
    weekly.recordVersion,
  );
  expect((await payload(parent.api)).records.weekly).toEqual([]);
  weekly = (await payload(coach.api)).records.weekly.find(
    (record) => record.id === weekly.id,
  )!;
  await period("weeklyPublish", {}, weekly.id, weekly.recordVersion);
  expect(
    (await payload(parent.api)).records.weekly.map((record) => record.playerId),
  ).toEqual([child.id]);
  await period<WorkspaceReport[]>("monthlyPrepare", {
    playerIds: [child.id],
    month,
  });
  let monthly = (await payload(coach.api)).records.report[0];
  expect(monthly.monthlySources?.sessionIds).toContain(historical.id);
  // A late-entered observation keeps its actual server timestamp and is not forged into a past month.
  expect(monthly.monthlySources?.evidenceIds).toEqual([]);
  expect(JSON.stringify(monthly.monthlySources?.model.evidence)).toMatch(
    /no .*reviewed|missing|no .*observation/i,
  );
  await period(
    "monthlyEdit",
    {
      observation:
        "The completed session attendance is recorded. This monthly snapshot has no eligible in-period individual observation; further coach review is required.",
      closingNote: "Keep practice comfortable and purposeful.",
      nextStep: personalPlan.nextStep,
    },
    monthly.id,
    monthly.recordVersion,
  );
  monthly = (await payload(coach.api)).records.report[0];
  await action(
    "approveReport",
    monthly.id,
    { expectedVersion: monthly.recordVersion },
    coach.api,
  );
  monthly = (await payload(coach.api)).records.report[0];
  expect(monthly.status).toBe("Approved");
  const parentData = await payload(parent.api);
  expect(parentData.records.player.map((player) => player.id)).toEqual([
    child.id,
  ]);
  expect(parentData.records.evidence).toEqual([]);
  expect(JSON.stringify(parentData)).not.toContain("PRIVATE_PORTAL_");
  const reportPDF = await parent.api.get(`${root}/reports/${monthly.id}/pdf`);
  expect(reportPDF.status()).toBe(200);
  const reportBytes = await reportPDF.body();
  expect((await PDFDocument.load(reportBytes)).getPageCount()).toBeGreaterThan(
    0,
  );
  await writeFile(`${shots}/approved-monthly-report.pdf`, reportBytes);
  // An issued invoice and submitted reference are distinct from a verified financial event.
  const monthStart = `${today.slice(0, 7)}-01`,
    monthEnd = new Date(
      Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + 1,
        0,
      ),
    )
      .toISOString()
      .slice(0, 10);
  async function workspaceReady(page: Page, navigate: () => Promise<unknown>) {
    const response = page.waitForResponse(
      (value) =>
        new URL(value.url()).pathname === root &&
        value.request().method() === "GET",
    );
    await navigate();
    await page.bringToFront();
    const loaded = await response;
    expect(loaded.status()).toBe(200);
    expect((await loaded.json()).academy.id).toBe(aid);
  }
  async function openOwnerFees(navigate: () => Promise<unknown>) {
    const response = op.waitForResponse(
      (value) =>
        new URL(value.url()).pathname === `${root}/finance` &&
        value.request().method() === "GET",
    );
    await workspaceReady(op, navigate);
    expect((await response).status()).toBe(200);
    await expect(
      op.getByText("Loading authorised fee records…", { exact: true }),
    ).not.toBeVisible();
  }
  await openOwnerFees(() =>
    op.goto(`/workspace/${aid}?section=fees&player=${child.id}`),
  );
  await op.getByRole("button", { name: "Fee Plans", exact: true }).click();
  await op
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  const planDialog = op.getByRole("dialog", {
    name: "Create fee plan",
    exact: true,
  });
  await planDialog
    .getByLabel("Plan name", { exact: true })
    .fill("Monthly football training");
  await planDialog.getByLabel("Amount (INR)", { exact: true }).fill("5000");
  await planDialog
    .getByRole("button", { name: "Create fee plan", exact: true })
    .click();
  await expect(planDialog).toBeHidden();
  const feePlan: FinancePlan = (await finance()).plans[0];
  await op
    .getByRole("button", { name: "Issue player invoice", exact: true })
    .click();
  const invoiceDialog = op.getByRole("dialog", {
    name: "Issue player invoice",
    exact: true,
  });
  await invoiceDialog
    .getByLabel("Player", { exact: true })
    .selectOption(child.id);
  await invoiceDialog
    .getByLabel("Fee plan", { exact: true })
    .selectOption(feePlan.id);
  await invoiceDialog
    .getByLabel("Invoice label", { exact: true })
    .fill("Monthly football training");
  await invoiceDialog
    .getByLabel("Billing period start", { exact: true })
    .fill(monthStart);
  await invoiceDialog
    .getByLabel("Billing period end", { exact: true })
    .fill(monthEnd);
  await invoiceDialog.getByLabel("Due date", { exact: true }).fill(monthEnd);
  await invoiceDialog
    .getByRole("button", { name: "Issue player invoice", exact: true })
    .click();
  await expect(invoiceDialog).toBeHidden();
  const invoice: FinanceInvoice = (await finance()).invoices[0];
  await fee("invoice", {
    playerId: unrelated.id,
    label: "Monthly training other family",
    chargeMinor: 600000,
    currency: "INR",
    periodStart: monthStart,
    periodEnd: monthEnd,
    dueDate: pastDate,
  });
  await openOwnerFees(() =>
    op.goto(`/workspace/${aid}?section=fees&player=${child.id}`),
  );
  await expect(
    op.getByRole("heading", { name: "Fees", exact: true }),
  ).toBeVisible();
  await op
    .getByRole("button", { name: "Collect Payment", exact: true })
    .click();
  const feeDialog = op.getByRole("dialog", {
    name: "Record payment reference",
    exact: true,
  });
  await feeDialog.getByLabel("Amount (INR)", { exact: true }).fill("2000");
  await feeDialog
    .getByLabel("Payment reference", { exact: true })
    .fill(`SYNTHETIC-PORTAL-${suffix}`);
  const financeEndpoint = `**/api/workspaces/${aid}/finance`;
  await op.route(financeEndpoint, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Synthetic finance save failure" }),
        })
      : route.continue(),
  );
  await feeDialog
    .getByRole("button", { name: "Record payment reference", exact: true })
    .click();
  await expect(feeDialog.getByRole("alert")).toContainText(
    "Synthetic finance save failure",
  );
  await expect(
    feeDialog.getByLabel("Payment reference", { exact: true }),
  ).toHaveValue(`SYNTHETIC-PORTAL-${suffix}`);
  await expect(
    feeDialog.getByLabel("Amount (INR)", { exact: true }),
  ).toHaveValue("2000");
  await op.unroute(financeEndpoint);
  await feeDialog
    .getByRole("button", { name: "Record payment reference", exact: true })
    .click();
  await expect(feeDialog).toBeHidden();
  let parentFinance = await finance(parent.api);
  expect(parentFinance.invoices).toHaveLength(1);
  expect(parentFinance.invoices[0].paidMinor).toBe(0);
  expect(parentFinance.receipts).toEqual([]);
  await openOwnerFees(() => op.reload());
  await op
    .getByRole("button", { name: "Verify reference", exact: true })
    .click();
  const verifyDialog = op.getByRole("dialog", {
    name: "Verify payment reference",
    exact: true,
  });
  await verifyDialog
    .getByLabel("Verification note", { exact: true })
    .fill("Matched the synthetic manual record to the invoice and amount.");
  await verifyDialog
    .getByRole("checkbox", {
      name: "I matched this reference, invoice and amount against the academy record",
      exact: true,
    })
    .check();
  await verifyDialog
    .getByRole("button", { name: "Verify payment reference", exact: true })
    .click();
  await expect(verifyDialog).toBeHidden();
  parentFinance = await finance(parent.api);
  expect(parentFinance.invoices[0]).toMatchObject({
    id: invoice.id,
    status: "PARTIAL",
    paidMinor: 200000,
    outstandingMinor: 300000,
  });
  expect(parentFinance.receipts).toHaveLength(1);
  expect(parentFinance.payments[0].decisionNote).toBeUndefined();
  expect((await coach.api.get(`${root}/finance`)).status()).toBe(403);
  expect((await outsider.api.get(`${root}/finance`)).status()).toBe(403);
  expect(
    (await parent.api.get(`${root}/finance?player=${unrelated.id}`)).status(),
  ).toBe(404);
  expect((await coach.api.get(root)).status()).toBe(200);
  expect((await payload(coach.api)).records.fee).toEqual([]);
  const receipt = parentFinance.receipts[0],
    receiptResponse = await parent.api.get(
      `${root}/finance/receipt/${receipt.id}/pdf`,
    );
  expect(receiptResponse.status()).toBe(200);
  expect(receiptResponse.headers()["cache-control"]).toContain("private");
  const receiptBytes = await receiptResponse.body();
  expect((await PDFDocument.load(receiptBytes)).getPageCount()).toBeGreaterThan(
    0,
  );
  await writeFile(`${shots}/verified-academy-receipt.pdf`, receiptBytes);
  expect(
    (await coach.api.get(`${root}/finance/receipt/${receipt.id}/pdf`)).status(),
  ).toBe(403);
  await fee("reminder", {
    invoiceId: invoice.id,
    body: "Synthetic private reminder: please review the recorded remaining academy training fee.",
  });
  expect((await finance(parent.api)).reminders).toHaveLength(1);
  const communication = await owner.api.get(`${root}/communication`);
  expect((await communication.json()).jobs).toEqual([]);
  await expect(op.locator(".pf-guardian")).toContainText("PortalParent");
  await expect(op.locator(".pf-guardian")).toContainText("Phone not recorded");
  await op.getByRole("button", { name: "Message Parent", exact: true }).click();
  await expect
    .poll(() => new URL(op.url()).searchParams.get("section"))
    .toBe("messages");
  expect(new URL(op.url()).searchParams.get("player")).toBe(child.id);
  await expect(
    op.getByRole("heading", { name: "Private conversations", exact: true }),
  ).toBeVisible();
  await openOwnerFees(() =>
    op.goto(`/workspace/${aid}?section=fees&player=${child.id}`),
  );
  await op
    .getByRole("button", { name: "View Player Profile", exact: true })
    .click();
  await expect
    .poll(() => new URL(op.url()).searchParams.get("section"))
    .toBe("players");
  expect(new URL(op.url()).searchParams.get("player")).toBe(child.id);
  await expect(op.locator(".portal-player-detail")).toContainText(child.name);
  // Home, Calendar and Training use the same persisted session id and roster.
  const coachContext = await browser.newContext({
    storageState: await coach.api.storageState(),
  });
  contexts.push(coachContext);
  const cp = await coachContext.newPage();
  watchPage(cp);
  await workspaceReady(cp, () => cp.goto(`/workspace/${aid}?section=home`));
  await cp
    .locator(".portal-home-hero")
    .getByRole("button", { name: "Open Session", exact: true })
    .click();
  await expect
    .poll(() => new URL(cp.url()).searchParams.get("section"))
    .toBe("training");
  expect(new URL(cp.url()).searchParams.get("session")).toBe(current.id);
  await expect(cp.locator("main")).toContainText(current.sharedObjective!.goal);
  await workspaceReady(cp, () =>
    cp.goto(`/workspace/${aid}?section=calendar&session=${current.id}`),
  );
  await cp
    .locator(".pc-panel-actions")
    .getByRole("button", { name: "Open Session", exact: true })
    .click();
  expect(new URL(cp.url()).searchParams.get("session")).toBe(current.id);
  await expect
    .poll(() => new URL(cp.url()).searchParams.get("section"))
    .toBe("training");
  const parentContext = await browser.newContext({
    storageState: await parent.api.storageState(),
  });
  contexts.push(parentContext);
  const pp = await parentContext.newPage();
  watchPage(pp);
  await workspaceReady(pp, () =>
    pp.goto(`/workspace/${aid}?section=home&player=${child.id}`),
  );
  await expect(pp.locator("main")).not.toContainText(unrelated.name);
  await expect(pp.locator("main")).not.toContainText("PRIVATE_PORTAL_");
  const parentWeeklyCard = pp.locator(".portal-parent-focus");
  await expect(
    parentWeeklyCard.locator(".portal-parent-focus-label p"),
  ).toHaveText("Awaiting coach approval");
  await expect(parentWeeklyCard.locator("h3")).toHaveText(
    "Your next shared training plan",
  );
  await expect(
    parentWeeklyCard.locator(".portal-parent-plan-focus"),
  ).toContainText(personalPlan.focus);
  await expect(pp.locator("main")).toContainText(personalPlan.focus);
  await expect(pp.locator(".portal-parent-update")).toContainText(
    monthly.observation,
  );
  await expect(pp.locator(".portal-parent-update")).not.toContainText(
    "Attendance basis:",
  );
  const parentFeeResponse = pp.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `${root}/finance` &&
      response.request().method() === "GET",
  );
  await pp.locator(".portal-parent-fee").click();
  await expect
    .poll(() => new URL(pp.url()).searchParams.get("section"))
    .toBe("fees");
  expect(new URL(pp.url()).searchParams.get("player")).toBe(child.id);
  expect((await parentFeeResponse).status()).toBe(200);
  await expect(pp.locator(".pf-detail")).toContainText(child.name);
  for (const name of [
    "Collect Payment",
    "Verify reference",
    "Create fee plan",
    "Approve adjustment",
    "Message Parent",
    "View Player Profile",
  ])
    await expect(pp.getByRole("button", { name, exact: true })).toHaveCount(0);
  expect(
    (
      await parent.api.post(`${root}/finance`, {
        data: { requestId: crypto.randomUUID(), action: "plan", data: {} },
      })
    ).status(),
  ).toBe(403);
  const evidenceManifest: unknown[] = [];
  const overflowScreens: string[] = [];
  async function capture(
    page: Page,
    name: string,
    section: string,
    width: number,
    height: number,
    childContext = "",
  ) {
    await page.setViewportSize({ width, height });
    await page.bringToFront();
    const params = new URLSearchParams({ section });
    if (childContext) params.set("player", childContext);
    if (section === "calendar" || section === "training")
      params.set("session", current.id);
    const loadedFinance =
      section === "fees"
        ? page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === `${root}/finance` &&
              response.request().method() === "GET",
          )
        : undefined;
    await workspaceReady(page, () => page.goto(`/workspace/${aid}?${params}`));
    if (loadedFinance) {
      expect((await loadedFinance).status()).toBe(200);
      await expect(
        page.getByText("Loading authorised fee records…", { exact: true }),
      ).not.toBeVisible();
    }
    await expect(page.locator(".academy-portal")).toBeVisible();
    await expect(page.locator("main h1").first()).toBeVisible();
    if (section === "fees")
      await expect(
        page.getByText("Verified collections", { exact: true }),
      ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .locator(".academy-portal img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    for (const label of [
      "Academy fixture",
      "Review academy fixture",
      "Role preview",
      "Design scenario",
    ])
      await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
    const metrics = await page.evaluate(() => ({
      route: location.pathname + location.search,
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      overflowElements:
        document.documentElement.scrollWidth > innerWidth
          ? [...document.querySelectorAll(".academy-portal *")]
              .map((element) => {
                const bounds = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                  tag: element.tagName,
                  className: element.getAttribute("class"),
                  left: bounds.left,
                  right: bounds.right,
                  width: bounds.width,
                  minWidth: style.minWidth,
                  overflowX: style.overflowX,
                };
              })
              .filter((element) => element.right > innerWidth + 1)
              .sort((a, b) => b.width - a.width)
              .slice(0, 16)
          : [],
      fonts: [...document.fonts]
        .filter((font) => font.family.includes("Portal Noto"))
        .map((font) => ({ weight: font.weight, status: font.status })),
      headingFont: getComputedStyle(document.querySelector("main h1")!)
        .fontFamily,
      images: [
        ...document.querySelectorAll<HTMLImageElement>(".academy-portal img"),
      ].map((image) => ({
        src: image.currentSrc.startsWith("data:")
          ? "Academy uploaded logo"
          : new URL(image.currentSrc).pathname,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      })),
    }));
    if (metrics.overflow) overflowScreens.push(`${name}-${width}`);
    expect(metrics.fonts.length).toBeGreaterThan(0);
    expect(metrics.fonts.every((font) => font.status === "loaded")).toBe(true);
    expect(metrics.headingFont).toContain("Portal Noto");
    let feeTabsReachable = false;
    let feeTabsPanVerified = false;
    if (section === "fees") {
      const brokenAmounts = await page
        .locator(".pf-summary strong")
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              const rectangles = [...range.getClientRects()].filter(
                (rectangle) => rectangle.width > 0 && rectangle.height > 0,
              );
              const card = element.closest("section")!.getBoundingClientRect();
              const firstTop = rectangles[0]?.top ?? 0;
              return {
                value: element.textContent,
                oneLine:
                  rectangles.length > 0 &&
                  rectangles.every(
                    (rectangle) => Math.abs(rectangle.top - firstTop) <= 2,
                  ),
                fitsCard: rectangles.every(
                  (rectangle) =>
                    rectangle.left >= card.left - 1 &&
                    rectangle.right <= card.right + 1,
                ),
              };
            })
            .filter((amount) => !amount.oneLine || !amount.fitsCard),
        );
      expect(
        brokenAmounts,
        "Financial values must stay whole and fit their cards",
      ).toEqual([]);
    }
    if (width <= 600 && section === "fees") {
      const tabs = page.locator(".pf-tabs");
      const lastTab = tabs.getByRole("button").last();
      const tabsOverflow = await tabs.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      );
      if (tabsOverflow) {
        await tabs.scrollIntoViewIfNeeded();
        await tabs.hover();
        await page.mouse.wheel(500, 0);
        await expect
          .poll(() => tabs.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
        feeTabsPanVerified = true;
      }
      await lastTab.click();
      await expect(lastTab).toHaveAttribute("aria-current", "page");
      if (tabsOverflow) {
        await tabs.hover();
        await page.mouse.wheel(-500, 0);
        await expect
          .poll(() => tabs.evaluate((element) => element.scrollLeft))
          .toBe(0);
      }
      const overview = tabs.getByRole("button", {
        name: "Overview",
        exact: true,
      });
      await overview.click();
      await expect(overview).toHaveAttribute("aria-current", "page");
      await tabs.evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      feeTabsReachable = true;
    }
    let tablePanVerified = false;
    if (width <= 768 && (section === "players" || section === "fees")) {
      const scroller = page
        .locator(section === "fees" ? ".pf-table-wrap" : ".portal-table-wrap")
        .first();
      if (
        await scroller.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        )
      ) {
        expect(
          await scroller.evaluate(
            (element) => getComputedStyle(element).overflowX,
          ),
        ).toMatch(/auto|scroll/);
        expect(
          await scroller.evaluate(
            (element) => getComputedStyle(element).touchAction,
          ),
        ).not.toBe("none");
        await scroller.scrollIntoViewIfNeeded();
        await scroller.hover();
        await page.mouse.wheel(500, 0);
        await expect
          .poll(() => scroller.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
        await scroller.evaluate((element) => {
          element.scrollLeft = 0;
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        tablePanVerified = true;
      }
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${shots}/${name}-${width}.png` });
    await page.screenshot({
      path: `${shots}/${name}-${width}-full.png`,
      fullPage: true,
    });
    evidenceManifest.push({
      screen: name,
      ...metrics,
      tablePanVerified,
      feeTabsReachable,
      feeTabsPanVerified,
    });
  }
  for (const [width, height] of [
    [1536, 1024],
    [1440, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ])
    for (const section of [
      "home",
      "players",
      "calendar",
      "training",
      "reports",
      "fees",
      "settings",
    ])
      await capture(
        op,
        section,
        section,
        width,
        height,
        ["players", "reports", "fees"].includes(section) ? child.id : "",
      );
  for (const width of [390, 320])
    await capture(pp, "parent-home", "home", width, 844, child.id);
  for (const width of [390, 320])
    await capture(pp, "parent-fees", "fees", width, 844, child.id);
  await capture(cp, "coach-home", "home", 1536, 1024);
  await writeFile(
    `${shots}/capture.json`,
    JSON.stringify(
      {
        baseCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        workingTreeDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        capturedAt: new Date().toISOString(),
        note: "Real authenticated application with synthetic isolated-QA records, not preview fixture persistence. Visual approval remains pending.",
        records: {
          academyId: aid,
          childId: child.id,
          currentSessionId: current.id,
          parallelSessionId: parallel.id,
          upcomingSessionId: future.id,
          completedSessionId: historical.id,
          monthlyReportId: monthly.id,
          invoiceId: invoice.id,
        },
        evidence: evidenceManifest,
        overflowScreens,
      },
      null,
      2,
    ),
  );
  const beforeRestart = await finance(owner.api);
  await verifyWorkspaceRestart(playwright, owner.api, aid, async (reader) => {
    const response = await reader.get(`${root}/finance`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(beforeRestart);
  });
  await openOwnerFees(() =>
    op.goto(`/workspace/${aid}?section=fees&player=${child.id}`),
  );
  await openOwnerFees(() => op.reload());
  await expect(op.locator(".pf-detail")).toContainText("partial");
  expect((await finance(parent.api)).receipts).toEqual(
    beforeRestart.receipts.filter((item) => item.playerId === child.id),
  );
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(overflowScreens, "Screens with document horizontal overflow").toEqual(
    [],
  );
  await Promise.all(contexts.map((context) => context.close()));
  await Promise.all(
    [owner, coach, parent, outsider].map((person) => person.api.dispose()),
  );
  // Only a fully successful master case may expose its synthetic review logins.
  // This local ignored file is intentionally separate from committed evidence.
  const reviewAccess = ".local/academy-portal-review-access.json";
  execFileSync("git", ["check-ignore", "--quiet", reviewAccess]);
  const databasePath = process.env.SPORTOZEN_DATABASE_PATH;
  if (!databasePath)
    throw new Error("The isolated QA database path is missing.");
  await mkdir(".local", { recursive: true });
  await writeFile(
    reviewAccess,
    JSON.stringify(
      {
        databasePath: resolve(databasePath),
        academyId: aid,
        childIds: {
          linked: child.id,
          otherFamily: unrelated.id,
          parallel: parallelPlayer.id,
        },
        accounts: Object.fromEntries([
          ["owner", { email: owner.email, password: owner.password }],
          ["coach", { email: coach.email, password: coach.password }],
          ["parent", { email: parent.email, password: parent.password }],
        ]),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
});

test("batch-only monthly preparation approves and privately renders a PDF without manufacturing an individual plan", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(180000);
  const origin = "http://127.0.0.1:3001",
    suffix = crypto.randomUUID(),
    shots = "docs/screenshots/academy-portal";
  const newAccount = async (name: string) => {
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
  };
  const owner = await newAccount("BatchOnlyOwner");
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const parent = await newAccount("BatchOnlyParent");
  const post = async <T>(path: string, data: unknown, expected = 200) => {
    const response = await owner.api.post(path, { data });
    expect(response.status(), await response.text()).toBe(expected);
    return response.json() as Promise<T>;
  };
  const academy = await post<{ id: string }>(
    "/api/workspaces",
    {
      name: "Synthetic Batch-Only Academy",
      contactEmail: "batch-only@example.test",
      country: "IN",
      language: "en",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      modules: ["development", "reports", "communication", "fees"],
      demo: false,
    },
    201,
  );
  const root = `/api/workspaces/${academy.id}`;
  const save = <T>(kind: string, data: unknown) =>
    post<T>(`${root}/records/${kind}`, data, 201);
  const train = <T>(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) =>
    post<T>(`${root}/training`, {
      requestId: crypto.randomUUID(),
      action,
      data,
      id,
      expectedVersion,
    });
  const period = <T>(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) =>
    post<T>(`${root}/periods`, {
      requestId: crypto.randomUUID(),
      action,
      data,
      id,
      expectedVersion,
    });
  const payload = async () =>
    (await (await owner.api.get(root)).json()) as WorkspacePayload;
  const child = await save<WorkspacePlayer>("player", {
    name: "Synthetic Batch-Only Child",
    squad: "U10",
    coachId: owner.id,
  });
  const branch = await save<{ id: string }>("branch", {
    name: "Recorded Branch",
    timezone: "Asia/Kolkata",
  });
  const drill = await save<{ id: string }>("drill", {
    name: "Batch receiving practice",
    focusArea: "Receiving",
    purpose: "Practise first touch in shared training",
    cue: "Look before receiving",
  });
  const batch = await train<FootballSquad>("squad", {
    name: "Batch without individual plans",
    branchId: branch.id,
    playerIds: [child.id],
  });
  const date = new Date(),
    past = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 15))
      .toISOString()
      .slice(0, 10),
    month = past.slice(0, 7);
  let session = await train<FootballSession>("session", {
    branchId: branch.id,
    squadId: batch.id,
    location: "Recorded synthetic pitch",
    coachIds: [owner.id],
    timezone: "Asia/Kolkata",
    startLocal: `${past}T17:00`,
    endLocal: `${past}T18:00`,
    theme: "Shared receiving session",
    sharedObjective: {
      goal: "Receive in space",
      cue: "Open body position",
      observe: "Look before first touch",
    },
    agenda: [{ drillId: drill.id, duration: 40 }],
  });
  session = await train<FootballSession>(
    "status",
    { status: "SCHEDULED" },
    session.id,
    session.version,
  );
  session = await train<FootballSession>(
    "status",
    { status: "IN_PROGRESS" },
    session.id,
    session.version,
  );
  const attendance = (await payload()).records.attendance[0];
  await train(
    "attendance",
    {
      entries: [
        {
          playerId: child.id,
          status: "PRESENT",
          expectedVersion: attendance.version,
        },
      ],
      correctionReason: "",
    },
    session.id,
    session.version,
  );
  await train("status", { status: "COMPLETED" }, session.id, session.version);
  const invitation = await post<{ token: string }>(`${root}/actions`, {
    action: "invite",
    data: {
      email: parent.email,
      role: "PARENT",
      playerIds: [child.id],
      guardianVerified: true,
    },
  });
  expect(
    (
      await parent.api.post("/api/invitations/accept", {
        data: { token: invitation.token },
      })
    ).status(),
  ).toBe(200);
  expect((await payload()).records.plan).toEqual([]);
  await period<WorkspaceReport[]>("monthlyPrepare", {
    playerIds: [child.id],
    month,
  });
  let report = (await payload()).records.report[0];
  expect(report.monthlySources?.sessionIds).toEqual([session.id]);
  expect(report.monthlySources?.evidenceIds).toEqual([]);
  await period(
    "monthlyEdit",
    {
      observation:
        "Further individual observation is needed before interpreting progress.",
      nextStep:
        "Continue the shared receiving activities and review first touch.",
      closingNote: "No individual result is inferred from attendance.",
    },
    report.id,
    report.recordVersion,
  );
  report = (await payload()).records.report[0];
  await post(`${root}/actions`, {
    action: "approveReport",
    id: report.id,
    verified: true,
    data: { expectedVersion: report.recordVersion },
  });
  const approved = (await payload()).records.report.find(
    (item) => item.id === report.id,
  )!;
  expect(approved.status).toBe("Approved");
  expect(approved.approvedPlan).toBeUndefined();
  expect((await payload()).records.plan).toEqual([]);
  const parentPayload = await parent.api.get(root);
  expect(parentPayload.status()).toBe(200);
  expect((await parentPayload.json()).records.report[0].id).toBe(report.id);
  const pdf = await parent.api.get(`${root}/reports/${report.id}/pdf`);
  expect(pdf.status()).toBe(200);
  const bytes = await pdf.body();
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  await mkdir(shots, { recursive: true });
  await writeFile(`${shots}/batch-only-approved-monthly-report.pdf`, bytes);
  const parentUpdates = async () => {
    const response = await parent.api.get(root);
    expect(response.status()).toBe(200);
    return ((await response.json()) as WorkspacePayload).records.update;
  };
  const staffContext = await browser.newContext({
    storageState: await owner.api.storageState(),
  });
  const staffPage = await staffContext.newPage(),
    staffErrors: string[] = [];
  staffPage.on("pageerror", (error) => staffErrors.push(error.message));
  await staffPage.goto(
    `/workspace/${academy.id}?section=reports&player=${child.id}&report=${report.id}`,
  );
  await staffPage.bringToFront();
  const sendToParent = staffPage.getByRole("button", {
    name: "Send to Parent",
    exact: true,
  });
  await expect(sendToParent).toBeEnabled();
  await sendToParent.click();
  await expect
    .poll(() => new URL(staffPage.url()).searchParams.get("sourceReport"))
    .toBe(report.id);
  expect(new URL(staffPage.url()).searchParams.get("player")).toBe(child.id);
  const sourceSelect = staffPage.getByRole("combobox", {
    name: /^Approved source report/,
  });
  await expect(sourceSelect).toHaveValue(report.id);
  await staffPage.goBack();
  await expect(sendToParent).toBeVisible();
  expect(new URL(staffPage.url()).searchParams.get("report")).toBe(report.id);
  await staffPage.goForward();
  await expect(sourceSelect).toHaveValue(report.id);
  expect(new URL(staffPage.url()).searchParams.get("sourceReport")).toBe(
    report.id,
  );
  await staffPage
    .getByRole("button", { name: "Prepare from approved sources", exact: true })
    .click();
  const message = staffPage.getByRole("textbox", {
    name: "Parent-friendly message",
    exact: true,
  });
  await expect(message).not.toHaveValue("");
  const preparedBody = await message.inputValue();
  expect(preparedBody).toContain(approved.snapshot!.practised);
  expect(preparedBody).toContain(approved.snapshot!.nextStep);
  const draftResponse = staffPage.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `${root}/records/update`,
  );
  await staffPage
    .getByRole("button", { name: "Save update draft", exact: true })
    .click();
  const savedResponse = await draftResponse;
  expect(savedResponse.status()).toBe(201);
  const update = (await savedResponse.json()) as WorkspaceUpdate;
  expect(update.planId).toBe("");
  expect(update.sourceReportId).toBe(report.id);
  expect(update.approvalStatus).toBe("DRAFT");
  expect(update.inAppPublicationStatus).toBe("UNPUBLISHED");
  expect(await parentUpdates()).toEqual([]);
  const performAction = async (label: string) => {
    const response = staffPage.waitForResponse(
      (result) =>
        result.request().method() === "POST" &&
        new URL(result.url()).pathname === `${root}/actions`,
    );
    await staffPage.getByRole("button", { name: label, exact: true }).click();
    const result = await response;
    expect(result.status()).toBe(200);
    return result.json() as Promise<WorkspaceUpdate>;
  };
  const submitted = await performAction("Send for approval");
  expect(submitted.approvalStatus).toBe("PENDING_APPROVAL");
  const approveUpdate = staffPage.getByRole("button", {
    name: "Approve update",
    exact: true,
  });
  await expect(approveUpdate).toBeDisabled();
  expect(await parentUpdates()).toEqual([]);
  await staffPage
    .getByRole("checkbox", {
      name: "I verified the correct player, authorised guardian, approved source records and guidance",
      exact: true,
    })
    .check();
  const reviewed = await performAction("Approve update");
  expect(reviewed.approvalStatus).toBe("APPROVED");
  expect(reviewed.approvedBody).toBe(preparedBody);
  expect(reviewed.approvedSource).toEqual(approved.snapshot);
  expect(await parentUpdates()).toEqual([]);
  const published = await performAction("Share in parent app");
  expect(published.inAppPublicationStatus).toBe("PUBLISHED");
  expect(published.externalDeliveryStatus).toBe("NOT_SENT");
  expect(published.publishedGuardianIds).toEqual([parent.id]);
  expect((await parentUpdates()).map((item) => item.id)).toEqual([update.id]);
  expect((await payload()).records.plan).toEqual([]);
  const communication = await owner.api.get(`${root}/communication`);
  expect(communication.status()).toBe(200);
  expect((await communication.json()).jobs).toEqual([]);
  await expect(
    staffPage.getByText(
      "Published only to authorised, opted-in in-app recipients. No external message was sent.",
      { exact: true },
    ),
  ).toBeVisible();
  await staffPage.goto(
    `/workspace/${academy.id}?section=messages&player=${child.id}&sourceReport=${crypto.randomUUID()}`,
  );
  await expect(
    staffPage.getByRole("heading", { name: "Report unavailable", exact: true }),
  ).toBeVisible();
  await expect(
    staffPage.getByRole("button", { name: "Save update draft", exact: true }),
  ).toHaveCount(0);
  expect(staffErrors).toEqual([]);
  await staffContext.close();
  const context = await browser.newContext({
    storageState: await parent.api.storageState(),
  });
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `/workspace/${academy.id}?section=reports&player=${child.id}&report=${report.id}`,
  );
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: "Progress & Reports", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "Further individual observation is needed before interpreting progress.",
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.bringToFront();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `${shots}/batch-only-parent-report-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto(
    `/workspace/${academy.id}?section=messages&player=${child.id}`,
  );
  await page.bringToFront();
  await expect(
    page.getByText("Shared in your parent app", { exact: true }),
  ).toBeVisible();
  await page.getByText("Read full coach message", { exact: true }).click();
  await expect(page.locator(".message-body")).toHaveText(preparedBody);
  await expect(
    page.getByRole("button", { name: "Approve update", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Share in parent app", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
  await owner.api.dispose();
  await parent.api.dispose();
});
