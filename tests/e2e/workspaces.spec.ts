import { test, expect, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { operationalSports } from "../../src/config/sports/workspace-sports";
import { generalNutritionGuidance } from "../../src/config/communication/nutrition-guidance";
import { verifyWorkspaceRestart } from "./restart-workspace-check";
test("authenticated football academies isolate regional plans, approved parent reports and conversations", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(360000);
  const origin = "http://127.0.0.1:3001",
    suffix = crypto.randomUUID();
  let registrations = 0;
  async function account(name: string) {
    if (registrations++ > 0)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const email = `${name}-${suffix}@example.test`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password: `Test-only-${crypto.randomUUID()}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    const value = await response.json();
    return { api, userId: value.user.id, email };
  }
  const a = await account("OwnerA"),
    b = await account("OwnerB"),
    c = await account("OwnerC"),
    parent = await account("Parent"),
    coach = await account("Coach");
  async function academy(
    api: APIRequestContext,
    name: string,
    region: {
      country: string;
      currency: string;
      timezone: string;
      dateLocale: string;
    },
  ) {
    const context = await browser.newContext({
      storageState: await api.storageState(),
    });
    const page = await context.newPage();
    await page.goto("/workspace");
    await page.getByLabel("Academy name", { exact: true }).fill(name);
    await page
      .getByLabel("Academy contact email")
      .fill("fictional@example.test");
    await page.getByLabel("Country code").fill(region.country);
    await page.getByLabel("Currency code").fill(region.currency);
    await page.getByLabel("Default branch time zone").fill(region.timezone);
    await page.getByLabel("Date and number locale").fill(region.dateLocale);
    await page
      .getByRole("checkbox", {
        name: "Explicitly label this as a fictional demo academy",
      })
      .check();
    await expect(
      page.getByRole("group", { name: "Enabled sports" }),
    ).toHaveCount(0);
    mkdirSync("docs/screenshots/football-only", { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/football-only/onboarding-${region.country}.png`,
      fullPage: true,
    });
    if (region.country === "IN") {
      for (const width of [1440, 1280, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        await page.screenshot({
          path: `docs/screenshots/football-only/onboarding-${width}.png`,
          fullPage: true,
        });
      }
    }
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/workspaces") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create empty academy" }).click();
    const r = await response;
    expect(r.status(), await r.text()).toBe(201);
    const created = await r.json();
    expect(created.sportIds).toEqual(["football"]);
    expect(created).toMatchObject(region);
    await expect(page).toHaveURL(new RegExp(`/workspace/${created.id}$`));
    await context.close();
    return created.id as string;
  }
  const aid = await academy(a.api, "Fictional A Football", {
      country: "IN",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
    }),
    bid = await academy(b.api, "Fictional B Football", {
      country: "GB",
      currency: "GBP",
      timezone: "Europe/London",
      dateLocale: "en-GB",
    }),
    cid = await academy(c.api, "Fictional C Football", {
      country: "AU",
      currency: "AUD",
      timezone: "Australia/Perth",
      dateLocale: "en-AU",
    });
  async function save(
    api: APIRequestContext,
    id: string,
    kind: string,
    data: unknown,
  ) {
    const r = await api.post(`/api/workspaces/${id}/records/${kind}`, { data });
    expect(r.status(), await r.text()).toBe(201);
    return r.json();
  }
  async function action(
    api: APIRequestContext,
    id: string,
    action: string,
    recordId?: string,
    data?: unknown,
  ) {
    const r = await api.post(`/api/workspaces/${id}/actions`, {
      data: { action, id: recordId, data, verified: true },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.json();
  }
  expect((await a.api.get(`/api/workspaces/${aid}`)).ok()).toBeTruthy();
  expect((await a.api.get(`/api/workspaces/${bid}`)).status()).toBe(403);
  const empty = await (await a.api.get(`/api/workspaces/${aid}`)).json();
  expect(empty.records.player).toEqual([]);
  const coachInvitation = await action(a.api, aid, "invite", undefined, {
    email: coach.email,
    role: "COACH",
  });
  expect(
    (
      await coach.api.post("/api/invitations/accept", {
        data: { token: coachInvitation.token },
      })
    ).ok(),
  ).toBeTruthy();
  const ownerAContext = await browser.newContext({
    storageState: await a.api.storageState(),
  });
  const ownerA = await ownerAContext.newPage();
  await ownerA.goto(`/workspace/${aid}`);
  await ownerA.getByRole("button", { name: "Settings", exact: true }).click();
  await ownerA
    .getByLabel("Player name", { exact: true })
    .fill("Fictional Child A");
  await ownerA.getByLabel("Squad", { exact: true }).fill("Junior");
  await ownerA
    .getByRole("combobox", { name: "Assigned coach", exact: true })
    .selectOption(coach.userId);
  // Inject one failed save, then retry against the real API. The draft must survive.
  const playerEndpoint = `**/api/workspaces/${aid}/records/player`;
  await ownerA.route(playerEndpoint, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporary test save failure" }),
    }),
  );
  await ownerA.getByRole("button", { name: "Add player", exact: true }).click();
  await expect(
    ownerA
      .getByRole("alert")
      .filter({ hasText: "Temporary test save failure" }),
  ).toHaveText("Temporary test save failure");
  await expect(ownerA.getByLabel("Player name", { exact: true })).toHaveValue(
    "Fictional Child A",
  );
  await ownerA.unroute(playerEndpoint);
  const playerResponse = ownerA.waitForResponse(
    (r) =>
      r.url().endsWith("/records/player") && r.request().method() === "POST",
  );
  await ownerA.getByRole("button", { name: "Add player", exact: true }).click();
  const playerCreated = await playerResponse;
  expect(playerCreated.status()).toBe(201);
  const child = await playerCreated.json();
  expect(child.coachId).toBe(coach.userId);
  await ownerAContext.close();
  const other = await save(b.api, bid, "player", {
    name: "Fictional Child B",
    squad: "Junior",
    coachId: b.userId,
    sportIds: ["football"],
  });
  const unrelated = await save(a.api, aid, "player", {
    name: "Fictional Unrelated Family",
    squad: "Junior",
    coachId: a.userId,
    sportIds: ["football"],
  });
  expect(
    (
      await a.api.get(`/api/workspaces/${bid}/records/player/${other.id}`)
    ).status(),
  ).toBe(403);
  expect(
    (
      await a.api.put(`/api/workspaces/${bid}/records/player/${other.id}`, {
        data: child,
      })
    ).status(),
  ).toBe(403);
  async function planReport(
    api: APIRequestContext,
    id: string,
    playerId: string,
    coachId: string,
    sportId: string,
  ) {
    const template = operationalSports[sportId].templates[0];
    const drill = await save(api, id, "drill", {
      ...template,
      sportId,
      templateId: template.id,
    });
    const draftPlan = {
      playerId,
      coachId,
      sportId,
      focus: template.focusArea,
      reason: "Reviewed comparable attempts selected this individual focus.",
      drillIds: [drill.id],
      observe: "Observe the recorded drill outcome.",
      homePractice: "Optional safe practice in an open space.",
      reviewDate: "2026-10-25",
      nextStep: "Review four comparable attempts.",
      status: "ACTIVE",
      privateNote: "STAFF ONLY SECRET",
    };
    const context = await browser.newContext({
      storageState: await api.storageState(),
    });
    const page = await context.newPage();
    await page.goto(`/workspace/${id}`);
    await page
      .getByRole("combobox", { name: "Player", exact: true })
      .selectOption(playerId);
    await page.getByLabel("Development focus").selectOption(template.focusArea);
    await page.getByLabel("Why this focus").fill(draftPlan.reason);
    await page
      .getByRole("checkbox", { name: new RegExp(template.name) })
      .check();
    await page.getByLabel("Coach will observe").fill(draftPlan.observe);
    await page
      .getByLabel("Optional safe home practice")
      .fill(draftPlan.homePractice);
    await page
      .getByLabel("Review date", { exact: true })
      .fill(draftPlan.reviewDate);
    await page.getByLabel("Next development step").fill(draftPlan.nextStep);
    await page.getByLabel("Plan status").selectOption("ACTIVE");
    await page
      .getByLabel("Private coach working note")
      .fill(draftPlan.privateNote);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/records/plan") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save individual plan" }).click();
    const saved = await response;
    expect(saved.status(), await saved.text()).toBe(201);
    const plan = await saved.json();
    expect(plan).toMatchObject(draftPlan);
    await page.reload();
    await expect(page.getByLabel("Why this focus")).toHaveValue(
      draftPlan.reason,
    );
    await page.screenshot({
      path: `docs/screenshots/football-only/plan-${id === aid ? "IN" : id === bid ? "GB" : "AU"}.png`,
      fullPage: true,
    });
    if (id === aid) {
      for (const width of [1440, 1280, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        await page.screenshot({
          path: `docs/screenshots/football-only/coach-plan-${width}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
    const report = await save(api, id, "report", {
      playerId,
      planId: plan.id,
      sportId,
      period: "2026-10",
      observation: "The coach reviewed this player's own comparable attempts.",
      evidenceType: "COACH_OBSERVATION",
      nextStep: plan.nextStep,
      closingNote: "Thank you for supporting safe practice.",
    });
    const approved = await action(api, id, "approveReport", report.id);
    expect(approved.snapshot.sport).toBe(operationalSports[sportId].name);
    return { plan, report: approved };
  }
  const ar = await planReport(
    coach.api,
    aid,
    child.id,
    coach.userId,
    "football",
  );
  expect((await coach.api.get(`/api/workspaces/${bid}`)).status()).toBe(403);
  expect(
    (
      await coach.api.get(
        `/api/workspaces/${aid}/records/player/${unrelated.id}`,
      )
    ).status(),
  ).toBe(404);
  const two = await save(c.api, cid, "player", {
    name: "Fictional Child C",
    squad: "Junior",
    coachId: c.userId,
    sportIds: ["football"],
  });
  const cr = await planReport(c.api, cid, two.id, c.userId, "football");
  expect(cr.report.snapshot.sport).toBe("Football");
  const config = (await (await c.api.get(`/api/workspaces/${cid}`)).json())
    .academy;
  for (const unsupported of ["cricket", "badminton", "hockey"]) {
    expect(
      (
        await c.api.patch(`/api/workspaces/${cid}`, {
          data: { ...config, sportIds: ["football", unsupported] },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await c.api.post("/api/workspaces", {
          data: { ...config, sportIds: [unsupported] },
        })
      ).status(),
    ).toBe(400);
    for (const kind of [
      "player",
      "plan",
      "drill",
      "report",
      "update",
      "program",
    ]) {
      expect(
        (
          await c.api.post(`/api/workspaces/${cid}/records/${kind}`, {
            data: {
              ...cr.plan,
              ...operationalSports.football.templates[0],
              playerId: two.id,
              planId: cr.plan.id,
              sportId: unsupported,
              sportIds: [unsupported],
              coachId: c.userId,
              name: "Unsupported",
              period: "2026-10",
              observation: "Test",
              evidenceType: "COACH_OBSERVATION",
              closingNote: "",
              messageBody: "Test",
              type: "DEVELOPMENT",
              branchId: "missing",
            },
          })
        ).status(),
      ).toBe(400);
    }
  }
  expect(
    (await (await c.api.get(`/api/workspaces/${cid}`)).json()).academy,
  ).toEqual(config);
  const historicalBefore = execFileSync(
    process.execPath,
    [
      "tests/e2e/legacy-football-fixture.mjs",
      "insert",
      cid,
      a.userId,
      parent.userId,
    ],
    { encoding: "utf8" },
  );
  for (const kind of [
    "player",
    "plan",
    "drill",
    "report",
    "update",
    "program",
    "conversation",
  ]) {
    expect(
      (
        await c.api.get(
          `/api/workspaces/${cid}/records/${kind}/retired-${kind}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await c.api.put(
          `/api/workspaces/${cid}/records/${kind}/retired-${kind}`,
          { data: { ...cr.plan, sportId: "football" } },
        )
      ).status(),
    ).toBe(kind === "conversation" ? 405 : 404);
  }
  expect(
    (
      await c.api.get(`/api/workspaces/${cid}/reports/retired-report/pdf`)
    ).status(),
  ).toBe(404);
  // Saving regional settings cannot delete or convert historical records.
  expect(
    (await c.api.patch(`/api/workspaces/${cid}`, { data: config })).status(),
  ).toBe(200);
  const historicalAfter = execFileSync(
    process.execPath,
    ["tests/e2e/legacy-football-fixture.mjs", "read", cid],
    { encoding: "utf8" },
  );
  expect(historicalAfter).toBe(historicalBefore);
  expect(
    JSON.stringify(
      (await (await c.api.get(`/api/workspaces/${cid}`)).json()).records,
    ),
  ).not.toMatch(/Historical|retired-|cricket|badminton/);
  const invitation = await action(a.api, aid, "invite", undefined, {
    email: parent.email,
    role: "PARENT",
    playerIds: [child.id],
    guardianVerified: true,
  });
  expect(invitation.status).toBe("NOT_SENT");
  expect(
    (
      await b.api.post("/api/invitations/accept", {
        data: { token: invitation.token },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await parent.api.post("/api/invitations/accept", {
        data: { token: invitation.token },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await parent.api.post("/api/invitations/accept", {
        data: { token: invitation.token },
      })
    ).status(),
  ).toBe(403);
  const pdata = await (await parent.api.get(`/api/workspaces/${aid}`)).json();
  expect(pdata.records.player.map((p: { id: string }) => p.id)).toEqual([
    child.id,
  ]);
  expect(
    (
      await parent.api.get(
        `/api/workspaces/${aid}/records/player/${unrelated.id}`,
      )
    ).status(),
  ).toBe(404);
  expect(JSON.stringify(pdata)).not.toContain("Fictional Unrelated Family");
  expect(JSON.stringify(pdata)).not.toContain("STAFF ONLY SECRET");
  expect((await parent.api.get(`/api/workspaces/${cid}`)).status()).toBe(403);
  const pdf = await parent.api.get(
    `/api/workspaces/${aid}/reports/${ar.report.id}/pdf`,
  );
  expect(pdf.status(), await pdf.text()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  mkdirSync("docs/screenshots/football-only", { recursive: true });
  writeFileSync(
    "docs/screenshots/football-only/approved-parent-report.pdf",
    await pdf.body(),
  );
  expect(
    (
      await parent.api.get(`/api/workspaces/${cid}/reports/${cr.report.id}/pdf`)
    ).status(),
  ).toBe(403);
  const update = await save(a.api, aid, "update", {
    playerId: child.id,
    sportId: "football",
    planId: ar.plan.id,
    sourceReportId: ar.report.id,
    type: "DEVELOPMENT",
    messageBody:
      "Coach-reviewed focus and next review are available in your private plan.",
  });
  await action(a.api, aid, "submitUpdate", update.id);
  const published = await action(a.api, aid, "approveUpdate", update.id);
  expect(published.externalDeliveryStatus).toBe("NOT_SENT");
  expect(
    (await (await parent.api.get(`/api/workspaces/${aid}`)).json()).records
      .update,
  ).toHaveLength(1);
  const thread = await save(parent.api, aid, "conversation", {
    playerId: child.id,
    guardianId: parent.userId,
    subject: "Home practice question",
  });
  await action(parent.api, aid, "reply", thread.id, {
    action: "reply",
    body: "How can we practise safely?",
    internal: false,
  });
  await action(a.api, aid, "reply", thread.id, {
    action: "reply",
    body: "PRIVATE STAFF NOTE",
    internal: true,
  });
  await action(parent.api, aid, "reply", thread.id, {
    action: "reply",
    body: "Thank you",
    internal: false,
  });
  const staffThread = await (
    await a.api.get(`/api/workspaces/${aid}/records/conversation/${thread.id}`)
  ).json();
  expect(JSON.stringify(staffThread)).toContain("PRIVATE STAFF NOTE");
  const parentThread = await (
    await parent.api.get(
      `/api/workspaces/${aid}/records/conversation/${thread.id}`,
    )
  ).json();
  expect(JSON.stringify(parentThread)).not.toContain("PRIVATE STAFF NOTE");
  await action(a.api, aid, "reply", thread.id, {
    action: "reply",
    body: "Use the optional home practice in your reviewed plan.",
    internal: false,
  });
  const nutrition = await save(a.api, aid, "update", {
    playerId: child.id,
    sportId: "football",
    planId: ar.plan.id,
    type: "NUTRITION_HYDRATION",
    messageBody: generalNutritionGuidance,
  });
  await action(a.api, aid, "submitUpdate", nutrition.id);
  await action(a.api, aid, "approveUpdate", nutrition.id);
  expect(
    (await (await parent.api.get(`/api/workspaces/${aid}`)).json()).records
      .update,
  ).toHaveLength(1);
  await save(parent.api, aid, "preference", {
    nutrition: true,
    development: true,
    inApp: true,
    language: "English",
    quietStart: "21:00",
    quietEnd: "07:00",
  });
  const opted = await save(a.api, aid, "update", {
    playerId: child.id,
    sportId: "football",
    planId: ar.plan.id,
    type: "NUTRITION_HYDRATION",
    messageBody: generalNutritionGuidance,
  });
  await action(a.api, aid, "submitUpdate", opted.id);
  await action(a.api, aid, "approveUpdate", opted.id);
  expect(
    (await (await parent.api.get(`/api/workspaces/${aid}`)).json()).records
      .update,
  ).toHaveLength(2);
  await save(parent.api, aid, "dietary", {
    playerId: child.id,
    note: "Fictional test restriction; no real medical data.",
  });
  expect(
    (await (await a.api.get(`/api/workspaces/${aid}`)).json()).records.dietary,
  ).toHaveLength(1);
  const browserContext = await browser.newContext({
    storageState: await parent.api.storageState(),
  });
  const page = await browserContext.newPage();
  await page.goto(`/workspace/${aid}`);
  await expect(
    page.getByRole("heading", { name: "Fictional A Football" }),
  ).toBeVisible();
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `docs/screenshots/football-only/parent-${width}.png`,
      fullPage: true,
    });
  }
  await page.reload();
  await expect(page.getByText("STAFF ONLY SECRET")).toHaveCount(0);
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/football-only/parent-inbox.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Home practice question/ }).click();
  await expect(
    page.getByText("Use the optional home practice in your reviewed plan."),
  ).toBeVisible();
  await expect(page.getByText("PRIVATE STAFF NOTE")).toHaveCount(0);
  await page
    .getByLabel("Reply to coach")
    .fill("Can we use the same safe practice this week?");
  await page.getByRole("button", { name: "Post reply", exact: true }).click();
  await expect(
    page.getByText("Can we use the same safe practice this week?", {
      exact: true,
    }),
  ).toBeVisible();
  const coachContext = await browser.newContext({
    storageState: await coach.api.storageState(),
  });
  const coachPage = await coachContext.newPage();
  await coachPage.goto(`/workspace/${aid}`);
  await coachPage
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await coachPage
    .getByRole("button", { name: /Home practice question/ })
    .click();
  await expect(
    coachPage.getByText("Can we use the same safe practice this week?", {
      exact: true,
    }),
  ).toBeVisible();
  await coachPage
    .getByLabel("Conversation reply")
    .fill(
      "Yes, continue the reviewed safe home practice until the next review.",
    );
  await coachPage
    .getByRole("button", { name: "Post reply", exact: true })
    .click();
  await expect(
    coachPage.getByText(
      "Yes, continue the reviewed safe home practice until the next review.",
      { exact: true },
    ),
  ).toBeVisible();
  await coachContext.close();
  await page.reload();
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await page.getByRole("button", { name: /Home practice question/ }).click();
  await expect(
    page.getByText(
      "Yes, continue the reviewed safe home practice until the next review.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("PRIVATE STAFF NOTE")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/football-only/parent-thread.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Optional nutrition and hydration guidance",
    }),
  ).toBeChecked();
  await page.screenshot({
    path: "docs/screenshots/football-only/parent-preferences.png",
    fullPage: true,
  });
  await browserContext.close();
  const tampered = await a.api.post(`/api/workspaces/${aid}/records/update`, {
    data: {
      playerId: child.id,
      sportId: "football",
      planId: ar.plan.id,
      type: "NUTRITION_HYDRATION",
      messageBody: "Prescribe supplements and a weight-loss diet.",
    },
  });
  expect(tampered.status()).toBe(400);
  const edited = await a.api.put(
    `/api/workspaces/${aid}/records/report/${ar.report.id}`,
    {
      data: {
        ...ar.report,
        observation: "Edited observation must be reviewed again.",
      },
    },
  );
  expect(edited.ok()).toBeTruthy();
  expect((await edited.json()).status).toBe("Draft");
  expect(
    (
      await parent.api.get(`/api/workspaces/${aid}/reports/${ar.report.id}/pdf`)
    ).status(),
  ).toBe(404);
  const multiInvite = await action(c.api, cid, "invite", undefined, {
    email: a.email,
    role: "COACH",
    playerIds: [],
  });
  expect(
    (
      await a.api.post("/api/invitations/accept", {
        data: { token: multiInvite.token },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await (await a.api.get("/api/workspaces")).json()).workspaces,
  ).toHaveLength(2);
  expect((await a.api.get(`/api/workspaces/${bid}`)).status()).toBe(403);
  expect(
    (await (await a.api.get(`/api/workspaces/${cid}`)).json()).records.player,
  ).toHaveLength(0);
  const secondAcademyInvitation = await action(
    c.api,
    cid,
    "invite",
    undefined,
    {
      email: parent.email,
      role: "PARENT",
      playerIds: [two.id],
      guardianVerified: true,
    },
  );
  expect(
    (
      await parent.api.post("/api/invitations/accept", {
        data: { token: secondAcademyInvitation.token },
      })
    ).ok(),
  ).toBeTruthy();
  execFileSync(process.execPath, [
    "tests/e2e/legacy-football-fixture.mjs",
    "link",
    cid,
    c.userId,
    parent.userId,
  ]);
  const coachScope = await (await a.api.get(`/api/workspaces/${cid}`)).json();
  expect(
    coachScope.members.map((member: { userId: string }) => member.userId),
  ).not.toContain(parent.userId);
  const secondParentScope = await (
    await parent.api.get(`/api/workspaces/${cid}`)
  ).json();
  expect(
    secondParentScope.records.player.map((player: { id: string }) => player.id),
  ).toEqual([two.id]);
  expect(secondParentScope.records.plan).toHaveLength(1);
  expect(JSON.stringify(secondParentScope.records)).not.toMatch(
    /Historical|retired-|cricket|badminton/,
  );
  expect(JSON.stringify(secondParentScope)).not.toContain("STAFF ONLY SECRET");
  const switchingContext = await browser.newContext({
    storageState: await a.api.storageState(),
  });
  const switchingPage = await switchingContext.newPage();
  await switchingPage.goto(`/workspace/${aid}`);
  await expect(
    switchingPage.getByRole("combobox", { name: "Player", exact: true }),
  ).toContainText("Fictional Child A");
  await switchingPage
    .getByLabel("Switch academy", { exact: true })
    .selectOption(cid);
  await expect(
    switchingPage.getByRole("heading", { name: "Fictional C Football" }),
  ).toBeVisible();
  await expect(
    switchingPage.getByRole("combobox", { name: "Player", exact: true }),
  ).not.toContainText("Fictional Child A");
  await expect(switchingPage.getByText("STAFF ONLY SECRET")).toHaveCount(0);
  await switchingContext.close();
  const ownerContext = await browser.newContext({
    storageState: await c.api.storageState(),
  });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(`/workspace/${cid}`);
  await expect(ownerPage.getByLabel("Active sport")).toHaveCount(0);
  await expect(
    ownerPage.getByRole("checkbox", { name: "Badminton", exact: true }),
  ).toHaveCount(0);
  await expect(
    ownerPage.getByRole("heading", { name: "Individual development plan" }),
  ).toBeVisible();
  await ownerPage.screenshot({
    path: "docs/screenshots/football-only/football-plan.png",
    fullPage: true,
  });
  await ownerPage.getByRole("button", { name: "Reports", exact: true }).click();
  await ownerPage.screenshot({
    path: "docs/screenshots/football-only/approved-report.png",
    fullPage: true,
  });
  await ownerPage
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await ownerPage.screenshot({
    path: "docs/screenshots/football-only/settings-not-connected.png",
    fullPage: true,
  });
  await ownerContext.close();
  await planReport(b.api, bid, other.id, b.userId, "football");
  execFileSync(process.execPath, ["scripts/platform-admin.mjs", c.email]);
  const metadata = await c.api.get("/api/platform/accounts");
  expect(metadata.status()).toBe(200);
  expect(await metadata.text()).not.toContain("Fictional Child B");
  const platformContext = await browser.newContext({
    storageState: await c.api.storageState(),
  });
  const platformPage = await platformContext.newPage();
  await platformPage.goto("/platform");
  await platformPage.screenshot({
    path: "docs/screenshots/football-only/platform-metadata.png",
    fullPage: true,
  });
  await platformContext.close();
  expect((await c.api.get(`/api/workspaces/${bid}`)).status()).toBe(403);
  await action(b.api, bid, "support", undefined, {
    userId: c.userId,
    playerIds: [other.id],
    reason: "Fictional authorised support acceptance check",
  });
  const supportData = await (await c.api.get(`/api/workspaces/${bid}`)).json();
  expect(supportData.records.report).toHaveLength(1);
  expect(JSON.stringify(supportData)).not.toContain("STAFF ONLY SECRET");
  expect(supportData.records.conversation).toEqual([]);
  expect(supportData.records.dietary).toEqual([]);
  expect(
    (
      await c.api.post(`/api/workspaces/${bid}/records/player`, {
        data: {
          name: "Forbidden",
          squad: "Junior",
          coachId: c.userId,
          sportIds: ["football"],
        },
      })
    ).status(),
  ).toBe(403);
  const membership = (
    await (await a.api.get(`/api/workspaces/${aid}`)).json()
  ).members.find((m: { userId: string }) => m.userId === parent.userId);
  await action(a.api, aid, "revoke", membership.id);
  expect((await parent.api.get(`/api/workspaces/${aid}`)).status()).toBe(403);
  await verifyWorkspaceRestart(playwright, a.api, aid);
  for (const user of [a, b, c, parent, coach]) await user.api.dispose();
});
