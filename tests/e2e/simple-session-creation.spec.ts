import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evidencePath } from "./evidence-path";
import type {
  WorkspacePayload,
  WorkspacePlayer,
} from "../../src/domain/workspace";
import type {
  FootballSession,
  FootballSquad,
  FootballVenue,
} from "../../src/domain/training";

test("Quick Create saves unfinished real drafts, survives interrupted responses and preserves session controls and scope", async ({
  playwright,
  browser,
  baseURL,
}) => {
  test.setTimeout(420000);
  const origin = new URL(baseURL ?? "http://127.0.0.1:3012").origin;
  const suffix = crypto.randomUUID();
  const shots = evidencePath("docs/screenshots/session-creation/after");
  const apis: APIRequestContext[] = [];
  const contexts: BrowserContext[] = [];
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  const captures: {
    file: string;
    width: number;
    height: number;
    sha256: string;
  }[] = [];
  await mkdir(shots, { recursive: true });
  let registrations = 0;
  async function account(name: string) {
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    apis.push(api);
    const email = `${name}-${suffix}@example.test`;
    const password = `Synthetic-only-${crypto.randomUUID()}`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password },
    });
    expect(response.status(), await response.text()).toBe(200);
    return {
      api,
      name,
      email,
      password,
      id: (await response.json()).user.id as string,
    };
  }
  async function post<T>(
    api: APIRequestContext,
    path: string,
    data: unknown,
    status = 200,
  ): Promise<T> {
    const response = await api.post(path, { data });
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  }
  async function capture(
    page: Page,
    file: string,
    width: number,
    dialog = false,
  ) {
    await page.setViewportSize({ width, height: width >= 1000 ? 1024 : 844 });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${file}: document overflow`).toBe(false);
    if (dialog) {
      expect(
        await page
          .getByRole("dialog")
          .evaluate((element) => element.scrollWidth > element.clientWidth + 1),
        `${file}: dialog overflow`,
      ).toBe(false);
      await expect(
        page.getByRole("button", { name: "Save Session Draft", exact: true }),
      ).toBeInViewport();
    }
    const bytes = await page.screenshot({
      path: `${shots}/${file}`,
      fullPage: !dialog,
    });
    captures.push({
      file,
      width,
      height: width >= 1000 ? 1024 : 844,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  try {
    const owner = await account("SessionOwner");
    const coachA = await account("SessionCoachA");
    const coachB = await account("SessionCoachB");
    const parent = await account("SessionGuardian");
    const academyData = {
      name: "Synthetic Quick Session Academy",
      contactEmail: "quick-session-academy@example.test",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      modules: ["development", "reports", "communication"],
      demo: false,
    };
    const academy = await post<{ id: string }>(
      owner.api,
      "/api/workspaces",
      academyData,
      201,
    );
    const aid = academy.id;
    const root = `/api/workspaces/${aid}`;
    const trainingRoute = `/workspace/${aid}?section=training`;
    const payload = async (api = owner.api) => {
      const response = await api.get(root);
      expect(response.status(), await response.text()).toBe(200);
      return response.json() as Promise<WorkspacePayload>;
    };
    const save = <T>(kind: string, data: unknown) =>
      post<T>(owner.api, `${root}/records/${kind}`, data, 201);
    const command = <T>(
      action: string,
      data: unknown,
      id?: string,
      expectedVersion = 0,
      api = owner.api,
      status = 200,
    ) =>
      post<T>(
        api,
        `${root}/training`,
        { requestId: crypto.randomUUID(), action, data, id, expectedVersion },
        status,
      );
    for (const coach of [coachA, coachB]) {
      const invitation = await post<{ token: string }>(
        owner.api,
        `${root}/actions`,
        {
          action: "invite",
          verified: true,
          data: { email: coach.email, role: "COACH" },
        },
      );
      await post(coach.api, "/api/invitations/accept", {
        token: invitation.token,
      });
    }
    const branch = await save<{ id: string }>("branch", {
      name: "Recorded Quick Session Branch",
      timezone: "Asia/Kolkata",
    });
    const drill = await save<{ id: string }>("drill", {
      sportId: "football",
      name: "Synthetic close-control turns",
      focusArea: "Dribbling",
      purpose: "Keep the ball close when changing direction",
      cue: "Small touches then look up",
    });
    expect((await payload()).records.squad).toEqual([]);
    const context = await browser.newContext({
      baseURL: origin,
      storageState: await owner.api.storageState(),
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== origin)
        externalRequests.push(url.origin + url.pathname);
    });
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto(`${trainingRoute}&create=session`);
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", {
        name: "Quick Create Session",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByText("No training batch created yet", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Save Session Draft", exact: true }),
    ).toBeEnabled();
    await dialog
      .getByRole("button", { name: "Save Session Draft", exact: true })
      .click();
    await expect(
      dialog.getByLabel("Training batch", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      dialog.getByLabel("Session date", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      dialog.getByLabel("Start time", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await capture(page, "missing-batch-1440.png", 1440, true);
    await dialog
      .getByRole("button", { name: "Create training batch", exact: true })
      .click();
    await dialog
      .getByLabel("Squad name", { exact: true })
      .fill("U10 Quick Create");
    await dialog
      .getByRole("combobox", { name: /Squad branch/ })
      .selectOption(branch.id);
    await dialog
      .getByRole("button", { name: "Save squad", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", {
        name: "Quick Create Session",
        exact: true,
      }),
    ).toBeVisible();
    const batchA = (await payload()).records.squad.find(
      (batch) => batch.name === "U10 Quick Create",
    )!;
    expect(batchA).toBeTruthy();
    await expect(
      dialog.getByLabel("Training batch", { exact: true }),
    ).toHaveValue(batchA.id);
    await expect(
      dialog.getByText(
        "No saved venues in this branch. You can enter a location.",
        { exact: true },
      ),
    ).toBeVisible();
    await dialog.getByLabel("Session date", { exact: true }).fill("2032-10-19");
    await dialog.getByLabel("Start time", { exact: true }).fill("17:00");
    await dialog.getByLabel("Duration (minutes)", { exact: true }).fill("481");
    await dialog
      .getByRole("button", { name: "Save Session Draft", exact: true })
      .click();
    await expect(
      dialog.getByLabel("Duration (minutes)", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await dialog.getByLabel("Duration (minutes)", { exact: true }).fill("90");
    await expect(
      dialog.getByLabel("Training focus", { exact: true }),
    ).toHaveValue("");
    await expect(
      dialog.getByLabel("Session venue", { exact: true }),
    ).toHaveValue("");
    await expect(
      dialog.getByLabel("Add agenda drill", { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByLabel("Shared development focus", { exact: true }),
    ).toHaveCount(0);
    await expect(dialog.getByText(/Coach: Not assigned yet/)).toBeVisible();

    // First lose the request; then lose a committed response. Both retries must
    // retain the entered draft and reuse the existing idempotency key.
    const submissions: { requestId: string; data: unknown }[] = [];
    let committed!: FootballSession;
    let releaseSuccessfulSave!: () => void;
    const successfulSaveGate = new Promise<void>((resolve) => {
      releaseSuccessfulSave = resolve;
    });
    const trainingPattern = `**/api/workspaces/${aid}/training`;
    await page.route(trainingPattern, async (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.continue();
      const body = request.postDataJSON() as {
        requestId: string;
        action: string;
        data: unknown;
        id?: string;
      };
      if (body.action !== "session" || body.id) return route.continue();
      submissions.push({ requestId: body.requestId, data: body.data });
      if (submissions.length === 1) return route.abort("failed");
      if (submissions.length === 2) {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        committed = (await response.json()) as FootballSession;
        return route.abort("failed");
      }
      await successfulSaveGate;
      return route.continue();
    });
    const saveDraft = dialog.getByRole("button", {
      name: "Save Session Draft",
      exact: true,
    });
    await saveDraft.click();
    await expect(
      dialog.getByText("Save failed — retry", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByLabel("Session date", { exact: true }),
    ).toHaveValue("2032-10-19");
    await expect(dialog.getByLabel("Start time", { exact: true })).toHaveValue(
      "17:00",
    );
    expect((await payload()).records.session).toHaveLength(0);
    await capture(page, "failed-save-retained-320.png", 320, true);
    await saveDraft.click();
    await expect(
      dialog.getByText("Save failed — retry", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await payload()).records.session.length)
      .toBe(1);
    // The confirmed response must still populate the saved session if the
    // follow-up workspace refresh fails.
    let interruptedRefreshes = 0;
    await page.route(
      `**/api/workspaces/${aid}`,
      (route) => {
        interruptedRefreshes++;
        return route.abort("failed");
      },
      { times: 1 },
    );
    const duplicateClicks = saveDraft.dblclick();
    try {
      await expect(
        dialog.getByRole("button", { name: "Saving...", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByText("Session saved as draft", { exact: true }),
      ).toHaveCount(0);
    } finally {
      releaseSuccessfulSave();
    }
    await duplicateClicks;
    await expect(dialog).not.toBeVisible();
    expect(interruptedRefreshes).toBe(1);
    await page.unroute(trainingPattern);
    expect(submissions).toHaveLength(3);
    expect(
      new Set(submissions.map((submission) => submission.requestId)).size,
    ).toBe(1);
    expect(
      new Set(submissions.map((submission) => JSON.stringify(submission.data)))
        .size,
    ).toBe(1);
    await expect(page).toHaveURL(new RegExp(`session=${committed.id}`));
    await expect(
      page.getByText("Session saved as draft", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "U10 Quick Create Training",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Coach not assigned yet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Training focus not recorded yet", { exact: true }),
    ).toBeVisible();
    expect(committed).toMatchObject({
      status: "DRAFT",
      coachIds: [],
      agenda: [],
      theme: "",
      location: "",
      squadId: batchA.id,
      timezone: "Asia/Kolkata",
      endLocal: "2032-10-19T18:30",
    });
    let data = await payload();
    expect(data.records.session).toHaveLength(1);
    expect(data.records.attendance).toEqual([]);
    for (const kind of ["report", "update", "weekly", "evidence"] as const)
      expect(data.records[kind]).toEqual([]);
    for (const width of [1440, 390, 320])
      await capture(page, `saved-session-${width}.png`, width);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "U10 Quick Create Training",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Schedule Session", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Assign an authorised session coach" })
        .first(),
    ).toBeVisible();
    expect((await payload()).records.session[0].status).toBe("DRAFT");
    await page
      .getByRole("button", { name: "Add Activities", exact: true })
      .click();
    const edit = page.getByRole("dialog");
    await expect(
      edit
        .getByRole("heading", { name: "Edit Training Plan", exact: true })
        .first(),
    ).toBeVisible();
    await edit
      .getByLabel("Training location", { exact: true })
      .fill("Recorded manual training ground");
    await edit.getByRole("checkbox", { name: owner.name, exact: true }).check();
    await edit
      .getByLabel("Add agenda drill", { exact: true })
      .selectOption(drill.id);
    await edit
      .getByLabel("Shared development focus", { exact: true })
      .fill("Receive into space");
    await edit
      .getByRole("button", { name: "Save session draft", exact: true })
      .click();
    await expect(edit).not.toBeVisible();
    data = await payload();
    const planned = data.records.session.find(
      (session) => session.id === committed.id,
    )!;
    expect(planned.agenda[0].drill.id).toBe(drill.id);
    expect(planned.sharedObjective).toEqual({
      goal: "Receive into space",
      cue: "",
      observe: "",
    });
    expect(planned.coachIds).toEqual([owner.id]); // Explicitly checked above, never inferred.
    expect(planned.roster).toEqual([]);
    await page
      .getByRole("button", { name: "Schedule Session", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Start Session", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Start Session", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Continue Session", exact: true }),
    ).toBeVisible();

    const playerA = await save<WorkspacePlayer>("player", {
      name: "Synthetic Quick U10 Player",
      squad: batchA.name,
      coachId: coachA.id,
      ageCategory: "U10",
      sportIds: ["football"],
    });
    const playerB = await save<WorkspacePlayer>("player", {
      name: "Synthetic Quick U12 Player",
      squad: "U12 Quick Create",
      coachId: coachB.id,
      ageCategory: "U12",
      sportIds: ["football"],
    });
    await command<FootballSquad>(
      "squad",
      { name: batchA.name, branchId: branch.id, playerIds: [playerA.id] },
      batchA.id,
      batchA.version,
    );
    const batchB = await command<FootballSquad>("squad", {
      name: "U12 Quick Create",
      branchId: branch.id,
      playerIds: [playerB.id],
    });
    const ground = await command<FootballVenue>("venue", {
      name: "Synthetic independent zones",
      branchId: branch.id,
      location: "Synthetic training ground",
      independentChildren: true,
    });
    const zoneA = await command<FootballVenue>("venue", {
      name: "Synthetic Zone A",
      branchId: branch.id,
      location: "Recorded Zone A",
      parentVenueId: ground.id,
    });
    const zoneB = await command<FootballVenue>("venue", {
      name: "Synthetic Zone B",
      branchId: branch.id,
      location: "Recorded Zone B",
      parentVenueId: ground.id,
    });
    const separatePitch = await command<FootballVenue>("venue", {
      name: "Synthetic separate pitch",
      branchId: branch.id,
      location: "Recorded separate pitch",
    });
    const parentInvite = await post<{ token: string }>(
      owner.api,
      `${root}/actions`,
      {
        action: "invite",
        verified: true,
        data: {
          email: parent.email,
          role: "PARENT",
          playerIds: [playerA.id],
          guardianVerified: true,
        },
      },
    );
    await post(parent.api, "/api/invitations/accept", {
      token: parentInvite.token,
    });
    await page.goto(`${trainingRoute}&create=session`);
    await dialog
      .getByLabel("Training batch", { exact: true })
      .selectOption(batchA.id);
    await dialog.getByLabel("Session date", { exact: true }).fill("2032-10-20");
    await dialog.getByLabel("Start time", { exact: true }).fill("16:15");
    await dialog.getByLabel("Duration (minutes)", { exact: true }).fill("75");
    await dialog
      .getByLabel("Session venue", { exact: true })
      .selectOption(zoneA.id);
    const customFocus = "Close control <practice> & turning";
    await dialog
      .getByLabel("Training focus", { exact: true })
      .fill(customFocus);
    await dialog.getByText("Optional details", { exact: true }).click();
    await expect(
      dialog.getByLabel("Assigned session coach", { exact: true }),
    ).toHaveValue(coachA.id);
    await dialog
      .getByLabel("Custom session title", { exact: true })
      .fill("U10 Autumn Session");
    await dialog
      .getByRole("button", { name: "Save Session Draft", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/session=[a-zA-Z0-9-]+/);
    const customId = new URL(page.url()).searchParams.get("session")!;
    await expect(
      page.getByRole("heading", { name: "U10 Autumn Session", exact: true }),
    ).toBeVisible();
    data = await payload();
    const custom = data.records.session.find(
      (session) => session.id === customId,
    )!;
    expect(custom).toMatchObject({
      title: "U10 Autumn Session",
      theme: customFocus,
      coachIds: [coachA.id],
      location: zoneA.location,
      venueId: zoneA.id,
      startLocal: "2032-10-20T16:15",
      endLocal: "2032-10-20T17:30",
      roster: [{ playerId: playerA.id, name: playerA.name }],
    });
    expect(
      data.records.attendance
        .filter((attendance) => attendance.sessionId === customId)
        .map((attendance) => attendance.status),
    ).toEqual(["UNMARKED"]);
    await page
      .getByRole("button", { name: "Review Players", exact: true })
      .click();
    await expect(
      page.getByText(playerA.name, { exact: true }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "U10 Autumn Session", exact: true }),
    ).toBeVisible();
    await context.clearCookies();
    await page.goto(`${trainingRoute}&session=${customId}`);
    await expect(page).toHaveURL(/\/sign-in/);
    await page.getByLabel("Email", { exact: true }).fill(owner.email);
    await page.getByLabel("Password", { exact: true }).fill(owner.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/workspace/);
    await page.goto(`${trainingRoute}&session=${customId}`);
    await expect(
      page.getByRole("heading", { name: "U10 Autumn Session", exact: true }),
    ).toBeVisible();
    await capture(page, "configured-session-after-login-1440.png", 1440);

    // The existing scheduling regression suite covers buffers, copy/reschedule,
    // historical outcomes and independent zones. Exercise the new draft path
    // through the same real operational gate as an additional browser check.
    const sessionData = {
      branchId: branch.id,
      squadId: batchA.id,
      timezone: "Asia/Kolkata",
      startLocal: custom.startLocal,
      endLocal: custom.endLocal,
      coachIds: [coachA.id],
      location: zoneA.location,
      venueId: zoneA.id,
      theme: "",
      agenda: [],
    };
    await command(
      "session",
      { ...sessionData, endLocal: "2032-10-20T15:00" },
      undefined,
      0,
      owner.api,
      400,
    );
    const scheduled = await command<FootballSession>(
      "status",
      { status: "SCHEDULED" },
      custom.id,
      custom.version,
    );
    const venueConflict = await command<FootballSession>("session", {
      ...sessionData,
      squadId: batchB.id,
      coachIds: [coachB.id],
    });
    await command(
      "status",
      { status: "SCHEDULED" },
      venueConflict.id,
      venueConflict.version,
      owner.api,
      409,
    );
    const parallel = await command<FootballSession>("session", {
      ...sessionData,
      squadId: batchB.id,
      coachIds: [coachB.id],
      venueId: zoneB.id,
      location: zoneB.location,
    });
    expect(
      (
        await command<FootballSession>(
          "status",
          { status: "SCHEDULED" },
          parallel.id,
          parallel.version,
        )
      ).status,
    ).toBe("SCHEDULED");
    const coachConflict = await command<FootballSession>("session", {
      ...sessionData,
      venueId: separatePitch.id,
      location: separatePitch.location,
    });
    await command(
      "status",
      { status: "SCHEDULED" },
      coachConflict.id,
      coachConflict.version,
      owner.api,
      409,
    );
    await command(
      "session",
      { ...sessionData, coachIds: [] },
      undefined,
      0,
      coachA.api,
      403,
    );
    await command("session", sessionData, undefined, 0, parent.api, 403);
    await command(
      "session",
      { ...sessionData, coachIds: [coachB.id] },
      custom.id,
      scheduled.version,
      coachB.api,
      404,
    );
    const foreign = await post<{ id: string }>(
      owner.api,
      "/api/workspaces",
      { ...academyData, name: "Other Synthetic Session Academy" },
      201,
    );
    const foreignRoot = `/api/workspaces/${foreign.id}`;
    const foreignBranch = await post<{ id: string }>(
      owner.api,
      `${foreignRoot}/records/branch`,
      { name: "Other branch", timezone: "Asia/Kolkata" },
      201,
    );
    const foreignBatch = await post<FootballSquad>(
      owner.api,
      `${foreignRoot}/training`,
      {
        requestId: crypto.randomUUID(),
        action: "squad",
        data: {
          name: "Other academy batch",
          branchId: foreignBranch.id,
          playerIds: [],
        },
      },
    );
    await command(
      "session",
      { ...sessionData, squadId: foreignBatch.id },
      undefined,
      0,
      owner.api,
      404,
    );
    const anonymous = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    apis.push(anonymous);
    await command("session", sessionData, undefined, 0, anonymous, 401);
    const parentData = await payload(parent.api);
    expect(parentData.records.session).toEqual([]);
    data = await payload();
    expect(
      data.records.session.find((session) => session.id === committed.id)
        ?.roster,
    ).toEqual([]);
    expect(
      data.records.session.find((session) => session.id === custom.id)?.status,
    ).toBe("SCHEDULED");
    expect(
      data.records.session.find((session) => session.id === venueConflict.id)
        ?.status,
    ).toBe("DRAFT");
    expect(
      data.records.session.find((session) => session.id === coachConflict.id)
        ?.status,
    ).toBe("DRAFT");
    for (const kind of ["report", "update", "weekly", "evidence"] as const)
      expect(data.records[kind]).toEqual([]);
    await page.goto(`${trainingRoute}&create=session`);
    await dialog
      .getByLabel("Training batch", { exact: true })
      .selectOption(batchA.id);
    await dialog.getByLabel("Session date", { exact: true }).fill("2032-10-21");
    await dialog.getByLabel("Start time", { exact: true }).fill("17:00");
    for (const width of [1440, 390, 320])
      await capture(page, `create-session-${width}.png`, width, true);
    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
    await writeFile(
      `${shots}/verification.json`,
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          fictionalIsolatedAcademy: true,
          cases: [
            "missing batch action returns to Quick Create",
            "required field errors",
            "duration validation",
            "no activity/focus/venue draft",
            "unassigned owner is not auto-selected",
            "request failure retains inputs",
            "lost response retries without duplicate session",
            "duplicate clicks share one request key",
            "confirmed save survives interrupted workspace refresh",
            "actual saved-session navigation",
            "refresh and real sign-in persistence",
            "configured venue and custom focus/title",
            "prefilled authorised coach",
            "activities and partial shared plan after saving",
            "Schedule and Start requirements",
            "real coach and venue conflicts",
            "valid simultaneous independent batches",
            "parent/coach/anonymous/cross-academy guards",
            "desktop and mobile overflow checks",
          ],
          requestAttempts: submissions.length,
          uniqueSubmissionKeys: new Set(
            submissions.map((submission) => submission.requestId),
          ).size,
          pageErrors,
          externalRequests,
          captures,
        },
        null,
        2,
      ),
    );
  } finally {
    for (const context of contexts) await context.close();
    for (const api of apis) await api.dispose();
  }
});
