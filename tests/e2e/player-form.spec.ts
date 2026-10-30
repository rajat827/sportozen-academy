import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
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

const positionOptions = [
  "Not decided yet",
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Winger",
  "Forward / Striker",
  "Multiple positions / Exploring",
];

test("Add and Edit Player use saved batches and optional positions without losing scope or history", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(300000);
  const origin = "http://127.0.0.1:3001";
  const apis: APIRequestContext[] = [];
  const contexts: BrowserContext[] = [];
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  const suffix = crypto.randomUUID();
  const shots = evidencePath("docs/screenshots/player-form/qa");
  await mkdir(shots, { recursive: true });
  let registrations = 0;
  async function checked<T>(
    response: {
      status(): number;
      text(): Promise<string>;
      json(): Promise<unknown>;
    },
    status = 200,
  ): Promise<T> {
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  }
  async function account(name: string) {
    if (registrations++)
      await new Promise((resolve) => setTimeout(resolve, 11000));
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    apis.push(api);
    const email = `${name}-${suffix}@example.test`;
    const result = await checked<{ user: { id: string } }>(
      await api.post("/api/auth/sign-up/email", {
        data: {
          name,
          email,
          password: `Synthetic-only-${crypto.randomUUID()}`,
        },
      }),
    );
    return { api, email, id: result.user.id };
  }
  async function workspace(api: APIRequestContext, name: string) {
    return checked<{ id: string }>(
      await api.post("/api/workspaces", {
        data: {
          name,
          contactEmail: "fictional-academy@example.test",
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
      }),
      201,
    );
  }
  try {
    const owner = await account("PlayerFormOwner");
    const coach = await account("PlayerFormCoach");
    const parent = await account("PlayerFormParent");
    const academy = await workspace(
      owner.api,
      "Fictional Bharat Football Academy",
    );
    const root = `/api/workspaces/${academy.id}`;
    const payload = async (api = owner.api) =>
      checked<WorkspacePayload>(await api.get(root));
    const save = <T>(kind: string, data: unknown) =>
      owner.api
        .post(`${root}/records/${kind}`, { data })
        .then((r) => checked<T>(r, 201));
    const training = <T>(
      action: string,
      data: unknown,
      id?: string,
      expectedVersion = 0,
    ) =>
      owner.api
        .post(`${root}/training`, {
          data: {
            action,
            data,
            id,
            expectedVersion,
            requestId: crypto.randomUUID(),
          },
        })
        .then((r) => checked<T>(r));
    const invite = async (
      person: typeof coach,
      role: "COACH" | "PARENT",
      playerIds: string[] = [],
    ) => {
      const invitation = await checked<{ token: string }>(
        await owner.api.post(`${root}/actions`, {
          data: {
            action: "invite",
            verified: true,
            data: {
              email: person.email,
              role,
              playerIds,
              guardianVerified: role === "PARENT",
            },
          },
        }),
      );
      await checked(
        await person.api.post("/api/invitations/accept", {
          data: { token: invitation.token },
        }),
      );
    };
    await invite(coach, "COACH");
    const branch = await save<{ id: string }>("branch", {
      name: "Fictional Bharat Training Ground",
      timezone: "Asia/Kolkata",
    });
    const originalPlayers: WorkspacePlayer[] = [];
    for (const age of ["U8", "U10", "U12", "U14", "U16", "U18"])
      for (let index = 1; index <= 10; index++)
        originalPlayers.push(
          await save<WorkspacePlayer>("player", {
            name: `Fictional ${age} Player ${String(index).padStart(2, "0")}`,
            squad: index === 1 ? `${age} historical label` : "",
            ageCategory: age,
            position: index === 1 ? "Sweeper / libero (legacy)" : "",
            coachId: index === 1 ? coach.id : owner.id,
            sportIds: ["football"],
            status: "ACTIVE",
          }),
        );
    expect(originalPlayers).toHaveLength(60);
    const legacy = originalPlayers[0];
    await invite(parent, "PARENT", [legacy.id]);
    const first = await training<FootballSquad>("squad", {
      name: "U10 Morning Batch",
      branchId: branch.id,
      playerIds: [legacy.id],
    });
    const second = await training<FootballSquad>("squad", {
      name: "U12 Advanced",
      branchId: branch.id,
      playerIds: [],
    });
    const rosterOnly = originalPlayers[10];
    const rosterOnlyBatch = await training<FootballSquad>("squad", {
      name: "U10 Evening Batch",
      branchId: branch.id,
      playerIds: [rosterOnly.id],
    });
    const assigned = await checked<WorkspacePlayer>(
      await owner.api.put(`${root}/records/player/${legacy.id}`, {
        data: {
          ...legacy,
          squadId: first.id,
          placementReviewed: true,
          expectedVersion: legacy.recordVersion,
        },
      }),
    );
    const venue = await training<FootballVenue>("venue", {
      name: "Fictional Pitch",
      branchId: branch.id,
      location: "Fictional Bharat Ground",
    });
    const history = await training<FootballSession>("session", {
      branchId: branch.id,
      squadId: first.id,
      venueId: venue.id,
      location: venue.location,
      coachIds: [coach.id],
      timezone: "Asia/Kolkata",
      startLocal: "2032-10-19T17:00",
      endLocal: "2032-10-19T18:30",
      theme: "Recorded training history",
      agenda: [],
      sharedObjective: {
        goal: "Close control",
        cue: "Small touches",
        observe: "Control during a shared activity",
      },
      preparation: [],
    });
    const ownerContext = await browser.newContext({
      storageState: await owner.api.storageState(),
      viewport: { width: 1536, height: 1024 },
    });
    contexts.push(ownerContext);
    const page = await ownerContext.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== origin)
        externalRequests.push(url.origin + url.pathname);
    });
    page.on("dialog", (dialog) => dialog.accept());
    async function players(id = "") {
      await page.goto(
        `/workspace/${academy.id}?section=players${id ? `&player=${id}` : ""}`,
      );
      await expect(
        page.getByRole("heading", { name: "Players", exact: true }),
      ).toBeVisible();
    }
    const dialog = () => page.getByRole("dialog");
    async function add(name: string, position = "", squad = "") {
      await players();
      await page
        .getByRole("button", { name: "Add Player", exact: true })
        .first()
        .click();
      await expect(
        dialog().getByLabel("Batch label", { exact: true }),
      ).toHaveCount(0);
      await expect(
        dialog().getByRole("combobox", { name: "Position", exact: true }),
      ).toHaveValue("");
      await expect(
        dialog()
          .getByRole("combobox", { name: "Position", exact: true })
          .locator("option"),
      ).toHaveText(positionOptions);
      await dialog().getByLabel("Player name", { exact: true }).fill(name);
      await dialog()
        .getByRole("combobox", { name: "Age category", exact: true })
        .selectOption("U8");
      if (position)
        await dialog()
          .getByRole("combobox", { name: "Position", exact: true })
          .selectOption(position);
      if (squad)
        await dialog()
          .getByRole("combobox", { name: "Training batch", exact: true })
          .selectOption(squad);
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `${root}/records/player` &&
          r.request().method() === "POST",
      );
      await dialog()
        .getByRole("button", { name: "Add Player", exact: true })
        .click();
      const result = await response;
      expect(result.status(), await result.text()).toBe(201);
      await expect(dialog()).toHaveCount(0);
      return result.json() as Promise<WorkspacePlayer>;
    }
    let undecided!: WorkspacePlayer;
    let selected!: WorkspacePlayer;
    await test.step("create without optional position and batch; create with actual batch ID and chosen position", async () => {
      undecided = await add("Fictional Undecided New Player");
      expect(undecided.position ?? "").toBe("");
      expect(undecided.squadId ?? "").toBe("");
      const profile = page.locator(".portal-player-detail");
      await expect(profile).toContainText("Not decided yet");
      await expect(profile).toContainText("Not assigned yet");
      selected = await add("Fictional Assigned New Player", "Winger", first.id);
      expect(selected.squadId).toBe(first.id);
      expect(selected.squad).toBe(first.name);
      expect(selected.ageCategory).toBe("U8");
      await expect(profile).toContainText(first.name);
      await page.reload();
      await expect(profile).toContainText("Winger");
      await expect(profile).toContainText(first.name);
      await expect(profile).toContainText("U8");
    });
    await test.step("edit preserves legacy text, batch ID and historical labels until explicitly changed", async () => {
      await players(legacy.id);
      await page
        .getByRole("button", { name: "Edit Player", exact: true })
        .click();
      await expect(
        dialog().getByLabel("Batch label", { exact: true }),
      ).toHaveCount(0);
      await expect(
        dialog().getByRole("combobox", { name: "Training batch", exact: true }),
      ).toHaveValue(first.id);
      await expect(
        dialog().getByRole("combobox", { name: "Position", exact: true }),
      ).toHaveValue("Sweeper / libero (legacy)");
      await expect(
        dialog()
          .getByRole("combobox", { name: "Position", exact: true })
          .locator("option:checked"),
      ).toContainText("Current position: Sweeper / libero (legacy)");
      await dialog()
        .getByLabel("Player name", { exact: true })
        .fill("Fictional Renamed Legacy Player");
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `${root}/records/player/${legacy.id}` &&
          r.request().method() === "PUT",
      );
      await dialog()
        .getByRole("button", { name: "Save Player", exact: true })
        .click();
      const updated = await checked<WorkspacePlayer>(await response);
      expect(updated.position).toBe(legacy.position);
      expect(updated.squad).toBe(assigned.squad);
      expect(updated.squadId).toBe(first.id);
      expect(updated.ageCategory).toBe(legacy.ageCategory);
      expect(updated.id).toBe(legacy.id);
      expect(updated.academyId).toBe(academy.id);
    });
    await test.step("roster-only historical membership resolves its saved batch without rewriting legacy data", async () => {
      await players(rosterOnly.id);
      await page
        .getByRole("button", { name: "Edit Player", exact: true })
        .click();
      await expect(
        dialog().getByRole("combobox", { name: "Training batch", exact: true }),
      ).toHaveValue(rosterOnlyBatch.id);
      await dialog()
        .getByLabel("Player name", { exact: true })
        .fill("Fictional Roster Only Legacy Player");
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname ===
            `${root}/records/player/${rosterOnly.id}` &&
          r.request().method() === "PUT",
      );
      await dialog()
        .getByRole("button", { name: "Save Player", exact: true })
        .click();
      const updated = await checked<WorkspacePlayer>(await response);
      expect(updated.squad).toBe(rosterOnly.squad);
      expect(updated.squadId ?? "").toBe(rosterOnly.squadId ?? "");
      expect(updated.position).toBe(rosterOnly.position);
      await expect(page.locator(".portal-player-detail")).toContainText(
        rosterOnlyBatch.name,
      );
      await players(legacy.id);
    });
    await test.step("explicit position and reviewed batch changes retain independent age category and old sessions", async () => {
      await page
        .getByRole("button", { name: "Edit Player", exact: true })
        .click();
      await dialog()
        .getByRole("combobox", { name: "Position", exact: true })
        .selectOption("Multiple positions / Exploring");
      await dialog()
        .getByRole("combobox", { name: "Training batch", exact: true })
        .selectOption(second.id);
      await expect(
        dialog().getByRole("combobox", { name: "Age category", exact: true }),
      ).toHaveValue("U8");
      await dialog()
        .getByRole("checkbox", {
          name: "I reviewed this training placement change.",
        })
        .check();
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `${root}/records/player/${legacy.id}` &&
          r.request().method() === "PUT",
      );
      await dialog()
        .getByRole("button", { name: "Save Player", exact: true })
        .click();
      const updated = await checked<WorkspacePlayer>(await response);
      expect(updated.position).toBe("Multiple positions / Exploring");
      expect(updated.squadId).toBe(second.id);
      expect(updated.squad).toBe(second.name);
      expect(updated.ageCategory).toBe("U8");
      await page.reload();
      const profile = page.locator(".portal-player-detail");
      await expect(profile).toContainText(second.name);
      await expect(profile).toContainText("Multiple positions / Exploring");
      const current = await payload();
      expect(current.records.session.find((s) => s.id === history.id)).toEqual(
        history,
      );
      expect(
        current.records.player.find((p) => p.id === originalPlayers[1].id),
      ).toEqual(originalPlayers[1]);
      expect(
        current.records.squad.find((s) => s.id === second.id)?.playerIds,
      ).toContain(legacy.id);
      expect(
        current.records.squad.find((s) => s.id === first.id)?.playerIds,
      ).not.toContain(legacy.id);
    });
    await test.step("directory position and batch filters include the same options and unset values", async () => {
      await players();
      const positions = page.getByRole("combobox", {
        name: "All Positions",
        exact: true,
      });
      await expect(positions.locator("option")).toHaveText([
        "All Positions",
        ...positionOptions,
        "Sweeper / libero (legacy) (existing)",
      ]);
      await positions.selectOption("Winger");
      await expect(page.locator("tbody .portal-player-name")).toHaveText([
        selected.name,
      ]);
      await positions.selectOption({ label: "Not decided yet" });
      await expect(
        page.getByRole("button", { name: selected.name, exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("textbox", { name: "Search player directory", exact: true })
        .fill(undecided.name);
      await expect(page.locator("tbody .portal-player-name")).toHaveText([
        undecided.name,
      ]);
      await positions.selectOption("");
      await page
        .getByRole("textbox", { name: "Search player directory", exact: true })
        .fill("");
      await page
        .getByRole("combobox", { name: "All Batches", exact: true })
        .selectOption(second.name);
      await expect(page.locator("tbody .portal-player-name")).toHaveText([
        "Fictional Renamed Legacy Player",
      ]);
    });
    await test.step("desktop and mobile editors retain controls without document overflow", async () => {
      for (const width of [1536, 1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1024 });
        await players(undecided.id);
        await page
          .getByRole("button", { name: "Add Player", exact: true })
          .first()
          .click();
        await page.evaluate(() => document.fonts.ready);
        await expect(
          dialog().getByRole("combobox", { name: "Position", exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `${shots}/add-player-${width}.png`,
          fullPage: true,
        });
        await dialog()
          .getByRole("button", { name: "Add Player", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          dialog().getByRole("button", { name: "Add Player", exact: true }),
        ).toBeVisible();
        await dialog()
          .getByRole("button", { name: "Close player editor", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Edit Player", exact: true })
          .click();
        await expect(
          dialog().getByRole("combobox", {
            name: "Training batch",
            exact: true,
          }),
        ).toBeVisible();
        await page.screenshot({
          path: `${shots}/edit-player-${width}.png`,
          fullPage: true,
        });
        await dialog()
          .getByRole("button", { name: "Save Player", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          dialog().getByRole("button", { name: "Save Player", exact: true }),
        ).toBeVisible();
        await dialog()
          .getByRole("button", { name: "Close player editor", exact: true })
          .click();
        await page.screenshot({
          path: `${shots}/player-profile-${width}.png`,
          fullPage: true,
        });
      }
    });
    await test.step("parent, anonymous, foreign academy and out-of-scope coach cannot modify protected players", async () => {
      const current = (await payload()).records.player.find(
        (p) => p.id === legacy.id,
      )!;
      const foreignAcademy = await workspace(
        owner.api,
        "Fictional Foreign Football Academy",
      );
      const foreignRoot = `/api/workspaces/${foreignAcademy.id}`;
      const foreignBranch = await checked<{ id: string }>(
        await owner.api.post(`${foreignRoot}/records/branch`, {
          data: { name: "Foreign Ground", timezone: "Asia/Kolkata" },
        }),
        201,
      );
      const foreignBatch = await checked<FootballSquad>(
        await owner.api.post(`${foreignRoot}/training`, {
          data: {
            action: "squad",
            requestId: crypto.randomUUID(),
            expectedVersion: 0,
            data: {
              name: "Foreign U8 Batch",
              branchId: foreignBranch.id,
              playerIds: [],
            },
          },
        }),
      );
      const foreignAssign = await owner.api.put(
        `${root}/records/player/${current.id}`,
        {
          data: {
            ...current,
            squadId: foreignBatch.id,
            placementReviewed: true,
            expectedVersion: current.recordVersion,
          },
        },
      );
      expect([403, 404]).toContain(foreignAssign.status());
      expect(
        (
          await parent.api.put(`${root}/records/player/${current.id}`, {
            data: {
              ...current,
              position: "Forward / Striker",
              expectedVersion: current.recordVersion,
            },
          })
        ).status(),
      ).toBe(403);
      const anon = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      });
      apis.push(anon);
      expect(
        (
          await anon.put(`${root}/records/player/${current.id}`, {
            data: {
              ...current,
              position: "Goalkeeper",
              expectedVersion: current.recordVersion,
            },
          })
        ).status(),
      ).toBe(401);
      const unrelated = originalPlayers[1];
      expect([403, 404]).toContain(
        (
          await coach.api.put(`${root}/records/player/${unrelated.id}`, {
            data: {
              ...unrelated,
              position: "Goalkeeper",
              expectedVersion: unrelated.recordVersion,
            },
          })
        ).status(),
      );
      const coachUpdate = await checked<WorkspacePlayer>(
        await coach.api.put(`${root}/records/player/${current.id}`, {
          data: {
            ...current,
            position: "Defender",
            expectedVersion: current.recordVersion,
          },
        }),
      );
      expect(coachUpdate.position).toBe("Defender");
      expect(coachUpdate.squadId).toBe(second.id);
      const coachPlacement = await coach.api.put(
        `${root}/records/player/${current.id}`,
        {
          data: {
            ...coachUpdate,
            squadId: first.id,
            placementReviewed: true,
            expectedVersion: coachUpdate.recordVersion,
          },
        },
      );
      expect(coachPlacement.status()).toBe(403);
      const stale = await owner.api.put(
        `${root}/records/player/${current.id}`,
        {
          data: {
            ...current,
            name: "Stale overwrite must not save",
            expectedVersion: current.recordVersion,
          },
        },
      );
      expect(stale.status()).toBe(409);
      const retained = (await payload()).records.player.find(
        (p) => p.id === current.id,
      )!;
      expect(retained).toEqual(coachUpdate);
      const parentContext = await browser.newContext({
        storageState: await parent.api.storageState(),
        viewport: { width: 390, height: 1024 },
      });
      contexts.push(parentContext);
      const parentPage = await parentContext.newPage();
      await parentPage.goto(
        `/workspace/${academy.id}?section=players&player=${current.id}`,
      );
      await expect(
        parentPage.getByRole("button", { name: "Add Player", exact: true }),
      ).toHaveCount(0);
      await expect(
        parentPage.getByRole("button", { name: "Edit Player", exact: true }),
      ).toHaveCount(0);
    });
    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
    const final = await payload();
    expect(final.records.player).toHaveLength(62);
    expect(final.records.session.find((s) => s.id === history.id)).toEqual(
      history,
    );
    await writeFile(
      `${shots}/verification.json`,
      JSON.stringify(
        {
          fictional: true,
          isolatedDatabase: true,
          initialPlayers: 60,
          finalPlayers: 62,
          viewports: [1536, 1440, 390, 320],
          requiredCases: 14,
          pageErrors,
          externalRequests,
          preservedHistoricalSession: history.id,
          status: "PASS",
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await Promise.all(apis.map((api) => api.dispose()));
  }
});
