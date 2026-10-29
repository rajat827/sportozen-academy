import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const captures = "docs/screenshots/settings-ui/after";
const tools = (page: Page) =>
  page.getByRole("button", {
    name: "Preview context & screen gallery",
    exact: true,
  });
async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".as-layout, .as-restricted, .as-loading")).toBeVisible();
}
async function capture(page: Page, name: string, fullPage = false) {
  await mkdir(captures, { recursive: true });
  await page.screenshot({ path: `${captures}/${name}.png`, fullPage });
}
function monitor(page: Page) {
  const api: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      api.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { api, errors };
}

test("approved Settings captures six responsive layouts without page overflow", async ({
  page,
}) => {
  test.setTimeout(180000);
  const result = monitor(page),
    sizes = [];
  for (const [width, height] of [
    [1536, 1024],
    [1440, 900],
    [1024, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/design-preview/academy-settings");
    await ready(page);
    await expect(page.locator(".settings-screen")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Preview tools" }),
    ).toBeHidden();
    const bounds = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      left: document.querySelector(".as-main-column")!.getBoundingClientRect()
        .width,
      right: document
        .querySelector(".as-support-column")!
        .getBoundingClientRect().width,
      sidebar: document.querySelector(".hd-sidebar")!.getBoundingClientRect()
        .width,
    }));
    expect(bounds.scroll, `${width}px page overflow`).toBeLessThanOrEqual(
      width,
    );
    if (width >= 1440) {
      expect(bounds.sidebar).toBe(248);
      expect(bounds.left / bounds.right).toBeGreaterThan(2);
    }
    await capture(page, `settings-${width}`);
    await capture(page, `settings-${width}-full`, true);
    sizes.push({ height, ...bounds });
  }
  await writeFile(
    `${captures}/viewport-metrics.json`,
    JSON.stringify(sizes, null, 2),
  );
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("one Settings save validates, confirms persistence and restores the saved academy after reload", async ({
  page,
}) => {
  const result = monitor(page);
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  await page
    .getByLabel("Academy Name", { exact: true })
    .fill("Riverside Updated Preview");
  await page.getByLabel("Primary Email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByText("Enter a valid fictional academy email address."),
  ).toBeVisible();
  await capture(page, "settings-validation", true);
  await page
    .getByLabel("Primary Email", { exact: true })
    .fill("updated@example.test");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await capture(page, "settings-unsaved", true);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByText(
      "Changes saved in this fictional preview. No customer records were updated.",
    ),
  ).toBeVisible();
  await capture(page, "settings-saved", true);
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Riverside Updated Preview",
  );
  await expect(page.getByLabel("Primary Email", { exact: true })).toHaveValue(
    "updated@example.test",
  );
  await tools(page).click();
  await page
    .getByLabel("Review academy fixture", { exact: true })
    .selectOption("harbour");
  await page
    .getByRole("button", { name: "Close preview tools", exact: true })
    .click();
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Harbour Football Academy",
  );
  await tools(page).click();
  await page
    .getByLabel("Review academy fixture", { exact: true })
    .selectOption("riverside");
  await page
    .getByRole("button", { name: "Close preview tools", exact: true })
    .click();
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Riverside Updated Preview",
  );
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("logo controls share one staged value and removal persists only after Save Changes", async ({
  page,
}) => {
  const result = monitor(page);
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  await page
    .getByLabel("Choose academy PNG logo", { exact: true })
    .setInputFiles(
      "public/design-preview/approved-settings/riverside-logo.png",
    );
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  const logos = page.getByRole("img", {
    name: "Academy logo preview",
    exact: true,
  });
  await expect(logos).toHaveCount(2);
  expect(await logos.nth(0).getAttribute("src")).toEqual(
    await logos.nth(1).getAttribute("src"),
  );
  await capture(page, "settings-staged-logo", true);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("img", { name: "Academy logo preview", exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByLabel("Academy initials fallback")).toHaveCount(2);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("Academy initials fallback")).toHaveCount(2);
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("failure and conflict keep drafts; restricted roles do not expose academy fields", async ({
  page,
}) => {
  const result = monitor(page);
  page.on("dialog", (dialog) => dialog.accept());
  for (const scenario of ["failed-save", "conflict"] as const) {
    await page.goto(`/design-preview/academy-settings?scenario=${scenario}`);
    await ready(page);
    await page
      .getByLabel("Academy Name", { exact: true })
      .fill(`Unsaved ${scenario}`);
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    await expect(
      page.locator(".settings-screen").getByRole("alert"),
    ).toContainText(
      scenario === "failed-save"
        ? "Simulated save failure"
        : "saved configuration changed",
    );
    await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
      `Unsaved ${scenario}`,
    );
    await capture(page, `settings-${scenario}`, true);
    if (scenario === "failed-save")
      await page
        .getByRole("button", {
          name: "Keep draft and enable retry",
          exact: true,
        })
        .click();
    else {
      await page
        .getByRole("button", { name: "Review saved values", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", {
          name: "Review saved configuration",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Keep draft with reviewed version",
          exact: true,
        })
        .click();
    }
    await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
      `Unsaved ${scenario}`,
    );
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    await expect(
      page.getByText(
        "Changes saved in this fictional preview. No customer records were updated.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Changes", exact: true }),
    ).toBeDisabled();
  }
  for (const role of ["COACH", "PARENT"] as const) {
    await page.goto(`/design-preview/academy-settings?role=${role}`);
    await ready(page);
    await expect(
      page.getByRole("heading", {
        name: "Academy administration is unavailable for this role",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Academy Name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Save Changes", exact: true }),
    ).toHaveCount(0);
    await capture(page, `settings-restricted-${role.toLowerCase()}`, true);
  }
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("mobile Settings keeps one Save reachable and exposes an honest loading state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  await page
    .getByLabel("Primary Email", { exact: true })
    .fill("mobile@example.test");
  const save = page.getByRole("button", { name: "Save Changes", exact: true });
  await expect(save).toHaveCount(1);
  await expect(save).toBeInViewport();
  const bounds = await save.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(bounds!.y + bounds!.height).toBeLessThan(780);
  await capture(page, "settings-mobile-unsaved", true);
  await save.click();
  await expect(
    page.getByText(
      "Changes saved in this fictional preview. No customer records were updated.",
    ),
  ).toBeVisible();
  await page.goto("/design-preview/academy-settings?scenario=loading");
  await ready(page);
  await expect(page.getByRole("status")).toContainText(
    "Loading academy configuration",
  );
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveCount(0);
  await capture(page, "settings-loading", true);
});

test("settings tabs, guarded venue and non-destructive deletion preview retain keyboard navigation", async ({
  page,
}) => {
  const result = monitor(page);
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  for (const [label, path] of [
    ["Team", "staff"],
    ["Sessions", "weekly-plan"],
    ["Notifications", "guardian-consent"],
    ["Account", "owner-more"],
    ["Integrations", "whatsapp-setup"],
  ] as const)
    await expect(
      page
        .getByRole("navigation", { name: "Settings sections" })
        .getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("href", `/design-preview/${path}`);
  await expect(
    page.getByRole("combobox", { name: "Week Starts On", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Manage Plan", exact: true }),
  ).toBeDisabled();
  const add = page.getByRole("button", { name: "Add Venue", exact: true });
  await add.click();
  await expect(
    page.getByRole("dialog", { name: "Recorded venue workflow" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  const deletion = page.getByRole("button", {
    name: "Preview deletion restriction",
    exact: true,
  });
  await deletion.click();
  await expect(
    page.getByRole("dialog", { name: "No academy will be deleted" }),
  ).toBeVisible();
  await capture(page, "settings-deletion-preview", true);
  await page.keyboard.press("Escape");
  await expect(deletion).toBeFocused();
  await page
    .getByLabel("Academy Name", { exact: true })
    .fill("Unsaved guarded name");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("link", { name: "Team", exact: true })
    .click();
  await expect(page).toHaveURL(/academy-settings$/);
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Unsaved guarded name",
  );
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("Home, Players, Parent Home and Calendar remain existing screens after Settings styles load", async ({
  page,
}) => {
  const result = monitor(page);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  for (const route of ["coach-today", "players", "sessions", "parent-home"]) {
    await page.goto(`/design-preview/${route}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".settings-screen")).toHaveCount(0);
    await capture(page, `regression-${route}-1536`, true);
  }
  expect(result.api).toEqual([]);
  expect(result.errors).toEqual([]);
});

test("browser history recovers the unsaved Settings draft and explicit discard clears recovery", async ({
  page,
}) => {
  await page.goto("/design-preview/academy-settings");
  await ready(page);
  const team = () =>
    page
      .getByRole("navigation", { name: "Settings sections" })
      .getByRole("link", { name: "Team", exact: true });
  await team().click();
  await expect(page).toHaveURL(/\/staff$/);
  await page.goBack();
  await ready(page);
  await page
    .getByLabel("Academy Name", { exact: true })
    .fill("Draft recovered from history");
  await page.goForward();
  await expect(page).toHaveURL(/\/staff$/);
  await page.goBack();
  await ready(page);
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Draft recovered from history",
  );
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await team().click();
  await expect(page).toHaveURL(/\/staff$/);
  await page.goBack();
  await ready(page);
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Riverside Football Academy",
  );
  await page
    .getByLabel("Academy Name", { exact: true })
    .fill("Draft before reset");
  await tools(page).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reset fictional preview", exact: true })
    .click();
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    "Riverside Football Academy",
  );
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(
    0,
  );
});
