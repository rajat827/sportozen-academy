import { test, expect } from "@playwright/test";
test("New player has an editable plan, fee references and internal message approval", async ({
  page,
}) => {
  await page.goto("/owner/players");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await page.getByLabel("Player name", { exact: true }).fill("Test Player");
  await page.getByRole("button", { name: "Save demo player" }).click();
  await page.getByLabel("Search players").fill("Test Player");
  await page.getByLabel("Open Test Player profile").click();
  await page
    .getByRole("link", { name: "Development plan", exact: true })
    .click();
  await page.getByLabel("New development goal").fill("Create a support angle");
  await page.getByRole("button", { name: "Add goal", exact: true }).click();
  await page
    .getByLabel("Practice and review plan")
    .fill("Two focused practices followed by a coach review.");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Practice and review plan")).toHaveValue(
    "Two focused practices followed by a coach review.",
  );
  await expect(
    page.getByRole("heading", { name: "Create a support angle", exact: true }),
  ).toBeVisible();
  await page.goto("/owner/fees");
  await page
    .getByRole("row")
    .filter({ hasText: "Test Player" })
    .getByRole("button", { name: "Record reference" })
    .click();
  await page
    .getByLabel("Payment reference", { exact: true })
    .fill("TEST-DEMO-REFERENCE");
  await page.getByRole("button", { name: "Save demo record" }).click();
  await page.reload();
  await expect(
    page.getByText("TEST-DEMO-REFERENCE", { exact: true }),
  ).toBeVisible();
  await page.goto("/owner/communication");
  await page
    .getByRole("textbox", { name: "Editable message", exact: true })
    .fill("Coach reviewed: Aarav practised scanning before receiving.");
  await page
    .getByRole("button", { name: "Prepare from Source Records" })
    .click();
  await page
    .getByRole("textbox", { name: "Editable message", exact: true })
    .fill("Coach reviewed: Aarav practised scanning before receiving.");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Send for Approval", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve Draft", exact: true })
    .click();
  await page.goto("/parent/messages");
  await expect(
    page.getByText(
      "Coach reviewed: Aarav practised scanning before receiving.",
      { exact: true },
    ),
  ).not.toBeVisible();
  await page.goto("/coach/reports/r1");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Demo PDF" }).click();
  expect((await download).suggestedFilename()).toBe("r1-demo-report.pdf");
});
test("Supported route inventory renders without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  ];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator(".loading")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Page not found");
  }
  const invalid = await page.goto("/owner/unsupported");
  expect(invalid?.status()).toBe(404);
  expect(errors).toEqual([]);
});
