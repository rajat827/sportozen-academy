import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import type { WorkspacePayload } from "../../src/domain/workspace";

const directory = "docs/screenshots/final-academy/bharat";
const origin = "http://127.0.0.1:3001";
const sections = [
  "home",
  "players",
  "calendar",
  "training",
  "reports",
  "fees",
  "settings",
] as const;
type Entry = {
  id: string;
  name: string;
  batchId: string;
  guardianId: string;
  reports: { id: string; month: string }[];
};

test("Bharat read-only captures reset focus and scroll before native screenshots", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(240000);
  const access = JSON.parse(
    await readFile(".local/bharat-qa-access.json", "utf8"),
  ) as {
    databasePath: string;
    academyId: string;
    accounts: { id: string; email: string; password: string }[];
  };
  const database = resolve(access.databasePath);
  const local = relative(resolve(".local"), database);
  expect(isAbsolute(local)).toBe(false);
  expect(local.startsWith("..")).toBe(false);
  expect(local).toMatch(/^e2e-bharat-[a-zA-Z0-9-]+\.sqlite$/);
  expect(resolve(process.env.SPORTOZEN_DATABASE_PATH ?? "")).toBe(database);
  for (const name of [
    "SPORTOZEN_WHATSAPP_SEND_ENABLED",
    "SPORTOZEN_WHATSAPP_LIVE_ENABLED",
  ]) {
    expect(["true", "1"]).not.toContain(process.env[name]);
  }
  const manifestPath = `${directory}/manifest.json`;
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    academyId: string;
    fictional: boolean;
    players: Entry[];
    batches: { id: string; playerIds: string[] }[];
  };
  expect(manifest.fictional).toBe(true);
  expect(manifest.academyId).toBe(access.academyId);
  expect(manifest.players).toHaveLength(60);
  expect(manifest.batches).toHaveLength(6);
  const originalVerification = await readFile(`${directory}/verification.json`);
  expect(JSON.parse(originalVerification.toString("utf8")).status).toBe("PASS");
  let logins = 0;
  async function login(id: string) {
    if (logins++) await new Promise((done) => setTimeout(done, 11000));
    const account = access.accounts.find((candidate) => candidate.id === id);
    expect(account, "The synthetic account must exist locally").toBeDefined();
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const response = await api.post("/api/auth/sign-in/email", {
      data: { email: account!.email, password: account!.password },
    });
    // Never include an authentication response or storage state in artifacts.
    expect(response.status(), "Synthetic account sign-in must succeed").toBe(
      200,
    );
    return api;
  }
  const owner = await login(access.accounts[0].id);
  const apiRoot = `/api/workspaces/${access.academyId}`;
  const bootstrap = await owner.get(apiRoot);
  expect(bootstrap.status()).toBe(200);
  const data = (await bootstrap.json()) as WorkspacePayload;
  expect(data.records.player).toHaveLength(60);
  expect(data.records.report).toHaveLength(120);
  const first = manifest.players[0];
  const other = manifest.players.find(
    (candidate) => candidate.batchId !== first.batchId,
  )!;
  const report = first.reports.find((item) => item.month === "2026-09")!;
  const upcoming = data.records.session.find(
    (session) =>
      session.status === "SCHEDULED" && session.squadId === first.batchId,
  );
  expect(report).toBeDefined();
  expect(upcoming).toBeDefined();
  const parent = await login(first.guardianId);
  const parentBootstrap = await parent.get(apiRoot);
  expect(parentBootstrap.status()).toBe(200);
  const parentData = (await parentBootstrap.json()) as WorkspacePayload;
  expect(parentData.records.player.map((player) => player.id)).toEqual([
    first.id,
  ]);
  expect(parentData.records.report).toHaveLength(2);
  expect(parentData.records.evidence).toEqual([]);
  expect(JSON.stringify(parentData)).not.toContain("PRIVATE_BHARAT");

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const externalRequests: string[] = [];
  const blockedMutations: { method: string; path: string }[] = [];
  async function readOnly(context: BrowserContext) {
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.protocol.startsWith("http")) return route.continue();
      if (url.origin !== origin) {
        externalRequests.push(url.origin);
        return route.abort();
      }
      if (!["GET", "HEAD"].includes(request.method())) {
        blockedMutations.push({
          method: request.method(),
          path: url.pathname,
        });
        return route.abort();
      }
      return route.continue();
    });
    context.on("page", (page) => {
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
    });
  }
  async function settle(page: Page) {
    await page.bringToFront();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          fontsReady: document.fonts.status === "loaded",
          fontLoaded: document.fonts.check('13px "Portal Noto"'),
          imagesReady: Array.from(document.images).every(
            (image) =>
              !image.getClientRects().length ||
              getComputedStyle(image).visibility === "hidden" ||
              (image.complete && image.naturalWidth > 0),
          ),
        })),
      )
      .toEqual({ fontsReady: true, fontLoaded: true, imagesReady: true });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      for (const element of document.querySelectorAll<HTMLElement>("*")) {
        if (element.scrollLeft) element.scrollLeft = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    let previous = "";
    await expect
      .poll(async () => {
        const current = await page.evaluate(() =>
          JSON.stringify({
            scroll: [scrollX, scrollY],
            document: [
              document.documentElement.scrollWidth,
              document.documentElement.scrollHeight,
            ],
            main: document
              .querySelector("main")
              ?.getBoundingClientRect()
              .toJSON(),
          }),
        );
        const stable = current === previous;
        previous = current;
        return stable;
      })
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => [window.scrollX, window.scrollY]))
      .toEqual([0, 0]);
    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(".portal-sidebar");
      const sidebarVisible =
        !!sidebar && getComputedStyle(sidebar).display !== "none";
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scrollX,
        scrollY,
        fontsReady: document.fonts.status === "loaded",
        portalFontLoaded: document.fonts.check('13px "Portal Noto"'),
        unloadedImages: Array.from(document.images).filter(
          (image) =>
            image.getClientRects().length > 0 &&
            getComputedStyle(image).visibility !== "hidden" &&
            (!image.complete || image.naturalWidth === 0),
        ).length,
        documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        activeField:
          document.activeElement?.matches("input,select,textarea") ?? false,
        sidebarTop: sidebarVisible
          ? sidebar!.getBoundingClientRect().top
          : null,
      };
    });
    expect(layout.fontsReady).toBe(true);
    expect(layout.portalFontLoaded).toBe(true);
    expect(layout.unloadedImages).toBe(0);
    expect(layout.documentOverflow).toBe(false);
    expect(layout.activeField).toBe(false);
    if (layout.sidebarTop !== null)
      expect(
        Math.abs(layout.sidebarTop),
        "Sticky sidebar begins at viewport top",
      ).toBeLessThanOrEqual(1);
    return layout;
  }
  const contexts: BrowserContext[] = [];
  const captures: {
    section: string;
    role: "OWNER" | "PARENT";
    file: string;
    sha256: string;
    pngPixels: { width: number; height: number };
    layout: Awaited<ReturnType<typeof settle>>;
  }[] = [];
  const verificationPath = `${directory}/capture-verification.json`;
  await writeFile(
    verificationPath,
    JSON.stringify(
      { status: "IN_PROGRESS", purpose: "Read-only neutral-focus captures" },
      null,
      2,
    ),
  );
  try {
    const context = await browser.newContext({
      storageState: await owner.storageState(),
      deviceScaleFactor: 1,
    });
    contexts.push(context);
    await readOnly(context);
    const page = await context.newPage();
    async function capture(
      page: Page,
      section: string,
      role: "OWNER" | "PARENT",
      file: string,
    ) {
      const layout = await test.step(
        `Neutral native layout: ${role} ${file}`,
        () => settle(page),
        { timeout: 15000 },
      );
      const bytes = await page.screenshot({
        path: `${directory}/${file}`,
        fullPage: true,
      });
      expect(bytes.readUInt32BE(16)).toBe(layout.viewport.width);
      captures.push({
        section,
        role,
        file,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        pngPixels: {
          width: bytes.readUInt32BE(16),
          height: bytes.readUInt32BE(20),
        },
        layout,
      });
    }
    for (const width of [1536, 1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 });
      for (const section of sections) {
        const query = new URLSearchParams({ section, player: first.id });
        if (section === "reports") query.set("report", report.id);
        if (section === "calendar" || section === "training")
          query.set("session", upcoming!.id);
        await page.goto(`/workspace/${access.academyId}?${query}`);
        await expect(page.locator(".academy-portal")).toBeVisible();
        await expect(page.locator("main")).not.toContainText(
          "Loading your academy",
        );
        await expect(page).toHaveURL(new RegExp(`player=${first.id}`));
        if (section === "reports") {
          await page
            .getByLabel("Reporting period filter", { exact: true })
            .fill("2026-09");
          await expect(page.locator(".portal-table-footer")).toContainText(
            "1–8 of 60 players",
          );
          await expect(page.locator("tbody tr")).toHaveCount(8);
          await expect(
            page.locator(".portal-reports-layout aside"),
          ).toContainText(first.name);
        }
        if (section === "training") {
          await expect(
            page.locator(".pt-session-list .pt-selected"),
          ).toContainText(upcoming!.theme);
          await expect(page.locator(".pt-session-plan")).toContainText(
            upcoming!.sharedObjective?.goal ?? upcoming!.theme,
          );
          await expect(page.locator(".pt-drills li")).toHaveCount(4);
        }
        if (width < 768 && section === "calendar") {
          const dialog = page.getByRole("dialog", {
            name: "Session details",
            exact: true,
          });
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(upcoming!.theme);
        } else if (width < 768) {
          await page
            .getByRole("button", {
              name: "Open academy navigation",
              exact: true,
            })
            .click();
          await expect(
            page.getByRole("dialog", {
              name: "Academy navigation",
              exact: true,
            }),
          ).toContainText("Bharat Football Academy");
          await page
            .getByRole("button", { name: "Close navigation", exact: true })
            .click();
        } else {
          await expect(page.locator(".portal-sidebar")).toContainText(
            "Bharat Football Academy",
          );
        }
        if (section === "players" && width < 768) {
          const header = page.locator(
            ".portal-player-detail > .portal-detail-title",
          );
          await expect(
            header.getByRole("heading", { name: first.name, exact: true }),
          ).toBeVisible();
          expect(
            await header.evaluate((element) => {
              const name = element.querySelector("h2")!.getBoundingClientRect();
              const close = element
                .querySelector(".portal-icon")!
                .getBoundingClientRect();
              return (
                name.right <= close.left ||
                name.left >= close.right ||
                name.bottom <= close.top ||
                name.top >= close.bottom
              );
            }),
          ).toBe(true);
        }
        await capture(page, section, "OWNER", `${section}-${width}.png`);
      }
    }
    const parentContext = await browser.newContext({
      storageState: await parent.storageState(),
      deviceScaleFactor: 1,
    });
    contexts.push(parentContext);
    await readOnly(parentContext);
    const parentPage = await parentContext.newPage();
    for (const width of [390, 320]) {
      await parentPage.setViewportSize({ width, height: 844 });
      for (const section of ["reports", "home"]) {
        const query = new URLSearchParams({ section, player: first.id });
        if (section === "reports") query.set("report", report.id);
        await parentPage.goto(`/workspace/${access.academyId}?${query}`);
        await expect(parentPage.locator(".academy-portal")).toBeVisible();
        await expect(parentPage).toHaveURL(new RegExp(`player=${first.id}`));
        if (section === "reports")
          await expect(
            parentPage.getByRole("heading", {
              name: "Progress & Reports",
              exact: true,
            }),
          ).toBeVisible();
        else
          await expect(parentPage.locator("main")).toContainText(
            `Here’s ${first.name.split(" ")[0]}’s latest update.`,
          );
        await expect(parentPage.locator("main")).not.toContainText(other.name);
        await expect(parentPage.locator("main")).not.toContainText(
          "PRIVATE_BHARAT",
        );
        await capture(
          parentPage,
          section,
          "PARENT",
          `parent-${section}-${width}.png`,
        );
      }
    }
    expect(captures).toHaveLength(39);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
    expect(blockedMutations).toEqual([]);
    expect(
      createHash("sha256")
        .update(await readFile(manifestPath))
        .digest("hex"),
    ).toBe(createHash("sha256").update(manifestBytes).digest("hex"));
    await writeFile(
      verificationPath,
      JSON.stringify(
        {
          status: "PASS",
          purpose:
            "Read-only captures; neutral field focus and scroll origin. Existing120-PDF/core verification remains separate.",
          generatedAt: new Date().toISOString(),
          originalVerificationSha256: createHash("sha256")
            .update(originalVerification)
            .digest("hex"),
          manifestSha256: createHash("sha256")
            .update(manifestBytes)
            .digest("hex"),
          captures,
          pageErrors,
          consoleErrors,
          externalRequests,
          blockedMutations,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await writeFile(
      verificationPath,
      JSON.stringify(
        {
          status: "FAIL",
          purpose:
            "Read-only capture attempt; partial files do not establish completed evidence.",
          captures,
          pageErrors,
          consoleErrors,
          externalRequests,
          blockedMutations,
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    for (const context of contexts) await context.close();
    await owner.dispose();
    await parent.dispose();
  }
});
