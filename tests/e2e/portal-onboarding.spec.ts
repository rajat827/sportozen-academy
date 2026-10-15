import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("actual onboarding keeps typed categories and waits for a staged PNG before one confirmed create", async ({
  playwright,
  browser,
}, testInfo) => {
  const origin = String(testInfo.project.use.baseURL),
    api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
  const response = await api.post("/api/auth/sign-up/email", {
    data: {
      name: "Synthetic Onboarding Owner",
      email: `onboarding-${crypto.randomUUID()}@example.test`,
      password: `Test-only-${crypto.randomUUID()}`,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const context = await browser.newContext({
      storageState: await api.storageState(),
    }),
    page = await context.newPage();
  // Gate only the local FileReader; releasing it still performs the real PNG read.
  await page.addInitScript(() => {
    const Reader = window.FileReader;
    class DeferredReader extends Reader {
      readAsDataURL(blob: Blob) {
        (window as Window & { releaseLogoRead?: () => void }).releaseLogoRead =
          () => super.readAsDataURL(blob);
      }
    }
    window.FileReader = DeferredReader;
  });
  await page.goto("/workspace");
  await page
    .getByLabel("Academy name", { exact: true })
    .fill("Synthetic Onboarding Academy");
  await page
    .getByLabel("Academy contact email", { exact: true })
    .fill("onboarding@example.test");
  const categories = page.getByLabel("Age groups", { exact: true });
  await categories.pressSequentially("U10, U12, U14");
  await expect(categories).toHaveValue("U10, U12, U14");
  await expect(page.locator("#academy-age-group-review")).toContainText(
    "U10, U12, U14",
  );
  const logo = page.getByLabel("Academy PNG logo (maximum 200 KB)", {
    exact: true,
  });
  await logo.setInputFiles({
    name: "wrong.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("not-a-png"),
  });
  await expect(page.locator("#academy-logo-error")).toContainText(
    "Choose a PNG",
  );
  await expect(
    page.getByRole("button", { name: "Create empty academy", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove staged logo", exact: true })
    .click();
  const bytes = await readFile(
    "public/design-preview/approved-home/riverside-crest.png",
  );
  await logo.setInputFiles({
    name: "academy.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await expect(
    page.getByRole("button", { name: "Reading PNG…", exact: true }),
  ).toBeDisabled();
  expect((await (await api.get("/api/workspaces")).json()).workspaces).toEqual(
    [],
  );
  await page.evaluate(() =>
    (window as Window & { releaseLogoRead?: () => void }).releaseLogoRead?.(),
  );
  await expect(
    page.getByRole("img", { name: "Staged academy logo", exact: true }),
  ).toBeVisible();
  await page.route("**/api/workspaces", async (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Injected onboarding failure" }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Create empty academy", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Injected onboarding failure" }),
  ).toBeVisible();
  await expect(categories).toHaveValue("U10, U12, U14");
  await expect(
    page.getByRole("img", { name: "Staged academy logo", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/workspaces");
  const createdResponse = page.waitForResponse(
    (result) =>
      result.url().endsWith("/api/workspaces") &&
      result.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create empty academy", exact: true })
    .click();
  const created = await createdResponse;
  expect(created.status(), await created.text()).toBe(201);
  const academy = await created.json();
  await expect(page).toHaveURL(new RegExp(`/workspace/${academy.id}$`));
  const saved = await (await api.get(`/api/workspaces/${academy.id}`)).json();
  expect(saved.academy.ageGroups).toEqual(["U10", "U12", "U14"]);
  expect(saved.academy.modules).toContain("fees");
  expect(saved.academy.logoData).toBe(
    "data:image/png;base64," + bytes.toString("base64"),
  );
  expect(saved.records.player).toEqual([]);
  expect(saved.records.session).toEqual([]);
  expect(
    (await (await api.get("/api/workspaces")).json()).workspaces,
  ).toHaveLength(1);
  await context.close();
  await api.dispose();
});
