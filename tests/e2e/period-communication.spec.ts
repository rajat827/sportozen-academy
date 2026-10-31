import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type { WorkspacePayload } from "../../src/domain/workspace";
import { PDFDocument } from "pdf-lib";
test.use({ actionTimeout: 20000 });
test("weekly plans and monthly reports extend authorised workspaces across three regions", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(480000);
  const origin = "http://127.0.0.1:3001",
    suffix = crypto.randomUUID(),
    shots = evidencePath("docs/screenshots/weekly-monthly/portal");
  mkdirSync(shots, { recursive: true });
  async function account(name: string) {
    const api = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      }),
      email = `${name}-${suffix}@example.test`,
      password = `Synthetic-${crypto.randomUUID()}`;
    const r = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password },
    });
    expect(r.ok(), await r.text()).toBe(true);
    return { api, email, password, id: (await r.json()).user.id as string };
  }
  const owner = await account("PeriodOwner");
  await new Promise((r) => setTimeout(r, 11000));
  const parent = await account("PeriodParent");
  const staffContext = await browser.newContext(),
    parentContext = await browser.newContext();
  await staffContext.addCookies((await owner.api.storageState()).cookies);
  await parentContext.addCookies((await parent.api.storageState()).cookies);
  const staffPage = await staffContext.newPage(),
    parentPage = await parentContext.newPage();
  const consoleErrors: string[] = [];
  staffPage.on("pageerror", (e) => consoleErrors.push(e.message));
  parentPage.on("pageerror", (e) => consoleErrors.push(e.message));
  let firstRoot = "",
    firstPlayer = "";
  for (const [country, timezone, currency, locale] of [
    ["IN", "Asia/Kolkata", "INR", "en-IN"],
    ["GB", "Europe/London", "GBP", "en-GB"],
    ["AU", "Australia/Sydney", "AUD", "en-AU"],
  ]) {
    const a = await owner.api.post("/api/workspaces", {
      data: {
        name: `Synthetic ${country} Monthly Academy`,
        contactEmail: "fictional@example.test",
        country,
        timezone,
        currency,
        dateLocale: locale,
        language: "English",
        measurementSystem: "METRIC",
        brandAccent: "#008463",
        demo: true,
      },
    });
    expect(a.status()).toBe(201);
    const aid = (await a.json()).id,
      root = `/api/workspaces/${aid}`;
    async function payload(api = owner.api) {
      const r = await api.get(root);
      expect(r.ok(), await r.text()).toBe(true);
      return (await r.json()) as WorkspacePayload;
    }
    async function save(kind: string, data: unknown) {
      const r = await owner.api.post(`${root}/records/${kind}`, { data });
      expect(r.ok(), await r.text()).toBe(true);
      return r.json();
    }
    async function train(
      action: string,
      data: unknown,
      id?: string,
      expectedVersion = 0,
    ) {
      const r = await owner.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action,
          data,
          id,
          expectedVersion,
        },
      });
      expect(r.ok(), await r.text()).toBe(true);
      return r.json();
    }
    const player = await save("player", {
        name: `Synthetic ${country} Child A`,
        sportIds: ["football"],
        squad: "U13",
        coachId: owner.id,
      }),
      second = await save("player", {
        name: `Synthetic ${country} Child B`,
        sportIds: ["football"],
        squad: "U13",
        coachId: owner.id,
      });
    if (!firstRoot) {
      firstRoot = root;
      firstPlayer = player.id;
    }
    const branch = await save("branch", { name: "Recorded branch", timezone });
    const drill = await save("drill", {
      sportId: "football",
      name: "Recorded touch activity",
      focusArea: "Receiving",
      purpose: "Practise controlled first touch",
      cue: "Look at the ball",
    });
    const plan = await save("plan", {
      playerId: player.id,
      sportId: "football",
      coachId: owner.id,
      focus: "Receiving",
      reason: "Recorded focus",
      drillIds: [drill.id],
      observe: "Controlled first touch",
      homePractice: "Optional gentle touches in a safe space",
      reviewDate: "2027-01-10",
      nextStep: "Repeat the recorded activity",
      status: "ACTIVE",
      privateNote: "PRIVATE_MONTHLY_NOTE",
    });
    await save("plan", {
      ...plan,
      playerId: second.id,
      focus: "Passing",
      privateNote: "PRIVATE_OTHER_CHILD",
    });
    const squad = await train("squad", {
      name: "Recorded squad",
      branchId: branch.id,
      playerIds: [player.id, second.id],
    });
    let session = await train("session", {
      branchId: branch.id,
      squadId: squad.id,
      location: "Recorded pitch",
      coachIds: [owner.id],
      timezone,
      startLocal: "2027-01-05T17:00",
      endLocal: "2027-01-05T18:00",
      theme: "Passing",
      agenda: [{ drillId: drill.id, duration: 20 }],
    });
    session = await train(
      "objective",
      {
        playerId: player.id,
        planId: plan.id,
        goal: "Receiving control",
        drillId: drill.id,
        cue: "Watch",
        observe: "First touch direction",
      },
      session.id,
      session.version,
    );
    session = await train(
      "status",
      { status: "SCHEDULED" },
      session.id,
      session.version,
    );
    const invitation = await owner.api.post(`${root}/actions`, {
      data: {
        action: "invite",
        data: {
          email: parent.email,
          role: "PARENT",
          playerIds: [player.id],
          guardianVerified: true,
        },
      },
    });
    expect(invitation.ok(), await invitation.text()).toBe(true);
    const accepted = await parent.api.post("/api/invitations/accept", {
      data: { token: (await invitation.json()).token },
    });
    expect(accepted.ok(), await accepted.text()).toBe(true);
    await staffPage.setViewportSize({ width: 1440, height: 900 });
    await staffPage.goto(
      `/workspace/${aid}?section=training&view=weekly&player=${player.id}`,
    );
    await staffPage.bringToFront();
    await staffPage.screenshot({
      path: `${shots}/staff-training-${country}.png`,
      fullPage: true,
    });
    const prepare = staffPage.locator("section.card").filter({
      has: staffPage.getByRole("heading", {
        name: "Prepare weekly plan",
        exact: true,
      }),
    });
    await prepare.getByLabel("Squad").selectOption(squad.id);
    await prepare.getByLabel("Week starting Monday").fill("2027-01-04");
    await prepare
      .getByRole("button", { name: "Prepare player previews" })
      .click();
    await expect
      .poll(async () => (await payload()).records.weekly.length)
      .toBe(2);
    const weekly = (await payload()).records.weekly.find(
      (r) => r.playerId === player.id,
    )!;
    expect(weekly.content.personalFocus).toBe("Receiving control");
    expect((await payload()).records.report).toHaveLength(0);
    const review = staffPage.locator("section.card").filter({
      has: staffPage.getByRole("heading", {
        name: `Synthetic ${country} Child A · 2027-01-04`,
        exact: true,
      }),
    });
    await review
      .getByLabel(
        "I reviewed this player’s sources, wording and authorised recipients",
      )
      .check();
    await review
      .getByRole("button", { name: "Approve weekly plan", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await payload()).records.weekly.find((r) => r.id === weekly.id)
            ?.status,
      )
      .toBe("APPROVED");
    await review
      .getByRole("button", { name: "Publish in parent app", exact: true })
      .click();
    await expect
      .poll(async () => (await payload(parent.api)).records.weekly.length)
      .toBe(1);
    await parentPage.goto(
      `/workspace/${aid}?player=${player.id}&weekly=${weekly.id}`,
    );
    await parentPage.bringToFront();
    await expect(
      parentPage.getByRole("heading", {
        name: `Synthetic ${country} Child A · 2027-01-04`,
        exact: true,
      }),
    ).toBeVisible();
    expect(await parentPage.locator("body").innerText()).not.toContain(
      "PRIVATE_MONTHLY_NOTE",
    );
    expect(await parentPage.locator("body").innerText()).not.toContain(
      `Synthetic ${country} Child B`,
    );
    // The monthly draft intentionally has no completed sessions/evidence; no praise is manufactured.
    await staffPage.bringToFront();
    await staffPage
      .getByRole("button", { name: "Reports", exact: true })
      .click();
    await staffPage
      .getByRole("button", { name: "Create Report", exact: true })
      .click();
    // Create Report opens the full-page monthly review workspace.
    const monthlyWorkflow = staffPage.getByRole("region", {
      name: "Prepare & Review Monthly Report",
      exact: true,
    });
    await expect(monthlyWorkflow).toBeVisible();
    await monthlyWorkflow
      .getByLabel("Reporting period filter", { exact: true })
      .fill("2026-09");
    await expect(
      monthlyWorkflow.getByLabel("Reporting period filter", { exact: true }),
    ).toHaveValue("2026-09");
    await monthlyWorkflow
      .getByRole("button", { name: "Prepare monthly draft", exact: true })
      .click();
    await expect
      .poll(async () => (await payload()).records.report.length)
      .toBe(1);
    const report = (await payload()).records.report[0];
    expect(report.reportingPeriod?.key).toBe("2026-09");
    expect(report.reportingPeriod?.timezone).toBe(timezone);
    expect(report.monthlySources?.model.evidence[0].text).toContain(
      "No marked attendance basis",
    );
    const commentary =
      "No completed September session records are available for this synthetic player.";
    await monthlyWorkflow
      .getByLabel("Coach commentary", { exact: true })
      .fill(commentary);
    await expect(
      monthlyWorkflow.getByLabel("Next development priorities", {
        exact: true,
      }),
    ).toHaveValue("Repeat the recorded activity");
    await monthlyWorkflow
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await expect
      .poll(async () => (await payload()).records.report[0].observation)
      .toBe(commentary);
    await expect(
      monthlyWorkflow.getByRole("button", { name: "Save draft", exact: true }),
    ).toBeEnabled();
    await monthlyWorkflow
      .getByLabel(
        "I reviewed the player, period, attendance, recorded sessions, sources and coaching feedback.",
        { exact: true },
      )
      .check();
    await monthlyWorkflow
      .getByRole("button", { name: "Approve report", exact: true })
      .click();
    await expect
      .poll(async () => (await payload()).records.report[0].status)
      .toBe("Approved");
    const approved = (await payload()).records.report[0];
    writeFileSync(
      `${shots}/approved-${country}.json`,
      JSON.stringify(approved.snapshot, null, 2),
    );
    const pdf = await parent.api.get(`${root}/reports/${report.id}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["cache-control"]).toContain("private");
    const bytes = await pdf.body();
    writeFileSync(`${shots}/monthly-${country}.pdf`, bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    expect(
      (await parent.api.get(`${firstRoot}/reports/${report.id}/pdf`)).status(),
    ).toBe(country === "IN" ? 200 : 404);
    await monthlyWorkflow
      .getByRole("button", { name: "Back to Reports", exact: true })
      .click();
    await expect(monthlyWorkflow).toBeHidden();
    await parentPage.goto(
      `/workspace/${aid}?player=${player.id}&report=${report.id}`,
    );
    await parentPage.bringToFront();
    await expect(
      parentPage.getByText(
        "No completed September session records are available for this synthetic player.",
        { exact: true },
      ),
    ).toBeVisible();
    for (const width of [1440, 390, 320]) {
      await staffPage.setViewportSize({ width, height: 900 });
      await parentPage.setViewportSize({ width, height: 900 });
      await staffPage.bringToFront();
      await staffPage.screenshot({
        path: `${shots}/staff-report-${country}-${width}.png`,
        fullPage: true,
      });
      await parentPage.bringToFront();
      await parentPage.screenshot({
        path: `${shots}/parent-report-${country}-${width}.png`,
        fullPage: true,
      });
      expect(
        await staffPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await parentPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await staffPage.setViewportSize({ width: 1440, height: 900 });
    await staffPage.bringToFront();
    await staffPage
      .getByRole("button", { name: "Messages", exact: true })
      .click();
    await staffPage
      .getByText("Delivery and approval details", { exact: true })
      .click();
    await expect(
      staffPage.getByRole("heading", {
        name: "Weekly plans and monthly notifications",
        exact: true,
      }),
    ).toBeVisible();
    await staffPage.getByRole("button", { name: "More", exact: true }).click();
    await staffPage
      .getByRole("tab", { name: "Notifications", exact: true })
      .click();
    await expect(
      staffPage.getByText("Not configured", { exact: true }),
    ).toBeVisible();
    await expect(
      staffPage.getByText("TEST MODE", { exact: true }),
    ).toBeVisible();
    const parentSetting = await parent.api.post(`${root}/communication`, {
      data: { action: "settings", data: {} },
    });
    expect(parentSetting.status()).toBe(403);
    const forbidden = await parent.api.post(`${root}/periods`, {
      data: {
        requestId: crypto.randomUUID(),
        action: "monthlyPrepare",
        data: { playerIds: [second.id], month: "2026-09" },
      },
    });
    expect(forbidden.status()).toBe(403);
    expect(
      (await parent.api.get(`${root}/records/player/${second.id}`)).status(),
    ).toBe(404);
    const state = await owner.api.get(`${root}/communication`);
    expect((await state.json()).jobs).toHaveLength(0); // Preparation/download never send or enqueue.
  }
  expect(consoleErrors).toEqual([]);
  expect(firstPlayer).toBeTruthy();
  await staffContext.close();
  await parentContext.close();
  await owner.api.dispose();
  await parent.api.dispose();
});
