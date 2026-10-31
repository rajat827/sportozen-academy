import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
test("Communication stays internal through verification, rejection, approval and manual copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/owner/communication");
  await expect(
    page
      .getByRole("combobox", { name: "Template", exact: true })
      .getByRole("option"),
  ).toHaveCount(7);
  await page.getByRole("button", { name: "New draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Approve Draft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Copy Message", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Template", exact: true })
    .selectOption("Weekly progress update");
  await page
    .getByRole("button", { name: "Prepare from Source Records" })
    .click();
  await expect(
    page.getByText("Reviewed evidence · e1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Editable message", exact: true })
    .fill("INTERNAL-ONLY-PROGRESS");
  await expect(
    page.getByRole("button", { name: "Send for Approval", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "I verified the source records" })
    .check();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Message preview" }),
  ).toContainText("INTERNAL-ONLY-PROGRESS");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Send for Approval", exact: true })
    .click();
  await page.getByRole("button", { name: "Reject Draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy Message", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Send for Approval", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve Draft", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button")
    .filter({ hasText: "Approved internally · NOT_SENT" })
    .click();
  await page.getByRole("button", { name: "Copy Message", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("INTERNAL-ONLY-PROGRESS");
  await expect(
    page.getByText("Copied manually; no delivery recorded", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Editable message", exact: true })
    .fill("Changed internal draft");
  await expect(
    page.getByRole("button", { name: "Copy Message", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy Message", exact: true }),
  ).toBeDisabled();
  await page.goto("/parent/messages");
  await expect(
    page.getByText("INTERNAL-ONLY-PROGRESS", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText("Changed internal draft", { exact: true }),
  ).not.toBeVisible();
  await page.goto("/owner/settings");
  await expect(
    page.getByText("WhatsApp Business", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "FUTURE INTEGRATION" }),
  ).toHaveCount(4);
  await page.goto("/owner/communication");
  await page
    .getByRole("button")
    .filter({ hasText: "Weekly progress update" })
    .last()
    .click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page
    .getByRole("heading", { name: "Communication centre", exact: true })
    .click();
  await page.screenshot({
    path: evidencePath("docs/screenshots/communication-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("heading", { name: "Communication centre", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: evidencePath("docs/screenshots/communication-mobile.png"),
    fullPage: true,
  });
});
