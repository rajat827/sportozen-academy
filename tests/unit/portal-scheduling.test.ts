import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync, readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({
  WorkspaceError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  authenticatedUser: vi.fn(),
}));
import { database } from "@/server/database";
import { workspaceRepository as repo } from "@/server/workspace-repository";
import { trainingAction } from "@/server/training-service";
import { periodAction } from "@/server/period-service";
import { approveReport } from "@/server/workspace-service";
import {
  parentReportSnapshot,
  reportPresentation,
} from "@/services/reports/report-presentation";
import { parentSchedule } from "@/server/parent-schedule-service";
import {
  visibleRecords,
  type WorkspaceAccess,
} from "@/server/workspace-access";
import type { AcademyConfiguration, WorkspaceReport } from "@/domain/workspace";
import type {
  FootballSession,
  FootballSquad,
  FootballVenue,
  FootballEvidence,
} from "@/domain/training";
import type { WeeklyPlan } from "@/domain/communication";
import {
  bookingOverlap,
  sessionConflicts,
  venuesConflict,
} from "@/services/session-scheduling";
import {
  periodFor,
  weeklyWording,
} from "@/services/communication/period-rules";
import { createGooglePlacesClient } from "@/server/google-places";
import {
  reservePlaceRequest,
  sessionPlacesAction,
  sessionPlacesStatus,
} from "@/server/session-places-service";

const filename = join(tmpdir(), `sportozen-scheduling-${randomUUID()}.sqlite`);
beforeAll(() => {
  process.env.SPORTOZEN_DATABASE_PATH = filename;
  database().exec(
    'CREATE TABLE IF NOT EXISTS "user"(id TEXT PRIMARY KEY,name TEXT)',
  );
});
afterAll(() => {
  database().close();
  delete (globalThis as typeof globalThis & { sportozenDatabase?: unknown })
    .sportozenDatabase;
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});

function setup() {
  const id = randomUUID();
  const academy: AcademyConfiguration = {
    id,
    academyId: id,
    name: "Isolated scheduling academy",
    contactEmail: "academy@example.test",
    country: "IN",
    language: "English",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateLocale: "en-IN",
    measurementSystem: "METRIC",
    brandAccent: "#008463",
    sportIds: ["football"],
    ageGroups: [],
    reviewFrequency: "Coach review",
    modules: ["development", "reports", "communication"],
    nutritionOptional: true,
    demo: false,
    onboardingStatus: "ACTIVE",
  };
  database()
    .prepare("INSERT INTO academy_workspaces(id,config) VALUES(?,?)")
    .run(id, JSON.stringify(academy));
  database()
    .prepare(
      "INSERT INTO platform_entitlements(academyId,tier,modules,status) VALUES(?,?,?,'ACTIVE')",
    )
    .run(id, "TEST", JSON.stringify(academy.modules));
  for (const [userId, role] of [
    ["owner", "OWNER"],
    ["a", "COACH"],
    ["b", "COACH"],
    ["c", "COACH"],
    ["parent", "PARENT"],
  ])
    database()
      .prepare(
        "INSERT INTO academy_memberships(id,academyId,userId,role,active) VALUES(?,?,?,?,1)",
      )
      .run(randomUUID(), id, userId, role);
  const ctx = {
    academy,
    user: { id: "owner", name: "Test owner", email: "owner@example.test" },
    membership: repo.membership(id, "owner")!,
  } as WorkspaceAccess;
  repo.save(id, "branch", {
    id: "branch",
    academyId: id,
    name: "Branch",
    timezone: "Asia/Kolkata",
  });
  repo.save(id, "drill", {
    id: "drill",
    academyId: id,
    sportId: "football",
    name: "Receiving activity",
    focusArea: "Passing",
    purpose: "Receive into space",
    cue: "Look and receive",
    ownership: "ACADEMY_CURRICULUM",
  });
  for (const coach of ["a", "b", "c"])
    repo.save(id, "player", {
      id: `p-${coach}`,
      academyId: id,
      name: `Player ${coach}`,
      sportIds: ["football"],
      squad: coach,
      coachId: coach,
    });
  const command = <T>(
    action: string,
    data: unknown,
    recordId?: string,
    expectedVersion = 0,
    as = ctx,
    requestId = randomUUID(),
  ) =>
    trainingAction(as, {
      requestId,
      action,
      data,
      id: recordId,
      expectedVersion,
    }) as T;
  const venue = (
    name: string,
    parentVenueId?: string,
    independentChildren = false,
  ) =>
    command<FootballVenue>("venue", {
      name,
      location: name,
      branchId: "branch",
      parentVenueId,
      independentChildren,
    });
  const ground = venue("Whole ground", undefined, true),
    zoneA = venue("Zone A", ground.id),
    zoneB = venue("Zone B", ground.id),
    pitch = venue("Separate pitch");
  const squads = ["a", "b", "c"].map((coach) =>
    command<FootballSquad>("squad", {
      name: `Batch ${coach}`,
      branchId: "branch",
      playerIds: [`p-${coach}`],
    }),
  );
  const draft = (
    coach = "a",
    venueId = zoneA.id,
    date = "2031-01-07",
    start = "17:00",
    end = "18:30",
  ) =>
    command<FootballSession>("session", {
      branchId: "branch",
      squadId: squads[["a", "b", "c"].indexOf(coach)].id,
      venueId,
      location: "Recorded training space",
      coachIds: [coach],
      timezone: "Asia/Kolkata",
      startLocal: `${date}T${start}`,
      endLocal: `${date}T${end}`,
      theme: "Shared receiving plan",
      agenda: [{ drillId: "drill", duration: 15 }],
      sharedObjective: {
        goal: "Receive into space",
        cue: "Look and receive",
        observe: "",
      },
      preparation: ["Bring water"],
    });
  const schedule = (session: FootballSession) =>
    command<FootballSession>(
      "status",
      { status: "SCHEDULED" },
      session.id,
      session.version,
    );
  return { ctx, command, draft, schedule, ground, zoneA, zoneB, pitch, squads };
}

