import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const captureFolder = "docs/design/locked-ui/after";
const previewNotice =
  "Design preview — fictional data; no payments or messages are processed.";
const toolsName = "Preview context & screen gallery";
const toolsButton = (page: Page) =>
  page.getByRole("button", { name: toolsName, exact: true });

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

async function expectTouchTarget(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test("locked home compositions load real fonts and assets at five review viewports", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { errors, businessCalls } = recordRequests(page);
  const evidence = [];
  await mkdir(captureFolder, { recursive: true });

  for (const [screen, width, height] of [
    ["coach-today", 1440, 780],
    ["parent-home", 390, 844],
    ["parent-home", 320, 844],
    ["parent-home", 1440, 900],
    ["coach-today", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const response = await page.goto(`/design-preview/${screen}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".approved-review")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Preview tools" }),
    ).toBeHidden();
    await expect(
      page.getByLabel("Review academy fixture", { exact: true }),
    ).toBeHidden();
    await expect(
      page.getByLabel("Academy fixture", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(previewNotice, { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const illustration = page.locator(
      screen === "coach-today" ? ".ar-training-photo" : ".ar-week-image",
    );
    await expect(illustration).toBeVisible();
    await expect
      .poll(() =>
        illustration.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);

    const metrics = await page.evaluate(() => ({
      route: location.pathname,
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth,
      fontFamily: getComputedStyle(document.querySelector(".approved-review")!)
        .fontFamily,
      fonts: [...document.fonts]
        .filter((font) => font.family.includes("Preview Noto"))
        .map((font) => ({
          family: font.family,
          weight: font.weight,
          status: font.status,
        })),
      images: [
        ...document.querySelectorAll<HTMLImageElement>(".approved-review img"),
      ].map((image) => ({
        src: new URL(image.currentSrc).pathname,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        complete: image.complete,
      })),
    }));
    expect(metrics.overflow, `${screen}-${width}`).toBe(false);
    expect(metrics.fontFamily).toContain("Preview Noto");
    expect(metrics.fonts.length).toBeGreaterThan(0);
    expect(metrics.fonts.every((font) => font.status === "loaded")).toBe(true);
    evidence.push(metrics);

    if (screen === "coach-today") {
      await expect(page.locator(".ar-ai")).toContainText("Coming soon");
      await expect(
        page
          .getByRole("navigation", { name: "Preview workspace navigation" })
          .getByRole("link", { name: "Drills Library", exact: true }),
      ).toHaveCount(0);
      if (width === 1440) {
        const training = await page.locator(".ar-training").boundingBox(),
          side = await page.locator(".ar-side-cards").boundingBox();
        expect(training!.width).toBeGreaterThan(side!.width * 2);
        expect(Math.abs(training!.y - side!.y)).toBeLessThanOrEqual(2);
      } else {
        await expect(page.locator(".ar-mobile-academy")).toBeVisible();
        await expect(page.locator(".ar-mobile-academy")).toContainText(
          "Riverside Football Academy",
        );
        await expectTouchTarget(
          page.getByRole("link", { name: "Start Session", exact: true }),
        );
        await expectTouchTarget(
          page.getByRole("link", { name: "View Plan", exact: true }),
        );
        await expectTouchTarget(toolsButton(page));
      }
    } else if (width === 1440) {
      const workspace = await page.locator(".ar-workspace").boundingBox(),
        focus = await page.locator(".ar-week-card").boundingBox();
      expect(workspace!.width).toBeGreaterThan(800);
      expect(focus!.width).toBeLessThan(workspace!.width * 0.8);
    } else {
      await expectTouchTarget(toolsButton(page));
      await expectTouchTarget(
        page.getByLabel("Player context", { exact: true }),
      );
      for (const link of await page
        .locator(".ar-shortcuts a, .ar-bottom-nav a")
        .all())
        await expectTouchTarget(link);
    }

    await page.screenshot({ path: `${captureFolder}/${screen}-${width}.png` });
    await page.screenshot({
      path: `${captureFolder}/${screen}-${width}-full.png`,
      fullPage: true,
    });

    if (screen === "parent-home" && width === 320) {
      const lastShortcut = page.locator(".ar-shortcuts a").last();
      await lastShortcut.scrollIntoViewIfNeeded();
      await page.keyboard.press("End");
      await expect
        .poll(async () => {
          const shortcut = await lastShortcut.boundingBox(),
            navigation = await page.locator(".ar-bottom-nav").boundingBox();
          return shortcut!.y + shortcut!.height - navigation!.y;
        })
        .toBeLessThanOrEqual(0);
      await page.screenshot({
        path: `${captureFolder}/parent-home-320-bottom.png`,
      });
    }
  }

  await writeFile(
    `${captureFolder}/capture.json`,
    JSON.stringify({ capturedAt: new Date().toISOString(), evidence }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("preview tools stay outside the mobile composition and return keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const screen of ["coach-today", "parent-home"]) {
    await page.goto(`/design-preview/${screen}`);
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
      for (let index = 0; index < 20; index++) {
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
  }
});

test("home branding and linked-child context survive review controls without expanding parent scope", async ({
  page,
}) => {
  const { errors, businessCalls } = recordRequests(page);
  await page.goto("/design-preview/coach-today");
  await toolsButton(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Preview tools",
    exact: true,
  });
  await dialog
    .getByLabel("Review academy fixture", { exact: true })
    .selectOption("harbour");
  await page.keyboard.press("Escape");
  await expect(page.locator(".ar-header")).toContainText(
    "Harbour Football Academy",
  );
  await expect(page.locator(".ar-training")).toContainText(
    "Harbour training ground",
  );
  await toolsButton(page).click();
  await dialog
    .getByLabel("Review academy fixture", { exact: true })
    .selectOption("riverside");
  await page.keyboard.press("Escape");

  await page.goto("/design-preview/parent-home");
  const child = page.getByLabel("Player context", { exact: true });
  expect(
    await child
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(["aarav", "leo"]);
  await child.selectOption("leo");
  await expect(page.locator(".ar-greeting")).toContainText("Leo");
  await expect(page.locator(".ar-next")).toContainText(
    "No confirmed current-week session",
  );
  await expect(page.locator(".ar-update")).toContainText("Not recorded");
  await child.selectOption("aarav");
  await page.getByRole("link", { name: "View Plan", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/parent-weekly/);
  await page.getByRole("tab", { name: "Aarav’s Focus", exact: true }).click();
  await expect(page.locator("main")).toContainText(
    "Open body position before receiving",
  );

  await page.goto("/design-preview/coach-today");
  await toolsButton(page).click();
  await dialog
    .getByLabel("Player context", { exact: true })
    .selectOption("isha");
  await page.keyboard.press("Escape");
  await page.goto("/design-preview/parent-home");
  await expect(page.locator(".approved-review")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Select a linked child", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Isha Kapoor");
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("home navigation preserves session and player workflows and approval stays separate from publication", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { errors, businessCalls } = recordRequests(page);
  await page.goto("/design-preview/coach-today");
  await page.locator(".ar-academy").click();
  await expect(page).toHaveURL(/design-preview\/coach-more/);
  await page.goto("/design-preview/coach-today");
  await page
    .getByLabel("Search players, sessions, drills", { exact: true })
    .fill("Aarav");
  await page
    .getByRole("button", { name: "Open player search", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/player-profile/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Aarav Shah", exact: true }),
  ).toBeVisible();
  await page.goto("/design-preview/coach-today");
  await page.getByRole("link", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/session-agenda/);
  await expect(page.locator("main")).toContainText("U10 Foundations");
  await page.goto("/design-preview/drill-library");
  await expect(
    page.getByRole("heading", {
      name: "Activities for the session",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();

  for (const [name, route] of [
    ["Monthly Report", "parent-report"],
    ["Practise Together", "practice"],
    ["Message Coach", "conversation"],
  ]) {
    await page.goto("/design-preview/parent-home");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`design-preview/${route}$`));
  }

  await page.goto("/design-preview/weekly-plan");
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Shared batch focus", { exact: true })
    .fill("Receive through the wide gate");
  const save = page.getByRole("button", {
    name: "Save batch plan",
    exact: true,
  });
  await expect(save).toHaveCount(1);
  await save.click();
  await page.goto("/design-preview/parent-home");
  await expect(page.locator(".ar-week-card")).toContainText(
    "Your plan is awaiting coach review",
  );
  await page.goto("/design-preview/whatsapp-preview");
  await page
    .getByLabel(
      "I reviewed Aarav Shah's plan and intended guardian Neha Shah",
      { exact: true },
    )
    .check();
  await page
    .getByRole("button", { name: "Approve wording", exact: true })
    .click();
  await expect(page.getByText("Unpublished", { exact: true })).toBeVisible();
  await page.goto("/design-preview/parent-home");
  await expect(page.locator(".ar-week-card")).toContainText(
    "Your plan is awaiting coach review",
  );
  await page.goto("/design-preview/whatsapp-preview");
  await page
    .getByRole("button", { name: "Publish in parent preview", exact: true })
    .click();
  await page.goto("/design-preview/parent-home");
  await expect(page.locator(".ar-week-card")).toContainText(
    "Receive through the wide gate",
  );
  await expect(page.locator(".ar-week-card")).not.toContainText(
    "Your plan is awaiting coach review",
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});
