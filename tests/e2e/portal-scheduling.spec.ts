import { evidencePath } from "./evidence-path";
import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type {
  WorkspacePayload,
  WorkspacePlayer,
} from "../../src/domain/workspace";
import type {
  FootballSession,
  FootballSquad,
  FootballVenue,
} from "../../src/domain/training";
import type { WeeklyPlan } from "../../src/domain/communication";

test.use({ actionTimeout: 15000 });

test("real Calendar and Training controls preserve session identity, shared plans, conflicts and dated outcomes", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(420000);
  const origin = "http://127.0.0.1:3001";
  const suffix = crypto.randomUUID();
  const day = "2032-10-19";
  const shots = evidencePath("docs/screenshots/academy-portal/scheduling");
  const apis: APIRequestContext[] = [];
  const contexts: BrowserContext[] = [];
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  let registrations = 0;
  await mkdir(shots, { recursive: true });

  function watch(page: Page) {
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== origin)
        externalRequests.push(url.origin + url.pathname);
    });
  }
  async function account(name: string) {
    // Use the normal Better Auth throttle; no direct membership or cookie writes.
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    apis.push(api);
    const email = `${name}-${suffix}@example.test`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password: `Synthetic-only-${crypto.randomUUID()}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    return { api, email, id: (await response.json()).user.id as string };
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

  try {
    const owner = await account("SchedulingOwner");
    const coach = await account("SchedulingCoachA");
    const otherCoach = await account("SchedulingCoachB");
    const academy = await post<{ id: string }>(
      owner.api,
      "/api/workspaces",
      {
        name: "Synthetic Scheduling Academy",
        contactEmail: "scheduling-academy@example.test",
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
    const aid = academy.id;
    const root = `/api/workspaces/${aid}`;
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
    ) =>
      post<T>(owner.api, `${root}/training`, {
        requestId: crypto.randomUUID(),
        action,
        data,
        id,
        expectedVersion,
      });
    for (const person of [coach, otherCoach]) {
      const invitation = await post<{ token: string }>(
        owner.api,
        `${root}/actions`,
        {
          action: "invite",
          verified: true,
          data: { email: person.email, role: "COACH" },
        },
      );
      await post(person.api, "/api/invitations/accept", {
        token: invitation.token,
      });
    }
    expect((await payload()).records.session).toEqual([]);
    expect((await payload()).records.player).toEqual([]);
    const branch = await save<{ id: string }>("branch", {
      name: "Synthetic Scheduling Branch",
      timezone: "Asia/Kolkata",
    });
    const drill = await save<{ id: string }>("drill", {
      name: "Recorded close-control turns",
      sportId: "football",
      focusArea: "Dribbling",
      purpose: "Keep the ball close when changing direction",
      cue: "Small touches, then look up",
    });
    const people = [coach, otherCoach, owner];
    const names = ["U10 Foundations", "U12 Development", "U14 Competitive"];
    const players: WorkspacePlayer[] = [];
    const squads: FootballSquad[] = [];
    let secondRosterPlayer!: WorkspacePlayer;
    for (let index = 0; index < people.length; index++) {
      const player = await save<WorkspacePlayer>("player", {
        name: `Synthetic ${names[index]} Player`,
        squad: names[index],
        ageCategory: ["U10", "U12", "U14"][index],
        coachId: people[index].id,
        sportIds: ["football"],
        status: "ACTIVE",
      });
      players.push(player);
      const playerIds = [player.id];
      if (index === 0) {
        secondRosterPlayer = await save<WorkspacePlayer>("player", {
          name: "Synthetic U10 Second Player",
          squad: names[index],
          ageCategory: "U10",
          coachId: coach.id,
          sportIds: ["football"],
          status: "ACTIVE",
        });
        playerIds.push(secondRosterPlayer.id);
      }
      squads.push(
        await command<FootballSquad>("squad", {
          name: names[index],
          branchId: branch.id,
          playerIds,
        }),
      );
    }
    const ground = await command<FootballVenue>("venue", {
      name: "Synthetic Whole Ground",
      branchId: branch.id,
      location: "Synthetic Ground",
      independentChildren: true,
      exclusive: true,
    });
    const venues: FootballVenue[] = [];
    for (const name of ["Zone A", "Zone B", "Main Pitch"])
      venues.push(
        await command<FootballVenue>("venue", {
          name: `Synthetic ${name}`,
          branchId: branch.id,
          location: `Synthetic Ground · ${name}`,
          ...(name === "Main Pitch" ? {} : { parentVenueId: ground.id }),
          exclusive: true,
        }),
      );
    const sessions: FootballSession[] = [];
    for (let index = 0; index < people.length; index++) {
      const draft = await command<FootballSession>("session", {
        branchId: branch.id,
        squadId: squads[index].id,
        venueId: venues[index].id,
        location: venues[index].location,
        coachIds: [people[index].id],
        timezone: "Asia/Kolkata",
        startLocal: `${day}T17:00`,
        endLocal: `${day}T18:30`,
        theme: `${names[index]} technical training`,
        agenda: [{ drillId: drill.id, duration: 15 }],
        sharedObjective: {
          goal: "Close control after changing direction",
          cue: "Keep the ball close and look up",
          observe: "Controlled touches during the shared activity",
        },
        preparation: ["Bring water and suitable training boots"],
      });
      sessions.push(
        await command<FootballSession>(
          "status",
          { status: "SCHEDULED" },
          draft.id,
          draft.version,
        ),
      );
    }
    const [first, second, third] = sessions;
    const original = await payload();
    expect(original.records.plan).toEqual([]);
    expect(original.records.evidence).toEqual([]);
    expect(original.records.attendance).toHaveLength(4);
    expect(
      original.records.attendance.every(
        (record) => record.status === "UNMARKED",
      ),
    ).toBe(true);

    const ownerContext = await browser.newContext({
      storageState: await owner.api.storageState(),
      viewport: { width: 1536, height: 1024 },
    });
    contexts.push(ownerContext);
    const page = await ownerContext.newPage();
    watch(page);
    async function calendar(view = "Week", session = "") {
      await page.goto(
        `/workspace/${aid}?section=calendar&date=${day}&view=${view}${session ? `&session=${session}` : ""}`,
      );
      await page.bringToFront();
      await expect(
        page.getByRole("heading", { name: "Calendar", exact: true }),
      ).toBeVisible();
    }
    const panel = () => page.locator(".pc-desktop-panel .pc-panel");
    async function uiTraining(
      action: string,
      click: () => Promise<unknown>,
      status = 200,
    ) {
      const response = page.waitForResponse((response) => {
        if (
          new URL(response.url()).pathname !== `${root}/training` ||
          response.request().method() !== "POST"
        )
          return false;
        return response.request().postDataJSON()?.action === action;
      });
      await click();
      const saved = await response;
      expect(saved.status(), await saved.text()).toBe(status);
      return {
        record: (await saved.json()) as FootballSession,
        submitted: saved.request().postDataJSON() as {
          id: string;
          expectedVersion: number;
          data: Record<string, unknown>;
        },
      };
    }

    await test.step("Week, Month and Agenda keep parallel records and exact side-panel context", async () => {
      await calendar();
      const grid = page.locator(".pc-view-week");
      for (const session of sessions)
        await expect(
          grid.locator(`button[data-session-id="${session.id}"]`),
        ).toHaveCount(1);
      await grid.locator(`button[data-session-id="${second.id}"]`).click();
      await expect(panel()).toHaveAttribute("data-session-id", second.id);
      await expect(
        panel().getByRole("heading", { name: names[1], exact: true }),
      ).toBeVisible();
      await expect(panel()).toContainText(venues[1].location);
      await panel()
        .getByRole("button", { name: "Players", exact: true })
        .click();
      await expect(panel().locator(".pc-roster")).toContainText(
        players[1].name,
      );
      await expect(panel().locator(".pc-roster")).not.toContainText(
        players[0].name,
      );
      await panel().getByRole("button", { name: "Plan", exact: true }).click();
      await expect(panel()).toContainText("Shared batch plan");
      await expect(panel()).toContainText("Recorded close-control turns");
      await panel()
        .getByRole("button", { name: "Details", exact: true })
        .click();
      await page.screenshot({
        path: `${shots}/calendar-week-selected-1536.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Month", exact: true }).click();
      for (const session of sessions)
        await expect(
          page.locator(`.pc-month-event[data-session-id="${session.id}"]`),
        ).toHaveCount(1);
      await page
        .locator(`.pc-month-event[data-session-id="${third.id}"]`)
        .click();
      await expect(panel()).toHaveAttribute("data-session-id", third.id);
      await expect(panel()).toContainText(venues[2].location);
      await page.screenshot({
        path: `${shots}/calendar-month-1536.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Agenda", exact: true }).click();
      await expect(page.locator(".pc-agenda-event")).toHaveCount(3);
      await page
        .locator(`.pc-agenda-event[data-session-id="${first.id}"]`)
        .click();
      await expect(panel()).toHaveAttribute("data-session-id", first.id);
      await page.screenshot({
        path: `${shots}/calendar-agenda-1536.png`,
        fullPage: true,
      });
    });

    await test.step("combined filters and date navigation survive real URL changes", async () => {
      await page.bringToFront();
      const venueFilter = page.getByRole("combobox", {
        name: "Venue or zone",
        exact: true,
      });
      await venueFilter.selectOption(ground.id);
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("venue") === ground.id,
      );
      await expect(page.locator(".pc-agenda-event")).toHaveCount(2);
      await expect(
        page.locator(`.pc-agenda-event[data-session-id="${third.id}"]`),
      ).toHaveCount(0);
      await page
        .getByRole("combobox", { name: "Batch", exact: true })
        .selectOption(squads[0].id);
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("batch") === squads[0].id,
      );
      await page
        .getByRole("combobox", { name: "Coach", exact: true })
        .selectOption(coach.id);
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("coach") === coach.id,
      );
      await page
        .getByRole("combobox", { name: "Session status", exact: true })
        .selectOption("SCHEDULED");
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("sessionStatus") === "SCHEDULED",
      );
      await expect(page.locator(".pc-agenda-event")).toHaveCount(1);
      await expect(page.locator(".pc-agenda-event")).toHaveAttribute(
        "data-session-id",
        first.id,
      );
      await venueFilter.selectOption(venues[1].id);
      await expect(page).toHaveURL(new RegExp(`venue=${venues[1].id}`));
      await expect(page.locator(".pc-agenda-event")).toHaveCount(0);
      await page.goBack();
      await expect(venueFilter).toHaveValue(ground.id);
      await expect(page.locator(".pc-agenda-event")).toHaveCount(1);
      await expect(
        page.getByRole("combobox", { name: "Batch", exact: true }),
      ).toHaveValue(squads[0].id);
      await page.goForward();
      await expect(venueFilter).toHaveValue(venues[1].id);
      await expect(page.locator(".pc-agenda-event")).toHaveCount(0);
      await venueFilter.selectOption(venues[0].id);
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("venue") === venues[0].id,
      );
      await expect(page.locator(".pc-agenda-event")).toHaveCount(1);
      await page.getByRole("button", { name: "Month", exact: true }).click();
      await expect(
        page.getByRole("combobox", { name: "Batch", exact: true }),
      ).toHaveValue(squads[0].id);
      await expect(
        page.getByRole("combobox", { name: "Coach", exact: true }),
      ).toHaveValue(coach.id);
      await expect(venueFilter).toHaveValue(venues[0].id);
      await expect(page.locator(".pc-month-event")).toHaveCount(1);
      await page
        .getByRole("combobox", { name: "Batch", exact: true })
        .selectOption("");
      await expect(page).toHaveURL((url) => !url.searchParams.has("batch"));
      await page
        .getByRole("combobox", { name: "Coach", exact: true })
        .selectOption("");
      await expect(page).toHaveURL((url) => !url.searchParams.has("coach"));
      await page
        .getByRole("combobox", { name: "Session status", exact: true })
        .selectOption("");
      await expect(page).toHaveURL(
        (url) => !url.searchParams.has("sessionStatus"),
      );
      await venueFilter.selectOption("");
      await expect(page).toHaveURL((url) => !url.searchParams.has("venue"));
      await page.getByRole("button", { name: "Week", exact: true }).click();
      await page
        .getByRole("button", { name: "Next week", exact: true })
        .click();
      await expect(page.locator(".pc-event")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Previous week", exact: true })
        .click();
      await expect(page.locator(".pc-event")).toHaveCount(3);
      await page.getByRole("button", { name: "Today", exact: true }).click();
      await expect(page).not.toHaveURL(new RegExp(`date=${day}`));
      await page.goBack();
      await expect(page.locator(".pc-event")).toHaveCount(3);
      await expect(
        page.getByRole("button", { name: "Week", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    await test.step("six widths remain usable and mobile details restore keyboard focus", async () => {
      await page.bringToFront();
      await panel()
        .getByRole("button", { name: "Close session details", exact: true })
        .click();
      for (const width of [1536, 1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1024 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `${shots}/calendar-week-${width}.png`,
          fullPage: true,
        });
      }
      await page.getByRole("button", { name: "Agenda", exact: true }).click();
      const selected = page.locator(
        `.pc-agenda-event[data-session-id="${first.id}"]`,
      );
      await selected.click();
      const sheet = page.getByRole("dialog", {
        name: "Session details",
        exact: true,
      });
      await expect(sheet).toBeVisible();
      await expect(sheet.locator(".pc-panel")).toHaveAttribute(
        "data-session-id",
        first.id,
      );
      await sheet.getByRole("button", { name: "Notes", exact: true }).click();
      await expect(sheet).toContainText(
        "No private observation notes recorded",
      );
      await page.screenshot({
        path: `${shots}/calendar-mobile-session-320.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(sheet).not.toBeVisible();
      await expect(selected).toBeFocused();
      await page.setViewportSize({ width: 1536, height: 1024 });
      await page.bringToFront();
      await selected.click();
    });

    await test.step("rescheduling retains the same ID/version and a real resource conflict retains entered values", async () => {
      await page.bringToFront();
      await panel()
        .getByRole("button", { name: "Reschedule", exact: true })
        .click();
      let editor = page.getByRole("dialog", {
        name: "Reschedule session",
        exact: true,
      });
      await editor
        .getByLabel("Session start", { exact: true })
        .fill("2032-10-20T23:00");
      await editor
        .getByLabel("Session end", { exact: true })
        .fill("2032-10-20T23:45");
      await editor
        .getByRole("textbox", { name: "Reason for change", exact: true })
        .fill("Coach reviewed the new training date");
      const moved = await uiTraining("reschedule", () =>
        editor
          .getByRole("button", { name: "Save new schedule", exact: true })
          .click(),
      );
      expect(moved.submitted.id).toBe(first.id);
      expect(moved.submitted.expectedVersion).toBe(first.version);
      expect(moved.record.id).toBe(first.id);
      expect(moved.record.version).toBe(first.version + 1);
      await expect(editor).not.toBeVisible();
      await expect(panel()).toHaveAttribute("data-session-id", first.id);
      await expect(panel()).toContainText("20 October 2032");
      await panel()
        .getByRole("button", { name: "View in Calendar", exact: true })
        .click();
      const lateEvent = page.locator(
        `.pc-view-week button[data-session-id="${first.id}"]`,
      );
      await expect(lateEvent).toHaveCount(1);
      await expect
        .poll(() =>
          lateEvent.evaluate((event) => {
            const timeline = event.closest(".pc-week-scroll")!,
              bounds = timeline.getBoundingClientRect(),
              target = event.getBoundingClientRect();
            return target.top >= bounds.top && target.bottom <= bounds.bottom;
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: `${shots}/calendar-late-selected-1536.png`,
        fullPage: true,
      });
      await lateEvent.click();
      const beforeConflict = await payload();
      expect(beforeConflict.records.attendance).toEqual(
        original.records.attendance,
      );
      await panel()
        .getByRole("button", { name: "Reschedule", exact: true })
        .click();
      editor = page.getByRole("dialog", {
        name: "Reschedule session",
        exact: true,
      });
      await editor
        .getByLabel("Session start", { exact: true })
        .fill(`${day}T17:15`);
      await editor
        .getByLabel("Session end", { exact: true })
        .fill(`${day}T18:00`);
      await editor
        .getByLabel("Training space", { exact: true })
        .selectOption(venues[1].id);
      await editor
        .getByRole("textbox", { name: "Reason for change", exact: true })
        .fill("Keep this entered draft after conflict review");
      await uiTraining(
        "reschedule",
        () =>
          editor
            .getByRole("button", { name: "Save new schedule", exact: true })
            .click(),
        409,
      );
      await expect(editor.getByRole("alert")).toContainText(
        "Scheduling conflict",
      );
      await expect(
        editor.getByLabel("Session start", { exact: true }),
      ).toHaveValue(`${day}T17:15`);
      await expect(
        editor.getByLabel("Training space", { exact: true }),
      ).toHaveValue(venues[1].id);
      await expect(
        editor.getByRole("textbox", { name: "Reason for change", exact: true }),
      ).toHaveValue("Keep this entered draft after conflict review");
      expect(
        (await payload()).records.session.find(
          (session) => session.id === first.id,
        ),
      ).toEqual(
        beforeConflict.records.session.find(
          (session) => session.id === first.id,
        ),
      );
      page.once("dialog", (dialog) => dialog.accept());
      await editor
        .getByRole("button", { name: "Close editor", exact: true })
        .click();
      await expect(editor).not.toBeVisible();
    });

    await test.step("Training opens the same actual shared plan and attendance changes only after an explicit save", async () => {
      await page.bringToFront();
      await panel()
        .getByRole("button", { name: "Open Session", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`section=training.*session=${first.id}`),
      );
      await expect(
        page.locator(".pt-session-list .pt-selected"),
      ).toHaveAttribute("data-session-id", first.id);
      await expect(page.locator(".pt-focus")).toContainText(
        "Close control after changing direction",
      );
      await expect(page.locator(".pt-drills")).toContainText(
        "Recorded close-control turns",
      );
      await expect(page.locator(".pt-coaching")).toContainText(
        "Keep the ball close and look up",
      );
      expect((await payload()).records.plan).toEqual([]);
      expect(
        (await payload()).records.session.find(
          (session) => session.id === first.id,
        )?.objectives,
      ).toEqual([]);
      expect((await payload()).records.attendance).toEqual(
        original.records.attendance,
      );
      await page
        .locator(".pt-actions")
        .getByRole("button", { name: "Mark Attendance", exact: true })
        .click();
      const desk = page.getByRole("dialog", {
        name: "Session Desk",
        exact: true,
      });
      await expect(
        desk.getByRole("heading", { name: "Attendance ledger", exact: true }),
      ).toBeVisible();
      const attendance = desk.getByRole("combobox", {
        name: new RegExp(`${players[0].name} attendance`),
      });
      await expect(attendance).toHaveValue("UNMARKED");
      await attendance.selectOption("PRESENT");
      expect(
        (await payload()).records.attendance.find(
          (record) =>
            record.sessionId === first.id && record.playerId === players[0].id,
        )?.status,
      ).toBe("UNMARKED");
      await uiTraining("attendance", () =>
        desk
          .getByRole("button", { name: "Save attendance", exact: true })
          .click(),
      );
      await expect(attendance).toHaveValue("PRESENT");
      await desk
        .getByRole("button", { name: "Close session editor", exact: true })
        .click();
      await expect(desk).not.toBeVisible();
      await page.screenshot({
        path: `${shots}/training-shared-plan-1536.png`,
        fullPage: true,
      });
      await page
        .locator(".pt-actions")
        .getByRole("button", { name: "View in Calendar", exact: true })
        .click();
      await expect(panel()).toHaveAttribute("data-session-id", first.id);
    });

    await test.step("returning from the second child's personal plan retains Evidence context and rejects an explicit invalid child", async () => {
      await page.bringToFront();
      await panel()
        .getByRole("button", { name: "Open Session", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Optional player personalisation",
          exact: true,
        })
        .click();
      let desk = page.getByRole("dialog", {
        name: "Session Desk",
        exact: true,
      });
      const secondCard = desk.locator("section.card").filter({
        has: page.getByRole("heading", {
          name: secondRosterPlayer.name,
          exact: true,
        }),
      });
      await expect(secondCard).toBeVisible();
      await secondCard
        .getByRole("button", { name: "View current player plan", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`section=development.*player=${secondRosterPlayer.id}`),
      );
      await expect(
        page.getByRole("combobox", { name: "Player", exact: true }),
      ).toHaveValue(secondRosterPlayer.id);
      await page
        .getByRole("navigation", { name: "Academy navigation", exact: true })
        .getByRole("button", { name: "Training", exact: true })
        .click();
      await expect(
        page.locator(".pt-session-list .pt-selected"),
      ).toHaveAttribute("data-session-id", first.id);
      await page
        .getByRole("navigation", {
          name: "Selected session sections",
          exact: true,
        })
        .getByRole("button", { name: "Notes", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Record an observation", exact: true })
        .click();
      desk = page.getByRole("dialog", { name: "Session Desk", exact: true });
      const evidencePlayer = desk.getByRole("combobox", {
        name: "Evidence player",
        exact: true,
      });
      await expect(evidencePlayer).toHaveValue(secondRosterPlayer.id);
      await evidencePlayer.selectOption(players[0].id);
      await expect(page).toHaveURL(new RegExp(`player=${players[0].id}`));
      await evidencePlayer.selectOption(secondRosterPlayer.id);
      await expect(page).toHaveURL(
        new RegExp(`player=${secondRosterPlayer.id}`),
      );
      await desk
        .getByRole("button", { name: "Close session editor", exact: true })
        .click();
      const invalid = `invalid-child-${suffix}`;
      await page.goto(
        `/workspace/${aid}?section=training&session=${first.id}&player=${invalid}&desk=Evidence`,
      );
      await page.bringToFront();
      desk = page.getByRole("dialog", { name: "Session Desk", exact: true });
      await expect(
        desk.getByRole("combobox", { name: "Evidence player", exact: true }),
      ).toHaveValue("");
      await expect(desk.getByRole("alert")).toContainText(
        "The selected player is not in this session roster",
      );
      await desk
        .getByRole("combobox", { name: "Evidence player", exact: true })
        .selectOption(players[0].id);
      await expect(page).toHaveURL(new RegExp(`player=${players[0].id}`));
      await expect(desk.getByRole("alert")).toHaveCount(0);
      await desk
        .getByRole("button", { name: "Close session editor", exact: true })
        .click();
      expect((await payload()).records.plan).toEqual([]);
      expect((await payload()).records.evidence).toEqual([]);
      await page
        .locator(".pt-actions")
        .getByRole("button", { name: "View in Calendar", exact: true })
        .click();
      await expect(panel()).toHaveAttribute("data-session-id", first.id);
    });

    let copied!: FootballSession;
    await test.step("copy creates an undated draft and clears source attendance instead of copying outcomes", async () => {
      await page.bringToFront();
      const before = await payload();
      expect(
        before.records.attendance.find(
          (record) =>
            record.sessionId === first.id && record.playerId === players[0].id,
        )?.status,
      ).toBe("PRESENT");
      const copy = await uiTraining("copy", () =>
        panel()
          .getByRole("button", { name: "Copy Session", exact: true })
          .click(),
      );
      copied = copy.record;
      expect(copied.id).not.toBe(first.id);
      expect(copied.copiedFromSessionId).toBe(first.id);
      expect(copied.status).toBe("DRAFT");
      expect([
        copied.startAt,
        copied.endAt,
        copied.startLocal,
        copied.endLocal,
      ]).toEqual(["", "", "", ""]);
      const current = await payload();
      expect(
        current.records.attendance
          .filter((record) => record.sessionId === copied.id)
          .map((record) => record.status),
      ).toEqual(["UNMARKED", "UNMARKED"]);
      expect(
        current.records.evidence.filter(
          (record) => record.sessionId === copied.id,
        ),
      ).toEqual([]);
      const editor = page.getByRole("dialog", {
        name: "Edit session draft",
        exact: true,
      });
      await expect(
        editor.getByLabel("Session start", { exact: true }),
      ).toHaveValue("");
      await expect(
        editor.getByLabel("Session end", { exact: true }),
      ).toHaveValue("");
      await editor
        .getByLabel("Session start", { exact: true })
        .fill("2032-10-21T17:00");
      await editor
        .getByLabel("Session end", { exact: true })
        .fill("2032-10-21T18:30");
      await editor
        .getByLabel("Session theme", { exact: true })
        .fill("Reviewed copied shared training plan");
      const saved = await uiTraining("session", () =>
        editor
          .getByRole("button", { name: "Save session draft", exact: true })
          .click(),
      );
      expect(saved.record.id).toBe(copied.id);
      expect(saved.record.status).toBe("DRAFT");
      copied = saved.record;
      await expect(editor).not.toBeVisible();
      await expect(panel()).toHaveAttribute("data-session-id", copied.id);
      await expect(panel()).toContainText("21 October 2032");
      await panel()
        .getByRole("button", { name: "Open Session", exact: true })
        .click();
      await expect(
        page.locator(".pt-session-list .pt-selected"),
      ).toHaveAttribute("data-session-id", copied.id);
      const scheduled = await uiTraining("status", () =>
        page
          .locator(".pt-actions")
          .getByRole("button", { name: "Schedule Session", exact: true })
          .click(),
      );
      expect(scheduled.record.id).toBe(copied.id);
      expect(scheduled.submitted.expectedVersion).toBe(copied.version);
      expect(scheduled.record.status).toBe("SCHEDULED");
      const started = await uiTraining("status", () =>
        page
          .locator(".pt-actions")
          .getByRole("button", { name: "Start Session", exact: true })
          .click(),
      );
      expect(started.record.id).toBe(copied.id);
      expect(started.submitted.expectedVersion).toBe(scheduled.record.version);
      expect(started.record.status).toBe("IN_PROGRESS");
      copied = started.record;
      const afterStart = await payload();
      expect(
        afterStart.records.attendance.find(
          (record) => record.sessionId === copied.id,
        )?.status,
      ).toBe("UNMARKED");
      expect(
        afterStart.records.attendance.find(
          (record) =>
            record.sessionId === first.id && record.playerId === players[0].id,
        )?.status,
      ).toBe("PRESENT");
    });

    await test.step("cancellation is explicit, versioned and historical; weekly batch plans remain reachable", async () => {
      await page.bringToFront();
      await page
        .locator(".pt-actions")
        .getByRole("button", { name: "Cancel Session", exact: true })
        .click();
      const cancellation = page.getByRole("dialog", {
        name: "Cancel session",
        exact: true,
      });
      await expect(
        cancellation.getByLabel("Cancellation reason", { exact: true }),
      ).toHaveValue("");
      expect(
        (await payload()).records.session.find(
          (session) => session.id === copied.id,
        )?.status,
      ).toBe("IN_PROGRESS");
      await cancellation
        .getByLabel("Cancellation reason", { exact: true })
        .fill("Academy confirmed this copied session is cancelled");
      const cancelled = await uiTraining("status", () =>
        cancellation
          .getByRole("button", { name: "Confirm cancellation", exact: true })
          .click(),
      );
      expect(cancelled.record.id).toBe(copied.id);
      expect(cancelled.record.status).toBe("CANCELLED");
      expect(cancelled.submitted.expectedVersion).toBe(copied.version);
      expect(cancelled.submitted.data.reason).toBe(
        "Academy confirmed this copied session is cancelled",
      );
      await expect(cancellation).not.toBeVisible();
      const after = await payload();
      expect(
        after.records.session.find((session) => session.id === copied.id)
          ?.status,
      ).toBe("CANCELLED");
      expect(
        after.records.session.find((session) => session.id === first.id)
          ?.startLocal,
      ).toBe("2032-10-20T23:00");
      expect(
        after.records.attendance.find(
          (record) => record.sessionId === copied.id,
        )?.status,
      ).toBe("UNMARKED");
      const historyResponse = await owner.api.get(
        `${root}/training?kind=session&id=${copied.id}`,
      );
      expect(historyResponse.status()).toBe(200);
      const history = (await historyResponse.json()) as {
        body: FootballSession;
      }[];
      expect(history.map((record) => record.body.status)).toEqual([
        "DRAFT",
        "DRAFT",
        "SCHEDULED",
        "IN_PROGRESS",
        "CANCELLED",
      ]);
      await page
        .getByRole("navigation", { name: "Training sections" })
        .getByRole("button", { name: "Session Plans", exact: true })
        .click();
      const weekly = page.locator(".pt-weekly");
      await expect(
        weekly.getByRole("heading", {
          name: "Prepare weekly plan",
          exact: true,
        }),
      ).toBeVisible();
      await weekly
        .getByRole("combobox", { name: "Squad", exact: true })
        .selectOption(squads[0].id);
      const monday = new Date(`${day}T12:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      await weekly
        .getByLabel("Week starting Monday", { exact: true })
        .fill(monday.toISOString().slice(0, 10));
      const prepared = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `${root}/periods` &&
          response.request().method() === "POST" &&
          response.request().postDataJSON()?.action === "weeklyPrepare",
      );
      await weekly
        .getByRole("button", { name: "Prepare player previews", exact: true })
        .click();
      const response = await prepared;
      expect(response.status(), await response.text()).toBe(200);
      const plans = (await response.json()) as WeeklyPlan[];
      expect(plans).toHaveLength(2);
      expect(plans.map((plan) => plan.playerId).sort()).toEqual(
        [players[0].id, secondRosterPlayer.id].sort(),
      );
      for (const plan of plans) {
        expect(plan.content.personalFocus).toBe("Following the batch plan");
        expect(plan.content.teamFocus).toBe(
          "Close control after changing direction",
        );
        expect(plan.content.sessions.map((session) => session.id)).toEqual([
          first.id,
        ]);
        expect(plan.content.missing).toEqual([]);
      }
      expect((await payload()).records.plan).toEqual([]);
      await page.screenshot({
        path: `${shots}/training-weekly-plan-1536.png`,
        fullPage: true,
      });
    });

    await test.step("the assigned coach can read the same record but cannot fall back from another coach's session", async () => {
      const coachData = await payload(coach.api);
      expect(
        coachData.records.session.some((session) => session.id === first.id),
      ).toBe(true);
      expect(
        coachData.records.session.some(
          (session) => session.id === second.id || session.id === third.id,
        ),
      ).toBe(false);
      const coachContext = await browser.newContext({
        storageState: await coach.api.storageState(),
        viewport: { width: 1536, height: 1024 },
      });
      contexts.push(coachContext);
      const cp = await coachContext.newPage();
      watch(cp);
      await cp.goto(`/workspace/${aid}?section=training&session=${first.id}`);
      await cp.bringToFront();
      await expect(cp.locator(".pt-session-list .pt-selected")).toHaveAttribute(
        "data-session-id",
        first.id,
      );
      await expect(cp.locator(".pt-focus")).toContainText(
        "Close control after changing direction",
      );
      await expect(cp.locator(".pt-session-list")).not.toContainText(names[1]);
      await expect(cp.locator(".pt-session-list")).not.toContainText(names[2]);
      await cp.goto(
        `/workspace/${aid}?section=calendar&date=${day}&view=Week&session=${second.id}`,
      );
      await cp.bringToFront();
      await expect(
        cp.getByRole("heading", { name: "Session unavailable", exact: true }),
      ).toBeVisible();
      await expect(cp.locator(".pc-desktop-panel")).not.toContainText(
        second.theme,
      );
      await expect(cp.locator(".pc-desktop-panel .pc-panel")).toHaveCount(0);
      await cp.screenshot({
        path: `${shots}/coach-restricted-session-1536.png`,
        fullPage: true,
      });
    });
    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    for (const api of apis) await api.dispose();
  }
});
