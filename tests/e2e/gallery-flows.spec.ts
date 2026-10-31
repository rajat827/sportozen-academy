import { test, expect } from "@playwright/test";

test("player and report row links open the chosen child", async ({ page }) => {
  await page.goto("/design-preview/players");
  const playerRow = page.locator(".dp-row").filter({
    has: page.getByText("Isha Kapoor", { exact: true }),
  });
  await playerRow.getByRole("link", { name: "Open", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/player-profile/);
  await expect(page.locator("main")).toContainText("Isha Kapoor");
  await page.goto("/design-preview/development-history");
  await expect(page.locator("main")).toContainText(
    "No reviewed history recorded",
  );
  await expect(page.locator("main")).not.toContainText(
    "30 September · Coach review",
  );

  await page.goto("/design-preview/report-queue");
  await page
    .getByLabel("Player context", { exact: true })
    .selectOption("aarav");
  const reportRow = page.locator(".dp-row").filter({
    has: page.getByText("Isha Kapoor · September 2026", { exact: true }),
  });
  await reportRow.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page).toHaveURL(/design-preview\/report-limited/);
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "isha",
  );
  await expect(page.locator("main")).toContainText(
    "Isha Kapoor · September 2026",
  );
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
});

test("drill links retain the selected drill instructions and cue", async ({
  page,
}) => {
  await page.goto("/design-preview/drill-library");
  const drillRow = page.locator("article.dp-row").filter({
    has: page.getByRole("heading", { name: "Pass and move", exact: true }),
  });
  await drillRow
    .getByRole("link", { name: "Drill detail", exact: true })
    .click();
  await expect(page).toHaveURL(/design-preview\/drill-detail/);
  await expect(
    page.getByRole("heading", { name: "Pass and move", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "Groups of three, a 10-metre triangle, one ball",
  );
  await expect(page.locator("main")).toContainText("Pass, find space, show");
  await expect(
    page.getByRole("img", { name: /Paired receiving task/ }),
  ).toHaveCount(0);
});

test("parent practice waits for both current approval and publication", async ({
  page,
}) => {
  const businessCalls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      businessCalls.push(request.url());
  });
  await page.goto("/design-preview/weekly-plan");
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Shared batch focus", { exact: true })
    .fill("Look for the free passing gate");
  await page
    .getByRole("button", { name: "Save batch plan", exact: true })
    .click();
  await page.goto("/design-preview/practice");
  await expect(
    page.getByRole("heading", {
      name: "Your practice is awaiting coach review",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Assigned approved activity", { exact: true }),
  ).toHaveCount(0);

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
  await page.goto("/design-preview/practice");
  await expect(
    page.getByRole("heading", {
      name: "Your practice is awaiting coach review",
      exact: true,
    }),
  ).toBeVisible();

  await page.goto("/design-preview/whatsapp-preview");
  await page
    .getByRole("button", { name: "Publish in parent preview", exact: true })
    .click();
  await page.goto("/design-preview/practice");
  await expect(
    page.getByText("Assigned approved activity", { exact: true }),
  ).toBeVisible();
  expect(businessCalls).toEqual([]);
});
