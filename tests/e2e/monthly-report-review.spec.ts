import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import type {
  WorkspacePayload,
  WorkspacePlayer,
} from "../../src/domain/workspace";
import { reportPresentation } from "../../src/services/reports/report-presentation";

const origin = "http://127.0.0.1:3013",
  directory = "docs/screenshots/report-review/after";
const reviewLabel =
  "I reviewed the player, period, attendance, recorded sessions, sources and coaching feedback.";
const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
type Access = {
  academyId: string;
  accounts: { key: string; id: string; email: string; password: string }[];
  players: WorkspacePlayer[];
  batchId: string;
  emptyBatchId: string;
  drillIds: string[];
  reportId: string;
  approvedId: string;
  approvedSnapshotHash: string;
  limitedReportId: string;
};
let access: Access,
  api: APIRequestContext,
  parentApi: APIRequestContext,
  coachApi: APIRequestContext,
  outsiderApi: APIRequestContext,
  context: BrowserContext,
  page: Page,
  root: string,
  approvedSeptemberId = "",
  correctionId = "";
const pageErrors: string[] = [],
  captures: { file: string; width: number; sha256: string; view: string }[] =
    [];
async function payload(client = api) {
  const response = await client.get(root);
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as WorkspacePayload;
}
async function record(id: string) {
  const value = (await payload()).records.report.find(
    (report) => report.id === id,
  );
  expect(value, `Saved report ${id}`).toBeTruthy();
  return value!;
}
async function period(
  action: string,
  data: unknown,
  id?: string,
  expectedVersion = 0,
  client = api,
) {
  return client.post(`${root}/periods`, {
    data: { requestId: randomUUID(), action, data, id, expectedVersion },
  });
}
async function approve(
  id: string,
  verified: boolean,
  expectedVersion: number,
  client = api,
) {
  return client.post(`${root}/actions`, {
    data: { action: "approveReport", id, verified, data: { expectedVersion } },
  });
}
async function openReview(
  playerId: string,
  month = "2026-09",
  reportId = "",
  batchId = "",
) {
  const query = new URLSearchParams({
    section: "reports",
    prepare: "monthly",
    player: playerId,
    reportMonth: month,
  });
  if (reportId) query.set("report", reportId);
  if (batchId) query.set("reportBatch", batchId);
  await page.goto(`/workspace/${access.academyId}?${query}`);
  await expect(
    page.getByRole("heading", {
      name: "Prepare & Review Monthly Report",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Report player", { exact: true })).toHaveValue(
    playerId,
  );
  await expect(
    page.getByLabel("Reporting period filter", { exact: true }),
  ).toHaveValue(month);
}
async function saveDraft(
  expected: { observation: string; nextStep: string; closingNote: string },
  id: string,
) {
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith(`${root}/periods`) &&
      response.request().postDataJSON()?.action === "monthlyEdit",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect
    .poll(async () => {
      const saved = await record(id);
      return {
        observation: saved.observation,
        nextStep: saved.nextStep,
        closingNote: saved.closingNote,
      };
    })
    .toEqual(expected);
  await expect(
    page.getByLabel("Coach commentary", { exact: true }),
  ).toHaveValue(expected.observation);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
}

test.describe.serial("authenticated monthly report review", () => {
  test.beforeAll(async ({ playwright, browser }) => {
    test.setTimeout(300000);
    access = JSON.parse(
      await readFile(".local/report-review-access.json", "utf8"),
    ) as Access;
    root = `/api/workspaces/${access.academyId}`;
    await mkdir(directory, { recursive: true });
    const clients: APIRequestContext[] = [];
    for (const [index, key] of [
      "owner",
      "parent",
      "coach",
      "outsider",
    ].entries()) {
      if (index) await new Promise((done) => setTimeout(done, 11000));
      const account = access.accounts.find((account) => account.key === key)!;
      const client = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      });
      const response = await client.post("/api/auth/sign-in/email", {
        data: { email: account.email, password: account.password },
      });
      expect(response.status(), `Fictional ${key} sign-in`).toBe(200);
      clients.push(client);
    }
    [api, parentApi, coachApi, outsiderApi] = clients;
    context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 1000 },
    });
    await context.addCookies((await api.storageState()).cookies);
    page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    expect((await payload()).records.player).toHaveLength(4);
  });
  test.afterAll(async () => {
    await context?.close();
    for (const client of [api, parentApi, coachApi, outsiderApi])
      await client?.dispose();
  });

  test("01 reopens the saved monthly draft and preserves normal report management", async () => {
    const before = await payload(),
      saved = await record(access.reportId);
    await page.goto(
      `/workspace/${access.academyId}?section=reports&player=${access.players[0].id}&reportMonth=2026-09`,
    );
    await expect(
      page.getByRole("heading", { name: "Player Reports", exact: true }),
    ).toBeVisible();
    await openReview(access.players[0].id, "2026-09", access.reportId);
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveValue(saved.observation);
    await expect(
      page.getByRole("button", { name: "Prepare monthly draft", exact: true }),
    ).toHaveCount(0);
    const reused = await period("monthlyPrepare", {
      playerIds: [access.players[0].id],
      month: "2026-09",
    });
    expect(reused.status()).toBe(200);
    expect((await reused.json())[0].id).toBe(access.reportId);
    expect((await payload()).records.report).toHaveLength(
      before.records.report.length,
    );
    expect((await record(access.reportId)).recordVersion).toBe(
      saved.recordVersion,
    );
    expect(
      await page
        .locator(".rr-source-details")
        .evaluate((element) => (element as HTMLDetailsElement).open),
    ).toBe(false);
    const familyText = await page
      .getByRole("article", { name: "Player development report" })
      .innerText();
    expect(familyText).not.toMatch(
      /PRIVATE_REVIEW|Conditions:|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    );
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveJSProperty("tagName", "TEXTAREA");
  });

  test("02 records an honest empty period without inventing completed training", async () => {
    await openReview(access.players[3].id);
    await page
      .getByRole("button", { name: "Prepare monthly draft", exact: true })
      .click();
    await expect(
      page.getByText(
        "No completed sessions are recorded for this period. No attendance or improvement is inferred.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Insufficient reviewed evidence to describe improvement. Keep the feedback specific to recorded facts.",
        { exact: true },
      ),
    ).toBeVisible();
    const report = (await payload()).records.report.find(
      (report) =>
        report.playerId === access.players[3].id &&
        report.reportingPeriod?.key === "2026-09",
    )!;
    expect(report.monthlySources?.sessionIds).toEqual([]);
    expect(report.monthlySources?.evidenceIds).toEqual([]);
    expect(report.status).toBe("Draft");
    expect(
      await page
        .getByRole("article", { name: "Player development report" })
        .innerText(),
    ).not.toMatch(
      /excellent progress|increased confidence|improved by|2\s*\/\s*6|3\s*\/\s*6/i,
    );
    await expect(
      page.getByRole("button", { name: "Approve report", exact: true }),
    ).toBeDisabled();
  });

  test("03 shows completed sessions and insufficient reviewed evidence separately", async () => {
    await openReview(access.players[1].id, "2026-09", access.limitedReportId);
    await expect(
      page.getByText(
        "Insufficient reviewed evidence to describe improvement. Keep the feedback specific to recorded facts.",
        { exact: true },
      ),
    ).toBeVisible();
    const report = await record(access.limitedReportId),
      facts = reportPresentation({
        ...report.monthlySources!.model,
        reportId: report.id,
        playerId: report.playerId,
        academy: "Bharat Football Academy",
        player: access.players[1].name,
        period: report.period,
        status: "Draft",
        externalDelivery: "Not sent",
        nextStep: report.nextStep,
        note: report.closingNote,
        demo: true,
      });
    expect(report.monthlySources?.sessionIds).toHaveLength(2);
    expect(report.monthlySources?.evidenceIds).toEqual([]);
    expect(facts.attendance).toMatchObject({ total: 2, present: 2 });
    expect(facts.activityCards).toHaveLength(4);
    expect(facts.measurementSeries).toEqual([]);
    await expect(page.locator(".rr-session-table tbody tr")).toHaveCount(2);
    expect(
      await page
        .getByRole("article", { name: "Player development report" })
        .innerText(),
    ).not.toContain("2 / 6");
  });

  test("04 saves feedback and reopens it after refreshing and switching players", async () => {
    await openReview(access.players[0].id, "2026-09", access.reportId);
    const fields = {
      observation:
        "Two completed September sessions were reviewed. The same six-turn activity needs continued observation.",
      nextStep:
        "Repeat six close-control turns before the next recorded review",
      closingNote:
        "Fictional test data. Practise comfortably with adult supervision.",
    };
    await page
      .getByLabel("Coach commentary", { exact: true })
      .fill(fields.observation);
    await page
      .getByLabel("Next development priorities", { exact: true })
      .fill(fields.nextStep);
    await page
      .getByLabel("Closing note", { exact: true })
      .fill(fields.closingNote);
    await expect(page.locator("#rr-approval-reason")).toHaveText(
      "Save your changes before approving.",
    );
    await saveDraft(fields, access.reportId);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Prepare & Review Monthly Report",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveValue(fields.observation);
    await page
      .getByLabel("Report player", { exact: true })
      .selectOption(access.players[1].id);
    await expect(page.getByLabel("Report player", { exact: true })).toHaveValue(
      access.players[1].id,
    );
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveValue((await record(access.limitedReportId)).observation);
    await expect(
      page.getByLabel("Reporting period filter", { exact: true }),
    ).toHaveValue("2026-09");
    await page
      .getByLabel("Report player", { exact: true })
      .selectOption(access.players[0].id);
    await expect(page.getByLabel("Closing note", { exact: true })).toHaveValue(
      fields.closingNote,
    );
    expect(new URL(page.url()).searchParams.get("reportMonth")).toBe("2026-09");
    expect((await record(access.reportId)).observation).toBe(
      fields.observation,
    );
  });

  test("05 retains feedback through a real failed request and saves it on retry", async () => {
    await openReview(access.players[1].id, "2026-09", access.limitedReportId);
    const previous = await record(access.limitedReportId),
      fields = {
        observation:
          "Two completed sessions are recorded. No reviewed performance observation is available for this player.",
        nextStep:
          "Continue the recorded batch focus and collect a coach observation",
        closingNote: "Fictional test records only.",
      };
    await page
      .getByLabel("Coach commentary", { exact: true })
      .fill(fields.observation);
    await page
      .getByLabel("Next development priorities", { exact: true })
      .fill(fields.nextStep);
    await page
      .getByLabel("Closing note", { exact: true })
      .fill(fields.closingNote);
    let failed = false;
    const pattern = `**${root}/periods`;
    await page.route(pattern, async (route) => {
      if (!failed && route.request().postDataJSON()?.action === "monthlyEdit") {
        failed = true;
        await route.abort("failed");
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page.getByText(
        "Draft was not saved. Your changes are retained; review the error and retry.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(failed).toBe(true);
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveValue(fields.observation);
    await expect(
      page.getByLabel("Next development priorities", { exact: true }),
    ).toHaveValue(fields.nextStep);
    expect((await record(access.limitedReportId)).recordVersion).toBe(
      previous.recordVersion,
    );
    await page.unroute(pattern);
    await saveDraft(fields, access.limitedReportId);
    expect((await record(access.limitedReportId)).recordVersion).toBe(
      previous.recordVersion! + 1,
    );
  });

  test("06 blocks dirty, unreviewed, unfinished-month and stale-source approval", async () => {
    await openReview(access.players[0].id, "2026-09", access.reportId);
    let saved = await record(access.reportId);
    const fields = {
      observation:
        "Two reviewed September session records support continued observation of the defined close-control activity.",
      nextStep: saved.nextStep,
      closingNote: saved.closingNote,
    };
    await page
      .getByLabel("Coach commentary", { exact: true })
      .fill(fields.observation);
    await expect(
      page.getByRole("button", { name: "Approve report", exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel(reviewLabel, { exact: true })).toBeDisabled();
    await saveDraft(fields, access.reportId);
    await expect(page.locator("#rr-approval-reason")).toHaveText(
      "Confirm that you reviewed the player, training evidence and feedback.",
    );
    saved = await record(access.reportId);
    expect(
      (await approve(saved.id, false, saved.recordVersion!)).status(),
    ).toBe(400);
    await page
      .getByLabel("Next development priorities", { exact: true })
      .fill("");
    await saveDraft({ ...fields, nextStep: "" }, access.reportId);
    await expect(page.locator("#rr-approval-reason")).toHaveText(
      "Record and save a next development focus before approving.",
    );
    saved = await record(access.reportId);
    expect((await approve(saved.id, true, saved.recordVersion!)).status()).toBe(
      400,
    );
    await page
      .getByLabel("Next development focus", { exact: true })
      .selectOption("Dribbling");
    await saveDraft({ ...fields, nextStep: "Dribbling" }, access.reportId);
    const now = new Date(),
      futureMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      )
        .toISOString()
        .slice(0, 7);
    await openReview(access.players[0].id, futureMonth);
    await page
      .getByRole("button", { name: "Prepare monthly draft", exact: true })
      .click();
    await expect(
      page.getByLabel("Next development priorities", { exact: true }),
    ).toBeVisible();
    const future = (await payload()).records.report.find(
      (report) =>
        report.playerId === access.players[0].id &&
        report.reportingPeriod?.key === futureMonth,
    )!;
    await page
      .getByLabel("Next development priorities", { exact: true })
      .fill("Repeat the defined activity after the reporting period");
    await saveDraft(
      {
        observation: "",
        nextStep: "Repeat the defined activity after the reporting period",
        closingNote: "",
      },
      future.id,
    );
    await page.getByLabel(reviewLabel, { exact: true }).check();
    await expect(page.locator("#rr-approval-reason")).toHaveText(
      "Wait until the reporting month ends before final approval.",
    );
    expect(
      (
        await approve(future.id, true, (await record(future.id)).recordVersion!)
      ).status(),
    ).toBe(409);
    await openReview(access.players[0].id, "2026-09", access.reportId);
    saved = await record(access.reportId);
    const sourceBefore = saved.monthlySources!.fingerprint;
    const plan = await api.post(`${root}/records/plan`, {
      data: {
        playerId: access.players[0].id,
        sportId: "football",
        coachId: access.accounts.find((account) => account.key === "coach")!.id,
        focus: "Dribbling",
        reason:
          "Recorded follow-up focus after reviewing the existing session records",
        drillIds: [access.drillIds[1]],
        observe: "Six defined close-control turns",
        homePractice: "Optional comfortable touches in a safe space",
        reviewDate: "2026-11-30",
        nextStep: "Repeat the defined activity before the next review",
        status: "ACTIVE",
        privateNote: "PRIVATE_REVIEW_PLAN_NOTE",
      },
    });
    expect(plan.status()).toBe(201);
    await page.reload();
    await expect
      .poll(
        async () =>
          (await payload()).monthlyReportReview?.[access.reportId]
            ?.sourcesCurrent,
      )
      .toBe(false);
    await expect(
      page.getByRole("button", { name: "Approve report", exact: true }),
    ).toBeDisabled();
    expect((await approve(saved.id, true, saved.recordVersion!)).status()).toBe(
      409,
    );
    await page.getByText("Advanced", { exact: true }).click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", {
        name: "Refresh draft source snapshot",
        exact: true,
      })
      .click();
    expect((await record(access.reportId)).monthlySources!.fingerprint).toBe(
      sourceBefore,
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", {
        name: "Refresh draft source snapshot",
        exact: true,
      })
      .click();
    await expect
      .poll(
        async () => (await record(access.reportId)).monthlySources!.fingerprint,
      )
      .not.toBe(sourceBefore);
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveValue(fields.observation);
    await expect(
      page.getByLabel(reviewLabel, { exact: true }),
    ).not.toBeChecked();
    await page.getByLabel(reviewLabel, { exact: true }).check();
    await expect(
      page.getByRole("button", { name: "Approve report", exact: true }),
    ).toBeEnabled();
    const current = await record(access.reportId);
    expect(
      (await approve(current.id, true, current.recordVersion! - 1)).status(),
    ).toBe(409);
  });

  test("07 approves only the individually reviewed saved report without sending", async () => {
    await openReview(access.players[0].id, "2026-09", access.reportId);
    await page.getByLabel(reviewLabel, { exact: true }).check();
    await page
      .getByRole("button", { name: "Approve report", exact: true })
      .click();
    await expect
      .poll(async () => (await record(access.reportId)).status)
      .toBe("Approved");
    approvedSeptemberId = access.reportId;
    const approved = await record(approvedSeptemberId);
    expect(approved.snapshot?.player).toBe(access.players[0].name);
    expect(approved.snapshot?.nextStep).toBe("Dribbling");
    expect(approved.externalDeliveryStatus).toBe("NOT_SENT");
    const presentation = reportPresentation(approved.snapshot!);
    expect(presentation.attendance).toMatchObject({ total: 2, present: 2 });
    expect(presentation.activityCards).toHaveLength(4);
    expect(
      presentation.measurementSeries[0].points.map((point) => [
        point.date,
        point.value,
        point.total,
      ]),
    ).toEqual([
      ["2026-09-05", 2, 6],
      ["2026-09-12", 3, 6],
    ]);
    const communication = await api.get(`${root}/communication`);
    expect((await communication.json()).jobs).toEqual([]);
    expect((await payload()).records.update).toEqual([]);
    expect(
      hash(JSON.stringify((await record(access.approvedId)).snapshot)),
    ).toBe(access.approvedSnapshotHash);
  });

  test("08 prepares the actual batch queue once and preserves month and review states", async () => {
    await openReview(
      access.players[0].id,
      "2026-09",
      approvedSeptemberId,
      access.batchId,
    );
    await page
      .getByRole("button", { name: "Prepare batch drafts", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await payload()).records.report.filter(
            (report) =>
              report.playerId === access.players[2].id &&
              report.reportingPeriod?.key === "2026-09",
          ).length,
      )
      .toBe(1);
    const before = (await payload()).records.report.length;
    await page
      .getByRole("button", { name: "Prepare batch drafts", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Prepare batch drafts", exact: true }),
    ).toBeEnabled();
    expect((await payload()).records.report).toHaveLength(before);
    await page.getByText(/^Batch review queue/).click();
    const queue = page.locator(".rr-queue");
    await expect(
      queue.getByLabel("Monthly report queue status"),
    ).toHaveJSProperty("tagName", "SELECT");
    expect(
      await queue
        .getByLabel("Monthly report queue status")
        .locator("option")
        .allTextContents(),
    ).toEqual([
      "All review states",
      "Draft",
      "Needs Review",
      "Ready for Approval",
      "Approved",
    ]);
    await expect(
      queue.getByRole("button", { name: /Aadi Fictional U8.*Approved/ }),
    ).toBeVisible();
    await expect(
      queue.getByRole("button", { name: /Neel Fictional U8.*Draft/ }),
    ).toBeVisible();
    await page
      .getByLabel("Report player", { exact: true })
      .selectOption(access.players[1].id);
    await expect(
      page.getByLabel("Reporting period filter", { exact: true }),
    ).toHaveValue("2026-09");
    await page.getByLabel(reviewLabel, { exact: true }).check();
    await queue
      .getByLabel("Monthly report queue status")
      .selectOption("Ready for Approval");
    await expect(queue.locator(".rr-queue-rows button")).toHaveCount(1);
    await expect(queue.locator(".rr-queue-rows button")).toContainText(
      "Vihaan Fictional U8",
    );
    await queue.getByLabel("Monthly report queue status").selectOption("");
    await page
      .getByLabel("Report player", { exact: true })
      .selectOption(access.players[2].id);
    await expect(
      page.getByLabel("Reporting period filter", { exact: true }),
    ).toHaveValue("2026-09");
    const batchReports = (await payload()).records.report.filter(
      (report) =>
        report.reportingPeriod?.key === "2026-09" &&
        access.players
          .slice(0, 3)
          .some((player) => player.id === report.playerId),
    );
    expect(batchReports).toHaveLength(3);
    expect(
      batchReports.filter((report) => report.status === "Approved"),
    ).toHaveLength(1);
  });

  test("09 creates an explicit correction while preserving approved history", async () => {
    const original = await record(approvedSeptemberId),
      originalHash = hash(JSON.stringify(original.snapshot));
    await openReview(access.players[0].id, "2026-09", approvedSeptemberId);
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Prepare reviewed monthly correction",
        exact: true,
      })
      .click();
    await expect
      .poll(
        async () =>
          (await payload()).records.report.filter(
            (report) => report.correctionOf === approvedSeptemberId,
          ).length,
      )
      .toBe(1);
    const correction = (await payload()).records.report.find(
      (report) => report.correctionOf === approvedSeptemberId,
    )!;
    correctionId = correction.id;
    expect(correction.id).not.toBe(approvedSeptemberId);
    expect(correction.status).toBe("Draft");
    await expect(
      page.getByLabel("Coach commentary", { exact: true }),
    ).toBeVisible();
    const overwrite = await period(
      "monthlyEdit",
      {
        observation: "Attempted in-place overwrite",
        nextStep: "Dribbling",
        closingNote: "",
      },
      original.id,
      original.recordVersion,
    );
    expect(overwrite.status()).toBe(409);
    expect(hash(JSON.stringify((await record(original.id)).snapshot))).toBe(
      originalHash,
    );
    await openReview(access.players[0].id, "2026-09", approvedSeptemberId);
    await page
      .getByRole("button", {
        name: "Prepare reviewed monthly correction",
        exact: true,
      })
      .click();
    expect(
      (await payload()).records.report.filter(
        (report) => report.correctionOf === approvedSeptemberId,
      ),
    ).toHaveLength(1);
    expect(
      hash(JSON.stringify((await record(access.approvedId)).snapshot)),
    ).toBe(access.approvedSnapshotHash);
  });

  test("10 enforces parent and coach scope and exports the actual approved PDF", async ({
    playwright,
    browser,
  }) => {
    const parentData = await payload(parentApi);
    expect(parentData.records.player.map((player) => player.id)).toEqual([
      access.players[0].id,
    ]);
    expect(
      parentData.records.report.every(
        (report) =>
          report.status === "Approved" &&
          report.playerId === access.players[0].id,
      ),
    ).toBe(true);
    expect(parentData.records.report).toHaveLength(2);
    expect(parentData.monthlyReportReview).toBeUndefined();
    expect(JSON.stringify(parentData)).not.toMatch(
      /PRIVATE_REVIEW|Conditions:/,
    );
    expect(
      (
        await parentApi.get(`${root}/records/player/${access.players[1].id}`)
      ).status(),
    ).toBe(404);
    expect(
      (
        await period(
          "monthlyPrepare",
          { playerIds: [access.players[0].id], month: "2026-09" },
          undefined,
          0,
          parentApi,
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await approve(
          approvedSeptemberId,
          true,
          (await record(approvedSeptemberId)).recordVersion!,
          parentApi,
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await outsiderApi.get(`${root}/records/report/${approvedSeptemberId}`)
      ).status(),
    ).toBe(404);
    expect(
      (
        await period(
          "monthlyPrepare",
          { playerIds: [access.players[0].id], month: "2026-09" },
          undefined,
          0,
          outsiderApi,
        )
      ).status(),
    ).toBe(404);
    expect(
      (await payload(coachApi)).records.report.some(
        (report) => report.id === approvedSeptemberId,
      ),
    ).toBe(true);
    const parentContext = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 900 },
    });
    await parentContext.addCookies((await parentApi.storageState()).cookies);
    const parentPage = await parentContext.newPage();
    await parentPage.goto(
      `/workspace/${access.academyId}?section=reports&player=${access.players[0].id}&report=${approvedSeptemberId}&reportMonth=2026-09&prepare=monthly`,
    );
    await expect(
      parentPage.getByRole("heading", {
        name: "Prepare & Review Monthly Report",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      parentPage.getByLabel("Coach commentary", { exact: true }),
    ).toHaveCount(0);
    await expect(
      parentPage.getByRole("article", { name: "Player development report" }),
    ).toBeVisible();
    expect(await parentPage.locator("body").innerText()).not.toContain(
      access.players[1].name,
    );
    await parentPage.screenshot({
      path: `${directory}/parent-approved-390.png`,
      fullPage: true,
    });
    await parentContext.close();
    expect(
      (await api.get(`${root}/reports/${correctionId}/pdf`)).status(),
    ).toBe(409);
    const anonymous = await playwright.request.newContext({ baseURL: origin });
    expect(
      (
        await anonymous.get(`${root}/reports/${approvedSeptemberId}/pdf`)
      ).status(),
    ).toBe(401);
    expect(
      (
        await parentApi.get(`${root}/reports/${access.limitedReportId}/pdf`)
      ).status(),
    ).toBe(404);
    await anonymous.dispose();
    if (!existsSync(".local/report-review-pdf-operation-started.json"))
      throw new Error(
        "Run the required PDF authoring marker exactly once before this actual export test.",
      );
    const original = await record(approvedSeptemberId),
      originalHash = hash(JSON.stringify(original));
    const response = await parentApi.get(
      `${root}/reports/${approvedSeptemberId}/pdf`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private");
    const bytes = await response.body(),
      pdfPath = resolve(`${directory}/approved-monthly-report.pdf`),
      pdf = await PDFDocument.load(bytes);
    await writeFile(pdfPath, bytes);
    for (const sheet of pdf.getPages()) {
      expect(sheet.getWidth()).toBeCloseTo(595.28, 0);
      expect(sheet.getHeight()).toBeCloseTo(841.89, 0);
    }
    const python =
      process.env.SPORTOZEN_QA_PYTHON ??
      "C:/Users/rajat/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
    const info = JSON.parse(
      execFileSync(
        python,
        [
          "-c",
          "import json,pdfplumber,sys; p=pdfplumber.open(sys.argv[1]); print(json.dumps({'text':' '.join(page.extract_text() or '' for page in p.pages),'images':sum(len(page.images) for page in p.pages),'pages':len(p.pages)}))",
          pdfPath,
        ],
        { encoding: "utf8" },
      ),
    ) as { text: string; images: number; pages: number };
    const compact = info.text.replace(/\s+/g, " ");
    for (const fact of [
      "Bharat Football Academy",
      access.players[0].name,
      "September 2026",
      original.observation,
      original.nextStep,
      original.closingNote,
      "Movement warm-up",
      "Close-control dribbling",
      "Passing pairs",
      "Small-sided game",
    ])
      expect(compact).toContain(fact);
    expect(info.text.replace(/\s/g, "")).toContain("2/6");
    expect(info.text.replace(/\s/g, "")).toContain("3/6");
    expect(info.images).toBeGreaterThanOrEqual(4);
    expect(compact).not.toMatch(
      /PRIVATE_REVIEW|Conditions:|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    );
    expect(hash(JSON.stringify(await record(approvedSeptemberId)))).toBe(
      originalHash,
    );
    await writeFile(
      `${directory}/pdf-verification.json`,
      JSON.stringify(
        {
          file: "approved-monthly-report.pdf",
          sha256: hash(bytes),
          pages: info.pages,
          embeddedImages: info.images,
          actualAuthenticatedParentExport: true,
          immutableApprovedRecordPreserved: true,
          savedFactsPresent: true,
          privateDetailsAbsent: true,
        },
        null,
        2,
      ),
    );
  });

  test("11 preserves desktop composition and makes mobile Edit and Preview usable", async () => {
    await openReview(access.players[0].id, "2026-09", correctionId);
    const fields = {
      observation:
        "The recorded September evidence shows two and three successful turns in the same six-attempt activity. Further comparable observations are needed.",
      nextStep:
        "Repeat the same defined close-control activity before the next review",
      closingNote:
        "Fictional QA records. Continue comfortable practice with adult supervision.",
    };
    await page
      .getByLabel("Coach commentary", { exact: true })
      .fill(fields.observation);
    await page
      .getByLabel("Next development priorities", { exact: true })
      .fill(fields.nextStep);
    await page
      .getByLabel("Closing note", { exact: true })
      .fill(fields.closingNote);
    await saveDraft(fields, correctionId);
    async function capture(width: number, view: string) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const file = `review-${view}-${width}.png`;
      const bytes = await page.screenshot({
        path: `${directory}/${file}`,
        fullPage: true,
      });
      captures.push({ file, width, sha256: hash(bytes), view });
      await page.screenshot({
        path: `${directory}/review-${view}-${width}-viewport.png`,
        fullPage: false,
      });
    }
    for (const width of [1536, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(
        page.getByLabel("Coach commentary", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#rr-preview")).toBeVisible();
      const columns = await page
        .locator(".rr-columns")
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
      expect(columns.split(" ")).toHaveLength(2);
      await capture(width, "desktop");
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole("tab", { name: "Edit", exact: true }).click();
      await expect(
        page.getByRole("tab", { name: "Edit", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByLabel("Coach commentary", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#rr-preview")).toBeHidden();
      await page.evaluate(() => window.scrollTo(0, 0));
      const saveBox = await page
        .getByRole("button", { name: "Save draft", exact: true })
        .boundingBox();
      expect(saveBox).toBeTruthy();
      expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(900);
      await capture(width, "edit");
      await page.getByRole("tab", { name: "Preview", exact: true }).click();
      await expect(
        page.getByLabel("Coach commentary", { exact: true }),
      ).toBeHidden();
      await expect(
        page.getByRole("article", { name: "Player development report" }),
      ).toBeVisible();
      await capture(width, "preview");
      await page.getByRole("tab", { name: "Edit", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Approve report", exact: true }),
      ).toBeDisabled();
    }
    expect(pageErrors).toEqual([]);
    const finalData = await payload();
    expect(
      hash(JSON.stringify((await record(access.approvedId)).snapshot)),
    ).toBe(access.approvedSnapshotHash);
    await writeFile(
      "docs/screenshots/report-review/verification.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          origin,
          academy:
            "Bharat Football Academy — isolated fictional review fixture",
          cases: 11,
          playerCount: finalData.records.player.length,
          reportCount: finalData.records.report.length,
          approvalSeparateFromPublication: true,
          originalApprovedSnapshotPreserved: true,
          customerDatabaseTouched: false,
          pageErrors,
          captures,
        },
        null,
        2,
      ),
    );
  });
});
