import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
test("Owner filters directory, opens Aarav and edits academy settings", async ({
  page,
}) => {
  await page.goto("/owner/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good afternoon, Anil." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Players", exact: true })
    .first()
    .click();
  await page.waitForURL("**/owner/players");
  await page.getByRole("textbox", { name: "Search players" }).fill("Aarav");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Squad filter").selectOption("U-15");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByLabel("Open Aarav Sharma profile").click();
  await expect(
    page.getByRole("heading", { name: "Aarav Sharma", exact: true }),
  ).toBeVisible();
  await page.goto("/owner/academy");
  await page
    .getByLabel("Tagline", { exact: true })
    .fill("Purposeful practice, every day.");
  await page.getByRole("button", { name: "Save academy" }).click();
  await page.reload();
  await expect(page.getByLabel("Tagline", { exact: true })).toHaveValue(
    "Purposeful practice, every day.",
  );
});
test("Coach changes goal, builds draft, personalises, marks attendance and reviews evidence", async ({
  page,
}) => {
  await page.goto("/coach/development/p1");
  await page
    .getByLabel("Goal status: Close-control dribbling and finishing", {
      exact: true,
    })
    .selectOption("Consistent");
  await page.reload();
  await expect(
    page.getByLabel("Goal status: Close-control dribbling and finishing", {
      exact: true,
    }),
  ).toHaveValue("Consistent");
  await page.goto("/coach/sessions/new");
  await page
    .getByLabel("Session theme", { exact: true })
    .fill("Smoke test practice");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page
    .getByRole("button", {
      name: "Move Pass through the gates up",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Individual focus for Aarav Sharma", { exact: true })
    .fill("Look twice before receiving");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Smoke test practice", exact: true }),
  ).toBeVisible();
  await page.goto("/coach/sessions/s1/personalise");
  await page
    .getByLabel("Today’s personal focus for Aarav Sharma", { exact: true })
    .fill("Scan over both shoulders");
  await page.getByRole("button", { name: "Save session objectives" }).click();
  await page.reload();
  await expect(
    page.getByLabel("Today’s personal focus for Aarav Sharma", { exact: true }),
  ).toHaveValue("Scan over both shoulders");
  await page.goto("/owner/attendance");
  await page
    .getByLabel("Attendance for Aarav Sharma", { exact: true })
    .selectOption("Present");
  await page.getByRole("button", { name: "Save attendance" }).click();
  await page.reload();
  await expect(
    page.getByLabel("Attendance for Aarav Sharma", { exact: true }),
  ).toHaveValue("Present");
  await page.goto("/coach/evidence/e2");
  await page.getByRole("button", { name: "Approve evidence" }).click();
  await page.reload();
  await expect(page.getByText("Coach Reviewed", { exact: true })).toBeVisible();
  await page.goto("/coach/reports/r2");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    page
      .getByRole("article", { name: "Player development report" })
      .locator(".pr-status"),
  ).toHaveText("Approved");
});
test("Demo role switch, parent privacy and mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/owner/dashboard");
  await page.getByLabel("Demo role", { exact: true }).selectOption("parent");
  await expect(page).toHaveURL(/parent\/home/);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Progress", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aarav’s progress", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Kabir Singh", { exact: true })).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "More", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Reports", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Demo role", { exact: true }).selectOption("coach");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Drills", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Drills & curriculum" }),
  ).toBeVisible();
});
test("Required screenshots and responsive overflow checks", async ({
  page,
}) => {
  const screenshots = [
    ["/owner/dashboard", 1440, 1000, "owner-dashboard-desktop"],
    ["/coach/dashboard", 1440, 1000, "coach-dashboard-desktop"],
    ["/owner/players", 1440, 1000, "player-directory-desktop"],
    ["/owner/players/p1", 1440, 1000, "player-profile-desktop"],
    ["/coach/development/p1", 1440, 1000, "development-plan-desktop"],
    ["/coach/sessions/s1/desk", 768, 1024, "session-desk-tablet"],
    ["/parent/home", 390, 844, "parent-home-mobile"],
    ["/parent/progress", 390, 844, "parent-progress-mobile"],
  ] as const;
  for (const [url, width, height, name] of screenshots) {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await expect(page.locator(".loading")).toHaveCount(0);
    if (url === "/owner/dashboard")
      await expect(page.locator(".recharts-area-curve")).toBeVisible();
    await page.screenshot({
      path: evidencePath(`docs/screenshots/${name}.png`),
      fullPage: true,
    });
  }
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      "/owner/dashboard",
      "/owner/players",
      "/coach/sessions/new",
      "/coach/sessions/s1/desk",
      "/parent/progress",
    ]) {
      await page.goto(url);
      await expect(page.locator(".loading")).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${url} overflows at ${width}px`).toBe(false);
    }
  }
});
