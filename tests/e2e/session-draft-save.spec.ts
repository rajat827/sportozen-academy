import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import type { WorkspacePayload } from "../../src/domain/workspace";
import type { FootballSession } from "../../src/domain/training";
import { evidencePath } from "./evidence-path";

test.use({ actionTimeout: 15000 });

test("coach saves a minimum session draft, keeps failed edits, and reopens the same record after a new login", async ({
  playwright,
  browser,
  baseURL,
}) => {
  test.setTimeout(180000);
  const origin = new URL(baseURL ?? "http://127.0.0.1:3001").origin;
  const suffix = crypto.randomUUID();
  const output = evidencePath("docs/screenshots/final-academy/session-draft");
  const requests: APIRequestContext[] = [];
  const contexts: BrowserContext[] = [];
  await mkdir(output, { recursive: true });
  async function api() {
    const value = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    requests.push(value);
    return value;
  }
  async function post<T>(
    client: APIRequestContext,
    path: string,
    data: unknown,
    status = 200,
  ) {
    const response = await client.post(path, { data });
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  }
  try {
    const owner = await api();
    await post(owner, "/api/auth/sign-up/email", {
      name: "Synthetic Session Owner",
      email: `session-owner-${suffix}@example.test`,
      password: `Synthetic-only-${crypto.randomUUID()}`,
    });
    // Honour the existing Better Auth sign-up throttle.
    await new Promise((resolve) => setTimeout(resolve, 11000));
    const coach = await api();
    const coachEmail = `session-coach-${suffix}@example.test`;
    const coachPassword = `Synthetic-only-${crypto.randomUUID()}`;
    const coachAccount = await post<{ user: { id: string } }>(
      coach,
      "/api/auth/sign-up/email",
      {
        name: "Synthetic Session Coach",
        email: coachEmail,
        password: coachPassword,
      },
    );
    const academy = await post<{ id: string }>(
      owner,
      "/api/workspaces",
      {
        name: "Synthetic Session Save Academy",
        contactEmail: "session-save@example.test",
        country: "IN",
        language: "English",
        currency: "INR",
        timezone: "Asia/Kolkata",
        dateLocale: "en-IN",
        measurementSystem: "METRIC",
        brandAccent: "#008463",
        modules: ["development", "reports", "communication"],
        demo: false,
      },
      201,
    );
    const root = `/api/workspaces/${academy.id}`;
    const invitation = await post<{ token: string }>(owner, `${root}/actions`, {
      action: "invite",
      verified: true,
      data: { email: coachEmail, role: "COACH" },
    });
    await post(coach, "/api/invitations/accept", { token: invitation.token });
    const branch = await post<{ id: string }>(
      owner,
      `${root}/records/branch`,
      {
        name: "Synthetic Session Branch",
        timezone: "Asia/Kolkata",
      },
      201,
    );
    const squad = await post<{ id: string }>(owner, `${root}/training`, {
      requestId: crypto.randomUUID(),
      action: "squad",
      data: { name: "Synthetic Under-12", branchId: branch.id, playerIds: [] },
    });
    const venue = await post<{ id: string }>(owner, `${root}/training`, {
      requestId: crypto.randomUUID(),
      action: "venue",
      data: {
        name: "Synthetic existing academy venue",
        branchId: branch.id,
        location: "Excelsior American School",
      },
    });
    async function payload(client = coach) {
      const response = await client.get(root);
      expect(response.status(), await response.text()).toBe(200);
      return response.json() as Promise<WorkspacePayload>;
    }
    expect((await payload()).records.drill).toHaveLength(0);
    const context = await browser.newContext({
      storageState: await coach.storageState(),
      viewport: { width: 1536, height: 1024 },
    });
    contexts.push(context);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const route = `/workspace/${academy.id}?section=training&create=session`;
    await page.goto(route);
    const editor = page.getByRole("dialog", {
      name: "Create a session",
      exact: true,
    });
    await expect(editor).toBeVisible();
    await editor
      .getByRole("combobox", { name: "Training batch", exact: true })
      .selectOption(squad.id);
    await editor
      .getByLabel("Session venue", { exact: true })
      .selectOption("__manual__");
    await editor
      .getByLabel("Training location", { exact: true })
      .fill("Excelsior American School");
    await editor
      .getByLabel("Training focus", { exact: true })
      .fill("Ball control and first touch");
    await editor.getByLabel("Session date", { exact: true }).fill("2032-11-08");
    await editor.getByLabel("Start time", { exact: true }).fill("17:00");
    await editor.getByLabel("Duration (minutes)", { exact: true }).fill("90");
    const save = editor.getByRole("button", {
      name: "Save Session Draft",
      exact: true,
    });
    await save.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${output}/${process.env.SESSION_DRAFT_BASELINE === "1" ? "before" : "after"}-minimum-1536.png`,
    });
    if (process.env.SESSION_DRAFT_BASELINE === "1") {
      await writeFile(
        `${output}/before.json`,
        JSON.stringify(
          {
            requiredInputsComplete: true,
            curriculumDrillCount: 0,
            agendaCount: 0,
            saveEnabled: await save.isEnabled(),
            persistedSessions: (await payload()).records.session.length,
            observation:
              "Recorded minimum draft control state; optional planning must not disable the Save action.",
          },
          null,
          2,
        ),
      );
      await expect(
        save,
        "Optional drill planning must not disable a valid session draft",
      ).toBeEnabled();
      return;
    }
    await expect(save).toBeEnabled();
    await editor
      .getByRole("combobox", { name: "Session venue", exact: true })
      .selectOption(venue.id);
    await expect(
      editor.getByLabel("Session venue", { exact: true }),
    ).toHaveValue(venue.id);
    await editor
      .getByRole("combobox", { name: "Session venue", exact: true })
      .selectOption("__manual__");
    await editor
      .getByLabel("Training location", { exact: true })
      .fill("Excelsior American School");
    await editor
      .locator("summary")
      .filter({ hasText: "Find a location with Google Maps" })
      .click();
    await expect(editor).toContainText("Google Maps is configuration-blocked.");
    await expect(
      editor.getByLabel("Training focus", { exact: true }),
    ).toHaveAttribute("list", /.+/);
    await editor
      .getByLabel("Training focus", { exact: true })
      .fill("Ball control and first touch");
    await expect(
      editor.getByLabel("Training focus", { exact: true }),
    ).toHaveValue("Ball control and first touch");
    await editor.getByLabel("Training focus", { exact: true }).fill("");
    await expect(save).toBeEnabled();
    await editor.getByLabel("Session date", { exact: true }).fill("");
    await save.click();
    await expect(
      editor.getByLabel("Session date", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(editor).toContainText("Choose a session date.");
    expect((await payload()).records.session).toHaveLength(0);
    await editor
      .getByLabel("Training focus", { exact: true })
      .fill("Ball control and first touch");
    await editor.getByLabel("Session date", { exact: true }).fill("2032-11-08");
    await editor.getByLabel("Duration (minutes)", { exact: true }).fill("0");
    await save.click();
    await expect(
      editor.getByLabel("Duration (minutes)", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(editor).toContainText(
      "Enter a duration from 1 to 480 minutes.",
    );
    expect((await payload()).records.session).toHaveLength(0);
    await editor.getByLabel("Duration (minutes)", { exact: true }).fill("90");
    let failedPosts = 0;
    await page.route(`**${root}/training`, async (intercept) => {
      if (intercept.request().method() === "POST") {
        failedPosts++;
        await intercept.abort("failed");
      } else await intercept.continue();
    });
    await save.click();
    await expect(editor).toContainText("Not confirmed. Your draft is retained");
    await expect(
      editor.getByLabel("Training focus", { exact: true }),
    ).toHaveValue("Ball control and first touch");
    await expect(
      editor.getByLabel("Training location", { exact: true }),
    ).toHaveValue("Excelsior American School");
    expect(failedPosts).toBe(1);
    expect((await payload()).records.session).toHaveLength(0);
    await page.unroute(`**${root}/training`);
    const confirmed = page.waitForResponse(
      (response) =>
        response.url().endsWith(`${root}/training`) &&
        response.request().method() === "POST",
    );
    // Real rapid clicks exercise the shared synchronous in-flight mutation guard.
    await save.click({ clickCount: 2 });
    const response = await confirmed;
    expect(response.status(), await response.text()).toBe(200);
    const saved = (await response.json()) as FootballSession;
    await expect(editor).not.toBeVisible();
    expect(saved.status).toBe("DRAFT");
    expect(saved.agenda).toEqual([]);
    expect(saved.coachIds).toEqual([coachAccount.user.id]);
    expect(saved.venueId).toBeUndefined();
    expect(saved.sharedObjective).toBeUndefined();
    expect(saved.preparation).toBeUndefined();
    expect((await payload()).records.session).toHaveLength(1);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Session saved as draft" })
        .first(),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".pt-session-plan")).toContainText(
      "Ball control and first touch",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${output}/after-saved-390.png` });
    await context.close();

    const fresh = await api();
    await post(fresh, "/api/auth/sign-in/email", {
      email: coachEmail,
      password: coachPassword,
    });
    const relogged = await browser.newContext({
      storageState: await fresh.storageState(),
      viewport: { width: 390, height: 844 },
    });
    contexts.push(relogged);
    const reopened = await relogged.newPage();
    let editingTrainingPosts = 0;
    reopened.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith(`${root}/training`)
      )
        editingTrainingPosts++;
    });
    const mockPlacesRequests: {
      action: string;
      sessionToken: string;
      query?: string;
    }[] = [];
    // This deliberately fake UI transport never contacts Google. Server signature,
    // scope and persisted selected-place behavior are covered in unit/service tests.
    await reopened.route(`**${root}/places`, async (intercept) => {
      if (intercept.request().method() === "GET")
        return intercept.fulfill({ json: { status: "AVAILABLE" } });
      const body = intercept.request().postDataJSON() as {
        action: string;
        sessionToken: string;
        query?: string;
        operationalLocation?: string;
      };
      mockPlacesRequests.push(body);
      if (body.action === "search") {
        if (body.query === "No results")
          return intercept.fulfill({ json: { suggestions: [] } });
        if (body.query === "Service outage")
          return intercept.fulfill({
            status: 503,
            json: {
              error:
                "Google Maps is temporarily unavailable. Your manual location is still usable.",
            },
          });
        return intercept.fulfill({
          json: {
            suggestions: [
              {
                placeId: "synthetic-place-fixture",
                description: "Synthetic location — fake provider QA",
              },
            ],
          },
        });
      }
      return intercept.fulfill({
        json: {
          place: {
            placeId: "synthetic-place-fixture",
            name: "Synthetic location",
            address: "Synthetic address fixture",
            location: body.operationalLocation,
            attributions: [
              {
                provider: "Fictional attribution provider",
                providerUri: "https://example.test/provider",
              },
            ],
            confirmation: "fake-ui-receipt-never-persisted",
          },
        },
      });
    });
    await reopened.goto(
      `/workspace/${academy.id}?section=training&session=${saved.id}`,
    );
    await expect(reopened.locator(".pt-session-plan")).toContainText(
      "Ball control and first touch",
    );
    await reopened
      .getByRole("button", { name: "Edit Draft", exact: true })
      .click();
    const editing = reopened.getByRole("dialog", {
      name: "Edit Training Plan",
      exact: true,
    });
    await editing
      .locator("summary")
      .filter({ hasText: "Find a location with Google Maps" })
      .click();
    const mapsInput = editing.getByLabel("Google Maps location search", {
      exact: true,
    });
    await mapsInput.fill("No results");
    await mapsInput.press("Enter");
    await expect(editing).toContainText("No places found.");
    expect(
      editingTrainingPosts,
      "Enter in Maps search must never submit the session form",
    ).toBe(0);
    await mapsInput.fill("Service outage");
    await editing
      .getByRole("button", { name: "Search locations", exact: true })
      .click();
    await expect(editing).toContainText(
      "Google Maps is temporarily unavailable.",
    );
    await mapsInput.fill("Synthetic location");
    await editing
      .getByRole("button", { name: "Search locations", exact: true })
      .click();
    await editing
      .getByRole("button", {
        name: "Synthetic location — fake provider QA",
        exact: true,
      })
      .click();
    await expect(editing).toContainText("Synthetic address fixture");
    await expect(
      editing.getByRole("link", {
        name: "Fictional attribution provider",
        exact: true,
      }),
    ).toHaveAttribute("href", "https://example.test/provider");
    await editing
      .getByRole("button", { name: "Confirm map selection", exact: true })
      .click();
    await expect(
      editing.getByLabel("Training location", { exact: true }),
    ).toHaveValue("Excelsior American School");
    const searchToken = mockPlacesRequests.find(
      (request) => request.query === "Synthetic location",
    )!.sessionToken;
    expect(
      mockPlacesRequests.find((request) => request.action === "select")!
        .sessionToken,
    ).toBe(searchToken);
    await reopened.screenshot({
      path: `${output}/mock-maps-selection-390.png`,
    });
    // Return to the manual workflow before saving: a fabricated Maps receipt is
    // never accepted as real provider confirmation or persisted as a Place ID.
    await editing
      .getByLabel("Training location", { exact: true })
      .fill("Changed independent manual label");
    await editing
      .getByLabel("Training location", { exact: true })
      .fill("Excelsior American School");
    const customTheme =
      `Passing & receiving — revised <practice>. ${"Controlled first touch before a change of direction. ".repeat(20)}`.trim();
    await editing
      .getByRole("combobox", { name: "Session theme options", exact: true })
      .selectOption("__custom");
    await editing
      .getByLabel("Session theme", { exact: true })
      .fill(customTheme);
    const editSaved = reopened.waitForResponse(
      (result) =>
        result.url().endsWith(`${root}/training`) &&
        result.request().method() === "POST",
    );
    await editing
      .getByRole("button", { name: "Save session draft", exact: true })
      .click();
    const editedResponse = await editSaved;
    expect(editedResponse.status(), await editedResponse.text()).toBe(200);
    const edited = (await editedResponse.json()) as FootballSession;
    expect(edited.id).toBe(saved.id);
    expect(edited.version).toBe(saved.version + 1);
    expect(edited.status).toBe("DRAFT");
    expect(edited.googlePlaceId).toBeUndefined();
    await expect(editing).not.toBeVisible();
    await reopened.reload();
    await expect(reopened.locator(".pt-session-plan")).toContainText(
      customTheme,
    );
    expect(
      await reopened.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await reopened.screenshot({ path: `${output}/after-custom-theme-390.png` });
    const final = await payload(fresh);
    expect(final.records.session).toHaveLength(1);
    expect(final.records.session[0].id).toBe(saved.id);
    expect(pageErrors).toEqual([]);
    await writeFile(
      `${output}/after.json`,
      JSON.stringify(
        {
          minimumDraft: "PASS",
          requiredFields: "PASS",
          optionalAgenda: "PASS",
          durationValidation:
            "PASS; end time is derived from a positive bounded duration",
          networkRetention: "PASS",
          repeatedClickCount: final.records.session.length,
          refreshAndLogin: "PASS",
          sameIdEdit: "PASS",
          savedStatus: edited.status,
          syntheticAcademyId: academy.id,
          sessionId: saved.id,
          mapsManualFallback:
            "PASS; real provider configuration blocked, no external request",
          mapsUiWithFakeTransport:
            "PASS; no results, outage, selected place and shared session token; fake place never persisted",
          pageErrors,
        },
        null,
        2,
      ),
    );
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    for (const request of requests) await request.dispose();
  }
});
