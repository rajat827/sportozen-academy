import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
test("Demo video really plays, pauses, seeks and persists bookmarks and review notes", async ({
  page,
}) => {
  await page.goto("/coach/evidence");
  await page.getByLabel("Evidence player filter").selectOption("p1");
  await page
    .getByRole("link", {
      name: "Play demo clip: Aarav · close-control practice",
      exact: true,
    })
    .click();
  const video = page.getByLabel("Fictional receiving practice video");
  await expect(
    page.getByRole("button", { name: "Play demo", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Play demo", exact: true }).click();
  await expect
    .poll(() => video.evaluate((e: HTMLVideoElement) => e.currentTime))
    .toBeGreaterThan(0.3);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await video.evaluate((e: HTMLVideoElement) => e.paused)).toBe(true);
  const timeline = page.getByLabel("Video timeline", { exact: true });
  await timeline.focus();
  await timeline.press("Home");
  for (let i = 0; i < 20; i++) await timeline.press("ArrowRight");
  await expect
    .poll(() =>
      video.evaluate((e: HTMLVideoElement) => Math.floor(e.currentTime)),
    )
    .toBe(20);
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Coach note", exact: true })
    .fill("Playback review note saved from the demo viewer.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Coach note", exact: true }),
  ).toHaveValue("Playback review note saved from the demo viewer.");
  await page.getByRole("button", { name: "Seek to 0:20", exact: true }).click();
  await expect
    .poll(() =>
      video.evaluate((e: HTMLVideoElement) => Math.floor(e.currentTime)),
    )
    .toBe(20);
  await page.getByRole("button", { name: "Play demo", exact: true }).click();
  await expect
    .poll(() => video.evaluate((e: HTMLVideoElement) => e.paused))
    .toBe(false);
  await page.screenshot({
    path: evidencePath("docs/screenshots/evidence-video-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: evidencePath("docs/screenshots/evidence-video-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

