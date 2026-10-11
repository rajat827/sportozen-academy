import { test, expect, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync,writeFileSync } from "node:fs";
import { operationalSports } from "../../src/config/sports/workspace-sports";
import { generalNutritionGuidance } from "../../src/config/communication/nutrition-guidance";
test("authenticated academies isolate records, sport plans, approved parent reports and conversations", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(240000);
  const origin = "http://127.0.0.1:3000",
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
    parent = await account("Parent");
  async function academy(
    api: APIRequestContext,
    name: string,
    sportIds: string[],
  ) {
    const r = await api.post("/api/workspaces", {
      data: {
        name,
        contactEmail: "fictional@example.test",
        country: "IN",
        language: "English",
        currency: sportIds[0] === "cricket" ? "GBP" : "INR",
        timezone: sportIds[0] === "cricket" ? "Europe/London" : "Asia/Kolkata",
        dateLocale: "en-IN",
        measurementSystem: "METRIC",
        brandAccent: "#008463",
        sportIds,
        modules: ["development", "reports", "communication"],
        demo: true,
      },
    });
    expect(r.status(), await r.text()).toBe(201);
    return (await r.json()).id as string;
  }
  const aid = await academy(a.api, "Fictional A Football", ["football"]),
    bid = await academy(b.api, "Fictional B Cricket", ["cricket"]),
    cid = await academy(c.api, "Fictional C Two Sports", [
      "football",
      "badminton",
    ]);
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
  const child = await save(a.api, aid, "player", {
    name: "Fictional Child A",
    squad: "Junior",
    coachId: a.userId,
    sportIds: ["football"],
  });
  const other = await save(b.api, bid, "player", {
    name: "Fictional Child B",
    squad: "Junior",
    coachId: b.userId,
    sportIds: ["cricket"],
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
    const plan = await save(api, id, "plan", {
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
    });
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
  const ar = await planReport(a.api, aid, child.id, a.userId, "football");
  const two = await save(c.api, cid, "player", {
    name: "Fictional Multi Sport Child",
    squad: "Junior",
    coachId: c.userId,
    sportIds: ["football", "badminton"],
  });
  await planReport(c.api, cid, two.id, c.userId, "football");
  const badminton = await planReport(c.api, cid, two.id, c.userId, "badminton");
  expect(JSON.stringify(badminton.report.snapshot)).not.toContain("Football");
  const invitation = await action(a.api, aid, "invite", undefined, {
    email: parent.email,
    role: "PARENT",
    playerIds: [child.id],
    guardianVerified: true,
  });
  expect(invitation.status).toBe("NOT_SENT");
  expect(
    (
      await parent.api.post("/api/invitations/accept", {
        data: { token: invitation.token },
      })
    ).ok(),
  ).toBeTruthy();
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
  mkdirSync("docs/screenshots/multi-academy",{recursive:true});
  writeFileSync("docs/screenshots/multi-academy/approved-parent-report.pdf",await pdf.body());
  expect(
    (
      await parent.api.get(
        `/api/workspaces/${cid}/reports/${badminton.report.id}/pdf`,
      )
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
      path: `docs/screenshots/multi-academy/parent-${width}.png`,
      fullPage: true,
    });
  }
  await page.reload();
  await expect(page.getByText("STAFF ONLY SECRET")).toHaveCount(0);
  await page.getByRole("button",{name:"Messages",exact:true}).click();
  await page.screenshot({path:"docs/screenshots/multi-academy/parent-inbox.png",fullPage:true});
  await page.getByRole("button",{name:/Home practice question/}).click();
  await expect(page.getByText("Use the optional home practice in your reviewed plan.")).toBeVisible();
  await expect(page.getByText("PRIVATE STAFF NOTE")).toHaveCount(0);
  await page.screenshot({path:"docs/screenshots/multi-academy/parent-thread.png",fullPage:true});
  await page.getByRole("button",{name:"Settings",exact:true}).click();
  await expect(page.getByRole("checkbox",{name:"Optional nutrition and hydration guidance"})).toBeChecked();
  await page.screenshot({path:"docs/screenshots/multi-academy/parent-preferences.png",fullPage:true});
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
  const secondAcademyInvitation=await action(c.api,cid,"invite",undefined,{email:parent.email,role:"PARENT",playerIds:[two.id],guardianVerified:true});
  expect((await parent.api.post("/api/invitations/accept",{data:{token:secondAcademyInvitation.token}})).ok()).toBeTruthy();
  const coachScope=await(await a.api.get(`/api/workspaces/${cid}`)).json();
  expect(coachScope.members.map((member:{userId:string})=>member.userId)).not.toContain(parent.userId);
  const secondParentScope=await(await parent.api.get(`/api/workspaces/${cid}`)).json();
  expect(secondParentScope.records.player.map((player:{id:string})=>player.id)).toEqual([two.id]);
  expect(secondParentScope.records.plan).toHaveLength(2);
  expect(JSON.stringify(secondParentScope)).not.toContain("STAFF ONLY SECRET");
  const switchingContext = await browser.newContext({
    storageState: await a.api.storageState(),
  });
  const switchingPage = await switchingContext.newPage();
  await switchingPage.goto(`/workspace/${aid}`);
  await expect(
    switchingPage.getByRole("combobox", { name:"Player", exact: true }),
  ).toContainText("Fictional Child A");
  await switchingPage
    .getByLabel("Switch academy", { exact: true })
    .selectOption(cid);
  await expect(
    switchingPage.getByRole("heading", { name: "Fictional C Two Sports" }),
  ).toBeVisible();
  await expect(
    switchingPage.getByRole("combobox", { name:"Player", exact: true }),
  ).not.toContainText("Fictional Child A");
  await expect(switchingPage.getByText("STAFF ONLY SECRET")).toHaveCount(0);
  await switchingContext.close();
  const ownerContext = await browser.newContext({
    storageState: await c.api.storageState(),
  });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(`/workspace/${cid}`);
  await ownerPage.getByLabel("Active sport").selectOption("badminton");
  await expect(
    ownerPage.getByRole("heading", { name: "Individual development plan" }),
  ).toBeVisible();
  await ownerPage.screenshot({
    path: "docs/screenshots/multi-academy/badminton-plan.png",
    fullPage: true,
  });
  await ownerPage.getByRole("button", { name: "Reports", exact: true }).click();
  await ownerPage.screenshot({
    path: "docs/screenshots/multi-academy/approved-report.png",
    fullPage: true,
  });
  await ownerPage
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await ownerPage.screenshot({
    path: "docs/screenshots/multi-academy/settings-not-connected.png",
    fullPage: true,
  });
  await ownerContext.close();
  await planReport(b.api, bid, other.id, b.userId, "cricket");
  execFileSync(process.execPath, ["scripts/platform-admin.mjs", c.email]);
  const metadata = await c.api.get("/api/platform/accounts");
  expect(metadata.status()).toBe(200);
  expect(await metadata.text()).not.toContain("Fictional Child B");
  const platformContext=await browser.newContext({storageState:await c.api.storageState()});
  const platformPage=await platformContext.newPage();
  await platformPage.goto("/platform");
  await platformPage.screenshot({path:"docs/screenshots/multi-academy/platform-metadata.png",fullPage:true});
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
          sportIds: ["cricket"],
        },
      })
    ).status(),
  ).toBe(403);
  const membership = (
    await (await a.api.get(`/api/workspaces/${aid}`)).json()
  ).members.find((m: { userId: string }) => m.userId === parent.userId);
  await action(a.api, aid, "revoke", membership.id);
  expect((await parent.api.get(`/api/workspaces/${aid}`)).status()).toBe(403);
  for (const user of [a, b, c, parent]) await user.api.dispose();
});
