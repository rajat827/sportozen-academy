import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { verifyWorkspaceRestart } from "./restart-workspace-check";
import { operationalSports } from "../../src/config/sports/workspace-sports";
import type {
  WorkspacePayload,
  WorkspacePlan,
} from "../../src/domain/workspace";
import type { FootballSession, FootballSquad } from "../../src/domain/training";
test("authenticated coach runs sessions, reviews evidence and communicates privately with the linked parent", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(420000);
  const origin = "http://127.0.0.1:3001",
    suffix = crypto.randomUUID(),
    shots = "docs/screenshots/football-training";
  mkdirSync(shots, { recursive: true });
  let registrations = 0;
  async function account(name: string) {
    if (registrations++) await new Promise((r) => setTimeout(r, 11000));
    const api = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      }),
      email = `${name}-${suffix}@example.test`,
      password = `Synthetic-${crypto.randomUUID()}`;
    const r = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password },
    });
    expect(r.status()).toBe(200);
    const json = await r.json();
    return { api, email, password, id: json.user.id as string };
  }
  const owner = await account("TrainingOwner"),
    coach = await account("TrainingCoach"),
    parent = await account("TrainingParent"),
    other = await account("OtherAcademyOwner");
  async function createAcademy(
    api: APIRequestContext,
    name: string,
    timezone = "Asia/Kolkata",
  ) {
    const r = await api.post("/api/workspaces", {
      data: {
        name,
        contactEmail: "fictional@example.test",
        country: "IN",
        language: "en",
        currency: "INR",
        timezone,
        dateLocale: "en-IN",
        measurementSystem: "METRIC",
        brandAccent: "#008463",
        demo: true,
      },
    });
    expect(r.status()).toBe(201);
    return (await r.json()).id as string;
  }
  const aid = await createAcademy(owner.api, "Synthetic Training Academy"),
    bid = await createAcademy(
      other.api,
      "Independent Football Academy",
      "Europe/London",
    );
  const root = `/api/workspaces/${aid}`;
  async function save<T>(api: APIRequestContext, kind: string, data: unknown) {
    const r = await api.post(`${root}/records/${kind}`, { data });
    expect(r.status(), await r.text()).toBe(201);
    return (await r.json()) as T;
  }
  async function action<T>(
    api: APIRequestContext,
    action: string,
    id?: string,
    data?: unknown,
  ) {
    const r = await api.post(`${root}/actions`, {
      data: { action, id, data, verified: true },
    });
    expect(r.ok(), await r.text()).toBe(true);
    return (await r.json()) as T;
  }
  async function command<T>(
    api: APIRequestContext,
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) {
    const r = await api.post(`${root}/training`, {
      data: {
        requestId: crypto.randomUUID(),
        action,
        data,
        id,
        expectedVersion,
      },
    });
    expect(r.ok(), await r.text()).toBe(true);
    return (await r.json()) as T;
  }
  async function payload(api: APIRequestContext) {
    const r = await api.get(root);
    expect(r.ok()).toBe(true);
    return (await r.json()) as WorkspacePayload;
  }
  async function invite(
    target: typeof coach,
    role: string,
    playerIds: string[] = [],
  ) {
    const invitation = await action<{ token: string }>(
      owner.api,
      "invite",
      undefined,
      {
        email: target.email,
        role,
        playerIds,
        guardianVerified: role === "PARENT",
      },
    );
    const r = await target.api.post("/api/invitations/accept", {
      data: { token: invitation.token },
    });
    expect(r.ok(), await r.text()).toBe(true);
  }
  await invite(coach, "COACH");
  const first = await save<{ id: string }>(owner.api, "player", {
      name: "Fictional Player A",
      sportIds: ["football"],
      squad: "U-13 label",
      coachId: coach.id,
    }),
    second = await save<{ id: string }>(owner.api, "player", {
      name: "Fictional Player B",
      squad: "U-13 label",
      coachId: coach.id,
    });
  await invite(parent, "PARENT", [first.id]);
  const branch = await save<{ id: string }>(owner.api, "branch", {
      name: "Training branch",
      timezone: "Asia/Kolkata",
    }),
    drill = await save<{ id: string }>(coach.api, "drill", {
      ...operationalSports.football.templates[0],
      sportId: "football",
    });
  const contexts = await Promise.all(
      [coach, parent, owner].map(async (a) =>
        browser.newContext({ storageState: await a.api.storageState() }),
      ),
    ),
    [coachContext, parentContext, ownerContext] = contexts;
  const cp = await coachContext.newPage(),
    pp = await parentContext.newPage(),
    op = await ownerContext.newPage();
  cp.setDefaultTimeout(15000);
  pp.setDefaultTimeout(15000);
  op.setDefaultTimeout(15000);
  await cp.goto(`/workspace/${aid}`);
  await cp.getByLabel("Development focus").selectOption("Dribbling");
  await cp
    .getByLabel("Why this focus", { exact: true })
    .fill("Coach selected close control for the current individual goal.");
  // Use the real plan editor and existing curriculum, not browser demonstration storage.
  await cp
    .getByRole("checkbox", {
      name: new RegExp(operationalSports.football.templates[0].name),
    })
    .check();
  await cp
    .getByLabel("Coach will observe", { exact: true })
    .fill("Touches while changing direction on the recorded course.");
  await cp
    .getByLabel("Optional safe home practice", { exact: true })
    .fill("Five minutes of comfortable touches in a safe open space.");
  await cp.getByLabel("Review date", { exact: true }).fill("2026-10-30");
  await cp
    .getByLabel("Next development step")
    .fill("Repeat the same course before interpreting a change.");
  await cp.getByLabel("Plan status").selectOption("ACTIVE");
  await cp.getByLabel("Private coach working note").fill("PRIVATE_PLAN_NOTE");
  await cp.getByRole("button", { name: "Save individual plan" }).click();
  await expect
    .poll(async () => (await payload(coach.api)).records.plan.length)
    .toBe(1);
  const plan = (await payload(coach.api)).records.plan[0];
  const planB = await save<WorkspacePlan>(coach.api, "plan", {
    ...plan,
    playerId: second.id,
    focus: "Passing",
    reason: "Coach agreed weaker-foot passing as an individual goal.",
    observe: "Comfortable weaker-foot contact.",
    privateNote: "PRIVATE_SECOND_PLAYER",
  });
  // Owner creates the actual squad and venue in the authenticated interface.
  await op.goto(`/workspace/${aid}`);
  await op.getByRole("button", { name: "Training", exact: true }).click();
  await op
    .getByLabel("Squad name", { exact: true })
    .fill("U-13 training squad");
  await op
    .getByRole("group", { name: "Squad roster" })
    .getByLabel("Fictional Player A", { exact: true })
    .check();
  await op
    .getByRole("group", { name: "Squad roster" })
    .getByLabel("Fictional Player B", { exact: true })
    .check();
  await op.getByRole("button", { name: "Save squad", exact: true }).click();
  await expect
    .poll(async () => (await payload(owner.api)).records.squad.length)
    .toBe(1);
  await op.getByLabel("Venue name").fill("Fictional practice ground");
  await op.getByLabel("Venue location").fill("Synthetic north training area");
  await op.getByRole("button", { name: "Save venue", exact: true }).click();
  await expect
    .poll(async () => (await payload(owner.api)).records.venue.length)
    .toBe(1);
  await cp.reload();
  await cp.getByRole("button", { name: "Training", exact: true }).click();
  const squad = (await payload(owner.api)).records.squad[0],
    venue = (await payload(owner.api)).records.venue[0];
  await cp.getByLabel("Session squad").selectOption(squad.id);
  await cp.getByLabel("Session venue").selectOption(venue.id);
  await cp.getByLabel("Session theme").fill("Dribbling and finishing");
  await cp.getByLabel("Session start").fill("2026-10-12T18:00");
  await cp.getByLabel("Session end").fill("2026-10-12T19:00");
  await cp.getByLabel("Add agenda drill").selectOption(drill.id);
  // Failure retains the unsaved schedule. Retry reaches the real backend.
  await cp.route("**/training", async (route) => {
    await route.fulfill({
      status: 503,
      json: { error: "Synthetic temporary save failure" },
    });
    await cp.unroute("**/training");
  });
  await cp.getByRole("button", { name: "Save session draft" }).click();
  await expect(
    cp
      .getByRole("alert")
      .filter({ hasText: "Synthetic temporary save failure" }),
  ).toBeVisible();
  await expect(cp.getByLabel("Session theme")).toHaveValue(
    "Dribbling and finishing",
  );
  await cp.getByRole("button", { name: "Save session draft" }).click();
  await expect
    .poll(async () => (await payload(coach.api)).records.session.length)
    .toBe(1);
  let session = (await payload(coach.api)).records.session[0];
  expect(session.startAt).toBe("2026-10-12T12:30:00.000Z");
  expect(
    (await payload(coach.api)).records.attendance.map((a) => a.status),
  ).toEqual(["UNMARKED", "UNMARKED"]);
  await cp.getByRole("button", { name: "Open session desk" }).click();
  const cards = cp.locator("section.card").filter({
    has: cp.getByRole("heading", { name: "Fictional Player A", exact: true }),
  });
  await cards
    .getByLabel("Personal coaching cue")
    .fill("Keep comfortable close touches.");
  await cards.getByRole("button", { name: "Save personal objective" }).click();
  await expect
    .poll(
      async () =>
        (await payload(coach.api)).records.session[0].objectives.length,
    )
    .toBe(1);
  const cardB = cp.locator("section.card").filter({
    has: cp.getByRole("heading", { name: "Fictional Player B", exact: true }),
  });
  await cardB
    .getByLabel("Individual goal")
    .fill("Use the weaker foot during this activity.");
  await cardB
    .getByLabel("Personal coaching cue")
    .fill("Comfortable weaker-foot contact.");
  await cardB.getByRole("button", { name: "Save personal objective" }).click();
  await expect
    .poll(
      async () =>
        (await payload(coach.api)).records.session[0].objectives.length,
    )
    .toBe(2);
  session = (await payload(coach.api)).records.session[0];
  const snapshot = session.objectives;
  await command(
    owner.api,
    "squad",
    { name: squad.name, branchId: branch.id, playerIds: [first.id] },
    squad.id,
    squad.version,
  );
  const revisedPlan = await coach.api.put(`${root}/records/plan/${plan.id}`, {
    data: { ...plan, focus: "Finishing" },
  });
  expect(revisedPlan.ok()).toBe(true);
  expect(
    (
      await coach.api.put(`${root}/records/plan/${plan.id}`, {
        data: {
          ...plan,
          expectedVersion: plan.recordVersion,
          reason: "Stale plan rewrite",
        },
      })
    ).status(),
  ).toBe(409);
  expect((await payload(coach.api)).records.session[0].objectives).toEqual(
    snapshot,
  );
  expect((await payload(coach.api)).records.session[0].roster).toHaveLength(2);
  const stale = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "objective",
      id: session.id,
      expectedVersion: 1,
      data: { ...snapshot[0], goal: "Stale edit" },
    },
  });
  expect(stale.status()).toBe(409);
  await cp
    .getByRole("button", { name: "Schedule session", exact: true })
    .click();
  await expect(cp.getByText("SCHEDULED", { exact: true })).toBeVisible();
  await cp.getByRole("button", { name: "Start training" }).click();
  await expect(cp.getByText("IN_PROGRESS", { exact: true })).toBeVisible();
  const incomplete = (await payload(coach.api)).records.session[0];
  expect(
    (
      await coach.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action: "status",
          id: incomplete.id,
          expectedVersion: incomplete.version,
          data: { status: "COMPLETED" },
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await parent.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action: "attendance",
          id: incomplete.id,
          data: {
            entries: [
              { playerId: first.id, status: "PRESENT", expectedVersion: 1 },
            ],
          },
        },
      })
    ).status(),
  ).toBe(403);
  await cp.getByRole("button", { name: "Attendance", exact: true }).click();
  await cp.getByRole("button", { name: "Mark all present" }).click();
  await cp
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await payload(coach.api)).records.attendance.every(
        (a) => a.status === "PRESENT",
      ),
    )
    .toBe(true);
  const attendance = (await payload(coach.api)).records.attendance;
  const duplicate = {
    requestId: crypto.randomUUID(),
    action: "attendance",
    id: session.id,
    data: {
      entries: attendance.map((a) => ({
        playerId: a.playerId,
        status: "PRESENT",
        expectedVersion: a.version,
      })),
      correctionReason: "",
    },
  };
  const repeated = await coach.api.post(`${root}/training`, {
    data: duplicate,
  });
  expect(repeated.ok()).toBe(true);
  const after = (await payload(coach.api)).records.attendance;
  expect(
    (await coach.api.post(`${root}/training`, { data: duplicate })).ok(),
  ).toBe(true);
  expect((await payload(coach.api)).records.attendance).toEqual(after);
  const conflict = await coach.api.post(`${root}/training`, {
    data: { ...duplicate, requestId: crypto.randomUUID() },
  });
  expect(conflict.status()).toBe(409);
  const rollback = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "attendance",
      id: session.id,
      data: {
        entries: [
          {
            playerId: first.id,
            status: "ABSENT",
            expectedVersion: after[0].version,
          },
          { playerId: second.id, status: "ABSENT", expectedVersion: 1 },
        ],
        correctionReason: "Recorded correction test",
      },
    },
  });
  expect(rollback.status()).toBe(409);
  expect((await payload(coach.api)).records.attendance).toEqual(after);
  const noReason = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "attendance",
      id: session.id,
      data: {
        entries: [
          {
            playerId: first.id,
            status: "EXCUSED",
            expectedVersion: after[0].version,
          },
        ],
      },
    },
  });
  expect(noReason.status()).toBe(400);
  const hist = await coach.api.get(
    `${root}/training?kind=attendance&id=${encodeURIComponent(after[0].id)}`,
  );
  expect(hist.ok()).toBe(true);
  expect((await hist.json()).length).toBeGreaterThan(1);
  expect(
    (
      await parent.api.get(
        `${root}/training?kind=attendance&id=${encodeURIComponent(after[0].id)}`,
      )
    ).status(),
  ).toBe(403);
  await command(
    coach.api,
    "attendance",
    {
      entries: [
        {
          playerId: first.id,
          status: "EXCUSED",
          expectedVersion: after[0].version,
        },
      ],
      correctionReason: "Parent requested a synthetic correction",
    },
    session.id,
  );
  const corrected = (await payload(coach.api)).records.attendance.find(
    (a) => a.playerId === first.id,
  )!;
  expect(corrected.status).toBe("EXCUSED");
  await command(
    coach.api,
    "attendance",
    {
      entries: [
        {
          playerId: first.id,
          status: "PRESENT",
          expectedVersion: corrected.version,
        },
      ],
      correctionReason: "Staff verified participation on the session ledger",
    },
    session.id,
  );
  await cp.getByRole("button", { name: "Evidence", exact: true }).click();
  await cp
    .getByLabel("Coach observation", { exact: true })
    .fill("Kept the ball close on three of six recorded turns.");
  await cp
    .getByLabel("Course, target and conditions")
    .fill("Six turns; 10m course; dry ground; same cones.");
  await cp.getByLabel("Measurement").selectOption("ATTEMPTS");
  await cp
    .getByRole("spinbutton", { name: "Recorded attempts", exact: true })
    .fill("6");
  await cp
    .getByRole("spinbutton", { name: "Successful attempts", exact: true })
    .fill("3");
  await cp
    .getByLabel("Separate staff-only evidence note")
    .fill("PRIVATE_EVIDENCE_NOTE");
  await cp.getByRole("button", { name: "Save evidence for review" }).click();
  await expect
    .poll(async () => (await payload(coach.api)).records.evidence.length)
    .toBe(1);
  let evidence = (await payload(coach.api)).records.evidence[0];
  const invalid = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "evidence",
      data: { ...evidence, attempts: 2, successes: 3 },
    },
  });
  expect(invalid.status()).toBe(400);
  execFileSync(
    process.execPath,
    ["tests/e2e/training-db-failure.mjs", "enable"],
    { stdio: "pipe" },
  );
  const dbFailure = {
    requestId: crypto.randomUUID(),
    action: "evidence",
    data: { ...evidence, observation: "QA_DATABASE_FAILURE" },
  };
  try {
    expect(
      (await coach.api.post(`${root}/training`, { data: dbFailure })).status(),
    ).toBe(500);
    expect((await payload(coach.api)).records.evidence).toHaveLength(1);
  } finally {
    execFileSync(
      process.execPath,
      ["tests/e2e/training-db-failure.mjs", "disable"],
      { stdio: "pipe" },
    );
  }
  expect(
    (await coach.api.post(`${root}/training`, { data: dbFailure })).ok(),
  ).toBe(true);
  const extra = (await payload(coach.api)).records.evidence.find(
    (e) => e.id !== evidence.id,
  )!;
  await command(
    coach.api,
    "review",
    { status: "REJECTED", verified: true },
    extra.id,
    extra.version,
  );
  await cp.reload();
  await cp.getByRole("button", { name: "Training", exact: true }).click();
  await cp.getByRole("button", { name: "Open session desk" }).click();
  await cp.getByRole("button", { name: "Review", exact: true }).click();
  const reviewCard = cp
    .locator("section.card")
    .filter({ hasText: "Kept the ball close on three of six recorded turns." });
  await reviewCard
    .getByRole("checkbox", {
      name: "I verified this player’s session evidence and conditions",
    })
    .check();
  await reviewCard
    .getByRole("button", { name: "Approve reviewed evidence" })
    .click();
  await expect
    .poll(
      async () =>
        (await payload(coach.api)).records.evidence.find(
          (e) => e.id === evidence.id,
        )?.status,
    )
    .toBe("REVIEWED");
  evidence = (await payload(coach.api)).records.evidence.find(
    (e) => e.id === evidence.id,
  )!;
  const immutable = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "evidence",
      id: evidence.id,
      expectedVersion: evidence.version,
      data: { ...evidence, observation: "Edited after review" },
    },
  });
  expect(immutable.status()).toBe(409);
  await reviewCard
    .getByLabel("Reviewed next development step")
    .fill("Continue the same course over four comparable sessions.");
  await reviewCard
    .getByRole("button", { name: "Update plan next step" })
    .click();
  await expect
    .poll(
      async () =>
        (await payload(coach.api)).records.plan.find((p) => p.id === plan.id)
          ?.nextStep,
    )
    .toContain("four comparable sessions");
  await cp.getByRole("button", { name: "Complete reviewed session" }).click();
  await expect(cp.getByText("COMPLETED", { exact: true })).toBeVisible();
  await reviewCard
    .getByLabel("Session report period")
    .fill("12 October 2026 session");
  await reviewCard
    .getByLabel("Session report closing note")
    .fill("Thank you for supporting safe practice.");
  await reviewCard
    .getByRole("button", { name: "Prepare report from reviewed session" })
    .click();
  await expect
    .poll(async () => (await payload(coach.api)).records.report.length)
    .toBe(1);
  const report = (await payload(coach.api)).records.report[0];
  // The second academy has its own real training records, not just an empty tenant.
  const broot = `/api/workspaces/${bid}`;
  async function bsave(kind: string, data: unknown) {
    const r = await other.api.post(`${broot}/records/${kind}`, { data });
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  }
  async function bcommand(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ) {
    const r = await other.api.post(`${broot}/training`, {
      data: {
        action,
        data,
        id,
        expectedVersion,
        requestId: crypto.randomUUID(),
      },
    });
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  }
  const bp = await bsave("player", {
      name: "Independent Academy Player",
      squad: "Independent squad",
      coachId: other.id,
    }),
    bb = await bsave("branch", {
      name: "UK branch",
      timezone: "Europe/London",
    }),
    bd = await bsave("drill", {
      ...operationalSports.football.templates[0],
      sportId: "football",
    }),
    bplan = await bsave("plan", {
      ...plan,
      playerId: bp.id,
      coachId: other.id,
      drillIds: [bd.id],
    });
  const bsquad = await bcommand("squad", {
    name: "Independent roster",
    branchId: bb.id,
    playerIds: [bp.id],
  });
  let bs = await bcommand("session", {
    branchId: bb.id,
    squadId: bsquad.id,
    location: "Independent ground",
    coachIds: [other.id],
    timezone: "Europe/London",
    startLocal: "2026-10-12T18:00",
    endLocal: "2026-10-12T19:00",
    theme: "Independent practice",
    agenda: [{ drillId: bd.id, duration: 15 }],
  });
  expect(bs.startAt).toBe("2026-10-12T17:00:00.000Z");
  bs = await bcommand(
    "objective",
    {
      playerId: bp.id,
      planId: bplan.id,
      goal: "Own development focus",
      drillId: bd.id,
      cue: "Own cue",
      observe: "Own observation criteria",
    },
    bs.id,
    bs.version,
  );
  bs = await bcommand("status", { status: "SCHEDULED" }, bs.id, bs.version);
  bs = await bcommand("status", { status: "IN_PROGRESS" }, bs.id, bs.version);
  await bcommand(
    "attendance",
    { entries: [{ playerId: bp.id, status: "PRESENT", expectedVersion: 1 }] },
    bs.id,
  );
  let be = await bcommand("evidence", {
    sessionId: bs.id,
    playerId: bp.id,
    planId: bplan.id,
    drillId: bd.id,
    conditions: "Independent 20m course",
    observation: "Independent coach observation",
    staffNote: "INDEPENDENT_PRIVATE_NOTE",
    method: "Coach count",
    measurement: "ATTEMPTS",
    attempts: 0,
    successes: 0,
    type: "RAW_RECORD",
    visibility: "PARENT_ELIGIBLE",
  });
  be = await bcommand(
    "review",
    { status: "REVIEWED", verified: true },
    be.id,
    be.version,
  );
  bs = await bcommand("status", { status: "COMPLETED" }, bs.id, bs.version);
  const br = await bcommand("report", {
    playerId: bp.id,
    planId: bplan.id,
    evidenceIds: [be.id],
    period: "Independent session",
    closingNote: "",
  });
  expect(br.observation).toContain("No attempts recorded");
  for (const [kind, id] of [
    ["session", bs.id],
    ["attendance", `${bs.id}:${bp.id}`],
    ["evidence", be.id],
    ["report", br.id],
  ]) {
    expect(
      (await owner.api.get(`${broot}/records/${kind}/${id}`)).status(),
    ).toBe(403);
    expect(
      (await parent.api.get(`${broot}/records/${kind}/${id}`)).status(),
    ).toBe(403);
  }
  expect(
    (
      await owner.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action: "session",
          data: {
            branchId: branch.id,
            squadId: bsquad.id,
            location: "Wrong relation",
            coachIds: [coach.id],
            timezone: "Asia/Kolkata",
            startLocal: "2026-10-12T18:00",
            endLocal: "2026-10-12T19:00",
            theme: "Cross academy",
            agenda: [{ drillId: drill.id, duration: 15 }],
          },
        },
      })
    ).status(),
  ).toBe(404);
  // Direct cross-academy and own-child authorisation, including writes and exports.
  for (const kind of ["session", "attendance", "evidence"]) {
    const record =
      kind === "session"
        ? session
        : kind === "attendance"
          ? after[0]
          : evidence;
    expect(
      (await other.api.get(`${root}/records/${kind}/${record.id}`)).status(),
    ).toBe(403);
    expect(
      (await parent.api.get(`${root}/records/${kind}/${record.id}`)).status(),
    ).toBe(404);
  }
  expect(
    (
      await other.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action: "review",
          id: evidence.id,
          expectedVersion: evidence.version,
          data: { status: "REVIEWED", verified: true },
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await coach.api.get(
        `/api/workspaces/${bid}/records/session/${session.id}`,
      )
    ).status(),
  ).toBe(403);
  expect(
    (await other.api.get(`${root}/reports/${report.id}/pdf`)).status(),
  ).toBe(403);
  const wrongPlayer = await coach.api.post(`${root}/training`, {
    data: {
      requestId: crypto.randomUUID(),
      action: "evidence",
      id: evidence.id,
      expectedVersion: evidence.version,
      data: { ...evidence, playerId: second.id, planId: planB.id },
    },
  });
  expect([400, 403, 409]).toContain(wrongPlayer.status());
  await cp.getByRole("button", { name: "Reports", exact: true }).click();
  expect(
    (
      await coach.api.post(`${root}/actions`, {
        data: {
          action: "approveReport",
          id: report.id,
          verified: true,
          data: { expectedVersion: (report.recordVersion ?? 1) + 1 },
        },
      })
    ).status(),
  ).toBe(409);
  await cp
    .getByRole("checkbox", {
      name: "I verified the player, sport plan, recorded observation, drills and dates",
    })
    .check();
  await cp.getByRole("button", { name: "Approve recorded report" }).click();
  await expect
    .poll(async () => (await payload(coach.api)).records.report[0].status)
    .toBe("Approved");
  const approved = (await payload(coach.api)).records.report[0];
  expect(approved.snapshot?.evidence[0].text).toContain(
    "3 successful out of 6",
  );
  expect(JSON.stringify(approved.snapshot)).not.toContain("PRIVATE_");
  await cp.getByRole("button", { name: "Messages", exact: true }).click();
  await cp.getByLabel("Update category").selectOption("REVIEWED_SESSION");
  await cp.getByLabel("Approved source report").selectOption(report.id);
  await cp
    .getByRole("button", { name: "Prepare from approved sources" })
    .click();
  await expect(cp.getByLabel("Parent-friendly message")).toHaveValue(
    /coach-reviewed session/,
  );
  await cp.getByRole("button", { name: "Save update draft" }).click();
  await expect
    .poll(async () => (await payload(coach.api)).records.update.length)
    .toBe(1);
  const update = (await payload(coach.api)).records.update[0];
  await action(coach.api, "submitUpdate", update.id);
  const pendingUpdate = (await payload(coach.api)).records.update[0];
  expect(
    (
      await owner.api.post(`${root}/actions`, {
        data: {
          action: "approveUpdate",
          id: update.id,
          verified: true,
          data: { expectedVersion: pendingUpdate.recordVersion! - 1 },
        },
      })
    ).status(),
  ).toBe(409);
  await action(owner.api, "approveUpdate", update.id);
  expect(
    (await payload(parent.api)).records.update[0].externalDeliveryStatus,
  ).toBe("NOT_SENT");
  await pp.goto(`/workspace/${aid}`);
  await expect(
    pp
      .getByText("Continue the same course over four comparable sessions.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await pp.getByRole("button", { name: "Messages", exact: true }).click();
  await expect(
    pp.getByText(/Kept the ball close on three of six/).first(),
  ).toBeVisible();
  const conversation = await save<{ id: string }>(parent.api, "conversation", {
    playerId: first.id,
    guardianId: parent.id,
    subject: "Question about the assigned course",
  });
  await action(parent.api, "reply", conversation.id, {
    body: "Can we practise these touches safely at home?",
    internal: false,
  });
  await action(coach.api, "reply", conversation.id, {
    body: "PRIVATE_THREAD_NOTE",
    internal: true,
  });
  await action(coach.api, "reply", conversation.id, {
    body: "Yes, use the optional safe open-space practice.",
    internal: false,
  });
  await pp.reload();
  await pp.getByRole("button", { name: "Messages", exact: true }).click();
  await pp
    .getByRole("button", { name: /Question about the assigned course/ })
    .click();
  await expect(
    pp.getByText("Yes, use the optional safe open-space practice.", {
      exact: true,
    }),
  ).toBeVisible();
  const parentData = await payload(parent.api);
  expect(parentData.records.player).toHaveLength(1);
  expect(parentData.records.session).toEqual([]);
  expect(parentData.records.evidence).toEqual([]);
  expect(JSON.stringify(parentData)).not.toMatch(/PRIVATE_|Fictional Player B/);
  // Planned messaging uses an approved snapshot and never claims an upcoming drill was completed.
  await cp.getByLabel("Update category").selectOption("UPCOMING_TRAINING");
  await cp
    .getByRole("button", { name: "Prepare from approved sources" })
    .click();
  await expect(cp.getByLabel("Parent-friendly message")).toHaveValue(
    /planned activities, not completed results/,
  );
  async function capture(page: Page, name: string) {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.scrollTo(0, 0);
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${shots}/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await capture(cp, "parent-update");
  await capture(pp, "parent-reply");
  await cp.getByRole("button", { name: "Reports", exact: true }).click();
  await capture(cp, "report-preview");
  await cp.getByRole("button", { name: "Training", exact: true }).click();
  await capture(cp, "sessions");
  await cp.getByRole("button", { name: "Open session desk" }).click();
  for (const section of [
    "Objectives",
    "Attendance",
    "Agenda",
    "Evidence",
    "Review",
  ]) {
    await cp.getByRole("button", { name: section, exact: true }).click();
    await capture(cp, section.toLowerCase());
  }
  const pdf = await parent.api.get(`${root}/reports/${report.id}/pdf`);
  expect(pdf.ok()).toBe(true);
  writeFileSync(`${shots}/approved-session-report.pdf`, await pdf.body());
  // Cancellation is separate from missed participation; a new roster does not alter the old ledger.
  const cancelled = await command<FootballSession>(coach.api, "session", {
    branchId: branch.id,
    squadId: squad.id,
    location: "Synthetic practice area",
    coachIds: [coach.id],
    timezone: "Asia/Kolkata",
    startLocal: "2026-10-13T18:00",
    endLocal: "2026-10-13T19:00",
    theme: "Cancelled training",
    agenda: [{ drillId: drill.id, duration: 15 }],
  });
  await command(
    coach.api,
    "status",
    { status: "CANCELLED", reason: "Synthetic weather cancellation" },
    cancelled.id,
    cancelled.version,
  );
  expect(
    (await payload(coach.api)).records.attendance.find(
      (a) => a.sessionId === cancelled.id,
    )?.status,
  ).toBe("UNMARKED");
  expect(
    (
      await coach.api.post(`${root}/training`, {
        data: {
          requestId: crypto.randomUUID(),
          action: "attendance",
          id: cancelled.id,
          data: {
            entries: [
              { playerId: first.id, status: "ABSENT", expectedVersion: 1 },
            ],
            correctionReason: "Attempt against cancelled session",
          },
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await payload(coach.api)).records.attendance.filter(
      (a) => a.sessionId === session.id,
    ),
  ).toHaveLength(2);
  // Regional DST ambiguity is rejected by the real scheduling endpoint.
  const ukbranch = await save<{ id: string }>(owner.api, "branch", {
      name: "Synthetic UK branch",
      timezone: "Europe/London",
    }),
    uksquad = await command<FootballSquad>(owner.api, "squad", {
      name: "UK practice",
      branchId: ukbranch.id,
      playerIds: [first.id],
    });
  for (const startLocal of ["2026-10-25T01:30", "2026-03-29T01:30"]) {
    const r = await coach.api.post(`${root}/training`, {
      data: {
        requestId: crypto.randomUUID(),
        action: "session",
        data: {
          branchId: ukbranch.id,
          squadId: uksquad.id,
          location: "Recorded UK practice area",
          coachIds: [coach.id],
          timezone: "Europe/London",
          startLocal,
          endLocal: startLocal.slice(0, 11) + "03:00",
          theme: "DST validation",
          agenda: [{ drillId: drill.id, duration: 15 }],
        },
      },
    });
    expect(r.status()).toBe(400);
  }
  const login = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect(
    (
      await login.post("/api/auth/sign-in/email", {
        data: { email: parent.email, password: parent.password },
      })
    ).ok(),
  ).toBe(true);
  expect((await payload(login)).records.update).toEqual(
    (await payload(parent.api)).records.update,
  );
  await login.dispose();
  await verifyWorkspaceRestart(playwright, coach.api, aid);
  const membership = (await payload(owner.api)).members.find(
    (m) => m.userId === coach.id,
  )!;
  await action(owner.api, "revoke", membership.id);
  expect(
    (await coach.api.get(`${root}/records/session/${session.id}`)).status(),
  ).toBe(403);
  expect(
    (await coach.api.post(`${root}/training`, { data: duplicate })).status(),
  ).toBe(403);
  for (const c of contexts) await c.close();
  for (const a of [owner, coach, parent, other]) await a.api.dispose();
});
