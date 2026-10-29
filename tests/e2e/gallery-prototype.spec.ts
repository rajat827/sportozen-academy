import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { galleryReferences } from "../../src/features/design-preview/gallery-catalog";
import { screenById } from "../../src/features/design-preview/catalog";
test("gallery opens every working route and captures responsive component screens", async ({
  page,
}) => {
  test.setTimeout(360000);
  const folder =
    process.env.SPORTOZEN_HOME_UI_QA === "1"
      ? "test-results/home-ui-gallery"
      : "docs/design/gallery-prototype/screenshots";
  await mkdir(folder, { recursive: true });
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  await page.goto("/design-preview/prototype");
  await expect(
    page.getByRole("heading", { name: "The academy, connected." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open working screen" }),
  ).toHaveCount(34);
  await page.getByLabel("Find a screen").fill("Player Profile");
  await expect(
    page.getByRole("link", { name: "Open working screen" }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Open working screen" }).click();
  await expect(page.locator(".gallery-player")).toBeVisible();
  const routes = Array.from(new Set(galleryReferences.map((r) => r.route)));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const route of routes) {
      expect(screenById(route), route).toBeDefined();
      const response = await page.goto(`/design-preview/${route}`);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${route}-${width}`,
      ).toBe(false);
      await page.screenshot({
        path: `${folder}/${route}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("/design-preview/prototype");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `hub-${width}`,
    ).toBe(false);
    await page.screenshot({
      path: `${folder}/prototype-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
  expect(calls).toEqual([]);
});
test("weekly preview separates changes, review and publication and keeps local evidence scoped", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  await page.goto("/design-preview/weekly-plan");
  await expect(page.locator(".gw-columns")).toBeVisible();
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Shared batch focus", { exact: true })
    .fill("Receive toward the free gate");
  await page
    .getByRole("button", { name: "Save batch plan", exact: true })
    .click();
  await page.goto("/design-preview/parent-weekly");
  await expect(page.locator("main")).toContainText(
    "Your next plan is awaiting coach review",
  );
  await page.goto("/design-preview/evidence-library");
  await page
    .getByLabel("Select local media")
    .setInputFiles("public/design-preview/ui-gallery/football-week-banner.png");
  await page.getByRole("link", { name: "Open evidence", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Local image: football-week-banner.png" }),
  ).toBeVisible();
  await page
    .getByLabel("Coach review note", { exact: true })
    .fill("Illustration used to check the local preview only.");
  await page
    .getByLabel("Coach has reviewed this local context", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Save evidence note", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("Reviewed");
  await page.getByLabel("Player context", { exact: true }).selectOption("isha");
  await expect(page.locator("main")).toContainText("No media selected");
  await page.goto("/design-preview/report-notification");
  await expect(page.locator("main")).toContainText("awaiting coach review");
  await expect(
    page.getByRole("link", { name: "View Report", exact: true }),
  ).toHaveCount(0);
  expect(calls).toEqual([]);
});
