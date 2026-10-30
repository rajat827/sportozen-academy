/** Service-backed fictional review fixture; never resets an existing database. */
import { mock } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import assert from "node:assert/strict";
import type {
  FootballSession,
  FootballEvidence,
  FootballSquad,
  FootballVenue,
} from "../src/domain/training";
import type {
  WorkspaceReport,
  WorkspacePlayer,
  WorkspaceDrill,
} from "../src/domain/workspace";

const filename = resolve(process.env.SPORTOZEN_DATABASE_PATH ?? "");
const local = relative(resolve(".local"), filename);
if (
  isAbsolute(local) ||
  local.startsWith("..") ||
  !/^e2e-report-review-[a-zA-Z0-9-]+\.sqlite$/.test(local)
)
  throw new Error(
    "Monthly review QA requires a fresh .local/e2e-report-review-*.sqlite database.",
  );
if ([filename, `${filename}-wal`, `${filename}-shm`].some(existsSync))
  throw new Error(
    "QA never resets a database. Choose a fresh isolated filename.",
  );
if (
  process.env.SPORTOZEN_WHATSAPP_SEND_ENABLED === "true" ||
  process.env.SPORTOZEN_WHATSAPP_LIVE_ENABLED === "true"
)
  throw new Error("External delivery must be disabled.");

