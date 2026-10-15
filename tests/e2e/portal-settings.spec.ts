import { test, expect, type APIRequestContext } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

test("authenticated Settings confirms actual records, retains failed drafts and preserves academy scope", async ({
  playwright,
  browser,
}, testInfo) => {
  test.setTimeout(240000);
  const origin = String(testInfo.project.use.baseURL),
    suffix = crypto.randomUUID();
  const api = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const registration = await api.post("/api/auth/sign-up/email", {
    data: {
      name: "Alex Morgan",
      email: `settings-${suffix}@example.test`,
      password: `Test-only-${crypto.randomUUID()}`,
    },
  });
  expect(registration.status(), await registration.text()).toBe(200);
  const base = {
    name: "Riverside Football Academy",
    contactEmail: "info@riversidefa.example.test",
    country: "IN",
    language: "English",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateLocale: "en-IN",
    measurementSystem: "METRIC",
    brandAccent: "#008463",
    ageGroups: ["U8", "U10", "U12"],
    demo: true,
  };
  async function createAcademy(client: APIRequestContext, name: string) {
    const response = await client.post("/api/workspaces", {
      data: { ...base, name },
    });
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }
  const academy = await createAcademy(api, base.name),
    other = await createAcademy(api, "Separate Settings Test Academy");
  const path = `/api/workspaces/${academy.id}`,
    crest = await readFile(
      "public/design-preview/approved-home/riverside-crest.png",
    );
  const configured = await api.patch(path, {
    data: {
      ...academy,
      expectedVersion: 0,
      location: "Gurugram, Haryana",
      about:
        "Developing better footballers through structured training, personalised guidance and a positive community.",
      phone: "+91 98765 43210",
      website: "https://riversidefa.example.test",
      weekStartsOn: 1,
      dateFormat: "DD_MMM_YYYY",
      timeFormat: "12_HOUR",
      logoData: "data:image/png;base64," + crest.toString("base64"),
    },
  });
  expect(configured.status(), await configured.text()).toBe(200);
  const branchResponse = await api.post(path + "/records/branch", {
    data: { name: "Gurugram Branch", timezone: "Asia/Kolkata" },
  });
  expect(branchResponse.status(), await branchResponse.text()).toBe(201);
  const branch = await branchResponse.json();
  for (const [name, location] of [
    ["Riverside Ground", "Sector 66, Gurugram"],
    ["City Ground", "Sector 56, Gurugram"],
  ]) {
    const venue = await api.post(path + "/training", {
      data: {
        action: "venue",
        requestId: crypto.randomUUID(),
        data: { name, location, branchId: branch.id, exclusive: true },
      },
    });
    expect(venue.status(), await venue.text()).toBe(200);
  }
  const context = await browser.newContext({
      storageState: await api.storageState(),
      viewport: { width: 1536, height: 1024 },
    }),
    page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const route = `/workspace/${academy.id}?section=settings`;
  await page.goto(route);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Academy Name", { exact: true })).toHaveValue(
    base.name,
  );
  await expect(page.locator(".portal-settings .as-logo img")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Manage Plan", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete Academy", exact: true }),
  ).toBeDisabled();
  const evidence = "docs/screenshots/portal-integration/settings";
  await mkdir(evidence, { recursive: true });
  const metrics: unknown[] = [];
  for (const width of [1536, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.bringToFront();
    await page.evaluate(() => document.fonts.ready.then(() => true));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    metrics.push({
      width,
      dimensions: await page.evaluate(() => ({
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
      })),
    });
    await page.screenshot({
      path: `${evidence}/settings-${width}.png`,
      fullPage: true,
    });
    if (width === 1536)
      await page.screenshot({ path: `${evidence}/settings-1536-viewport.png` });
  }
  await writeFile(
    `${evidence}/viewport-metrics.json`,
    JSON.stringify(
      {
        scope: "Fresh isolated authenticated QA academy; no customer records",
        metrics,
      },
      null,
      2,
    ),
  );
  await page.setViewportSize({ width: 1536, height: 1024 });

  // Both logo previews are local until the single actual configuration save.
  const savedBeforeLogo = await (await api.get(path)).json();
  const mark = await readFile("public/portal/sportozen-mark.png");
  await page.getByLabel("Choose academy PNG logo").setInputFiles({
    name: "sport-logo.png",
    mimeType: "image/png",
    buffer: mark,
  });
  await expect(
    page.getByRole("button", { name: "Save Changes", exact: true }),
  ).toBeEnabled();
  expect((await (await api.get(path)).json()).academy.logoData).toBe(
    savedBeforeLogo.academy.logoData,
  );
  await page
    .getByLabel("Phone Number", { exact: true })
    .fill("+91 90000 12345");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Academy configuration saved." }),
  ).toBeVisible();
  const confirmed = await (await api.get(path)).json();
  expect(confirmed.academy.phone).toBe("+91 90000 12345");
  expect(confirmed.academy.logoData).toBe(
    "data:image/png;base64," + mark.toString("base64"),
  );
  await page.reload();
  await expect(page.getByLabel("Phone Number", { exact: true })).toHaveValue(
    "+91 90000 12345",
  );
  await expect(page.locator(".portal-settings .as-logo img")).toHaveCount(2);

  await page
    .getByLabel("Website (Optional)", { exact: true })
    .fill("not a website");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByLabel("Website (Optional)", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  expect((await (await api.get(path)).json()).academy.configVersion).toBe(
    confirmed.academy.configVersion,
  );
  await page
    .getByLabel("Website (Optional)", { exact: true })
    .fill("https://reviewed.example.test");
  await page.route("**/api/workspaces/" + academy.id, async (request) =>
    request.request().method() === "PATCH"
      ? request.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Injected isolated save failure" }),
        })
      : request.continue(),
  );
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page
      .locator(".portal-settings [role=alert]")
      .filter({ hasText: "Injected isolated save failure" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Website (Optional)", { exact: true }),
  ).toHaveValue("https://reviewed.example.test");
  expect((await (await api.get(path)).json()).academy.configVersion).toBe(
    confirmed.academy.configVersion,
  );
  await page.unroute("**/api/workspaces/" + academy.id);

  // Another writer wins first; stale form cannot overwrite its saved version.
  const external = await api.patch(path, {
    data: {
      ...confirmed.academy,
      expectedVersion: confirmed.academy.configVersion,
      location: "Externally reviewed location",
    },
  });
  expect(external.status(), await external.text()).toBe(200);
  const conflict = page.waitForResponse(
    (response) =>
      response.url().endsWith(path) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  expect((await conflict).status()).toBe(409);
  expect((await (await api.get(path)).json()).academy.location).toBe(
    "Externally reviewed location",
  );
  await expect(
    page
      .locator(".portal-settings [role=alert]")
      .filter({ hasText: /changed|version|review/i }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Website (Optional)", { exact: true }),
  ).toHaveValue("https://reviewed.example.test");
  await page
    .getByRole("button", { name: "Review saved configuration", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Review saved configuration",
    exact: true,
  });
  await expect(review).toContainText("Externally reviewed location");
  await review
    .getByRole("button", { name: "Keep draft with reviewed version" })
    .click();
  await page
    .getByLabel("Location", { exact: true })
    .fill("Externally reviewed location");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Academy configuration saved." }),
  ).toBeVisible();

  // Back/Forward restores an unsaved draft in memory; a deliberate tab discard clears it.
  await page
    .locator(".portal-sidebar")
    .getByRole("button", { name: "Players", exact: true })
    .click();
  await expect(page).toHaveURL(/section=players/);
  await page
    .locator(".portal-sidebar")
    .getByRole("button", { name: "More", exact: true })
    .click();
  await page
    .getByLabel("About Academy", { exact: true })
    .fill("Unsaved draft after browser Back");
  await page.goBack();
  await expect(page).toHaveURL(/section=players/);
  await page.goForward();
  await expect(page.getByLabel("About Academy", { exact: true })).toHaveValue(
    "Unsaved draft after browser Back",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Academy", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await page.getByRole("tab", { name: "Academy", exact: true }).click();
  await expect(
    page.getByLabel("About Academy", { exact: true }),
  ).not.toHaveValue("Unsaved draft after browser Back");

  await page.getByRole("button", { name: "Add Venue", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Add training location",
    exact: true,
  });
  await editor.getByLabel("Name", { exact: true }).fill("East training zone");
  await editor
    .getByRole("combobox", { name: "Branch", exact: true })
    .selectOption(branch.id);
  await editor
    .getByLabel("Address / location", { exact: true })
    .fill("Riverside east half");
  await editor
    .getByRole("combobox", {
      name: "Parent venue (optional zone)",
      exact: true,
    })
    .selectOption({ label: "Riverside Ground" });
  await editor
    .getByRole("button", { name: "Save training location", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "East training zone" }),
  ).toContainText("Zone");
  const actual = await (await api.get(path)).json();
  expect(
    actual.records.venue.find(
      (venue: { name: string }) => venue.name === "East training zone",
    ).parentVenueId,
  ).toBeTruthy();
  const isolated = await (await api.get(`/api/workspaces/${other.id}`)).json();
  expect(isolated.academy.configVersion).toBe(0);
  expect(isolated.records.venue).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
  await api.dispose();
});
