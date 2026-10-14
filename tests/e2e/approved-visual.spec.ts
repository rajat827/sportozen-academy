import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test.use({ actionTimeout: 15000 });
test("approved-reference screens preserve controls, context and narrow usability", async ({
  page,
}) => {
  test.setTimeout(120000);
  const folder = "docs/design/visual-correction";
  await mkdir(folder, { recursive: true });
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  for (const [screen, width, height] of [
    ["coach-today", 1440, 780],
    ["parent-home", 390, 900],
    ["coach-today", 320, 900],
    ["parent-home", 320, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`/design-preview/${screen}`);
    await expect(page.locator(".approved-review")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `${screen}-${width}`,
    ).toBe(false);
    await expect(
      page.locator(
        screen === "coach-today" ? ".ar-training-photo" : ".ar-week-image",
      ),
    ).toBeVisible();
    expect(
      await page
        .locator(
          screen === "coach-today" ? ".ar-training-photo" : ".ar-week-image",
        )
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBe(true);
    await page.screenshot({
      path: `${folder}/${screen}-${width}.png`,
      fullPage: true,
    });
    if (screen === "coach-today")
      await expect(
        page.getByRole("link", { name: "Start Session", exact: true }),
      ).toBeVisible();
    else {
      if (width === 320) {
        const last = page.locator(".ar-shortcuts a").last();
        await last.scrollIntoViewIfNeeded();
        await page.keyboard.press("End");
        await expect
          .poll(async () => {
            const shortcut = await last.boundingBox(),
              navigation = await page.locator(".ar-bottom-nav").boundingBox();
            return shortcut!.y + shortcut!.height - navigation!.y;
          })
          .toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${folder}/parent-home-320-bottom.png` });
      }
      await page
        .getByLabel("Player context", { exact: true })
        .selectOption("leo");
      await expect(page.locator("main")).toContainText(
        "No confirmed current-week session",
      );
      await expect(page.locator(".ar-update")).toContainText("Not recorded");
      await page
        .getByLabel("Player context", { exact: true })
        .selectOption("aarav");
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-preview/coach-today");
  await page.locator(".ar-controls summary").click();
  await expect(
    page.getByLabel("Review academy fixture", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Design scenario", { exact: true })
    .selectOption("loading");
  await expect(
    page.getByText("Loading fictional records…", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Design scenario", { exact: true })
    .selectOption("default");
  await page.locator(".ar-controls summary").click();
  await page.getByLabel("Role preview", { exact: true }).selectOption("PARENT");
  await expect(page).toHaveURL(/parent-home/);
  await page.locator(".ar-controls summary").click();
  await page.getByLabel("Role preview", { exact: true }).selectOption("COACH");
  await expect(page).toHaveURL(/coach-today/);
  await page
    .getByLabel("Search players, sessions, drills", { exact: true })
    .fill("Aarav");
  await page
    .getByRole("button", { name: "Open player search", exact: true })
    .click();
  await expect(page).toHaveURL(/player-profile/);
  await expect(page.locator("main")).toContainText("Aarav Shah");
  await page.goto("/design-preview/coach-today");
  await page.getByRole("link", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/session-agenda/);
  await page.goto("/design-preview/weekly-plan");
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Shared batch focus", { exact: true })
    .fill("Receive through the wide gate");
  await page
    .getByRole("button", { name: "Save batch plan", exact: true })
    .click();
  await page.goto("/design-preview/parent-home");
  await expect(page.locator("main")).toContainText(
    "Your plan is awaiting coach review",
  );
  await page.goto("/design-preview/coach-more");
  await expect(page.locator(".approved-review")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(calls).toEqual([]);
});
