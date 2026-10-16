import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { reportPresentation } from "../../src/services/reports/report-presentation";
import type { WorkspacePayload } from "../../src/domain/workspace";

const directory = "docs/screenshots/professional-reports",
  origin = "http://127.0.0.1:3004";
const hash = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
test("professional reports preserve120 approved snapshots, actual facts, private access and responsive report UI", async ({
  playwright,
  browser,
}) => {
  const access = JSON.parse(
    await readFile(".local/professional-report-access.json", "utf8"),
  ) as {
    academyId: string;
    accounts: { id: string; email: string; password: string }[];
  };
  const manifest = JSON.parse(
    await readFile(
      "docs/screenshots/final-academy/bharat/manifest.json",
      "utf8",
    ),
  ) as {
    academyId: string;
    players: {
      scenarioKey: string;
      id: string;
      name: string;
      batchId: string;
      guardianId: string;
      reports: { id: string; month: string; snapshotHash: string }[];
    }[];
  };
  expect(access.academyId).toBe(manifest.academyId);
  await mkdir(directory + "/after", { recursive: true });
  await mkdir(".local/professional-report-pdfs", { recursive: true });
  let logins = 0;
  async function login(id: string) {
    if (logins++) await new Promise((done) => setTimeout(done, 11000));
    const account = access.accounts.find((a) => a.id === id)!;
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const r = await api.post("/api/auth/sign-in/email", {
      data: { email: account.email, password: account.password },
    });
    expect(r.status(), "Fictional account login").toBe(200);
    return api;
  }
  const owner = await login(access.accounts[0].id),
    root = `/api/workspaces/${access.academyId}`;
  const data = (await (await owner.get(root)).json()) as WorkspacePayload;
  expect(data.records.player).toHaveLength(60);
  expect(data.records.report.length).toBeGreaterThanOrEqual(120);
  const first = manifest.players.find((p) => p.scenarioKey === "U8-01")!;
  const august = first.reports.find((r) => r.month === "2026-08")!;
  const aadi = data.records.report.find((r) => r.id === august.id)!;
  const aadiPresentation = reportPresentation(aadi.snapshot!);
  expect(aadiPresentation.attendance).toEqual({
    total: 5,
    present: 5,
    absent: 0,
    excused: 0,
    unmarked: 0,
  });
  expect(aadiPresentation.activityCards).toHaveLength(4);
  expect(aadiPresentation.measurementSeries).toHaveLength(1);
  expect(aadiPresentation.measurementSeries[0].comparable).toBe(true);
  expect(
    aadiPresentation.measurementSeries[0].points.map((p) => [
      p.date,
      p.value,
      p.total,
    ]),
  ).toEqual([
    ["2026-08-01", 2, 6],
    ["2026-08-08", 2, 6],
    ["2026-08-15", 3, 6],
    ["2026-08-22", 3, 6],
    ["2026-08-29", 4, 6],
  ]);
  const exports = [],
    expected: Record<string, unknown> = {};
  for (const player of manifest.players)
    for (const entry of player.reports) {
      const report = data.records.report.find((r) => r.id === entry.id)!;
      expect(report.playerId).toBe(player.id);
      expect(report.status).toBe("Approved");
      expect(hash(JSON.stringify(report.snapshot))).toBe(entry.snapshotHash);
      const presentation = reportPresentation(report.snapshot!);
      const r = await owner.get(`${root}/reports/${report.id}/pdf`);
      expect(
        r.status(),
        `Actual approved PDF ${player.scenarioKey}/${entry.month}`,
      ).toBe(200);
      expect(r.headers()["cache-control"]).toContain("private");
      const bytes = await r.body(),
        pdf = await PDFDocument.load(bytes),
        filename = `${player.scenarioKey}-${entry.month}.pdf`;
      const pages = pdf.getPages();
      for (const page of pages) {
        expect(page.getWidth()).toBeCloseTo(595.28, 0);
        expect(page.getHeight()).toBeCloseTo(841.89, 0);
      }
      if (player.scenarioKey === "U8-01" && entry.month === "2026-08")
        expect(pages).toHaveLength(1);
      await writeFile(
        resolve(".local/professional-report-pdfs", filename),
        bytes,
      );
      if (["U8-01", "U8-05"].includes(player.scenarioKey))
        await writeFile(`${directory}/after/${filename}`, bytes);
      exports.push({
        playerKey: player.scenarioKey,
        playerId: player.id,
        reportId: entry.id,
        month: entry.month,
        snapshotHash: entry.snapshotHash,
        pdfSha256: hash(bytes),
        pages: pages.length,
        file: filename,
      });
      expected[filename] = {
        player: presentation.player,
        academy: presentation.academy,
        period: presentation.periodLabel,
        focus: presentation.focus,
        attendance: presentation.attendance,
        activities: presentation.activityCards.map((a) => ({
          name: a.name,
          purpose: a.purpose,
          activity: a.activity,
        })),
        measurements: presentation.measurementSeries,
        observations: presentation.observations,
        coachEvaluation: presentation.coachEvaluation,
        nextStep: presentation.nextStep,
        nextDrill: presentation.nextDrill,
        observationCriteria: presentation.observationCriteria,
        reviewDate: presentation.reviewDateLabel,
        note: presentation.note,
      };
    }
  await writeFile(
    ".local/professional-reports-safety/expected-pdf-content.json",
    JSON.stringify(expected, null, 2),
  );
  const parent = await login(first.guardianId),
    parentData = (await (await parent.get(root)).json()) as WorkspacePayload;
  expect(parentData.records.player.map((p) => p.id)).toEqual([first.id]);
  expect(parentData.records.report).toHaveLength(2);
  for (const r of parentData.records.report) {
    expect(r.status).toBe("Approved");
    expect(r.playerId).toBe(first.id);
    const snapshot = r.snapshot!;
    expect(JSON.stringify(snapshot)).not.toContain("Conditions:");
    expect(JSON.stringify(snapshot)).not.toContain("Attendance basis:");
    expect(snapshot.evidence.every((e) => !e.reference)).toBe(true);
    expect(r.monthlySources).toBeUndefined();
  }
  const parentPresentation = reportPresentation(
    parentData.records.report.find((r) => r.id === august.id)!.snapshot!,
  );
  expect(parentPresentation.attendance).toEqual(aadiPresentation.attendance);
  expect(parentPresentation.measurementSeries).toEqual(
    aadiPresentation.measurementSeries,
  );
  expect(parentPresentation.coachEvaluation).toEqual(
    aadiPresentation.coachEvaluation,
  );
  expect((await parent.get(`${root}/reports/${august.id}/pdf`)).status()).toBe(
    200,
  );
  const other = manifest.players.find((p) => p.id !== first.id)!;
  expect(
    (await parent.get(`${root}/reports/${other.reports[0].id}/pdf`)).status(),
  ).toBe(404);
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  expect(
    (await anonymous.get(`${root}/reports/${august.id}/pdf`)).status(),
  ).toBe(401);
  const ownerContext = await browser.newContext({
      storageState: await owner.storageState(),
    }),
    page = await ownerContext.newPage();
  const parentContext = await browser.newContext({
      storageState: await parent.storageState(),
    }),
    pp = await parentContext.newPage();
  const pageErrors: string[] = [],
    external: string[] = [],
    captures: { file: string; viewportWidth: number; sha256: string }[] = [];
  for (const p of [page, pp]) {
    p.on("pageerror", (e) => pageErrors.push(e.message));
    p.on("request", (r) => {
      const u = new URL(r.url());
      if (u.protocol.startsWith("http") && u.origin !== origin)
        external.push(u.origin + u.pathname);
    });
  }
  async function capture(p: Page, name: string, width: number) {
    await p.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect
      .poll(() =>
        p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const file = `${directory}/after/${name}-${width}.png`;
    await p.screenshot({ path: file, fullPage: true });
    captures.push({
      file,
      viewportWidth: width,
      sha256: hash(await readFile(file)),
    });
  }
  const route = `/workspace/${access.academyId}?section=reports&player=${first.id}&report=${august.id}`;
  for (const width of [1536, 1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto(route);
    await page.bringToFront();
    await expect(
      page.getByRole("heading", { name: "Player Reports", exact: true }),
    ).toBeVisible();
    const article = page.getByRole("article", {
      name: "Player development report",
      exact: true,
    });
    await expect(
      article.getByRole("heading", { name: first.name, exact: true }),
    ).toBeVisible();
    await expect(article).toContainText("August 2026");
    await expect(article).toContainText("Dribbling");
    await expect(article).not.toContainText("Conditions:");
    await expect(article).not.toContainText("Attendance basis:");
    await expect(article).not.toContainText("Present ÷");
    await expect(article.locator(".pr-activity img")).toHaveCount(4);
    await expect
      .poll(() =>
        article
          .locator(".pr-activity img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await expect(
      article.getByText("Generic activity illustrations", { exact: false }),
    ).toBeVisible();
    await capture(page, "reports", width);
  }
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto(route);
  const rosterNames: string[] = [];
  for (let pageNumber = 1; pageNumber <= 6; pageNumber++) {
    await expect(page.locator(".reports-player-pagination")).toContainText(
      `Page ${pageNumber} of 6`,
    );
    await expect(page.locator(".reports-player-row")).toHaveCount(10);
    rosterNames.push(
      ...(await page.locator(".reports-player-row strong").allTextContents()),
    );
    if (pageNumber < 6)
      await page
        .getByRole("button", { name: "Next report page", exact: true })
        .click();
  }
  expect(new Set(rosterNames).size).toBe(60);
  expect([...rosterNames].sort()).toEqual(
    manifest.players.map((p) => p.name).sort(),
  );
  await page
    .getByLabel("Search report players", { exact: true })
    .fill(other.name);
  await expect(page.locator(".reports-player-row")).toHaveCount(1);
  await page.locator(".reports-player-row").click();
  await expect(
    page
      .getByRole("article", { name: "Player development report" })
      .getByRole("heading", { name: other.name, exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("report")).toBe(
    other.reports.find((r) => r.month === "2026-08")!.id,
  );
  await page.goto(route);
  await page
    .getByLabel("Reporting period filter", { exact: true })
    .fill("2026-09");
  await expect(
    page.getByRole("article", { name: "Player development report" }),
  ).toContainText("September 2026");
  await expect(
    page
      .getByRole("article", { name: "Player development report" })
      .getByRole("heading", { name: first.name, exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Reporting period filter", { exact: true })
    .fill("2026-10");
  await expect(
    page
      .getByRole("article", { name: "Player development report" })
      .locator(".pr-status"),
  ).toHaveText("Draft");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page
    .locator(".reports-history > div")
    .filter({ has: page.getByText("August 2026", { exact: true }) })
    .getByRole("button", { name: "Open report", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Player development report" }),
  ).toContainText("August 2026");
  expect(new URL(page.url()).searchParams.get("report")).toBe(august.id);
  const reportTab = page.getByRole("tab", { name: "Report", exact: true });
  await reportTab.focus();
  await reportTab.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Evidence", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Evidence", exact: true }).press("Home");
  await expect(reportTab).toHaveAttribute("aria-selected", "true");
  for (const tab of await page.getByRole("tab").all()) {
    const panelId = await tab.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    await expect(page.locator(`#${panelId}`)).toHaveCount(1);
  }
  await page.goto(
    `/workspace/${access.academyId}?section=reports&player=${first.id}&report=${other.reports[0].id}`,
  );
  await expect(
    page.getByRole("article", { name: "Player development report" }),
  ).toHaveCount(0);
  await page.goto(route);
  await page.getByRole("tab", { name: "Evidence", exact: true }).click();
  await expect(
    page.getByText("Evidence details", { exact: false }).first(),
  ).toBeVisible();
  await capture(page, "staff-evidence", 1536);
  for (const width of [390, 320]) {
    await pp.setViewportSize({ width, height: 1024 });
    await pp.goto(route);
    await pp.bringToFront();
    await expect(
      pp.getByRole("article", {
        name: "Player development report",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      pp.getByRole("tab", { name: "Evidence", exact: true }),
    ).toHaveCount(0);
    await capture(pp, "parent-report", width);
  }
  // Exporting does not mutate the approval snapshot, status, revision or delivery state.
  const finalData = (await (await owner.get(root)).json()) as WorkspacePayload;
  expect(finalData.records.report).toEqual(data.records.report);
  expect(pageErrors).toEqual([]);
  expect(external).toEqual([]);
  await writeFile(
    `${directory}/verification.json`,
    JSON.stringify(
      {
        status: "PASS",
        build: ".next-professional-reports-qa",
        reports: 120,
        players: 60,
        exports,
        captures,
        pageErrors,
        externalRequests: external,
        immutableSnapshotsPreserved: true,
        liveMessagesSent: false,
      },
      null,
      2,
    ),
  );
  await ownerContext.close();
  await parentContext.close();
  await owner.dispose();
  await parent.dispose();
  await anonymous.dispose();
});
