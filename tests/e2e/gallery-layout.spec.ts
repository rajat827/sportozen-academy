import { test, expect } from "@playwright/test";
test("weekly plan keeps intermediate and narrow layout within the viewport", async ({
  page,
}) => {
  for (const width of [320, 1024, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-preview/weekly-plan");
    await expect(page.locator(".gw-columns")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      wide: Array.from(document.querySelectorAll("body *"))
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          right: Math.round(e.getBoundingClientRect().right),
          width: Math.round(e.getBoundingClientRect().width),
          text: (e.textContent || "").slice(0, 60),
        }))
        .slice(-15),
    }));
    expect(bounds.scroll <= bounds.width, JSON.stringify(bounds)).toBe(true);
  }
});
