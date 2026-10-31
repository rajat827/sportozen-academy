import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("demo storage failure retains objective, observation and session drafts", async ({
  page,
}) => {
  // Failure injection affects this fictional demo context only, never authentication.
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota failure", "QuotaExceededError");
    };
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/coach/sessions/s1/personalise");
  await page
    .getByLabel("Today’s personal focus for Aarav Sharma")
    .fill("Retain this fictional objective draft.");
  await page
    .getByRole("button", { name: "Save session objectives", exact: true })
    .click();
  await expect(
    page.getByText("Save failed. Your draft is retained; please retry.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Today’s personal focus for Aarav Sharma"),
  ).toHaveValue("Retain this fictional objective draft.");
  await page.goto("/coach/sessions/s1/desk");
  await page.getByLabel("Player", { exact: true }).selectOption("p1");
  await page
    .getByRole("textbox", { name: "Coach observation", exact: true })
    .fill("Retain this fictional observation draft.");
  await page
    .getByRole("button", { name: "Save observation for review", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Coach observation", exact: true }),
  ).toHaveValue("Retain this fictional observation draft.");
  await page.goto("/coach/sessions/new");
  await page
    .getByLabel("Session theme", { exact: true })
    .fill("Retain this fictional session draft.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/sessions\/new$/);
  await expect(page.getByLabel("Session theme", { exact: true })).toHaveValue(
    "Retain this fictional session draft.",
  );
});
test("demo objectives, modal navigation and parent-supported practice stay usable", async ({
  page,
}) => {
  test.setTimeout(120000);
  const shots = evidencePath("docs/screenshots/ux-simplification");
  mkdirSync(shots, { recursive: true });
  await page.goto("/coach/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dribbling and Finishing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Dribbling and Finishing\s*·\s*6 personal objectives/),
  ).toBeVisible();
  await page.getByRole("link", { name: "View all", exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/sessions$/);
  await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue(
    "coach",
  );
  await page.goto("/coach/sessions/s1/personalise");
  await expect(
    page.getByRole("button", { name: "Save session objectives", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Linked focus for Aarav Sharma", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Today’s personal focus for Aarav Sharma")
    .fill("Keep the ball close when turning before shooting.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("link", { name: "View current player plan", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/personalise$/);
  await page
    .getByRole("button", { name: "Save session objectives", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved session objectives" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Today’s personal focus for Aarav Sharma"),
  ).toHaveValue("Keep the ball close when turning before shooting.");
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page
    .getByRole("link", { name: "Open Session Desk", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Personalise", exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${shots}/demo-objectives-${width}.png`,
      fullPage: true,
    });
    if (width < 768) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Main navigation" });
      await expect(dialog).toBeVisible();
      for (let i = 0; i < 18; i++) {
        await page.keyboard.press("Tab");
        expect(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        ).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open navigation", exact: true }),
      ).toBeFocused();
    }
  }
  await page.goto("/parent/home");
  await page
    .getByRole("link", { name: "Practise together", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "One coaching cue" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${shots}/demo-practice-320.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "We need another demonstration.",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Reply", { exact: true })).toHaveValue(
    /Parent-submitted practice feedback/,
  );
  await page.getByRole("button", { name: "Reply In App", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText(/Parent-submitted practice feedback/).first(),
  ).toBeVisible();
  await page.goto("/parent/messages");
  await expect(
    page.getByText("Shared in your parent app", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Message coach", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${shots}/demo-inbox-320.png`,
    fullPage: true,
  });
});
