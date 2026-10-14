import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { screenCatalog } from "../../src/features/design-preview/catalog";
const folder = "docs/design/screenshots";
test.use({ actionTimeout: 15000 });
test("player drafts, group reset, batch dates and subscription scenarios", async ({
  page,
}) => {
  await page.goto("/design-preview/player-add");
  await page.getByLabel("Player name", { exact: true }).fill("Sam Preview");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.goto("/design-preview/players");
  await expect(page.locator("main")).toContainText("Sam Preview");
  await page
    .getByLabel("Player context", { exact: true })
    .selectOption("aarav");
  await page.goto("/design-preview/weekly-plan");
  await page
    .getByRole("button", { name: "Adjust selected group", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Isha Kapoor", { exact: true }).check();
  await dialog
    .getByLabel("Session-specific adjustment", { exact: true })
    .fill("Use a wider receiving gate");
  await dialog
    .getByRole("button", { name: "Save adjustment", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Reset to batch", exact: true })
    .click();
  await expect(
    dialog.getByLabel("Session-specific adjustment", { exact: true }),
  ).toHaveValue("");
  await expect(dialog).toContainText("Receive the ball into useful space");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Batch", { exact: true })
    .selectOption("U12 Development");
  await page.getByLabel("Week starting", { exact: true }).fill("2026-11-02");
  await page
    .getByRole("button", { name: "Save batch plan", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("3 November and 5 November");
  await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
    "leo",
  );
  await page.goto("/design-preview/subscription-status");
  await page
    .getByLabel("Software subscription scenario", { exact: true })
    .selectOption("Suspended");
  await expect(page.locator("main")).toContainText(
    "Fictional software account is suspended",
  );
  await page.goto("/design-preview/receipt");
  await expect(page.locator("main")).toContainText("Receipt not yet available");
});
for (const width of [1440, 390])
  test(`complete design inventory at ${width}px`, async ({ page }) => {
    test.setTimeout(600000);
    await mkdir(folder, { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [],
      businessCalls: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/"))
        businessCalls.push(r.url());
    });
    for (const screen of screenCatalog) {
      const response = await page.goto(`/design-preview/${screen.id}`);
      expect(response?.status(), screen.id).toBe(200);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name:
            screen.id === "coach-today"
              ? "Good morning, Coach Maya"
              : screen.id === "parent-home"
                ? "Hi Neha"
                : screen.id === "player-profile"
                  ? "Aarav Shah"
                  : screen.id === "weekly-plan"
                    ? "Weekly Plan"
                    : screen.title,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Design preview — fictional data; no payments or messages are processed.",
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        screen.id,
      ).toBe(false);
      await page.screenshot({
        path: `${folder}/${screen.id}-${width}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
    expect(businessCalls).toEqual([]);
  });
test("preview workflows retain context, deliberate approvals and safe payment scenarios", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/design-preview/onboard-identity");
  await page
    .getByLabel("Academy name", { exact: true })
    .fill("Riverside Review Academy");
  await page
    .getByRole("button", { name: "Save setup step", exact: true })
    .click();
  await expect(
    page.getByText("Fictional draft saved.", { exact: true }),
  ).toBeVisible();
  await page.goto("/design-preview/weekly-plan");
  await expect(page.locator(".dp-brand")).toContainText(
    "Riverside Review Academy",
  );
  await page
    .getByRole("button", { name: "Edit team focus", exact: true })
    .click();
  await page
    .getByLabel("Shared batch focus", { exact: true })
    .fill("Receive toward an open gate, then find a passing angle");
  await page
    .getByRole("button", { name: "Save batch plan", exact: true })
    .click();
  await expect(page.getByText("Review needed", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Personalise selected player", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Session-specific adjustment", { exact: true })
    .fill("Open the body before receiving into space");
  await dialog
    .getByRole("button", { name: "Save adjustment", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Close panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Personalise selected player",
      exact: true,
    }),
  ).toBeFocused();
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
  await page
    .getByRole("button", { name: "Publish in parent preview", exact: true })
    .click();
  await page.goto("/design-preview/parent-weekly");
  await page.getByRole("tab", { name: "Aarav’s Focus", exact: true }).click();
  await expect(page.locator("main")).toContainText(
    "Open the body before receiving into space",
  );
  await page.goto("/design-preview/conversation");
  await page
    .getByLabel("Private message", { exact: true })
    .fill("Could you explain the free-gate instruction?");
  await page
    .getByRole("button", { name: "Save prototype message", exact: true })
    .click();
  await expect(page.locator(".dp-chat")).toContainText(
    "Could you explain the free-gate instruction?",
  );
  await page.goto("/design-preview/session-attendance");
  await expect(
    page.getByLabel("Attendance for Aarav Shah", { exact: true }),
  ).toHaveValue("Unmarked");
  await page
    .getByLabel("Attendance for Aarav Shah", { exact: true })
    .selectOption("Present");
  await page.goto("/design-preview/session-observation");
  await page
    .getByLabel("Coach observation", { exact: true })
    .fill("The first touch moved toward the free gate in the paired task.");
  await page
    .getByRole("button", { name: "Save observation", exact: true })
    .click();
  await page.goto("/design-preview/session-review");
  await expect(page.locator("main")).toContainText(
    "The first touch moved toward the free gate in the paired task.",
  );
  await page.goto("/design-preview/report-edit");
  await page
    .getByLabel("Coach commentary", { exact: true })
    .fill(
      "September reviewed observation: the first touch moved into useful space in the paired task.",
    );
  await page
    .getByRole("button", { name: "Save report draft", exact: true })
    .click();
  await page
    .getByLabel(
      "I reviewed the player, month, attendance basis, sources and commentary",
      { exact: true },
    )
    .check();
  await page
    .getByRole("button", { name: "Approve report", exact: true })
    .click();
  await page.goto("/design-preview/parent-report");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await (await download).saveAs(`${folder}/reviewed-parent-report.pdf`);
  await page.goto("/design-preview/players");
  await page.getByLabel("Player context", { exact: true }).selectOption("isha");
  await page.goto("/design-preview/report-edit");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Player context", { exact: true })
    .selectOption("aarav");
  await page.goto("/design-preview/parent-fees");
  await page
    .getByLabel("Submit a fictional payment reference", { exact: true })
    .fill("PREVIEW-001");
  await page
    .getByRole("button", { name: "Submit reference", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("pending-verification");
  await expect(page.locator(".dp-amount")).toContainText("₹4,000");
  await page.goto("/design-preview/checkout");
  await page
    .getByRole("button", { name: "Start payment simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate failed", exact: true })
    .click();
  await expect(page).toHaveURL(/payment-failed/);
  await expect(page.locator(".dp-amount")).toContainText("₹4,000");
  await page.goto("/design-preview/payment-processing");
  await page
    .getByRole("button", { name: "Simulate paid", exact: true })
    .click();
  await expect(page).toHaveURL(/payment-paid/);
  await expect(page.locator(".dp-amount")).toContainText("₹0");
  await page.goto("/design-preview/practice");
  await page
    .getByLabel("Private practice feedback", { exact: true })
    .fill("We need another demonstration.");
  await page
    .getByRole("button", {
      name: "Send prototype feedback to coach",
      exact: true,
    })
    .click();
  await expect(page.locator(".dp-chat")).toContainText(
    "We need another demonstration.",
  );
  await page.goto("/design-preview/parent-home");
  await page
    .getByRole("button", {
      name: "Preview context & screen gallery",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Review academy fixture", { exact: true })
    .selectOption("harbour");
  await page
    .getByRole("button", { name: "Close preview tools", exact: true })
    .click();
  await expect(page.locator(".ar-parent-identity")).toContainText(
    "Harbour Football Academy",
  );
  await page.goto("/design-preview/parent-fees");
  await expect(page.locator("main")).toContainText("£70");
  await expect(page.locator("main")).not.toContainText("₹");
});
test("mobile drawers, retained failed edits and parent-context guards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto("/design-preview/weekly-plan");
  await page
    .getByRole("button", { name: "Personalise selected player", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.screenshot({
    path: `${folder}/weekly-personalisation-drawer-390.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Personalise selected player",
      exact: true,
    }),
  ).toBeFocused();
  await page.goto("/design-preview/academy-profile?scenario=failed-save");
  await page
    .getByLabel("Academy name", { exact: true })
    .fill("Retained review draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "save failed",
  );
  await expect(page.getByLabel("Academy name", { exact: true })).toHaveValue(
    "Retained review draft",
  );
  page.once("dialog", (d) => d.dismiss());
  await page.locator(".dp-gallery-link").click();
  await expect(page).toHaveURL(/academy-profile/);
  await page
    .getByLabel("Design scenario", { exact: true })
    .selectOption("default");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Fictional draft saved.", { exact: true }),
  ).toBeVisible();
  await page.goto("/design-preview/players");
  await page.getByLabel("Player context", { exact: true }).selectOption("isha");
  await page.goto("/design-preview/parent-home");
  await expect(
    page.getByRole("heading", { name: "Select a linked child", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Isha Kapoor");
});
test("narrow/intermediate layouts, shared states and long/limited PDFs", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1280, 1024, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of [
      "coach-today",
      "weekly-plan",
      "session-observation",
      "parent-home",
      "fee-overview",
      "checkout",
      "report-detail",
      "platform-customer",
    ]) {
      await page.goto(`/design-preview/${id}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${id}-${width}`,
      ).toBe(false);
    }
  }
  for (const scenario of [
    "empty",
    "loading",
    "validation",
    "failed-save",
    "unsaved",
    "conflict",
    "archived",
    "unavailable-media",
    "pending-template",
    "opted-out",
    "delivery-failed",
  ]) {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/design-preview/academy-profile?scenario=${scenario}`);
      await expect(page.locator("main")).toContainText("Design scenario:");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        scenario,
      ).toBe(false);
      if (width !== 320)
        await page.screenshot({
          path: `${folder}/state-${scenario}-${width}.png`,
          fullPage: true,
        });
    }
  }
  for (const id of ["report-print", "report-long", "report-limited"]) {
    await page.goto(`/design-preview/${id}`);
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    await (await download).saveAs(`${folder}/${id}.pdf`);
  }
  expect(errors).toEqual([]);
});
