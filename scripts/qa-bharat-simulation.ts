/** Isolated synthetic fixture through the customer application services, never SQL inserts. */
import { mock } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type {
  WorkspacePlayer,
  WorkspaceDrill,
  WorkspacePlan,
  WorkspaceReport,
} from "../src/domain/workspace";
import type {
  FootballSession,
  FootballEvidence,
  FootballSquad,
  FootballVenue,
} from "../src/domain/training";

const filename = resolve(process.env.SPORTOZEN_DATABASE_PATH ?? "");
const localPath = relative(resolve(".local"), filename);
if (
  isAbsolute(localPath) ||
  localPath.startsWith("..") ||
  !/^e2e-bharat-[a-zA-Z0-9-]+\.sqlite$/.test(localPath)
)
  throw new Error("Use a new dedicated .local/e2e-bharat-*.sqlite database.");
if ([filename, `${filename}-wal`, `${filename}-shm`].some(existsSync))
  throw new Error(
    "Simulation never resets a database. Choose a new isolated filename.",
  );
if (
  process.env.SPORTOZEN_WHATSAPP_SEND_ENABLED === "true" ||
  process.env.SPORTOZEN_WHATSAPP_LIVE_ENABLED === "true"
)
  throw new Error("External delivery must be disabled.");
const output = resolve("docs/screenshots/final-academy/bharat");
mkdirSync(output, { recursive: true });
const accessFile = resolve(".local/bharat-qa-access.json");
execFileSync("git", ["check-ignore", "--quiet", accessFile]);
async function main() {
  mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-07-31T08:00:00Z"),
  });
  const { authentication } = await import("../src/server/auth");
  const {
    createAcademy,
    context,
    saveRecord,
    invite,
    acceptInvitation,
    approveReport,
    workspace,
  } = await import("../src/server/workspace-service");
  const { trainingAction } = await import("../src/server/training-service");
  const { periodAction } = await import("../src/server/period-service");
  const { workspaceRepository: repo } =
    await import("../src/server/workspace-repository");
  const { comparableEvidence } = await import("../src/services/training-rules");
  type Context = Awaited<ReturnType<typeof context>>;
  const accounts: {
    name: string;
    email: string;
    password: string;
    id: string;
  }[] = [];
  const uuid = (key: string) => {
    const h = createHash("sha256")
      .update(`sportozen-bharat-v1:${key}`)
      .digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  async function account(name: string, key: string) {
    const auth = await authentication(),
      email = `bharat-${key}@example.test`,
      password = `Synthetic-only-${randomUUID()}`;
    const response = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json(),
      headers = new Headers({
        cookie: response.headers
          .getSetCookie()
          .map((v) => v.split(";")[0])
          .join("; "),
      });
    const value = { name, email, password, id: body.user.id as string };
    accounts.push(value);
    return { ...value, headers };
  }
  async function login(value: (typeof accounts)[number]) {
    const response = await (
      await authentication()
    ).api.signInEmail({
      body: { email: value.email, password: value.password },
      asResponse: true,
    });
    assert.equal(response.status, 200);
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((v) => v.split(";")[0])
        .join("; "),
    });
  }
  const owner = await account("Synthetic Bharat Owner", "owner");
  const academy = await createAcademy(owner.headers, {
    name: "Bharat Football Academy",
    location: "Excelsior American School",
    contactEmail: "bharat-qa@example.test",
    country: "IN",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateLocale: "en-IN",
    language: "English",
    measurementSystem: "METRIC",
    brandAccent: "#008463",
    demo: true,
    ageGroups: ["U8", "U10", "U12", "U14", "U16", "U18"],
  });
  let ownerCtx = await context(owner.headers, academy.id);
  const branch = saveRecord(ownerCtx, "branch", {
    name: "Bharat Football Academy",
    timezone: "Asia/Kolkata",
  });
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
  const venue = train<FootballVenue>(ownerCtx, "venue", {
    name: "Excelsior American School",
    branchId: branch.id,
    location: "Excelsior American School",
    exclusive: true,
  });
  const groups: {
    age: number;
    squad: FootballSquad;
    coach: typeof owner;
    players: WorkspacePlayer[];
    drills: WorkspaceDrill[];
    plans: WorkspacePlan[];
  }[] = [];
  const given = [
    "Aadi",
    "Ishaan",
    "Kabir",
    "Vihaan",
    "Arjun",
    "Reyansh",
    "Neel",
    "Dev",
    "Rohan",
    "Ayan",
  ];
  for (const age of [8, 10, 12, 14, 16, 18]) {
    const coach = await account(`Synthetic U${age} Coach`, `coach-u${age}`);
    const invitation = invite(ownerCtx, { email: coach.email, role: "COACH" });
    await acceptInvitation(coach.headers, invitation.token);
    const players: WorkspacePlayer[] = [];
    for (let i = 0; i < 10; i++)
      players.push(
        saveRecord(
          ownerCtx,
          "player",
          {
            name: `${given[i]} Fictional U${age}`,
            sportIds: ["football"],
            squad: `Under-${age}`,
            ageCategory: `U${age}`,
            coachId: coach.id,
            status: "ACTIVE",
          },
          uuid(`u${age}-p${i + 1}`),
        ) as WorkspacePlayer,
      );
    const squad = train<FootballSquad>(ownerCtx, "squad", {
      name: `Under-${age}`,
      branchId: branch.id,
      playerIds: players.map((p) => p.id),
    });
    for (let i = 0; i < players.length; i++) {
      players[i] = saveRecord(
        ownerCtx,
        "player",
        {
          ...players[i],
          squadId: squad.id,
          placementReviewed: true,
          expectedVersion: players[i].recordVersion,
        },
        players[i].id,
      ) as WorkspacePlayer;
      const guardian = await account(
        `Synthetic Guardian U${age} ${i + 1}`,
        `guardian-u${age}-${i + 1}`,
      );
      const link = invite(ownerCtx, {
        email: guardian.email,
        role: "PARENT",
        playerIds: [players[i].id],
        guardianVerified: true,
      });
      await acceptInvitation(guardian.headers, link.token);
    }
    const purpose =
      age <= 10
        ? "Comfortable first touches and playful direction changes at walking pace"
        : age <= 14
          ? "Controlled receiving, changes of direction and support in small games"
          : "Controlled receiving and scanning before passing in small-sided play";
    const drills = [
      {
        name: `U${age} movement warm-up`,
        focusArea: "Receiving",
        purpose: "Prepare through comfortable movement and ball familiarity",
        cue: "Move comfortably; choose your own pace",
      },
      {
        name: `U${age} close-control six attempts`,
        focusArea: "Dribbling",
        purpose,
        cue: "Keep comfortable touches before changing direction",
      },
      {
        name: `U${age} passing pairs`,
        focusArea: "Passing",
        purpose: "Practise receiving and passing with a partner",
        cue: "Look up; cushion the ball",
      },
      {
        name: `U${age} small-sided game`,
          focusArea: "Positioning",
        purpose: "Apply the batch focus in a supervised small game",
        cue: "Find space and support a team-mate",
      },
    ].map(
      (d) =>
        saveRecord(ownerCtx, "drill", {
          ...d,
          sportId: "football",
        }) as WorkspaceDrill,
    );
    // Six optional adjustments; all other54 children inherit their shared batch objective.
    const plans = [
      saveRecord(ownerCtx, "plan", {
        playerId: players[0].id,
        sportId: "football",
        coachId: coach.id,
        focus: "Dribbling",
        reason: "Optional individual adjustment to the shared batch plan",
        drillIds: [drills[1].id],
        observe: "Defined six-attempt activity under identical conditions",
        homePractice: "Optional gentle touches in a safe supervised space",
        reviewDate: "2026-09-30",
        nextStep:
          "Repeat comparable close-control attempts at a comfortable pace",
        status: "ACTIVE",
        privateNote: "PRIVATE_BHARAT_STAFF_ONLY",
      }) as WorkspacePlan,
    ];
    groups.push({ age, squad, coach, players, drills, plans });
    console.log(
      `Prepared Under-${age}:10 fictional players and verified test guardian relationships.`,
    );
  }
  const dates = [
    "2026-08-01",
    "2026-08-08",
    "2026-08-15",
    "2026-08-22",
    "2026-08-29",
    "2026-09-05",
    "2026-09-12",
    "2026-09-19",
    "2026-09-26",
  ];
  const themes = [
    "Ball control and first touch",
    "Passing and receiving",
    "Dribbling and turning",
    "Decision-making",
    "Small-sided games",
    "Ball control and first touch",
    "Passing and receiving",
    "Dribbling and turning",
    "Possession",
  ];
  const sources: Record<string, FootballEvidence[]> = {};
  for (let day = 0; day < dates.length; day++) {
    mock.timers.setTime(Date.parse(`${dates[day]}T01:00:00Z`));
    for (let batch = 0; batch < groups.length; batch++) {
      const g = groups[batch],
        ctx = await context(await login(g.coach), academy.id),
        hour = 8 + batch;
      let session = train<FootballSession>(ctx, "session", {
        branchId: branch.id,
        squadId: g.squad.id,
        venueId: venue.id,
        location: venue.location,
        coachIds: [g.coach.id],
        timezone: "Asia/Kolkata",
        startLocal: `${dates[day]}T${String(hour).padStart(2, "0")}:00`,
        endLocal: `${dates[day]}T${String(hour + 1).padStart(2, "0")}:00`,
        theme: themes[day],
        sharedObjective: {
          goal: themes[day],
          cue: g.drills[1].cue,
          observe: "Comfortable touches and decisions in the recorded activity",
        },
        preparation: [
          "Bring football boots, shin pads and water.",
          "Arrive ten minutes before the confirmed start.",
        ],
        agenda: g.drills.map((d, i) => ({
          drillId: d.id,
          duration: [10, 20, 15, 15][i],
        })),
      });
      session = train<FootballSession>(
        ctx,
        "objective",
        {
          playerId: g.players[0].id,
          planId: g.plans[0].id,
          goal: g.plans[0].focus,
          drillId: g.drills[1].id,
          cue: g.drills[1].cue,
          observe: g.plans[0].observe,
        },
        session.id,
        session.version,
      );
      session = train<FootballSession>(
        ctx,
        "status",
        { status: "SCHEDULED" },
        session.id,
        session.version,
      );
      mock.timers.setTime(Date.parse(session.startAt) + 60000);
      session = train<FootballSession>(
        ctx,
        "status",
        { status: "IN_PROGRESS" },
        session.id,
        session.version,
      );
      const statuses = g.players.map((p, i) =>
        i === 3 && day % 3 === 0
          ? "ABSENT"
          : i === 8 && day % 4 === 0
            ? "EXCUSED"
            : "PRESENT",
      );
      train(
        ctx,
        "attendance",
        {
          entries: g.players.map((p, i) => ({
            playerId: p.id,
            status: statuses[i],
            expectedVersion: repo.find(
              academy.id,
              "attendance",
              `${session.id}:${p.id}`,
            )!.version,
          })),
        },
        session.id,
        session.version,
      );
      for (let i = 0; i < g.players.length; i++) {
        if (statuses[i] !== "PRESENT") continue;
        const successes =
          i === 0
            ? day < 5
              ? 2 + Math.floor(day / 2)
              : 4 + Math.floor((day - 5) / 2)
            : i === 1
              ? 3
              : i === 2
                ? [4, 2, 3, 2, 4, 2, 4, 3, 2][day]
                : i === 5
                  ? 2
                  : 3 + ((day + i) % 2);
        const evidence = train<FootballEvidence>(ctx, "evidence", {
          sessionId: session.id,
          playerId: g.players[i].id,
          planId: i === 0 ? g.plans[0].id : undefined,
          drillId: g.drills[1].id,
          conditions: `Synthetic U${g.age}:six turns around two cones three metres apart, walking pace, unopposed, same surface and cue`,
          observation: `Fictional coach record: ${successes} of six close-control turns kept within the marked channel. ${i === 5 ? "Continue the same comfortable-touch focus." : "Further comparable sessions support the next review."}`,
          staffNote: "PRIVATE_BHARAT_STAFF_ONLY",
          type: "RAW_RECORD",
          visibility: "PARENT_ELIGIBLE",
          measurement: "ATTEMPTS",
          attempts: 6,
          successes,
          method:
            "Coach counted each of six defined turns once; successful means ball remains inside the marked channel.",
        });
        const reviewed = train<FootballEvidence>(
          ctx,
          "review",
          {
            status: i === 4 && day !== 0 && day !== 5 ? "UNCLEAR" : "REVIEWED",
            verified: true,
          },
          evidence.id,
          evidence.version,
        );
        assert.ok(
          Date.parse(reviewed.recordedAt) >= Date.parse(session.startAt) &&
            Date.parse(reviewed.recordedAt) < Date.parse(session.endAt),
          "Evidence must be recorded inside its actual synthetic session.",
        );
        (sources[g.players[i].id] ??= []).push(reviewed);
      }
      mock.timers.setTime(Date.parse(session.endAt) + 60000);
      train(
        ctx,
        "status",
        { status: "COMPLETED" },
        session.id,
        session.version,
      );
      // Return to the day's start for the next independently authenticated synthetic coach.
      mock.timers.setTime(Date.parse(`${dates[day]}T01:00:00Z`));
    }
    console.log(
      `Completed ${dates[day]}:six saved batch sessions with attendance and reviewed source records.`,
    );
  }
  mock.timers.setTime(Date.parse("2026-10-01T08:00:00Z"));
  ownerCtx = await context(await login(owner), academy.id);
  const manifestPlayers = [];
  for (const g of groups)
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i],
        all = (sources[p.id] ?? []).filter((e) => e.status === "REVIEWED"),
        aug = all.filter((e) => e.recordedAt.startsWith("2026-08")),
        sep = all.filter((e) => e.recordedAt.startsWith("2026-09"));
      const a = aug.at(-1),
        b = sep.at(-1),
        compatible = !!a && !!b && comparableEvidence(a, b);
      const comparison = compatible
        ? `Comparable fictional records: August ${a!.successes}/${a!.attempts}; September ${b!.successes}/${b!.attempts}. Same child, drill version, conditions, method and unit. This describes these attempts only; no talent score or general improvement percentage is inferred.`
        : "Insufficient compatible reviewed evidence for a month-to-month comparison.";
      const reports = [];
      for (const month of ["2026-08", "2026-09"]) {
        const prepared = periodAction(ownerCtx, {
          requestId: randomUUID(),
          action: "monthlyPrepare",
          data: { playerIds: [p.id], month },
        }) as WorkspaceReport[];
        let r = repo.find(academy.id, "report", prepared[0].id)!;
        const reviewed = month === "2026-08" ? aug : sep;
        const note =
          i === 4
            ? "Only one reviewed observation is available this month. Insufficient reviewed evidence for a broader assessment; continue observation."
            : `Source-backed fictional QA report using ${reviewed.length} reviewed observations. ${month === "2026-09" ? comparison : "The recorded attempts establish this month's limited baseline; no previous-month comparison is claimed."}`;
        const long =
          i === 0 && g.age === 8 && month === "2026-09"
            ? Array.from(
                { length: 30 },
                (_, n) =>
                  `Review note ${n + 1}: The same child's defined activity and recorded attendance form the basis of this report. Repeat comfortable close-control practice; the coach should review comparable attempts before changing the focus.`,
              ).join("\n")
            : "Fictional QA data. Comfortable practice and continued coach review; no video or AI assessment.";
        periodAction(ownerCtx, {
          requestId: randomUUID(),
          action: "monthlyEdit",
          id: r.id,
          expectedVersion: r.recordVersion,
          data: {
            observation: note,
            closingNote: long,
            nextStep:
              i === 4
                ? "Collect more reviewed observations from the next attended batch session."
                : "Continue the batch focus and repeat comparable close-control attempts before the next review.",
          },
        });
        r = repo.find(academy.id, "report", r.id)!;
        approveReport(ownerCtx, r.id, true, r.recordVersion);
        r = repo.find(academy.id, "report", r.id)!;
        assert.equal(r.status, "Approved");
        assert.equal(
          r.monthlySources!.sessionIds.length,
          month === "2026-08" ? 5 : 4,
        );
        assert.equal(r.monthlySources!.evidenceIds.length, reviewed.length);
        const attendance = repo
          .list(academy.id, "attendance")
          .filter(
            (a) =>
              a.playerId === p.id &&
              r.monthlySources!.sessionIds.includes(a.sessionId),
          );
        assert.equal(attendance.length, r.monthlySources!.sessionIds.length);
        for (const sessionId of r.monthlySources!.sessionIds) {
          const source = repo.find(academy.id, "session", sessionId)!;
          assert.equal(source.status, "COMPLETED");
          assert.ok(source.roster.some((player) => player.playerId === p.id));
          assert.ok(
            source.startAt >= r.reportingPeriod!.startAt &&
              source.startAt < r.reportingPeriod!.endAt,
            "Report sessions must stay inside the local reporting period.",
          );
        }
        for (const evidenceId of r.monthlySources!.evidenceIds) {
          const evidence = repo.find(academy.id, "evidence", evidenceId)!;
          assert.equal(evidence.playerId, p.id);
          assert.equal(evidence.status, "REVIEWED");
          assert.equal(evidence.visibility, "PARENT_ELIGIBLE");
          assert.ok(
            evidence.recordedAt >= r.reportingPeriod!.startAt &&
              evidence.recordedAt < r.reportingPeriod!.endAt,
          );
        }
        reports.push({
          month,
          id: r.id,
          sourceSessionIds: r.monthlySources!.sessionIds,
          evidenceIds: r.monthlySources!.evidenceIds,
          attendance: {
            present: attendance.filter((a) => a.status === "PRESENT").length,
            absent: attendance.filter((a) => a.status === "ABSENT").length,
            excused: attendance.filter((a) => a.status === "EXCUSED").length,
          },
          snapshotHash: createHash("sha256")
            .update(JSON.stringify(r.snapshot))
            .digest("hex"),
        });
      }
      manifestPlayers.push({
        scenarioKey: `U${g.age}-${String(i + 1).padStart(2, "0")}`,
        id: p.id,
        name: p.name,
        batchId: g.squad.id,
        coachId: g.coach.id,
        guardianId: accounts.find(
          (a) => a.email === `bharat-guardian-u${g.age}-${i + 1}@example.test`,
        )!.id,
        outcome:
          i < 6
            ? [
                "Comparable improvement",
                "Consistent observations",
                "Mixed results",
                "Missed sessions",
                "Limited reviewed evidence",
                "Continued focus",
              ][i]
            : i === 8
              ? "Excused sessions and regular observations"
              : "Regular batch observations",
        comparison: {
          compatible,
          augustEvidenceId: a?.id,
          septemberEvidenceId: b?.id,
          text: comparison,
        },
        reports,
      });
    }
  assert.equal(repo.list(academy.id, "player").length, 60);
  assert.equal(repo.list(academy.id, "report").length, 120);
  assert.equal(repo.list(academy.id, "session").length, 54);
  for (const g of groups) assert.equal(g.squad.playerIds.length, 10);
  assert.equal(new Set(manifestPlayers.map((player) => player.id)).size, 60);
  assert.equal(
    new Set(manifestPlayers.map((player) => player.guardianId)).size,
    60,
  );
  assert.equal(
    new Set(
      manifestPlayers.flatMap((player) =>
        player.reports.map((report) => report.id),
      ),
    ).size,
    120,
  );
  assert.equal(
    workspace(ownerCtx).members.filter(
      (member) => member.active && member.role === "PARENT",
    ).length,
    60,
  );
  assert.equal(repo.list(academy.id, "attendance").length, 540);
  // A real future timetable keeps Calendar/Home useful without adding historical outcomes.
  for (let batch = 0; batch < groups.length; batch++) {
    const g = groups[batch],
      hour = 8 + batch;
    let session = train<FootballSession>(ownerCtx, "session", {
      branchId: branch.id,
      squadId: g.squad.id,
      venueId: venue.id,
      location: venue.location,
      coachIds: [g.coach.id],
      timezone: "Asia/Kolkata",
      startLocal: `2026-10-20T${String(hour).padStart(2, "0")}:00`,
      endLocal: `2026-10-20T${String(hour + 1).padStart(2, "0")}:00`,
      theme: "Ball control and first touch",
      agenda: g.drills.map((d, i) => ({
        drillId: d.id,
        duration: [10, 20, 15, 15][i],
      })),
      sharedObjective: {
        goal: "Comfortable close-control turns",
        cue: g.drills[1].cue,
        observe: "Repeat the defined activity before the next review",
      },
      preparation: ["Bring boots, shin pads and water."],
    });
    session = train<FootballSession>(
      ownerCtx,
      "status",
      { status: "SCHEDULED" },
      session.id,
      session.version,
    );
    assert.equal(session.status, "SCHEDULED");
  }
  for (const player of manifestPlayers) {
    assert.deepEqual(
      player.reports.map((report) => report.month),
      ["2026-08", "2026-09"],
    );
    const saved = repo.find(academy.id, "player", player.id)!;
    assert.equal(saved.squadId, player.batchId);
    assert.equal(saved.coachId, player.coachId);
  }
  const manifest = {
    scenario: "Bharat Football Academy synthetic QA v1",
    fictional: true,
    academyId: academy.id,
    location: {
      name: "Excelsior American School",
      address: null,
      coordinates: null,
      googlePlaceId: null,
    },
    clock:
      "Isolated service-process Date mock: setup31Jul2026, sessions at actual synthetic Aug/Sep dates, reviewed reports1Oct2026. No existing timestamp was rewritten.",
    months: ["2026-08", "2026-09"],
    totals: {
      players: 60,
      batches: 6,
      sessions: 60,
      completedSessions: 54,
      upcomingSessions: 6,
      attendance: repo.list(academy.id, "attendance").length,
      evidence: repo.list(academy.id, "evidence").length,
      reports: 120,
    },
    batches: groups.map((g) => ({
      id: g.squad.id,
      age: g.age,
      name: g.squad.name,
      coachId: g.coach.id,
      playerIds: g.players.map((p) => p.id),
    })),
    players: manifestPlayers,
  };
  writeFileSync(`${output}/manifest.json`, JSON.stringify(manifest, null, 2));
  writeFileSync(
    accessFile,
    JSON.stringify(
      { databasePath: filename, academyId: academy.id, accounts },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  mock.timers.reset();
  console.log(
    JSON.stringify({
      status: "SEEDED",
      academyId: academy.id,
      ...manifest.totals,
    }),
  );
}
void main().catch((error: unknown) => {
  mock.timers.reset();
  console.error(error);
  process.exitCode = 1;
});
