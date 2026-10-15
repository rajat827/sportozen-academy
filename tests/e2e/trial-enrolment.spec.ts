import { test, expect, type APIRequestContext } from "@playwright/test";
import { evidencePath } from "./evidence-path";
import { mkdir, writeFile } from "node:fs/promises";
import type { TrialPayload, TrialView } from "../../src/domain/trial";
import type {
  WorkspacePlayer,
  WorkspacePayload,
} from "../../src/domain/workspace";
import type { FinancePayload } from "../../src/domain/finance";
import type {
  FootballSession,
  FootballEvidence,
  FootballAttendance,
} from "../../src/domain/training";

test("QA-13/QA-14 authenticated trials preserve identity, approval, parent privacy and explicit manual fees", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(240000);
  const origin = String(testInfo.project.use.baseURL),
    suffix = crypto.randomUUID();
  let registrations = 0;
  async function account(name: string) {
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      }),
      email = `${name}-${suffix}@example.test`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password: `Synthetic-only-${crypto.randomUUID()}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    return { api, email, id: (await response.json()).user.id as string };
  }
  const owner = await account("TrialOwner"),
    coach = await account("TrialCoach"),
    parent = await account("TrialParent");
  async function post<T>(
    api: APIRequestContext,
    path: string,
    data: unknown,
    expected = 200,
  ): Promise<T> {
    const response = await api.post(path, { data });
    expect(response.status(), await response.text()).toBe(expected);
    return response.json() as Promise<T>;
  }
  const academy = await post<{ id: string }>(
      owner.api,
      "/api/workspaces",
      {
        name: "Separate Fictional Trial QA Academy",
        contactEmail: "trial-qa@example.test",
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
      201,
    ),
    root = `/api/workspaces/${academy.id}`,
    endpoint = `${root}/trials`;
  async function invite(
    person: typeof coach,
    role: "COACH" | "PARENT",
    playerIds: string[] = [],
  ) {
    const invitation = await post<{ token: string }>(
      owner.api,
      `${root}/actions`,
      {
        action: "invite",
        data: {
          email: person.email,
          role,
          playerIds,
          guardianVerified: role === "PARENT",
        },
        verified: true,
      },
    );
    await post(person.api, "/api/invitations/accept", {
      token: invitation.token,
    });
  }
  await invite(coach, "COACH");
  const children: WorkspacePlayer[] = [];
  for (const name of [
    "Fictional Trial Player",
    "Fictional Expired Trial",
    "Fictional Cancelled Trial",
  ])
    children.push(
      await post<WorkspacePlayer>(
        owner.api,
        `${root}/records/player`,
        { name, squad: "U12 Trial Group", coachId: coach.id },
        201,
      ),
    );
  await invite(parent, "PARENT", [children[0].id]);
  const branch = await post<{ id: string }>(
    owner.api,
    `${root}/records/branch`,
    { name: "Trial Branch", timezone: "Asia/Kolkata" },
    201,
  );
  const squad = await post<{ id: string }>(owner.api, `${root}/training`, {
    requestId: crypto.randomUUID(),
    action: "squad",
    data: {
      name: "U12 Trial Group",
      branchId: branch.id,
      playerIds: children.map((child) => child.id),
    },
  });
  // Batch membership and the player's reviewed placement are separate records.
  for (const child of children) {
    const current = await owner.api.get(`${root}/records/player/${child.id}`);
    expect(current.status()).toBe(200);
    const record = (await current.json()) as WorkspacePlayer;
    const placed = await owner.api.put(`${root}/records/player/${child.id}`, {
      data: {
        ...record,
        squadId: squad.id,
        squad: "U12 Trial Group",
        placementReviewed: true,
        expectedVersion: record.recordVersion,
      },
    });
    expect(placed.status(), await placed.text()).toBe(200);
  }
  async function payload(api = owner.api): Promise<TrialPayload> {
    const response = await api.get(endpoint);
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  }
  async function finance(): Promise<FinancePayload> {
    const response = await owner.api.get(`${root}/finance`);
    expect(response.status()).toBe(200);
    return response.json();
  }
  async function workspace(): Promise<WorkspacePayload> {
    const response = await owner.api.get(root);
    expect(response.status()).toBe(200);
    return response.json();
  }
  const today = (await finance()).asOfDate;
  const clockResponse = await owner.api.get(root);
  const serverNow = Date.parse(clockResponse.headers()["date"]);
  expect(Number.isFinite(serverNow)).toBe(true);
  // Real earlier timestamps from the server's HTTP Date; no test clock or forced lifecycle state.
  const sessionEnd = new Date(
      Math.floor(serverNow / 60000) * 60000 - 5 * 60000,
    ),
    sessionStart = new Date(sessionEnd.getTime() - 10 * 60000);
  function localDateTime(date: Date) {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const part = (name: string) =>
      parts.find((value) => value.type === name)!.value;
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  }
  const trialStart = localDateTime(sessionStart).slice(0, 10),
    trialEndDate = new Date(`${trialStart}T12:00:00Z`);
  trialEndDate.setUTCDate(trialEndDate.getUTCDate() + 9);
  const ownerContext = await browser.newContext({
      storageState: await owner.api.storageState(),
      viewport: { width: 1536, height: 1024 },
    }),
    page = await ownerContext.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const route = `/workspace/${academy.id}?section=players&player=${children[0].id}`;
  await page.goto(route);
  let region = page.getByRole("region", {
    name: "Trial enrolment",
    exact: true,
  });
  await region
    .getByRole("button", { name: "Academy trial rules", exact: true })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Academy trial rules",
    exact: true,
  });
  await dialog
    .getByLabel("Default trial duration in days (optional)", { exact: true })
    .fill("10");
  await dialog
    .getByRole("checkbox", {
      name: "Allow paid trials under the academy fee rule",
      exact: true,
    })
    .check();
  await dialog
    .getByLabel("Trial fee amount (INR)", { exact: true })
    .fill("500");
  await dialog
    .getByLabel("Approved trial fee rule", { exact: true })
    .fill(
      "Fictional academy rule: issue a single manual INR500 invoice only after staff review; no automatic collection.",
    );
  await dialog
    .getByRole("button", { name: "Save Trial Rules", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await region
    .getByRole("button", { name: "Create trial enrolment", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Create trial enrolment",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Trial start date", { exact: true }),
  ).toHaveValue(today);
  await expect(
    dialog.getByLabel("Trial end date", { exact: true }),
  ).not.toHaveValue("");
  await dialog.getByLabel("Trial start date", { exact: true }).fill(trialStart);
  await dialog
    .getByLabel("Trial end date", { exact: true })
    .fill(trialEndDate.toISOString().slice(0, 10));
  await dialog
    .getByLabel("Trial pricing", { exact: true })
    .selectOption("PAID");
  const evidence = evidencePath("docs/screenshots/final-trials");
  await mkdir(evidence, { recursive: true });
  const metrics = [];
  for (const [width, height] of [
    [1536, 1024],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    const save = dialog.getByRole("button", {
      name: "Save Trial Enrolment",
      exact: true,
    });
    await expect(save).toBeVisible();
    const bounds = await save.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    const actionState = await save.evaluate((element) => {
      const box = element.getBoundingClientRect(),
        style = getComputedStyle(element);
      return {
        receivesPointer: element.contains(
          document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          ),
        ),
        background: style.backgroundColor,
        color: style.color,
      };
    });
    expect(actionState.receivesPointer).toBe(true);
    expect(actionState.background).toBe("rgb(0, 132, 99)");
    expect(actionState.color).toBe("rgb(255, 255, 255)");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `${evidence}/create-trial-${width}.png` });
    metrics.push({ width, height, saveBounds: bounds, actionState });
  }
  await dialog
    .getByRole("button", { name: "Save Trial Enrolment", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  let trial = (await payload()).enrolments[0];
  expect(trial).toMatchObject({
    playerId: children[0].id,
    squadId: squad.id,
    coachId: coach.id,
    effectiveStatus: "ACTIVE",
    pricing: "PAID",
    feeMinor: 50000,
  });
  expect((await finance()).invoices).toHaveLength(0);
  const trialId = trial.id,
    guardianLinks = (await workspace()).guardians;
  const training = <T>(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) =>
    post<T>(coach.api, `${root}/training`, {
      requestId: crypto.randomUUID(),
      action,
      id,
      expectedVersion,
      data,
    });
  const drill = await post<{ id: string }>(
    coach.api,
    `${root}/records/drill`,
    {
      name: "Fictional trial close-control familiarisation",
      focusArea: "Dribbling",
      purpose: "Observe introductory close-control touches",
      cue: "Small touches in the marked area",
      sportId: "football",
    },
    201,
  );
  let recordedSession = await training<FootballSession>("session", {
    branchId: branch.id,
    squadId: squad.id,
    location: "Fictional academy trial training area",
    coachIds: [coach.id],
    timezone: "Asia/Kolkata",
    startLocal: localDateTime(sessionStart),
    endLocal: localDateTime(sessionEnd),
    theme: "Fictional trial close-control familiarisation",
    sharedObjective: {
      goal: "Keep the ball within the marked area",
      cue: "Small controlled touches",
      observe: "First contact and change of direction",
    },
    agenda: [{ drillId: drill.id, duration: 10 }],
  });
  recordedSession = await training<FootballSession>(
    "status",
    { status: "SCHEDULED" },
    recordedSession.id,
    recordedSession.version,
  );
  recordedSession = await training<FootballSession>(
    "status",
    { status: "IN_PROGRESS" },
    recordedSession.id,
    recordedSession.version,
  );
  const initialAttendance = (await workspace()).records.attendance.filter(
    (row) => row.sessionId === recordedSession.id,
  );
  expect(initialAttendance).toHaveLength(3);
  await training(
    "attendance",
    {
      entries: initialAttendance.map((row) => ({
        playerId: row.playerId,
        status: row.playerId === children[0].id ? "PRESENT" : "EXCUSED",
        expectedVersion: row.version,
      })),
      correctionReason: "",
    },
    recordedSession.id,
    recordedSession.version,
  );
  const observation = await training<FootballEvidence>("evidence", {
    sessionId: recordedSession.id,
    playerId: children[0].id,
    drillId: drill.id,
    conditions: "Fictional introductory marked area, no pressure",
    observation:
      "Fictional observation: attended introductory practice and used short touches; further comparable sessions are needed.",
    staffNote: "PRIVATE_TRIAL_NOTE",
    type: "COACH_OBSERVATION",
    visibility: "PARENT_ELIGIBLE",
    measurement: "OBSERVATION",
    method: "Assigned coach watched this introductory activity",
  });
  const reviewedObservation = await training<FootballEvidence>(
    "review",
    { status: "REVIEWED", verified: true },
    observation.id,
    observation.version,
  );
  recordedSession = await training<FootballSession>(
    "status",
    { status: "COMPLETED" },
    recordedSession.id,
    recordedSession.version,
  );
  const recordedAttendance = (await workspace()).records.attendance.find(
    (row) =>
      row.sessionId === recordedSession.id && row.playerId === children[0].id,
  ) as FootballAttendance;
  expect(recordedAttendance.status).toBe("PRESENT");
  expect((await payload()).enrolments[0].sources).toEqual({
    sessionIds: [recordedSession.id],
    attendanceIds: [recordedAttendance.id],
    evidenceIds: [reviewedObservation.id],
  });
  expect((await payload(parent.api)).enrolments).toEqual([]);
  const unlinkedChild = await parent.api.get(
    `${endpoint}?player=${children[1].id}`,
  );
  // The existing record boundary intentionally conceals inaccessible child IDs.
  expect(unlinkedChild.status()).toBe(404);
  expect(await unlinkedChild.json()).toEqual({
    error: "Record not available in this academy and role.",
  });
  const coachContext = await browser.newContext({
      storageState: await coach.api.storageState(),
      viewport: { width: 390, height: 844 },
    }),
    coachPage = await coachContext.newPage();
  await coachPage.goto(route);
  const coachRegion = coachPage.getByRole("region", {
    name: "Trial enrolment",
    exact: true,
  });
  await coachRegion
    .getByText("Trial records and actions", { exact: true })
    .click();
  await expect(
    coachRegion.getByRole("button", {
      name: "Convert to regular enrolment",
      exact: true,
    }),
  ).toHaveCount(0);
  await coachRegion
    .getByRole("button", { name: "Record trial feedback", exact: true })
    .click();
  const feedback = coachPage.getByRole("dialog", {
    name: "Record trial feedback",
    exact: true,
  });
  await feedback
    .getByLabel("Coach trial feedback", { exact: true })
    .fill(
      "Fictional introductory feedback: participated in the orientation. Insufficient reviewed evidence for a development assessment.",
    );
  await feedback
    .getByRole("button", { name: "Record trial feedback", exact: true })
    .click();
  await expect(feedback).toBeHidden();
  await page.reload();
  region = page.getByRole("region", { name: "Trial enrolment", exact: true });
  await region.getByText("Trial records and actions", { exact: true }).click();
  await region
    .getByRole("button", { name: "Review trial summary", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Review trial summary",
    exact: true,
  });
  await dialog
    .getByLabel("Reviewed trial summary", { exact: true })
    .fill(
      "Fictional introductory trial: insufficient reviewed evidence for a full progress assessment. Continue the batch plan and record comparable observations.",
    );
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Review trial summary", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect((await payload(parent.api)).enrolments).toEqual([]);
  await region
    .getByRole("button", {
      name: "Publish reviewed trial summary",
      exact: true,
    })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Publish reviewed trial summary",
    exact: true,
  });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", {
      name: "Publish reviewed trial summary",
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
  const parentTrial = (await payload(parent.api)).enrolments[0];
  expect(parentTrial.publishedSummary?.body).toContain(
    "insufficient reviewed evidence",
  );
  expect(parentTrial.feedback).toBe("");
  expect(parentTrial.history).toEqual([]);
  const parentContext = await browser.newContext({
      storageState: await parent.api.storageState(),
      viewport: { width: 390, height: 844 },
    }),
    parentPage = await parentContext.newPage();
  await parentPage.goto(
    `/workspace/${academy.id}?section=development&player=${children[0].id}`,
  );
  await expect(
    parentPage.getByRole("region", {
      name: "Reviewed trial summary",
      exact: true,
    }),
  ).toContainText("insufficient reviewed evidence");
  await parentPage.screenshot({
    path: `${evidence}/parent-reviewed-summary-390.png`,
    fullPage: true,
  });
  await region
    .getByRole("button", { name: "Issue trial invoice", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Issue trial invoice",
    exact: true,
  });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Issue trial invoice", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  trial = (await payload()).enrolments[0];
  const issued = (await finance()).invoices[0];
  expect(issued.chargeMinor).toBe(50000);
  expect(trial.invoiceId).toBe(issued.id);
  expect((await finance()).payments).toHaveLength(0);
  const sourceBefore = trial.sources;
  expect(sourceBefore).toEqual({
    sessionIds: [recordedSession.id],
    attendanceIds: [recordedAttendance.id],
    evidenceIds: [reviewedObservation.id],
  });
  await region
    .getByRole("button", { name: "Convert to regular enrolment", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Convert to regular enrolment",
    exact: true,
  });
  await dialog
    .getByLabel("Decision reason", { exact: true })
    .fill(
      "Fictional reviewed regular enrolment decision; preserve the existing player and records.",
    );
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Convert to regular enrolment", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  trial = (await payload()).enrolments[0];
  expect(trial.id).toBe(trialId);
  expect(trial.status).toBe("CONVERTED");
  expect(trial.sources).toEqual(sourceBefore);
  expect(trial.feedback).toContain("introductory feedback");
  expect(trial.publishedSummary).toBeDefined();
  expect(
    (await workspace()).records.player.find(
      (player) => player.id === children[0].id,
    )?.status,
  ).toBe("ACTIVE");
  expect((await workspace()).guardians).toEqual(guardianLinks);
  const afterConversion = await workspace();
  expect(
    afterConversion.records.session.find(
      (row) => row.id === recordedSession.id,
    ),
  ).toEqual(recordedSession);
  expect(
    afterConversion.records.attendance.find(
      (row) => row.id === recordedAttendance.id,
    ),
  ).toEqual(recordedAttendance);
  expect(
    afterConversion.records.evidence.find(
      (row) => row.id === reviewedObservation.id,
    ),
  ).toEqual(reviewedObservation);
  const repeated = await post<TrialView>(owner.api, endpoint, {
    requestId: crypto.randomUUID(),
    action: "convert",
    id: trial.id,
    expectedVersion: trial.version - 1,
    data: { reviewed: true, reason: "Repeated request" },
  });
  expect(repeated.id).toBe(trialId);
  expect(repeated.status).toBe("CONVERTED");
  expect((await finance()).invoices.map((invoice) => invoice.id)).toEqual([
    issued.id,
  ]);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Trial enrolment", exact: true }),
  ).toContainText("converted");
  await page.screenshot({
    path: `${evidence}/converted-player-320.png`,
    fullPage: true,
  });
  const createTrial = (index: number, startDate: string, endDate: string) =>
    post<TrialView>(owner.api, endpoint, {
      requestId: crypto.randomUUID(),
      action: "create",
      data: {
        playerId: children[index].id,
        squadId: squad.id,
        coachId: coach.id,
        startDate,
        endDate,
        pricing: "FREE",
        feeMinor: 0,
        currency: "INR",
      },
    });
  const expired = await createTrial(1, "2026-08-01", "2026-08-03");
  expect(expired.status).toBe("EXPIRED");
  const futureDate = new Date(`${today}T12:00:00Z`);
  futureDate.setUTCDate(futureDate.getUTCDate() + 20);
  const future = futureDate.toISOString().slice(0, 10);
  futureDate.setUTCDate(futureDate.getUTCDate() + 2);
  const futureEnd = futureDate.toISOString().slice(0, 10);
  const scheduled = await createTrial(2, future, futureEnd);
  expect(scheduled.status).toBe("SCHEDULED");
  const cancelled = await post<TrialView>(owner.api, endpoint, {
    requestId: crypto.randomUUID(),
    action: "transition",
    id: scheduled.id,
    expectedVersion: scheduled.version,
    data: {
      status: "CANCELLED",
      reason: "Fictional family cancelled the trial",
    },
  });
  expect(cancelled.status).toBe("CANCELLED");
  const denied = {
    requestId: crypto.randomUUID(),
    action: "convert",
    id: cancelled.id,
    expectedVersion: cancelled.version,
    data: { reviewed: true, reason: "Not permitted" },
  };
  expect((await owner.api.post(endpoint, { data: denied })).status()).toBe(400);
  expect((await parent.api.post(endpoint, { data: denied })).status()).toBe(
    403,
  );
  expect((await coach.api.post(endpoint, { data: denied })).status()).toBe(403);
  expect((await finance()).invoices).toHaveLength(1);
  expect((await finance()).payments).toHaveLength(0);
  expect((await workspace()).records.player).toHaveLength(3);
  expect(errors).toEqual([]);
  await writeFile(
    `${evidence}/qa-13-14.json`,
    JSON.stringify(
      {
        academyId: academy.id,
        isolatedFromMain60PlayerScenario: true,
        players: children.map((child) => child.id),
        trials: (await payload()).enrolments.map((trial) => ({
          id: trial.id,
          playerId: trial.playerId,
          status: trial.effectiveStatus,
          invoiceId: trial.invoiceId,
        })),
        preservedGuardianLinks: true,
        preservedTrialSources: sourceBefore,
        invoiceCount: 1,
        paymentCount: 0,
        metrics,
      },
      null,
      2,
    ),
  );
  await Promise.all([
    ownerContext.close(),
    coachContext.close(),
    parentContext.close(),
    owner.api.dispose(),
    coach.api.dispose(),
    parent.api.dispose(),
  ]);
});