async function main() {
  mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-08-01T08:00:00Z"),
  });
  const { authentication } = await import("../src/server/auth");
  const {
    createAcademy,
    context,
    saveRecord,
    invite,
    acceptInvitation,
    approveReport,
  } = await import("../src/server/workspace-service");
  const { trainingAction } = await import("../src/server/training-service");
  const { periodAction } = await import("../src/server/period-service");
  const { workspaceRepository: repo } =
    await import("../src/server/workspace-repository");
  type Context = Awaited<ReturnType<typeof context>>;
  const suffix = randomUUID();
  async function account(key: string, name: string) {
    const email = `review-${key}-${suffix}@example.test`,
      password = `Synthetic-only-${randomUUID()}`;
    const response = await (
      await authentication()
    ).api.signUpEmail({ body: { name, email, password }, asResponse: true });
    assert.equal(response.status, 200, await response.clone().text());
    const value = await response.json();
    return { key, name, email, password, id: value.user.id as string };
  }
  async function login(account: { email: string; password: string }) {
    const response = await (
      await authentication()
    ).api.signInEmail({
      body: { email: account.email, password: account.password },
      asResponse: true,
    });
    assert.equal(response.status, 200, await response.clone().text());
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; "),
    });
  }
  const owner = await account("owner", "Fictional Bharat Review Owner"),
    coach = await account("coach", "Fictional U8 Coach"),
    parent = await account("parent", "Fictional Aadi Guardian"),
    outsider = await account("outsider", "Fictional Unassigned Coach");
  const academy = await createAcademy(await login(owner), {
    name: "Bharat Football Academy",
    location: "Fictional QA Training Ground",
    contactEmail: "fictional-review@example.test",
    country: "IN",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateLocale: "en-IN",
    language: "English",
    measurementSystem: "METRIC",
    brandAccent: "#008463",
    ageGroups: ["U8", "U10", "U12"],
    demo: true,
  });
  let ownerCtx = await context(await login(owner), academy.id);
  for (const person of [coach, outsider]) {
    const invitation = invite(ownerCtx, { email: person.email, role: "COACH" });
    await acceptInvitation(await login(person), invitation.token);
  }
  const branch = saveRecord(ownerCtx, "branch", {
    name: "Bharat Review Ground",
    timezone: "Asia/Kolkata",
  });
  const players = [
    "Aadi Fictional U8",
    "Vihaan Fictional U8",
    "Neel Fictional U8",
    "Reyansh Fictional U10",
  ].map(
    (name, index) =>
      saveRecord(ownerCtx, "player", {
        name,
        squad: index === 3 ? "Under-10" : "Under-8",
        ageCategory: index === 3 ? "U10" : "U8",
        sportIds: ["football"],
        coachId: coach.id,
      }) as WorkspacePlayer,
  );
  const invitation = invite(ownerCtx, {
    email: parent.email,
    role: "PARENT",
    playerIds: [players[0].id],
    guardianVerified: true,
  });
  await acceptInvitation(await login(parent), invitation.token);
  function train<T>(
    ctx: Context,
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ): T {
    return trainingAction(ctx, {
      requestId: randomUUID(),
      action,
      data,
      id,
      expectedVersion,
    }) as T;
  }
  const batch = train<FootballSquad>(ownerCtx, "squad", {
    name: "U8 Foundations",
    branchId: branch.id,
    playerIds: players.slice(0, 3).map((player) => player.id),
  });
  const emptyBatch = train<FootballSquad>(ownerCtx, "squad", {
    name: "U10 New Starters",
    branchId: branch.id,
    playerIds: [players[3].id],
  });
  const venue = train<FootballVenue>(ownerCtx, "venue", {
    name: "Bharat Main Pitch",
    branchId: branch.id,
    location: "Fictional QA Main Pitch",
    exclusive: true,
  });
  const drills = [
    [
      "Movement warm-up",
      "Recovery movement",
      "Practise comfortable movement and ball familiarity",
      "Small controlled steps",
    ],
    [
      "Close-control dribbling",
      "Dribbling",
      "Practise close control when changing direction",
      "Keep the ball close",
    ],
    [
      "Passing pairs",
      "Passing",
      "Practise receiving and passing with a partner",
      "Look before passing",
    ],
    [
      "Small-sided game",
      "Positioning",
      "Apply the recorded focus in a small game",
      "Look for a safe passing option",
    ],
  ].map(
    ([name, focusArea, purpose, cue]) =>
      saveRecord(ownerCtx, "drill", {
        sportId: "football",
        name,
        focusArea,
        purpose,
        cue,
      }) as WorkspaceDrill,
  );
  const sessions: FootballSession[] = [],
    reviewed: FootballEvidence[] = [];
  for (const [date, successes] of [
    ["2026-08-05", 2],
    ["2026-09-05", 2],
    ["2026-09-12", 3],
  ] as const) {
    mock.timers.setTime(Date.parse(`${date}T01:00:00Z`));
    const ctx = await context(await login(coach), academy.id);
    let session = train<FootballSession>(ctx, "session", {
      branchId: branch.id,
      squadId: batch.id,
      venueId: venue.id,
      location: venue.location,
      coachIds: [coach.id],
      timezone: "Asia/Kolkata",
      startLocal: `${date}T17:00`,
      endLocal: `${date}T18:30`,
      theme: "Close control when changing direction",
      sharedObjective: {
        goal: "Keep close control when changing direction",
        cue: "Small touches",
        observe: "Ball stays inside the marked channel during six turns",
      },
      agenda: drills.map((drill, index) => ({
        drillId: drill.id,
        duration: [15, 25, 20, 20][index],
      })),
      preparation: ["Bring water and football boots"],
    });
    session = train<FootballSession>(
      ctx,
      "status",
      { status: "SCHEDULED" },
      session.id,
      session.version,
    );
    mock.timers.setTime(Date.parse(session.startAt) + 60_000);
    session = train<FootballSession>(
      ctx,
      "status",
      { status: "IN_PROGRESS" },
      session.id,
      session.version,
    );
    train(
      ctx,
      "attendance",
      {
        entries: players.slice(0, 3).map((player) => ({
          playerId: player.id,
          status: "PRESENT",
          expectedVersion: repo.find(
            academy.id,
            "attendance",
            `${session.id}:${player.id}`,
          )!.version,
        })),
        correctionReason: "",
      },
      session.id,
      session.version,
    );
    const evidence = train<FootballEvidence>(ctx, "evidence", {
      sessionId: session.id,
      playerId: players[0].id,
      drillId: drills[1].id,
      conditions:
        "Six turns around two cones three metres apart, walking pace, unopposed, same surface and cue",
      observation: `Fictional recorded observation: ${successes} of six close-control turns stayed inside the marked channel. Further comparable observation is needed.`,
      staffNote: "PRIVATE_REVIEW_STAFF_NOTE",
      type: "RAW_RECORD",
      visibility: "PARENT_ELIGIBLE",
      measurement: "ATTEMPTS",
      attempts: 6,
      successes,
      method:
        "Coach counted each defined turn once; success means the ball remains inside the marked channel",
    });
    reviewed.push(
      train<FootballEvidence>(
        ctx,
        "review",
        { status: "REVIEWED", verified: true },
        evidence.id,
        evidence.version,
      ),
    );
    mock.timers.setTime(Date.parse(session.endAt) + 60_000);
    session = train<FootballSession>(
      ctx,
      "status",
      { status: "COMPLETED" },
      session.id,
      session.version,
    );
    sessions.push(session);
  }
  mock.timers.setTime(Date.parse("2026-10-02T08:00:00Z"));
  ownerCtx = await context(await login(owner), academy.id);
  function period<T>(
    action: string,
    data: unknown,
    id?: string,
    expectedVersion = 0,
  ): T {
    return periodAction(ownerCtx, {
      requestId: randomUUID(),
      action,
      data,
      id,
      expectedVersion,
    }) as T;
  }
  let august = period<WorkspaceReport[]>("monthlyPrepare", {
    playerIds: [players[0].id],
    month: "2026-08",
  })[0];
  august = period<WorkspaceReport>(
    "monthlyEdit",
    {
      observation:
        "One completed August session was reviewed. More comparable observations are needed.",
      nextStep: "Repeat the same defined close-control activity",
      closingNote: "Fictional QA report. No child assessment is implied.",
    },
    august.id,
    repo.find(academy.id, "report", august.id)!.recordVersion,
  );
  approveReport(
    ownerCtx,
    august.id,
    true,
    repo.find(academy.id, "report", august.id)!.recordVersion,
  );
  const september = period<WorkspaceReport[]>("monthlyPrepare", {
    playerIds: [players[0].id, players[1].id],
    month: "2026-09",
  });
  const draft = period<WorkspaceReport>(
    "monthlyEdit",
    {
      observation:
        "Reviewed two completed September sessions. Repeat the defined activity before changing the task.",
      nextStep: "Repeat six close-control turns at a comfortable pace",
      closingNote: "Fictional QA records for testing only.",
    },
    september[0].id,
    repo.find(academy.id, "report", september[0].id)!.recordVersion,
  );
  const approved = repo.find(academy.id, "report", august.id)!;
  mkdirSync(resolve(".local"), { recursive: true });
  writeFileSync(
    resolve(".local/report-review-access.json"),
    JSON.stringify(
      {
        databasePath: filename,
        academyId: academy.id,
        accounts: [owner, coach, parent, outsider],
        players,
        batchId: batch.id,
        emptyBatchId: emptyBatch.id,
        branchId: branch.id,
        drillIds: drills.map((drill) => drill.id),
        reportId: draft.id,
        approvedId: approved.id,
        approvedSnapshotHash: createHash("sha256")
          .update(JSON.stringify(approved.snapshot))
          .digest("hex"),
        limitedReportId: september[1].id,
        sessions: sessions.map((session) => session.id),
        reviewedEvidenceIds: reviewed.map((entry) => entry.id),
      },
      null,
      2,
    ),
  );
  mock.timers.reset();
  console.log(
    "Prepared isolated fictional monthly report review fixture: four players, three completed sessions, one approved historical report and two saved drafts.",
  );
}
main().catch((error) => {
  mock.timers.reset();
  console.error(error);
  process.exitCode = 1;
});
