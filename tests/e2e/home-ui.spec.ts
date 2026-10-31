import { evidencePath } from "./evidence-path";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const captureFolder = evidencePath("docs/screenshots/home-ui/after");
const previewNotice =
  "Design preview — fictional data; no payments or messages are processed.";
const toolsButton = (page: Page) =>
  page.getByRole("button", {
    name: "Preview context & screen gallery",
    exact: true,
  });
const section = (page: Page, name: string) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });

test.use({ actionTimeout: 15000 });

function recordRequests(page: Page) {
  const errors: string[] = [],
    businessCalls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      businessCalls.push(request.url());
  });
  return { errors, businessCalls };
}

async function touchTarget(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test("approved Home dashboard keeps its composition and captures six responsive viewports", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { errors, businessCalls } = recordRequests(page);
  const evidence = [];
  await mkdir(captureFolder, { recursive: true });

  for (const [width, height] of [
    [1536, 1024],
    [1440, 900],
    [1280, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const response = await page.goto("/design-preview/coach-today");
    expect(response?.status()).toBe(200);
    await expect(page.locator(".home-dashboard")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Good morning, Coach Maya",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(previewNotice, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Preview tools", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByLabel("Review academy fixture", { exact: true }),
    ).toBeHidden();
    await page.evaluate(() => document.fonts.ready);
    const illustration = page.locator(".hd-hero-image");
    await expect(illustration).toBeVisible();
    await expect
      .poll(() =>
        illustration.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    for (const name of [
      "Today’s Schedule",
      "Recent Activity",
      "Pending Actions",
      "Quick Actions",
      "Player Development Focus",
      "Reports This Month",
      "What’s Next",
    ])
      await expect(section(page, name)).toBeVisible();
    const bounds = await page.evaluate(() => {
      const box = (selector: string) => {
        const value = document.querySelector(selector)!.getBoundingClientRect();
        return {
          x: value.x,
          y: value.y,
          width: value.width,
          height: value.height,
        };
      };
      return {
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        hero: box(".hd-hero"),
        schedule: box(".hd-schedule"),
        sidebar: box(".hd-sidebar"),
        fontFamily: getComputedStyle(document.querySelector(".home-dashboard")!)
          .fontFamily,
      };
    });
    expect(bounds.overflow, `${width}px`).toBe(false);
    expect(bounds.fontFamily).toContain("Preview Noto");
    if (width >= 1280) {
      expect(bounds.sidebar.width).toBeGreaterThanOrEqual(240);
      expect(bounds.sidebar.width).toBeLessThanOrEqual(256);
      expect(bounds.hero.width / bounds.schedule.width).toBeGreaterThan(1.5);
      expect(bounds.hero.width / bounds.schedule.width).toBeLessThan(1.8);
      expect(Math.abs(bounds.hero.y - bounds.schedule.y)).toBeLessThanOrEqual(
        2,
      );
      expect(bounds.hero.height).toBeGreaterThanOrEqual(245);
      expect(bounds.hero.height).toBeLessThanOrEqual(295);
    } else if (width < 768) {
      expect(bounds.schedule.y).toBeGreaterThan(bounds.hero.y);
      await expect(page.locator(".hd-mobile-academy")).toContainText(
        "Riverside Football Academy",
      );
      await touchTarget(
        page.getByRole("link", { name: "Start Session", exact: true }),
      );
      await touchTarget(toolsButton(page));
      for (const link of await page.locator(".hd-mobile-nav a").all())
        await touchTarget(link);
      const pending = await section(page, "Pending Actions").boundingBox();
      const quick = await section(page, "Quick Actions").boundingBox();
      expect(pending!.y).toBeLessThan(quick!.y);
    }
    evidence.push(bounds);
    await page.screenshot({ path: `${captureFolder}/home-${width}.png` });
    await page.screenshot({
      path: `${captureFolder}/home-${width}-full.png`,
      fullPage: true,
    });
  }
  await writeFile(
    `${captureFolder}/capture.json`,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        route: "/design-preview/coach-today",
        evidence,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Home preview tools contain keyboard focus and leave product utilities closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/design-preview/coach-today");
  const trigger = toolsButton(page),
    dialog = page.getByRole("dialog", { name: "Preview tools", exact: true });
  await expect(dialog).toBeHidden();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("Review academy fixture", { exact: true }),
  ).toBeVisible();
  for (const key of ["Tab", "Shift+Tab"])
    for (let index = 0; index < 18; index++) {
      await page.keyboard.press(key);
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog
    .getByRole("button", { name: "Close preview tools", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Home actions preserve academy, player and review context without executing operations", async ({
  page,
}) => {
  const { errors, businessCalls } = recordRequests(page);
  await page.goto("/design-preview/coach-today");
  await page.getByRole("link", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("U10 Foundations");
  await expect(page.locator("main")).toContainText("20 October");
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "aarav",
  );

  await page.goto("/design-preview/coach-today");
  const schedule = section(page, "Today’s Schedule");
  await schedule
    .getByRole("link", { name: /U10 Foundations Training Session/ })
    .click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("20 October");
  await page.goto("/design-preview/coach-today");
  await section(page, "Today’s Schedule")
    .getByRole("link", { name: "View Calendar", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/sessions/);
  await expect(page.locator(".cal-panel:visible")).toContainText("20 Oct 2026");

  await page.goto("/design-preview/coach-today");
  const navigation = page.getByRole("navigation", {
    name: "Preview workspace navigation",
    exact: true,
  });
  await expect(
    navigation.getByRole("link", { name: "Drills Library", exact: true }),
  ).toHaveCount(0);
  await expect(
    navigation.getByRole("link", { name: "Fees", exact: true }),
  ).toHaveCount(0);
  await navigation.getByRole("link", { name: "Players", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/players/);
  await expect(
    page.getByRole("heading", { name: "Players", level: 1, exact: true }),
  ).toBeVisible();

  await page.goto("/design-preview/coach-today");
  await section(page, "Pending Actions")
    .getByRole("link", { name: /Review player reports/ })
    .click();
  await expect(page).toHaveURL(/design-preview\/report-queue/);
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "isha",
  );

  await page.goto("/design-preview/coach-today");
  const quick = section(page, "Quick Actions");
  await expect(
    quick.getByRole("button", { name: "Add Player", exact: true }),
  ).toBeDisabled();
  await quick.getByRole("link", { name: "Add Session", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/session-builder/);
  await page.goto("/design-preview/coach-today");
  await section(page, "Quick Actions")
    .getByRole("link", { name: "Send Message", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/parent-questions/);
  await expect(page.getByLabel("Private message", { exact: true })).toHaveValue(
    "",
  );
  await page.goto("/design-preview/coach-today");
  await section(page, "Quick Actions")
    .getByRole("link", { name: "Generate Report", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/report-prepare/);
  await page.goto("/design-preview/coach-today");
  await section(page, "What’s Next")
    .getByRole("link", { name: /Create next week’s plan/ })
    .click();
  await expect(page).toHaveURL(/design-preview\/weekly-plan/);
  await expect(page.locator("main")).toContainText(
    "Receive into space, then find the next pass",
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Home uses honest loading, empty and failure states within its approved shell", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captureFolder, { recursive: true });
  for (const [scenario, capture] of [
    ["empty", "empty"],
    ["loading", "loading"],
    ["failed-save", "error"],
  ] as const)
    for (const width of [1536, 390] as const) {
      await page.setViewportSize({
        width,
        height: width === 1536 ? 1024 : 844,
      });
      await page.goto(`/design-preview/coach-today?scenario=${scenario}`);
      await expect(page.locator(".home-dashboard")).toBeVisible();
      await expect(page.locator(".hd-hero")).toBeVisible();
      await expect(section(page, "Today’s Schedule")).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Good morning, Coach Maya",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(previewNotice, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Start Session", exact: true }),
      ).toHaveCount(0);
      if (scenario === "empty")
        await expect(page.locator(".hd-hero")).toContainText(
          "No session scheduled",
        );
      else if (scenario === "loading")
        await expect(
          page.getByText("Loading fictional records…", { exact: true }),
        ).toBeVisible();
      else await expect(page.locator("main").getByRole("alert")).toBeVisible();
      if (scenario !== "empty") {
        for (const id of ["players", "batches", "upcoming"])
          await expect(
            page.getByTestId(`home-${id}`).getByText("0", { exact: true }),
          ).toHaveCount(0);
        await expect(
          section(page, "Reports This Month").getByRole("img", {
            name: "Report counts unavailable",
            exact: true,
          }),
        ).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${scenario}-${width}`,
      ).toBe(false);
      await page.screenshot({
        path: `${captureFolder}/home-${capture}-${width}.png`,
        fullPage: true,
      });
    }
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Home summary values agree with recorded data and do not invent unread or current-month reports", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { errors, businessCalls } = recordRequests(page);
  await page.goto("/design-preview/coach-today");
  for (const [id, value] of [
    ["players", "3"],
    ["batches", "2"],
    ["upcoming", "2"],
  ] as const)
    await expect(
      page.getByTestId(`home-${id}`).getByText(value, { exact: true }),
    ).toBeVisible();
  const messages = page.getByTestId("home-messages");
  await expect(messages).toContainText("Read status not recorded");
  await expect(messages).toContainText(/0\s+parent questions/i);
  await expect(section(page, "Reports This Month")).toContainText(
    "No October 2026 records. Latest period: September 2026",
  );
  for (const status of ["Approved", "In Review", "Draft"])
    await expect(section(page, "Reports This Month")).toContainText(
      new RegExp(`0\\s*${status}`),
    );
  await toolsButton(page).click();
  const tools = page.getByRole("dialog", {
    name: "Preview tools",
    exact: true,
  });
  await tools.getByLabel("Preview date", { exact: true }).fill("2026-09-30");
  await page.keyboard.press("Escape");
  await expect(
    section(page, "Reports This Month").getByRole("img", {
      name: "1 approved, 0 in review, 1 draft reports in September 2026",
      exact: true,
    }),
  ).toBeVisible();
  await expect(section(page, "Reports This Month")).toContainText("1 / 2");
  await page.goto("/design-preview/report-edit");
  await page
    .getByLabel("Coach commentary", { exact: true })
    .fill("September source remains under coach review.");
  await page
    .getByRole("button", { name: "Save report draft", exact: true })
    .click();
  await page.goto("/design-preview/coach-today");
  await expect(
    section(page, "Reports This Month").getByRole("img", {
      name: "0 approved, 0 in review, 2 draft reports in September 2026",
      exact: true,
    }),
  ).toBeVisible();
  await toolsButton(page).click();
  await tools.getByLabel("Preview date", { exact: true }).fill("2026-10-20");
  await page.keyboard.press("Escape");
  await expect(section(page, "Recent Activity")).not.toContainText(
    /payment received|attended.*training|hours? ago/i,
  );
  await page.goto("/design-preview/conversation");
  await page
    .getByLabel("Private message", { exact: true })
    .fill("Could you explain the first receiving task?");
  await page
    .getByRole("button", { name: "Save prototype message", exact: true })
    .click();
  await page.goto("/design-preview/coach-today");
  await expect(page.getByTestId("home-messages")).toContainText(
    "Read status not recorded",
  );
  await expect(page.getByTestId("home-messages")).toContainText(
    /1\s+parent question/i,
  );
  await section(page, "Pending Actions")
    .getByRole("link", { name: /Open parent questions/ })
    .click();
  await expect(page).toHaveURL(/design-preview\/parent-questions/);
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "aarav",
  );
  await expect(page.locator(".dp-chat")).toContainText(
    "Could you explain the first receiving task?",
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Home opens the second scheduled date and keeps a genuine no-session day honest", async ({
  page,
}) => {
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captureFolder, { recursive: true });
  await page.goto("/design-preview/coach-today");
  await toolsButton(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Preview tools",
    exact: true,
  });
  await dialog.getByLabel("Preview date", { exact: true }).fill("2026-10-21");
  await page.keyboard.press("Escape");
  await expect(page.locator(".hd-hero")).toContainText("No session scheduled");
  await expect(
    page.getByRole("link", { name: "Start Session", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("home-upcoming").getByText("1", { exact: true }),
  ).toBeVisible();
  for (const width of [1536, 390]) {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    await page.screenshot({
      path: `${captureFolder}/home-no-session-${width}.png`,
      fullPage: true,
    });
  }
  await toolsButton(page).click();
  await dialog.getByLabel("Preview date", { exact: true }).fill("2026-10-22");
  await page.keyboard.press("Escape");
  await section(page, "Today’s Schedule")
    .getByRole("link", { name: /U10 Foundations Training Session/ })
    .click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("22 October");
  await expect(page.locator("main")).not.toContainText("20 October");
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "aarav",
  );
  await page.goto("/design-preview/coach-today");
  await page.getByRole("link", { name: "Start Session", exact: true }).click();
  await expect(page.locator("main")).toContainText("22 October");
  await page.goto("/design-preview/coach-today");
  await section(page, "Today’s Schedule")
    .getByRole("link", { name: "View Calendar", exact: true })
    .click();
  await page
    .locator(
      'button.cal-event[data-session-id="riverside:U10 Foundations:2026-10-22"]:visible',
    )
    .first()
    .click();
  await expect(page.locator(".cal-panel:visible")).toContainText("22 Oct 2026");
  await page
    .locator(".cal-panel:visible")
    .getByRole("link", { name: "Open Session", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("22 October");
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "aarav",
  );
  await page.goto("/design-preview/sessions");
  await page
    .locator(
      'button.cal-event[data-session-id="riverside:U10 Foundations:2026-10-20"]:visible',
    )
    .first()
    .click();
  await expect(page.locator(".cal-panel:visible")).toContainText("20 Oct 2026");
  await page
    .locator(".cal-panel:visible")
    .getByRole("link", { name: "Open Session", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("20 October");
  await expect(page.locator("main")).not.toContainText("22 October");
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "aarav",
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});
