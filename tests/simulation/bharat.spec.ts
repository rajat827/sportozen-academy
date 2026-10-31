import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import type { WorkspacePayload } from "../../src/domain/workspace";
type Entry = {
  scenarioKey: string;
  id: string;
  name: string;
  batchId: string;
  coachId: string;
  guardianId: string;
  reports: {
    id: string;
    month: string;
    sourceSessionIds: string[];
    evidenceIds: string[];
    snapshotHash: string;
  }[];
};
test("Bharat two-month sources,120 authorised PDFs and seven approved portal surfaces", async ({
  playwright,
  browser,
}) => {
  const directory = "docs/screenshots/final-academy/bharat",
    origin = "http://127.0.0.1:3001";
  const access = JSON.parse(
    await readFile(".local/bharat-qa-access.json", "utf8"),
  ) as {
    academyId: string;
    accounts: { name: string; email: string; password: string; id: string }[];
  };
  const manifest = JSON.parse(
    await readFile(`${directory}/manifest.json`, "utf8"),
  ) as {
    academyId: string;
    players: Entry[];
    batches: { id: string; playerIds: string[]; coachId: string }[];
    totals: {
      sessions: number;
      attendance: number;
      evidence: number;
      reports: number;
    };
  };
  expect(manifest.academyId).toBe(access.academyId);
  expect(manifest.players).toHaveLength(60);
  expect(new Set(manifest.players.map((p) => p.id)).size).toBe(60);
  expect(manifest.batches).toHaveLength(6);
  for (const b of manifest.batches) expect(b.playerIds).toHaveLength(10);
  let logins = 0;
  async function login(id: string) {
    if (logins++) await new Promise((r) => setTimeout(r, 11000));
    const account = access.accounts.find((a) => a.id === id)!;
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const response = await api.post("/api/auth/sign-in/email", {
      data: { email: account.email, password: account.password },
    });
    expect(response.status(), await response.text()).toBe(200);
    return api;
  }
  const owner = await login(access.accounts[0].id),
    root = `/api/workspaces/${access.academyId}`;
  async function payload(api: APIRequestContext) {
    const response = await api.get(root);
    expect(response.status(), await response.text()).toBe(200);
    return response.json() as Promise<WorkspacePayload>;
  }
  const data = await payload(owner);
  expect(data.records.player).toHaveLength(60);
  expect(data.records.report).toHaveLength(120);
  expect(
    data.records.session.filter((s) => s.status === "COMPLETED"),
  ).toHaveLength(54);
  expect(
    data.records.attendance.filter(
      (a) =>
        data.records.session.find((s) => s.id === a.sessionId)?.status ===
        "COMPLETED",
    ),
  ).toHaveLength(540);
  expect(data.records.plan).toHaveLength(6);
  const pdfChecks = [];
  const expectedPdfContent: Record<
    string,
    {
      parts: string[];
      firstShortEvidence?: { heading: string; text: string; source: string };
    }
  > = {};
  const pdfDir = resolve(".local/bharat-pdf-verification");
  await mkdir(pdfDir, { recursive: true });
  const qaPython = process.env.SPORTOZEN_QA_PYTHON ?? "python";
  for (const p of manifest.players) {
    const saved = data.records.player.find((v) => v.id === p.id)!;
    expect(saved.squadId).toBe(p.batchId);
    expect(saved.coachId).toBe(p.coachId);
    for (const expected of p.reports) {
      const r = data.records.report.find((v) => v.id === expected.id)!;
      expect(r.playerId).toBe(p.id);
      expect(r.status).toBe("Approved");
      expect(r.reportingPeriod?.key).toBe(expected.month);
      expect(r.monthlySources?.sessionIds).toEqual(expected.sourceSessionIds);
      expect(r.monthlySources?.evidenceIds).toEqual(expected.evidenceIds);
      expect(
        createHash("sha256").update(JSON.stringify(r.snapshot)).digest("hex"),
      ).toBe(expected.snapshotHash);
      for (const sid of expected.sourceSessionIds) {
        const s = data.records.session.find((s) => s.id === sid)!;
        expect(s.startLocal.startsWith(expected.month)).toBe(true);
        expect(s.roster.some((v) => v.playerId === p.id)).toBe(true);
      }
      for (const eid of expected.evidenceIds) {
        const e = data.records.evidence.find((e) => e.id === eid)!;
        expect(e.playerId).toBe(p.id);
        expect(e.status).toBe("REVIEWED");
        expect(e.recordedAt.startsWith(expected.month)).toBe(true);
        expect(
          data.records.attendance.some(
            (a) =>
              a.playerId === p.id &&
              a.sessionId === e.sessionId &&
              a.status === "PRESENT",
          ),
        ).toBe(true);
      }
      const response = await owner.get(`${root}/reports/${r.id}/pdf`);
      expect(response.status(), `Authorised PDF ${r.id}`).toBe(200);
      const bytes = await response.body(),
        pdf = await PDFDocument.load(bytes),
        path = resolve(pdfDir, `${p.scenarioKey}-${expected.month}.pdf`);
      await writeFile(path, bytes);
      // Compare the rendered body with the immutable approved snapshot, including
      // every long closing-note paragraph, in the independent geometry pass.
      const snapshot = r.snapshot!;
      const parts = [
        snapshot.player,
        snapshot.focus,
        snapshot.reviewedReason ?? "",
        snapshot.practised,
        ...snapshot.activities.flatMap((a) => [
          a.name,
          a.purpose,
          a.activity ?? "",
        ]),
        ...snapshot.evidence.map((e) => e.text),
        snapshot.nextStep,
        snapshot.nextDrill ?? "",
        snapshot.observationCriteria ?? "",
        snapshot.note,
      ].filter(Boolean);
      expectedPdfContent[`${p.scenarioKey}-${expected.month}.pdf`] = {
        parts,
        ...(snapshot.evidence[0] && snapshot.evidence[0].text.length <= 900
          ? {
              firstShortEvidence: {
                heading: (
                  snapshot.labels?.observed ?? "What the coach observed"
                ).toLocaleUpperCase(),
                text: snapshot.evidence[0].text,
                source: snapshot.evidence[0].source,
              },
            }
          : {}),
      };
      const text = execFileSync(
        qaPython,
        [
          "-c",
          "import pdfplumber,sys; pdf=pdfplumber.open(sys.argv[1]); print('\\n'.join(page.extract_text() or '' for page in pdf.pages)); pdf.close()",
          path,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        },
      );
      expect(text).toContain(p.name);
      expect(text).toContain("Bharat Football Academy");
      expect(text).toContain(expected.month);
      expect(text).not.toContain("PRIVATE_BHARAT");
      for (const other of manifest.players.filter((o) => o.id !== p.id))
        expect(text).not.toContain(other.name);
      const pages = pdf.getPages();
      for (const page of pages) {
        expect(page.getWidth()).toBeCloseTo(595.28, 0);
        expect(page.getHeight()).toBeCloseTo(841.89, 0);
      }
      pdfChecks.push({
        playerId: p.id,
        scenarioKey: p.scenarioKey,
        reportId: r.id,
        month: expected.month,
        status: response.status(),
        pages: pages.length,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        contentPrivacy: "PASS",
      });
      if (p.scenarioKey === "U8-01" || p.scenarioKey === "U8-05")
        await writeFile(
          `${directory}/${p.scenarioKey}-${expected.month}.pdf`,
          bytes,
        );
    }
  }
  expect(pdfChecks).toHaveLength(120);
  await writeFile(
    resolve(pdfDir, "expected-content.json"),
    JSON.stringify(expectedPdfContent, null, 2),
  );
  expect(pdfChecks.filter((p) => p.month === "2026-09")).toHaveLength(60);
  const first = manifest.players[0],
    parent = await login(first.guardianId),
    coach = await login(first.coachId),
    anon = await playwright.request.newContext({ baseURL: origin });
  const pd = await payload(parent);
  expect(pd.records.player.map((p) => p.id)).toEqual([first.id]);
  expect(pd.records.report).toHaveLength(2);
  expect(pd.records.evidence).toEqual([]);
  expect(JSON.stringify(pd)).not.toContain("PRIVATE_BHARAT");
  for (const r of first.reports)
    expect((await parent.get(`${root}/reports/${r.id}/pdf`)).status()).toBe(
      200,
    );
  const other = manifest.players.find((p) => p.coachId !== first.coachId)!;
  for (const api of [parent, coach]) {
    const denied = await api.get(`${root}/reports/${other.reports[1].id}/pdf`);
    expect(denied.status()).toBe(404);
    expect(await denied.json()).toEqual({
      error: "Record not available in this academy and role.",
    });
  }
  expect(
    (await anon.get(`${root}/reports/${first.reports[1].id}/pdf`)).status(),
  ).toBe(401);
  await writeFile(
    `${directory}/pdf-verification.json`,
    JSON.stringify(
      {
        status: "PASS",
        pdfChecks,
        rolePrivacy: {
          ownerAll120: true,
          coachOtherBatchDenied: true,
          parentOwnOnly: true,
          anonymousDenied: true,
        },
      },
      null,
      2,
    ),
  );
  const context = await browser.newContext({
      storageState: await owner.storageState(),
    }),
    page = await context.newPage();
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith("http") && u.origin !== origin)
      external.push(u.origin);
  });
  await page.goto(
    `/workspace/${access.academyId}?section=reports&player=${first.id}&report=${first.reports[1].id}`,
  );
  await expect(
    page.getByRole("heading", { name: "Reports", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Reporting period filter", { exact: true })
    .fill("2026-09");
  await expect(page.locator(".portal-table-footer")).toContainText(
    "60 matching reports",
  );
  await page
    .getByRole("button", { name: "Open full report preview", exact: true })
    .click();
  const fullPreview = page.getByRole("dialog", {
    name: "Private Report Preview",
    exact: true,
  });
  await expect(fullPreview).toContainText("Review note 30:");
  await fullPreview
    .getByRole("button", { name: "Close report preview", exact: true })
    .click();
  const last = manifest.players.at(-1)!;
  const seen = new Set<string>();
  let lastPlayerPage = 1;
  for (let reportPage = 1; reportPage <= 8; reportPage++) {
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(reportPage === 8 ? 4 : 8);
    await expect(page.locator(".portal-table-footer")).toContainText(
      `Page ${reportPage} of 8`,
    );
    for (const row of await rows.all()) {
      const name = (
        await row.locator(".portal-player-name strong").innerText()
      ).trim();
      expect(manifest.players.some((player) => player.name === name)).toBe(
        true,
      );
      expect(
        seen.has(name),
        `Duplicate player across report pages: ${name}`,
      ).toBe(false);
      seen.add(name);
      if (name === last.name) lastPlayerPage = reportPage;
      await expect(row).toContainText("2026-09");
      await expect(row).toContainText("Approved");
      await expect(
        row.getByRole("button", { name: "View", exact: true }),
      ).toHaveCount(1);
    }
    const next = page.getByRole("button", {
      name: "Next report page",
      exact: true,
    });
    if (reportPage < 8) await next.click();
    else await expect(next).toBeDisabled();
  }
  expect([...seen].sort()).toEqual(
    manifest.players.map((player) => player.name).sort(),
  );
  for (let currentPage = 8; currentPage > lastPlayerPage; currentPage--)
    await page
      .getByRole("button", { name: "Previous report page", exact: true })
      .click();
  await page
    .locator("tbody tr")
    .filter({
      has: page.getByRole("button", { name: last.name, exact: true }),
    })
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`report=${last.reports[1].id}`));
  await expect(page.locator(".portal-reports-layout aside")).toContainText(
    last.name,
  );
  const captures = [];
  const upcoming = data.records.session.find(
    (session) =>
      session.status === "SCHEDULED" && session.squadId === first.batchId,
  );
  expect(upcoming).toBeDefined();
  for (const width of [1536, 1440, 768, 390, 320])
    for (const section of [
      "home",
      "players",
      "calendar",
      "training",
      "reports",
      "fees",
      "settings",
    ]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 });
      await page.goto(
        `/workspace/${access.academyId}?section=${section}&player=${first.id}${section === "reports" ? `&report=${first.reports[1].id}` : ["calendar", "training"].includes(section) ? `&session=${upcoming!.id}` : ""}`,
      );
      await expect(page.locator(".academy-portal")).toBeVisible();
      if (section === "reports")
        await page
          .getByLabel("Reporting period filter", { exact: true })
          .fill("2026-09");
      if (width < 768 && section === "calendar") {
        // The selected session intentionally opens its native modal on mobile;
        // navigation behind that modal is correctly hidden from assistive tech.
        const selectedDetails = page.getByRole("dialog", {
          name: "Session details",
          exact: true,
        });
        await expect(selectedDetails).toBeVisible();
        await expect(selectedDetails).toContainText(upcoming!.theme);
        await expect(
          selectedDetails.getByRole("button", {
            name: "Close session details",
            exact: true,
          }),
        ).toBeVisible();
      } else if (width < 768) {
        await page
          .getByRole("button", { name: "Open academy navigation", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Academy navigation", exact: true }),
        ).toContainText("Bharat Football Academy");
        await page
          .getByRole("button", { name: "Close navigation", exact: true })
          .click();
      } else {
        await expect(page.locator(".portal-sidebar")).toContainText(
          "Bharat Football Academy",
        );
        await expect(page.locator(".portal-sidebar")).toBeVisible();
      }
      await expect(page.locator("main")).not.toContainText(
        "Loading your academy",
      );
      await page.evaluate(() => document.fonts.ready);
      if (section === "players" && width <= 390) {
        const header = page.locator(
          ".portal-player-detail > .portal-detail-title",
        );
        await expect(
          header.getByRole("heading", { name: first.name, exact: true }),
        ).toBeVisible();
        const disjoint = await header.evaluate((element) => {
          const title = element.querySelector("h2")!.getBoundingClientRect();
          const close = element
            .querySelector(".portal-icon")!
            .getBoundingClientRect();
          return (
            title.right <= close.left ||
            title.left >= close.right ||
            title.bottom <= close.top ||
            title.top >= close.bottom
          );
        });
        expect(
          disjoint,
          `Selected player name and close control at ${width}`,
        ).toBe(true);
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${section} at${width}`).toBe(false);
      const file = `${section}-${width}.png`;
      await page.screenshot({ path: `${directory}/${file}`, fullPage: true });
      captures.push({ section, width, file, documentOverflow: overflow });
    }
  const pc = await browser.newContext({
      storageState: await parent.storageState(),
    }),
    pp = await pc.newPage();
  for (const width of [390, 320]) {
    await pp.setViewportSize({ width, height: 844 });
    await pp.goto(
      `/workspace/${access.academyId}?section=reports&player=${first.id}&report=${first.reports[1].id}`,
    );
    await expect(
      pp.getByRole("heading", { name: "Progress & Reports" }),
    ).toBeVisible();
    await expect(pp.locator("body")).not.toContainText(other.name);
    await pp.screenshot({
      path: `${directory}/parent-reports-${width}.png`,
      fullPage: true,
    });
    await pp.goto(
      `/workspace/${access.academyId}?section=home&player=${first.id}`,
    );
    await expect(pp.locator("main")).toContainText(
      `Here’s ${first.name.split(" ")[0]}’s latest update.`,
    );
    await expect(pp).toHaveURL(new RegExp(`player=${first.id}`));
    await expect(pp.locator("main")).not.toContainText(other.name);
    expect(
      await pp.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      ),
    ).toBe(false);
    await pp.screenshot({
      path: `${directory}/parent-home-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await writeFile(
    `${directory}/verification.json`,
    JSON.stringify(
      {
        status: "PASS",
        pdfChecks,
        captures,
        rolePrivacy: {
          ownerAll120: true,
          coachOtherBatchDenied: true,
          parentOwnOnly: true,
          anonymousDenied: true,
        },
        septemberReportUI: {
          authorisedRows: 60,
          approvedRows: 60,
          pagesTraversed: 8,
          rowsPerPage: 8,
          longClosingNoteAvailableInFullPreview: true,
          finalPlayerViewOpened: true,
        },
        consoleErrors: errors,
        externalRequests: external,
      },
      null,
      2,
    ),
  );
  await context.close();
  await pc.close();
  for (const api of [owner, parent, coach, anon]) await api.dispose();
});
