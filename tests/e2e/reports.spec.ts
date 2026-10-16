import { evidencePath } from "./evidence-path";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const folder = evidencePath("docs/screenshots/reports");
test("Approved report downloads, remains unchanged and respects parent privacy", async ({
  page,
}) => {
  await mkdir(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/coach/reports/r1");
  const report = page.getByRole("article", {
    name: "Player development report",
  });
  await expect(report.getByText("3 of 6", { exact: false })).toBeVisible();
  await expect(report.locator(".pr-status")).toHaveText("Approved");
  await expect(report.locator(".pr-footer")).toContainText(
    "External delivery: Not sent",
  );
  await page.screenshot({
    path: `${folder}/after-desktop.png`,
    fullPage: true,
  });
  const beforeDownload = await page.evaluate(() =>
    localStorage.getItem("sportozen-demo-v1"),
  );
  for (let i = 0; i < 2; i++) {
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download PDF", exact: true }).click(),
    ]);
    expect(d.suggestedFilename()).toBe(
      "Aarav-Sharma-Development-Report-2026-10.pdf",
    );
    await d.saveAs(
      `${folder}/${i ? "repeat-report" : "Aarav-Sharma-Development-Report-2026-10"}.pdf`,
    );
    await expect(report.locator(".pr-status")).toHaveText("Approved");
  }
  expect(
    await page.evaluate(() => localStorage.getItem("sportozen-demo-v1")),
  ).toBe(beforeDownload);
  await page.goto("/parent/reports");
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("article")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await expect(page.getByText("Kabir Singh", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Private working note", { exact: false }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `${folder}/parent-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/coach/reports/r1");
  await page.getByLabel("Coach remarks").fill("Revised note needing review");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page.reload();
  await expect(
    page
      .getByRole("article", { name: "Player development report" })
      .locator(".pr-status"),
  ).toHaveText("Draft");
  await page.goto("/parent/reports");
  await expect(page.getByRole("article")).toHaveCount(0);
});
test("Failed PDF generation offers a working retry", async ({ page }) => {
  await page.goto("/parent/reports");
  await expect(page.getByRole("article")).toBeVisible();
  await page.route("**/_next/static/chunks/*.js", (route) => route.abort());
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "PDF could not be generated" }),
  ).toBeVisible();
  await page.unroute("**/_next/static/chunks/*.js");
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Retry PDF download" }).click(),
  ]);
  expect(await d.failure()).toBeNull();
});

test("Long recorded names and observations paginate without truncation", async ({
  page,
}) => {
  await page.goto("/coach/reports/r1");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("sportozen-demo-v1")!);
    const r = stored.state.reports.find((r: { id: string }) => r.id === "r1");
    const m = r.approvedSnapshot;
    m.player =
      "Aarav Sharma \u2013 No\u00ebl \u2013 fictional extended family name for a wrapping check";
    m.labels = {
      observed: "Recorded coach observation and supporting evidence details",
      next: "N\u00e4chster Entwicklungsschritt",
    };
    m.evidence[0].text = Array.from(
      { length: 24 },
      (_, i) =>
        `Recorded observation ${i + 1}: Close control was observed in comparable introductory practice. More sessions are needed before drawing a conclusion. No general skill score is recorded.`,
    ).join("\n\n");
    m.evidence[0].headline = undefined;
    m.evidence[0].label = undefined;
    m.note =
      "Keep the focus specific and celebrate consistent practice. ".repeat(12) +
      " END OF RECORDED NOTE";
    localStorage.setItem("sportozen-demo-v1", JSON.stringify(stored));
  });
  await page.goto("/parent/reports");
  await expect(page.getByRole("article")).toContainText(
    "Recorded observation 24",
  );
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF", exact: true }).click(),
  ]);
  await d.saveAs(`${folder}/long-report.pdf`);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("sportozen-demo-v1")!);
    const m = stored.state.reports[0].approvedSnapshot;
    m.player = "Aarav Sharma";
    m.evidence = [];
    m.activities = [];
    m.coach = undefined;
    m.squad = undefined;
    m.sport = undefined;
    m.note = "";
    m.focus = "Training focus not recorded";
    m.practised = "Recorded activities are awaiting confirmation.";
    m.nextStep = "Next development step to be confirmed";
    localStorage.setItem("sportozen-demo-v1", JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.getByRole("article")).toContainText(
    "No dated numerical measurements were recorded. No chart or progress score is inferred.",
  );
  const [missing] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF", exact: true }).click(),
  ]);
  await missing.saveAs(`${folder}/missing-records-report.pdf`);
});