function completeAttendance(
  f: ReturnType<typeof setup>,
  draft: FootballSession,
  status: "PRESENT" | "ABSENT",
) {
  const scheduled = f.schedule(draft),
    attendance = repo.find(f.ctx.academy.id, "attendance", `${draft.id}:p-a`)!;
  f.command(
    "attendance",
    {
      entries: [
        { playerId: "p-a", status, expectedVersion: attendance.version },
      ],
      correctionReason: "",
    },
    scheduled.id,
    scheduled.version,
  );
  const started = f.command<FootballSession>(
    "status",
    { status: "IN_PROGRESS" },
    scheduled.id,
    scheduled.version,
  );
  return f.command<FootballSession>(
    "status",
    { status: "COMPLETED" },
    started.id,
    started.version,
  );
}
function monthly(
  f: ReturnType<typeof setup>,
  action: string,
  data: unknown,
  report?: WorkspaceReport,
) {
  return periodAction(f.ctx, {
    requestId: randomUUID(),
    action,
    data,
    id: report?.id,
    expectedVersion: report?.recordVersion ?? 0,
  });
}

describe("real academy scheduling commands", () => {
  it("persists only a signed selected place and keeps manual locations valid while Maps is blocked", async () => {
    const f = setup();
    const config = {
      enabled: true,
      apiKey: "synthetic-key-only",
      signingSecret: "synthetic-test-signing-secret-at-least-32-chars",
    };
    vi.stubEnv("SPORTOZEN_GOOGLE_PLACES_ENABLED", "1");
    vi.stubEnv("SPORTOZEN_GOOGLE_PLACES_API_KEY", config.apiKey);
    vi.stubEnv("SPORTOZEN_GOOGLE_PLACES_SIGNING_SECRET", config.signingSecret);
    try {
      const fake = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "synthetic-place-id",
            displayName: { text: "Synthetic training ground" },
            formattedAddress: "Synthetic address fixture",
          }),
        ),
      );
      const place = await createGooglePlacesClient(config, fake).select(
        "synthetic-place-id",
        randomUUID(),
        { academyId: f.ctx.academy.id, userId: f.ctx.user.id },
        "Independently entered academy operating location",
      );
      const data = {
        branchId: "branch",
        squadId: f.squads[0].id,
        coachIds: ["a"],
        location: place.location,
        placeConfirmation: place.confirmation,
        timezone: "Asia/Kolkata",
        startLocal: "2031-01-07T17:00",
        endLocal: "2031-01-07T18:30",
        theme: "Passing and receiving",
        agenda: [],
      };
      const saved = f.command<FootballSession>("session", data);
      expect(
        repo.find(f.ctx.academy.id, "session", saved.id)?.googlePlaceId,
      ).toBe(place.placeId);
      expect(saved).not.toHaveProperty("placeConfirmation");
      expect(saved.location).toBe(
        "Independently entered academy operating location",
      );
      const stored = JSON.stringify([
        ...database()
          .prepare("SELECT body FROM workspace_records WHERE academyId=?")
          .all(f.ctx.academy.id),
        ...database()
          .prepare("SELECT body FROM training_history WHERE academyId=?")
          .all(f.ctx.academy.id),
        ...database()
          .prepare(
            "SELECT digest,response FROM training_submissions WHERE academyId=?",
          )
          .all(f.ctx.academy.id),
        Buffer.from(place.confirmation.split(".")[0], "base64url").toString(
          "utf8",
        ),
      ]);
      expect(stored).not.toContain("Synthetic training ground");
      expect(stored).not.toContain("Synthetic address fixture");
      expect(() =>
        f.command("session", { ...data, placeConfirmation: "invented" }),
      ).toThrow(/expired or changed/);
      vi.stubEnv("SPORTOZEN_GOOGLE_PLACES_ENABLED", "0");
      expect(sessionPlacesStatus(f.ctx).status).toBe("CONFIGURATION_BLOCKED");
      await expect(
        sessionPlacesAction(f.ctx, {
          action: "search",
          squadId: f.squads[0].id,
          sessionToken: randomUUID(),
          query: "Synthetic",
        }),
      ).rejects.toThrow(/configuration-blocked/);
      const manual = f.command<FootballSession>("session", {
        ...data,
        placeConfirmation: undefined,
        location: "Excelsior American School",
      });
      expect(manual.googlePlaceId).toBeUndefined();
      expect(manual.location).toBe("Excelsior American School");
      expect(fake).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("enforces Maps staff/squad scope and durable request limits without external calls", async () => {
    const f = setup();
    const parent = {
      ...f.ctx,
      user: { ...f.ctx.user, id: "parent" },
      membership: repo.membership(f.ctx.academy.id, "parent")!,
    };
    expect(() => sessionPlacesStatus(parent)).toThrow();
    await expect(
      sessionPlacesAction(f.ctx, {
        action: "search",
        squadId: "other-academy-squad",
        sessionToken: randomUUID(),
        query: "Synthetic",
      }),
    ).rejects.toThrow(/not available/);
    vi.stubEnv("SPORTOZEN_GOOGLE_PLACES_PER_USER_MINUTE", "1");
    try {
      reservePlaceRequest(f.ctx, 1000);
      expect(() => reservePlaceRequest(f.ctx, 1001)).toThrow(/limit/);
      expect(
        Number(
          database()
            .prepare(
              "SELECT SUM(requests) AS total FROM session_places_usage WHERE academyId=?",
            )
            .get(f.ctx.academy.id)?.total,
        ),
      ).toBe(2);
      reservePlaceRequest(f.ctx, 61000);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("persists a minimum draft without drills and retries the same request without duplicate records", () => {
    const f = setup();
    const data = {
      branchId: "branch",
      squadId: f.squads[0].id,
      coachIds: ["a"],
      location: "Excelsior American School",
      timezone: "Asia/Kolkata",
      startLocal: "2031-01-07T17:00",
      endLocal: "2031-01-07T18:30",
      theme: "Ball control and first touch",
      agenda: [],
    };
    const requestId = randomUUID();
    const saved = f.command<FootballSession>(
      "session",
      data,
      undefined,
      0,
      f.ctx,
      requestId,
    );
    const retry = f.command<FootballSession>(
      "session",
      data,
      undefined,
      0,
      f.ctx,
      requestId,
    );
    expect(retry).toEqual(saved);
    expect(saved.status).toBe("DRAFT");
    expect(saved.agenda).toEqual([]);
    expect(saved.sharedObjective).toBeUndefined();
    expect(repo.list(f.ctx.academy.id, "session")).toHaveLength(1);
    expect(repo.list(f.ctx.academy.id, "attendance")).toHaveLength(1);
    const edited = f.command<FootballSession>(
      "session",
      { ...data, theme: "Custom & revised <focus>" },
      saved.id,
      saved.version,
    );
    expect(edited.id).toBe(saved.id);
    expect(edited.status).toBe("DRAFT");
    expect(edited.version).toBe(saved.version + 1);
  });
  it("prepares, reviews, approves and renders a PDF for shared batch participation without creating an individual plan", async () => {
    const f = setup();
    database()
      .prepare('INSERT OR IGNORE INTO "user"(id,name) VALUES(?,?)')
      .run("a", "Recorded coach");
    completeAttendance(f, f.draft("a", f.zoneA.id, "2020-01-07"), "PRESENT");
    const absentDraft = f.draft("a", f.zoneA.id, "2020-01-08");
    repo.save(f.ctx.academy.id, "drill", {
      ...absentDraft.agenda[0].drill,
      id: "absent-drill",
      name: "Absent-only finishing activity",
      purpose: "Different batch activity",
    });
    const alteredDraft = f.command<FootballSession>(
      "session",
      { ...absentDraft, agenda: [{ drillId: "absent-drill", duration: 15 }] },
      absentDraft.id,
      absentDraft.version,
    );
    completeAttendance(f, alteredDraft, "ABSENT");
    const [prepared] = monthly(f, "monthlyPrepare", {
      playerIds: ["p-a"],
      month: "2020-01",
    }) as WorkspaceReport[];
    let report = repo.find(f.ctx.academy.id, "report", prepared.id)!;
    expect(report.planId).toBe("");
    expect(repo.list(f.ctx.academy.id, "plan")).toEqual([]);
    expect(report.monthlySources!.sessionIds).toHaveLength(2);
    expect(report.monthlySources!.model.focus).toContain("Receive into space");
    expect(report.monthlySources!.model.practised).toBe("Receiving activity");
    expect(
      report.monthlySources!.model.activities.map((activity) => activity.name),
    ).toEqual(["Receiving activity"]);
    expect(
      report.monthlySources!.model.evidence.map((item) => item.text).join(" "),
    ).toMatch(/1 present, 1 absent/);
    expect(report.evidenceType).toBe("MISSING_OR_UNCLEAR");
    expect(() =>
      approveReport(f.ctx, report.id, true, report.recordVersion),
    ).toThrow(/next development step/);
    monthly(
      f,
      "monthlyEdit",
      {
        observation: "",
        closingNote: "",
        nextStep:
          "Continue the shared receiving activity and record an observation next session.",
      },
      report,
    );
    report = repo.find(f.ctx.academy.id, "report", report.id)!;
    expect(() =>
      approveReport(f.ctx, report.id, false, report.recordVersion),
    ).toThrow(/Verify/);
    database()
      .prepare(
        "INSERT INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
      )
      .run(f.ctx.academy.id, "parent", "p-a");
    const parent = {
      ...f.ctx,
      user: { ...f.ctx.user, id: "parent" },
      membership: repo.membership(f.ctx.academy.id, "parent")!,
    };
    expect(visibleRecords(parent, "report")).toEqual([]);
    const approved = approveReport(
      f.ctx,
      report.id,
      true,
      report.recordVersion,
    );
    expect(approved.approvedPlan).toBeUndefined();
    expect(approved.snapshot!.coach).toBe("Recorded coach");
    expect(approved.snapshot!.focus).toContain("Receive into space");
    expect(
      approved.snapshot!.evidence.map((item) => item.text).join(" "),
    ).toContain("No reviewed parent-eligible observations");
    expect(repo.list(f.ctx.academy.id, "plan")).toEqual([]);
    const storedSnapshot = structuredClone(approved.snapshot!);
    const publicReport = visibleRecords(parent, "report")[0];
    expect(publicReport.snapshot).toEqual(
      JSON.parse(JSON.stringify(parentReportSnapshot(storedSnapshot))),
    );
    const attendance = {
      total: 2,
      present: 1,
      absent: 1,
      excused: 0,
      unmarked: 0,
    };
    expect(reportPresentation(publicReport.snapshot!).attendance).toEqual(
      attendance,
    );
    expect(reportPresentation(storedSnapshot).attendance).toEqual(attendance);
    expect(JSON.stringify(publicReport.snapshot)).not.toMatch(
      /Attendance basis:|drillId|drill version|Reference:/,
    );
    expect(publicReport.monthlySources).toBeUndefined();
    expect(publicReport.sourceEvidenceIds).toBeUndefined();
    expect(repo.find(f.ctx.academy.id, "report", report.id)?.snapshot).toEqual(
      storedSnapshot,
    );
    expect(storedSnapshot.evidence[0].text).toContain("Attendance basis:");
    expect(visibleRecords(parent, "plan")).toEqual([]);
    const history = database()
      .prepare(
        "SELECT approvedPlan,snapshot FROM report_approval_history WHERE academyId=? AND reportId=?",
      )
      .get(f.ctx.academy.id, report.id)!;
    expect(JSON.parse(String(history.approvedPlan))).toBeNull();
    expect(JSON.parse(String(history.snapshot))).toEqual(approved.snapshot);
    const { generateReportPdf } = await import("@/features/reports/report-pdf");
    const fontPath = join(process.cwd(), "public", "fonts");
    const pdf = await generateReportPdf(approved.snapshot!, fontPath, [
      readFileSync(join(fontPath, "NotoSans-Regular.ttf")),
      readFileSync(join(fontPath, "NotoSans-Bold.ttf")),
    ]);
    expect(
      new TextDecoder().decode(
        new Uint8Array(await pdf.arrayBuffer()).slice(0, 4),
      ),
    ).toBe("%PDF");
    expect(pdf.size).toBeGreaterThan(1000);
    const legacy = {
      ...report,
      id: randomUUID(),
      monthlySources: undefined,
      reportingPeriod: undefined,
      status: "Draft" as const,
    };
    repo.save(f.ctx.academy.id, "report", legacy);
    expect(() => approveReport(f.ctx, legacy.id, true)).toThrow(
      /plan is required for non-monthly/,
    );
  }, 30000);

  it("invalidates no-plan monthly approval after attendance changes and never claims absent batch activities were practised", () => {
    const f = setup(),
      completed = completeAttendance(
        f,
        f.draft("a", f.zoneA.id, "2020-01-07"),
        "PRESENT",
      );
    const [prepared] = monthly(f, "monthlyPrepare", {
      playerIds: ["p-a"],
      month: "2020-01",
    }) as WorkspaceReport[];
    let report = repo.find(f.ctx.academy.id, "report", prepared.id)!;
    monthly(
      f,
      "monthlyEdit",
      {
        observation: "",
        closingNote: "",
        nextStep: "Confirm participation at the next batch session.",
      },
      report,
    );
    report = repo.find(f.ctx.academy.id, "report", prepared.id)!;
    const attendance = repo.find(
      f.ctx.academy.id,
      "attendance",
      `${completed.id}:p-a`,
    )!;
    f.command(
      "attendance",
      {
        entries: [
          {
            playerId: "p-a",
            status: "ABSENT",
            expectedVersion: attendance.version,
          },
        ],
        correctionReason: "Corrected from the verified attendance sheet",
      },
      completed.id,
      completed.version,
    );
    expect(() =>
      approveReport(f.ctx, report.id, true, report.recordVersion),
    ).toThrow(/Monthly sources changed/);
    monthly(
      f,
      "monthlyEdit",
      {
        observation: "",
        closingNote: "",
        nextStep: report.nextStep,
        regenerate: true,
      },
      report,
    );
    report = repo.find(f.ctx.academy.id, "report", prepared.id)!;
    expect(report.monthlySources!.model.activities).toEqual([]);
    expect(report.monthlySources!.model.practised).toBe(
      "No confirmed completed-session participation recorded",
    );
    expect(report.monthlySources!.model.evidence[0].text).toContain(
      "0 present, 1 absent",
    );
    expect(
      approveReport(f.ctx, report.id, true, report.recordVersion).status,
    ).toBe("Approved");
    expect(repo.list(f.ctx.academy.id, "plan")).toEqual([]);
  });
  it("keeps independent simultaneous batches separate and rejects coach/player/whole-space conflicts atomically", () => {
    const f = setup();
    const a = f.schedule(f.draft("a", f.zoneA.id)),
      b = f.schedule(f.draft("b", f.zoneB.id)),
      c = f.schedule(f.draft("c", f.pitch.id));
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    const coachConflict = f.draft("a", f.pitch.id);
    expect(() => f.schedule(coachConflict)).toThrow(/Scheduling conflict/);
    expect(
      repo.find(f.ctx.academy.id, "session", coachConflict.id)?.status,
    ).toBe("DRAFT");
    const rootConflict = f.draft("b", f.ground.id);
    expect(() => f.schedule(rootConflict)).toThrow(/Scheduling conflict/);
    const conflicts = sessionConflicts(
      { ...b, coachIds: ["unshared"], roster: a.roster, venueId: f.zoneB.id },
      [a],
      repo.list(f.ctx.academy.id, "venue"),
    );
    expect(conflicts.map((value) => value.kind)).toEqual(["player"]);
    expect(
      venuesConflict(
        f.zoneA.id,
        f.zoneB.id,
        repo.list(f.ctx.academy.id, "venue"),
      ),
    ).toBe(false);
  });

  it("uses half-open times, detects partial overlap, applies configured venue buffers and ignores cancelled bookings", () => {
    const f = setup();
    const first = f.schedule(f.draft());
    expect(
      bookingOverlap(first, {
        startAt: first.endAt,
        endAt: "2031-01-07T14:00:00.000Z",
      }),
    ).toBe(false);
    expect(() =>
      f.schedule(f.draft("b", f.zoneA.id, "2031-01-07", "18:00", "19:00")),
    ).toThrow(/Scheduling conflict/);
    const next = f.draft("b", f.zoneA.id, "2031-01-07", "18:30", "20:00");
    f.command(
      "venue",
      {
        name: f.zoneA.name,
        location: f.zoneA.location,
        branchId: "branch",
        parentVenueId: f.ground.id,
        bufferMinutes: 15,
      },
      f.zoneA.id,
      f.zoneA.version,
    );
    expect(() => f.schedule(next)).toThrow(/Scheduling conflict/);
    f.command(
      "status",
      { status: "CANCELLED", reason: "Weather cancellation confirmed" },
      first.id,
      first.version,
    );
    expect(f.schedule(next).status).toBe("SCHEDULED");
  });

  it("reschedules the same record under version/assignment guards and retains history and outcomes", () => {
    const f = setup(),
      source = f.schedule(f.draft());
    f.command(
      "attendance",
      { entries: [{ playerId: "p-a", status: "PRESENT", expectedVersion: 1 }] },
      source.id,
      source.version,
    );
    const data = {
      startLocal: "2031-01-08T17:00",
      endLocal: "2031-01-08T18:30",
      timezone: "Asia/Kolkata",
      location: "Recorded training space",
      venueId: f.zoneB.id,
      coachIds: ["a"],
      reason: "Reviewed schedule change",
    };
    const coachCtx = {
      ...f.ctx,
      user: { ...f.ctx.user, id: "a" },
      membership: repo.membership(f.ctx.academy.id, "a")!,
    };
    expect(() =>
      f.command(
        "reschedule",
        { ...data, coachIds: ["b"] },
        source.id,
        source.version,
        coachCtx,
      ),
    ).toThrow(/Assign yourself/);
    const changed = f.command<FootballSession>(
      "reschedule",
      data,
      source.id,
      source.version,
    );
    expect(changed.id).toBe(source.id);
    expect(changed.startLocal).toBe(data.startLocal);
    expect(changed.roster).toEqual(source.roster);
    expect(changed.agenda).toEqual(source.agenda);
    expect(
      repo.find(f.ctx.academy.id, "attendance", `${source.id}:p-a`)?.status,
    ).toBe("PRESENT");
    expect(() =>
      f.command("reschedule", data, source.id, source.version),
    ).toThrow(/newer version/);
    expect(
      database()
        .prepare(
          "SELECT count(*) AS n FROM training_history WHERE academyId=? AND kind='session' AND recordId=?",
        )
        .get(f.ctx.academy.id, source.id)?.n,
    ).toBe(3);
  });

  it("copies planned structure once into a new undated draft without attendance, evidence or publication", () => {
    const f = setup(),
      source = f.schedule(f.draft());
    f.command(
      "attendance",
      { entries: [{ playerId: "p-a", status: "PRESENT", expectedVersion: 1 }] },
      source.id,
      source.version,
    );
    repo.save(f.ctx.academy.id, "evidence", {
      id: "private",
      academyId: f.ctx.academy.id,
      sportId: "football",
      sessionId: source.id,
      playerId: "p-a",
      staffNote: "Private source note",
    } as FootballEvidence);
    const requestId = randomUUID();
    const copied = f.command<FootballSession>(
      "copy",
      {},
      source.id,
      source.version,
      f.ctx,
      requestId,
    );
    expect(
      f.command<FootballSession>(
        "copy",
        {},
        source.id,
        source.version,
        f.ctx,
        requestId,
      ).id,
    ).toBe(copied.id);
    expect(copied).toMatchObject({
      status: "DRAFT",
      startLocal: "",
      endLocal: "",
      startAt: "",
      endAt: "",
      copiedFromSessionId: source.id,
      sharedObjective: source.sharedObjective,
      preparation: source.preparation,
    });
    expect(copied.id).not.toBe(source.id);
    expect(
      repo.find(f.ctx.academy.id, "attendance", `${copied.id}:p-a`)?.status,
    ).toBe("UNMARKED");
    expect(
      repo
        .list(f.ctx.academy.id, "evidence")
        .some((record) => record.sessionId === copied.id),
    ).toBe(false);
    expect(() => f.schedule(copied)).toThrow(/dated local time/);
  });

  it("permits empty current batches and rejects cyclic or cross-branch venue hierarchies", () => {
    const f = setup();
    expect(
      f.command<FootballSquad>("squad", {
        name: "New empty batch",
        branchId: "branch",
        playerIds: [],
      }).playerIds,
    ).toEqual([]);
    expect(() =>
      f.command(
        "venue",
        {
          name: "Cycle",
          branchId: "branch",
          location: "Ground",
          parentVenueId: f.zoneA.id,
        },
        f.ground.id,
        f.ground.version,
      ),
    ).toThrow(/cycle/);
    repo.save(f.ctx.academy.id, "branch", {
      id: "other",
      academyId: f.ctx.academy.id,
      name: "Other branch",
      timezone: "UTC",
    });
    expect(() =>
      f.command("venue", {
        name: "Invalid child",
        branchId: "other",
        location: "Other",
        parentVenueId: f.ground.id,
      }),
    ).toThrow(/same academy and branch/);
  });

  it("prepares and approves a shared batch plan with optional personalisation and exposes only linked public schedule fields", () => {
    const f = setup(),
      session = f.schedule(f.draft());
    database()
      .prepare(
        "INSERT INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
      )
      .run(f.ctx.academy.id, "parent", "p-a");
    const call = (
      action: string,
      data: unknown,
      id?: string,
      expectedVersion = 0,
    ) =>
      periodAction(f.ctx, {
        requestId: randomUUID(),
        action,
        data,
        id,
        expectedVersion,
      });
    const [weekly] = call("weeklyPrepare", {
      squadId: session.squadId,
      week: "2031-01-06",
    }) as WeeklyPlan[];
    expect(weekly.content.personalFocus).toBe("Following the batch plan");
    expect(weekly.content.teamFocus).toBe("Receive into space");
    expect(weekly.content.sessions[0].theme).toBe(session.theme);
    expect(weeklyWording(weekly.content)).toContain(session.theme);
    expect(weekly.content.missing).toEqual([]);
    const current = repo.find(f.ctx.academy.id, "weekly", weekly.id)!;
    expect(
      (
        call(
          "weeklyApprove",
          { verified: true },
          weekly.id,
          current.recordVersion,
        ) as WeeklyPlan
      ).status,
    ).toBe("APPROVED");
    const parentCtx = {
      ...f.ctx,
      user: { ...f.ctx.user, id: "parent" },
      membership: repo.membership(f.ctx.academy.id, "parent")!,
    };
    const projection = parentSchedule(parentCtx);
    expect(projection).toHaveLength(1);
    expect(projection[0]).toMatchObject({
      id: session.id,
      childId: "p-a",
      status: "SCHEDULED",
      theme: `${repo.find(f.ctx.academy.id, "squad", session.squadId)!.name} Training`,
    });
    expect(projection[0]).not.toHaveProperty("roster");
    expect(projection[0]).not.toHaveProperty("coachIds");
    expect(projection[0]).not.toHaveProperty("objectives");
    expect(JSON.stringify(projection)).not.toContain(session.theme);
    expect(JSON.stringify(projection)).not.toContain("Receive into space");
    f.command(
      "status",
      { status: "CANCELLED", reason: "Confirmed cancellation" },
      session.id,
      session.version,
    );
    expect(parentSchedule(parentCtx)).toEqual([]);
  });

  it("invalidates only affected unissued weekly consumers and preserves issued snapshots and unrelated weeks", () => {
    const f = setup(),
      session = f.schedule(f.draft());
    const period = periodFor("2031-01-06", "Asia/Kolkata", "WEEKLY");
    const content = {
      period,
      playerName: "Player a",
      teamFocus: "Receiving",
      personalFocus: "Following batch",
      observe: "Planned activities",
      homePractice: "",
      sessions: [
        {
          id: session.id,
          version: session.version,
          startAt: session.startAt,
          endAt: session.endAt,
          timezone: session.timezone,
          location: session.location,
        },
      ],
      activities: [],
      missing: [],
    };
    const base: WeeklyPlan = {
      id: "affected",
      academyId: f.ctx.academy.id,
      sportId: "football",
      squadId: session.squadId,
      playerId: "p-a",
      version: 1,
      content,
      snapshot: structuredClone(content),
      authorId: "owner",
      reviewerId: "owner",
      approvedAt: "2031-01-01T00:00:00Z",
      status: "APPROVED",
    };
    repo.save(f.ctx.academy.id, "weekly", base);
    repo.save(f.ctx.academy.id, "weekly", {
      ...base,
      id: "issued",
      issuedAt: "2031-01-01T00:00:00Z",
    });
    repo.save(f.ctx.academy.id, "weekly", {
      ...base,
      id: "other-week",
      content: {
        ...content,
        period: periodFor("2031-01-13", "Asia/Kolkata", "WEEKLY"),
        sessions: [],
      },
      snapshot: {
        ...content,
        period: periodFor("2031-01-13", "Asia/Kolkata", "WEEKLY"),
        sessions: [],
      },
    });
    f.command(
      "reschedule",
      {
        startLocal: "2031-01-08T17:00",
        endLocal: "2031-01-08T18:30",
        timezone: session.timezone,
        location: session.location,
        venueId: session.venueId,
        coachIds: session.coachIds,
        reason: "Reviewed change",
      },
      session.id,
      session.version,
    );
    expect(repo.find(f.ctx.academy.id, "weekly", "affected")?.status).toBe(
      "INVALIDATED",
    );
    expect(repo.find(f.ctx.academy.id, "weekly", "issued")).toMatchObject({
      status: "APPROVED",
      snapshot: content,
    });
    expect(repo.find(f.ctx.academy.id, "weekly", "other-week")?.status).toBe(
      "APPROVED",
    );
  });
});
