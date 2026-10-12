import { test, expect } from "@playwright/test";
const routes = [
  "/owner/dashboard",
  "/owner/academy",
  "/owner/academy/branches",
  "/owner/academy/programs",
  "/owner/players",
  "/owner/players/p1",
  "/owner/sessions",
  "/owner/attendance",
  "/owner/fees",
  "/owner/communication",
  "/owner/analytics",
  "/owner/staff",
  "/owner/settings",
  "/coach/dashboard",
  "/coach/players",
  "/coach/players/p1",
  "/coach/development/p1",
  "/coach/sessions",
  "/coach/squads",
  "/coach/sessions/new",
  "/coach/sessions/s1/personalise",
  "/coach/sessions/s1/desk",
  "/coach/drills",
  "/coach/drills/d1",
  "/coach/evidence",
  "/coach/evidence/e1",
  "/coach/reports",
  "/coach/reports/r1",
  "/coach/messages",
  "/parent/home",
  "/parent/schedule",
  "/parent/progress",
  "/parent/reports",
  "/parent/fees",
  "/parent/messages",
  "/parent/profile",
  "/parent/practice",
];
for (const width of [320, 390, 768]) {
  test(`All supported routes fit ${width}px without runtime errors`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator(".loading")).toHaveCount(0);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${route} overflow at ${width}px`,
      ).toBe(false);
      const small = await page
        .locator("main .button, .mobile-menu, .bottom-nav a")
        .evaluateAll((elements) =>
          elements
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.height < 43;
            })
            .map((e) => ({
              label: e.textContent?.trim() || e.getAttribute("aria-label"),
              height: e.getBoundingClientRect().height,
            })),
        );
      expect(small, `${route} undersized touch actions`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
test("Phone communication controls and drawer work by touch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coach/messages");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .click();
  await page
    .getByRole("tab", { name: "Development Updates", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prepare from Source Records" })
    .click();
  await page
    .getByRole("textbox", { name: "Editable message" })
    .fill("Mobile review draft");
  await page
    .getByRole("checkbox", { name: "I verified the source records" })
    .check();
  await page
    .getByRole("button", { name: "Send for Approval", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve Draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Copy Message", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("heading", { name: "Communication centre", exact: true })
    .click();
  await page.screenshot({
    path: "docs/screenshots/ux-simplification/qa-communication-phone.png",
    fullPage: true,
  });
});
