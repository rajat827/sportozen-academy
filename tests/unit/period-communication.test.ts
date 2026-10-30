import {
  beforeEach,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({
  WorkspaceError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WorkspaceError";
    }
  },
  authenticatedUser: vi.fn(),
}));
import { database } from "@/server/database";
import { workspaceRepository as repo } from "@/server/workspace-repository";
import { communicationRepository as comm } from "@/server/communication-repository";
import { periodAction, assembleMonthly } from "@/server/period-service";
import {
  parentReportSnapshot,
  reportPresentation,
} from "@/services/reports/report-presentation";
import {
  approveReport,
  reviewUpdate,
  publishUpdate,
  saveRecord,
  workspace,
} from "@/server/workspace-service";
import {
  visibleRecords,
  type WorkspaceAccess,
} from "@/server/workspace-access";
import {
  defaults,
  queueNotification,
  dispatchCheck,
  communicationAction,
  communicationView,
  contactEligible,
  notificationContent,
} from "@/server/communication-service";
import {
  claimJob,
  workerTick,
  prepareSchedules,
} from "@/server/communication-worker";
import { receiveWebhook, processEvents } from "@/server/whatsapp-webhooks";
import {
  MetaWhatsAppProvider,
  ProviderFailure,
  validSignature,
} from "@/server/whatsapp-provider";
import {
  weeklyTemplateBody,
  monthlyTemplateBody,
  templateParameters,
} from "@/services/communication/whatsapp-templates";
import {
  periodFor,
  monthlyRecords,
  providerState,
  quiet,
} from "@/services/communication/period-rules";
import type {
  AcademyConfiguration,
  WorkspacePlan,
  WorkspaceReport,
} from "@/domain/workspace";
import type { FootballSession, FootballEvidence } from "@/domain/training";
import type { WeeklyPlan } from "@/domain/communication";
const filename = join(
  tmpdir(),
  `sportozen-communication-${randomUUID()}.sqlite`,
);
process.env.SPORTOZEN_DATABASE_PATH = filename;
const academy: AcademyConfiguration = {
  id: "a",
  academyId: "a",
  name: "Synthetic Academy",
  contactEmail: "fake@example.test",
  country: "IN",
  language: "en",
  currency: "INR",
  timezone: "Asia/Kolkata",
  dateLocale: "en-IN",
  measurementSystem: "METRIC",
  brandAccent: "#008463",
  sportIds: ["football"],
  ageGroups: [],
  reviewFrequency: "Monthly",
  modules: ["development", "reports", "communication"],
  nutritionOptional: true,
  demo: true,
  onboardingStatus: "ACTIVE",
};
const ctx: WorkspaceAccess = {
  academy,
  membership: {
    id: "m",
    academyId: "a",
    userId: "coach",
    role: "COACH",
    active: true,
    sportIds: ["football"],
  },
  user: {
    id: "coach",
    name: "Synthetic coach",
    email: "coach@example.test",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: null,
  },
};
const parent: WorkspaceAccess = {
  ...ctx,
  membership: { ...ctx.membership, userId: "guardian", role: "PARENT" },
  user: { ...ctx.user, id: "guardian" },
};
const base = { academyId: "a", sportId: "football" };
const plan: WorkspacePlan = {
  ...base,
  id: "plan",
  playerId: "p",
  coachId: "coach",
  focus: "Receiving",
  reason: "Recorded focus",
  drillIds: ["drill"],
  observe: "Controlled first touch",
  homePractice: "Optional gentle ball touches with a guardian",
  reviewDate: "2027-01-10",
  nextStep: "Repeat the recorded touch activity",
  status: "ACTIVE",
  privateNote: "SECRET STAFF NOTE",
};
const futurePeriod = periodFor("2027-01-04", "Asia/Kolkata", "WEEKLY");
const session: FootballSession = {
  ...base,
  id: "session",
  version: 1,
  updatedAt: "2026-12-01T00:00:00Z",
  updatedBy: "coach",
  branchId: "branch",
  squadId: "squad",
  location: "Recorded pitch",
  coachIds: ["coach"],
  timezone: "Asia/Kolkata",
  startLocal: "2027-01-05T17:00",
  endLocal: "2027-01-05T18:00",
  startAt: "2027-01-05T11:30:00.000Z",
  endAt: "2027-01-05T12:30:00.000Z",
  theme: "Passing",
  status: "SCHEDULED",
  roster: [
    { playerId: "p", name: "Synthetic player" },
    { playerId: "p2", name: "Second player" },
  ],
  agenda: [
    {
      drill: {
        ...base,
        id: "drill",
        name: "Touch activity",
        focusArea: "Receiving",
        purpose: "Practise control",
        cue: "Watch the ball",
        ownership: "ACADEMY_CURRICULUM",
      },
      duration: 15,
      drillVersion: 1,
    },
  ],
  objectives: [
    {
      playerId: "p",
      playerName: "Synthetic player",
      planId: "plan",
      goal: "Control",
      drillId: "drill",
      cue: "Watch",
      observe: "Controlled first touch",
    },
    {
      playerId: "p2",
      playerName: "Second player",
      planId: "plan2",
      goal: "Passing precision",
      drillId: "drill",
      cue: "Watch",
      observe: "Pass direction",
    },
  ],
};
function command(action: string, data: unknown, id?: string) {
  const version = id
    ? (repo.find("a", "weekly", id)?.recordVersion ??
      repo.find("a", "report", id)?.recordVersion ??
      0)
    : 0;
  return periodAction(ctx, {
    requestId: randomUUID(),
    action,
    data,
    id,
    expectedVersion: version,
  });
}
function weekly(approved = true) {
  const r = (
    command("weeklyPrepare", {
      squadId: "squad",
      week: "2027-01-04",
    }) as WeeklyPlan[]
  )[0];
  if (approved) command("weeklyApprove", { verified: true }, r.id);
  return repo.find("a", "weekly", r.id)!;
}
function settings() {
  const s = {
    ...defaults("a", "Asia/Kolkata"),
    enabled: true,
    paused: false,
    quietStart: "00:00",
    quietEnd: "00:00",
    phoneNumberId: "111",
    wabaId: "222",
    credentialRef: "SPORTOZEN_WA_SYNTHETIC",
    connection: "Ready for controlled testing" as const,
    verifiedAt: new Date().toISOString(),
  };
  comm.saveSettings(s);
  return s;
}
function contact(id = "guardian", phone = "+12025550101") {
  comm.saveContact({
    academyId: "a",
    guardianId: id,
    phone,
    verifiedAt: new Date().toISOString(),
    verifiedBy: "coach",
    verificationReference: "synthetic verified contact",
    consentAt: new Date().toISOString(),
    consentReference: "synthetic academy named opt-in",
    weekly: true,
    monthly: true,
    version: 1,
  });
}
function queued() {
  const r = weekly();
  settings();
  contact();
  queueNotification(
    "a",
    "WEEKLY",
    r.id,
    ["guardian"],
    "2026-01-01T00:00:00.000Z",
    futurePeriod.startAt,
  );
  return { r, job: comm.jobs("a")[0] };
}
function signed(value: unknown) {
  const raw = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "222",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111" },
              ...(value as object),
            },
          },
        ],
      },
    ],
  });
  return {
    raw,
    signature: `sha256=${createHmac("sha256", "synthetic-secret").update(raw).digest("hex")}`,
  };
}
function secret() {
  process.env.SPORTOZEN_WA_SYNTHETIC = JSON.stringify({
    academyId: "a",
    phoneNumberId: "111",
    wabaId: "222",
    token: "SYNTHETIC-NOT-A-REAL-TOKEN",
    appSecret: "synthetic-secret",
    verifyToken: "synthetic-verify",
    graphVersion: "v23.0",
  });
}
beforeEach(() => {
  const db = database();
  db.exec(
    "DELETE FROM communication_events;DELETE FROM delivery_attempts;DELETE FROM delivery_jobs;DELETE FROM communication_reminders;DELETE FROM guardian_contacts;DELETE FROM communication_settings;DELETE FROM training_history;DELETE FROM training_submissions;DELETE FROM report_approval_history;DELETE FROM update_approval_history;DELETE FROM guardian_relationships;DELETE FROM academy_memberships;DELETE FROM workspace_records;DELETE FROM platform_entitlements;DELETE FROM academy_workspaces;CREATE TABLE IF NOT EXISTS user(id TEXT PRIMARY KEY,name TEXT,email TEXT,emailVerified INTEGER,createdAt TEXT,updatedAt TEXT);",
  );
  db.prepare("INSERT INTO academy_workspaces VALUES(?,?)").run(
    "a",
    JSON.stringify(academy),
  );
  db.prepare("INSERT INTO platform_entitlements VALUES(?,?,?,?)").run(
    "a",
    "TEST",
    JSON.stringify(academy.modules),
    "ACTIVE",
  );
  for (const [id, role] of [
    ["coach", "COACH"],
    ["guardian", "PARENT"],
    ["guardian2", "PARENT"],
  ]) {
    db.prepare(
      "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
    ).run(id, "a", id, role, '["football"]');
    db.prepare("INSERT OR IGNORE INTO user VALUES(?,?,?,?,?,?)").run(
      id,
      id,
      `${id}@example.test`,
      0,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  }
  repo.save("a", "player", {
    id: "p",
    academyId: "a",
    name: "Synthetic player",
    sportIds: ["football"],
    squad: "Squad",
    coachId: "coach",
  });
  repo.save("a", "player", {
    id: "p2",
    academyId: "a",
    name: "Second player",
    sportIds: ["football"],
    squad: "Squad",
    coachId: "coach",
  });
  db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
    "a",
    "guardian",
    "p",
  );
  db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
    "a",
    "guardian2",
    "p",
  );
  repo.save("a", "plan", plan);
  repo.save("a", "plan", {
    ...plan,
    id: "plan2",
    playerId: "p2",
    focus: "Passing",
  });
  repo.save("a", "drill", session.agenda[0].drill);
  repo.save("a", "squad", {
    ...base,
    id: "squad",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "coach",
    name: "Squad",
    branchId: "branch",
    playerIds: ["p", "p2"],
  });
  repo.save("a", "session", session);
  vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "false");
  secret();
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(() => {
  database().close();
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});
describe("weekly approval and monthly source extension", () => {
  it("saves unfinished monthly feedback, exposes current-source guidance only to staff, and preserves approval guards", () => {
    const draft = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2026-09",
      }) as WorkspaceReport[]
    )[0];
    command(
      "monthlyEdit",
      { observation: "", closingNote: "", nextStep: "" },
      draft.id,
    );
    const saved = repo.find("a", "report", draft.id)!;
    expect(saved.nextStep).toBe("");
    expect(saved.status).toBe("Draft");
    expect(() =>
      approveReport(ctx, saved.id, true, saved.recordVersion),
    ).toThrow(/next development step/);
    expect(workspace(ctx).monthlyReportReview?.[saved.id]).toEqual({
      sourcesCurrent: true,
    });
    expect(workspace(parent)).not.toHaveProperty("monthlyReportReview");
    repo.save("a", "plan", { ...plan, nextStep: "A newly recorded priority" });
    expect(workspace(ctx).monthlyReportReview?.[saved.id]).toMatchObject({
      sourcesCurrent: false,
      reason: expect.stringMatching(/sources changed/),
    });
    expect(repo.find("a", "report", draft.id)).toEqual(saved);
    command(
      "monthlyEdit",
      {
        observation: "",
        closingNote: "",
        nextStep: "Review receiving",
        regenerate: true,
      },
      draft.id,
    );
    expect(workspace(ctx).monthlyReportReview?.[saved.id]).toEqual({
      sourcesCurrent: true,
    });
    const prepared = command("monthlyPrepare", {
      playerIds: ["p", "p", "p2"],
      month: "2026-09",
    }) as WorkspaceReport[];
    expect(prepared).toHaveLength(2);
    expect(prepared[0].id).toBe(draft.id);
    expect(repo.list("a", "report")).toHaveLength(2);
    expect(repo.list("a", "report").every((r) => r.status === "Draft")).toBe(
      true,
    );
  });
  it("excludes preserved non-football snapshots before interpreting their historical schema", () => {
    const db = database();
    const historical = {
      player: {
        id: "historical-child",
        academyId: "a",
        name: "Historical child",
        sportIds: ["cricket"],
        coachId: "coach",
      },
      report: {
        id: "historical-report",
        academyId: "a",
        playerId: "historical-child",
        sportId: "cricket",
        status: "Approved",
        snapshot: { player: "Historical child", sport: "Cricket" },
      },
      update: {
        id: "historical-update",
        academyId: "a",
        playerId: "historical-child",
        sportId: "cricket",
        approvalStatus: "APPROVED",
        inAppPublicationStatus: "PUBLISHED",
        publishedGuardianIds: ["guardian"],
        approvedSource: {
          reportId: "historical-report",
          player: "Historical child",
          sport: "Cricket",
        },
      },
    };
    for (const [kind, body] of Object.entries(historical)) {
      db.prepare(
        "INSERT INTO workspace_records(academyId,kind,id,sportId,playerId,body) VALUES(?,?,?,?,?,?)",
      ).run(
        "a",
        kind,
        body.id,
        "sportId" in body ? body.sportId : null,
        kind === "player" ? body.id : "historical-child",
        JSON.stringify(body),
      );
    }
    db.prepare(
      "INSERT INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
    ).run("a", "guardian", "historical-child");
    expect(visibleRecords(parent, "player").map((p) => p.id)).toEqual(["p"]);
    expect(visibleRecords(parent, "report")).toEqual([]);
    expect(visibleRecords(parent, "update")).toEqual([]);
    expect(visibleRecords(parent, "plan")).toEqual([]);
    for (const [kind, body] of Object.entries(historical)) {
      const saved = db
        .prepare(
          "SELECT body FROM workspace_records WHERE academyId=? AND kind=? AND id=?",
        )
        .get("a", kind, body.id);
      expect(saved?.body).toBe(JSON.stringify(body));
    }
  });
  it("freezes the saved interpretation and complete authored observation for a new non-monthly training report", () => {
    const authored =
      "Reviewed first touch. Conditions: this sentence is coach-authored, not appended collection metadata.\nThe final recorded sentence must survive.";
    const commentary =
      "The saved report interpretation. Conditions: compare only these attempts before the next review.";
    repo.save("a", "session", { ...session, status: "COMPLETED" });
    const source: FootballEvidence = {
      ...base,
      id: "narrative-source",
      version: 1,
      updatedAt: session.startAt,
      updatedBy: "coach",
      sessionId: session.id,
      playerId: "p",
      planId: "plan",
      drillId: "drill",
      drillVersion: 1,
      drillName: "Touch activity",
      conditions: "Technical collection metadata retained for authorised staff",
      observation: authored,
      staffNote: "PRIVATE-NARRATIVE-STAFF",
      type: "COACH_OBSERVATION",
      visibility: "PARENT_ELIGIBLE",
      measurement: "OBSERVATION",
      unit: "NONE",
      method: "Recorded observation",
      status: "REVIEWED",
      authorId: "coach",
      recordedAt: session.startAt,
      reviewedBy: "coach",
      reviewedAt: session.startAt,
    };
    repo.save("a", "evidence", source);
    const draft = saveRecord(ctx, "report", {
      playerId: "p",
      planId: "plan",
      sportId: "football",
      period: "January 2027",
      sourceEvidenceIds: [source.id],
      observation: commentary,
      evidenceType: "COACH_OBSERVATION",
      nextStep: "Repeat the recorded cue",
      closingNote: "Saved closing note",
    }) as WorkspaceReport;
    const approved = approveReport(ctx, draft.id, true, draft.recordVersion);
    const frozen = structuredClone(approved.snapshot!);
    expect(frozen.presentationData?.coachEvaluation).toEqual([commentary]);
    expect(frozen.presentationData?.observations).toEqual([authored]);
    const publicReport = visibleRecords(parent, "report")[0];
    expect(reportPresentation(publicReport.snapshot!).coachEvaluation).toEqual([
      commentary,
    ]);
    expect(reportPresentation(publicReport.snapshot!).observations).toEqual([
      authored,
    ]);
    expect(JSON.stringify(publicReport.snapshot)).not.toMatch(
      /PRIVATE-NARRATIVE-STAFF|Technical collection metadata/,
    );
    expect(repo.find("a", "report", draft.id)?.snapshot).toEqual(frozen);
    expect(
      visibleRecords(ctx, "report")[0].snapshot?.evidence[0].text,
    ).toContain("Technical collection metadata");
    const history = database()
      .prepare(
        "SELECT snapshot FROM report_approval_history WHERE academyId=? AND reportId=?",
      )
      .get("a", draft.id)!;
    expect(JSON.parse(String(history.snapshot))).toEqual(frozen);
  });
  it("publishes an explicitly reviewed batch-only monthly update privately without manufacturing a player plan", () => {
    const db = database();
    db.prepare(
      "DELETE FROM workspace_records WHERE academyId=? AND kind='plan'",
    ).run("a");
    db.prepare(
      "DELETE FROM guardian_relationships WHERE academyId=? AND userId=?",
    ).run("a", "guardian2");
    db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
      "a",
      "guardian2",
      "p2",
    );
    const report = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2026-09",
      }) as WorkspaceReport[]
    )[0];
    expect(report.planId).toBe("");
    command(
      "monthlyEdit",
      {
        observation:
          "No individual observation recorded; further coach review is needed.",
        nextStep: "Observe receiving at the next batch session.",
        closingNote: "Continue the shared batch plan.",
      },
      report.id,
    );
    const approved = approveReport(ctx, report.id, true);
    const update = saveRecord(ctx, "update", {
      playerId: "p",
      sportId: "football",
      planId: "",
      type: "DEVELOPMENT",
      sourceReportId: approved.id,
      messageBody:
        "Reviewed monthly update: further observation is required. Continue the shared batch plan.",
    });
    expect(repo.find("a", "update", update!.id)?.planId).toBe("");
    expect(visibleRecords(parent, "update")).toEqual([]);
    expect(() => publishUpdate(ctx, update!.id)).toThrow(/Approve/);
    reviewUpdate(ctx, update!.id, "submit", true);
    expect(() => reviewUpdate(ctx, update!.id, "approve", false)).toThrow(
      /Verify/,
    );
    reviewUpdate(ctx, update!.id, "approve", true);
    expect(visibleRecords(parent, "update")).toEqual([]);
    publishUpdate(ctx, update!.id);
    const published = visibleRecords(parent, "update");
    expect(published).toHaveLength(1);
    expect(published[0].sourceReportId).toBe(approved.id);
    expect(published[0].approvedSource).toEqual(
      JSON.parse(JSON.stringify(parentReportSnapshot(approved.snapshot!))),
    );
    expect(repo.find("a", "report", approved.id)?.snapshot).toEqual(
      approved.snapshot,
    );
    expect(JSON.stringify(published[0].approvedSource)).not.toContain(
      "Attendance basis:",
    );
    expect(
      reportPresentation(
        published[0].approvedSource as NonNullable<WorkspaceReport["snapshot"]>,
      ).attendance,
    ).toEqual(reportPresentation(approved.snapshot!).attendance);
    expect(published[0].externalDeliveryStatus).toBe("NOT_SENT");
    expect(
      visibleRecords(
        {
          ...parent,
          user: { ...parent.user, id: "guardian2" },
          membership: { ...parent.membership, userId: "guardian2" },
        },
        "update",
      ),
    ).toEqual([]);
    expect(repo.list("a", "plan")).toEqual([]);
  });
  it("does not let an empty update plan bypass the approved monthly source, player or category checks", () => {
    database()
      .prepare(
        "DELETE FROM workspace_records WHERE academyId=? AND kind='plan'",
      )
      .run("a");
    const report = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2026-09",
      }) as WorkspaceReport[]
    )[0];
    const draft = {
      playerId: "p",
      sportId: "football",
      planId: "",
      type: "DEVELOPMENT",
      sourceReportId: report.id,
      messageBody: "Recorded coach wording",
    };
    expect(() => saveRecord(ctx, "update", draft)).toThrow(
      /approved sport report/,
    );
    command(
      "monthlyEdit",
      {
        observation: "Further observation needed.",
        nextStep: "Review the next batch session.",
        closingNote: "",
      },
      report.id,
    );
    approveReport(ctx, report.id, true);
    for (const values of [
      { ...draft, sourceReportId: undefined },
      { ...draft, sourceReportId: "other-academy-report" },
      { ...draft, playerId: "p2" },
      { ...draft, type: "NUTRITION_HYDRATION" },
      { ...draft, type: "UPCOMING_TRAINING" },
      { ...draft, type: "REVIEWED_SESSION" },
    ])
      expect(() => saveRecord(ctx, "update", values)).toThrow();
    expect(repo.list("a", "update")).toEqual([]);
    expect(repo.list("a", "plan")).toEqual([]);
  });
  it("reuses real sessions/objectives with distinct player focuses and no retrospective report", () => {
    const r = weekly();
    expect(r.content.sessions[0].id).toBe("session");
    expect(r.content.personalFocus).toBe("Control");
    expect(repo.list("a", "weekly")[1].content.personalFocus).toBe(
      "Passing precision",
    );
    expect(repo.list("a", "report")).toHaveLength(0);
    const u = saveRecord(ctx, "update", {
      playerId: "p",
      sportId: "football",
      planId: "plan",
      type: "UPCOMING_TRAINING",
      sourceWeeklyPlanId: r.id,
      messageBody: "Recorded planned training, not completed achievements",
    });
    expect(u).toBeDefined();
    reviewUpdate(ctx, u!.id, "submit", true);
    reviewUpdate(ctx, u!.id, "approve", true);
    publishUpdate(ctx, u!.id);
    expect(visibleRecords(parent, "update")).toHaveLength(1);
    expect(visibleRecords(parent, "weekly")).toHaveLength(0);
    command("weeklyPublish", {}, r.id);
    expect(visibleRecords(parent, "weekly")).toHaveLength(1);
    expect(JSON.stringify(visibleRecords(parent, "weekly"))).not.toContain(
      "SECRET STAFF NOTE",
    );
  });
  it("invalidates unissued approval and queued messages immediately when source schedule changes", () => {
    const { r } = queued();
    repo.save("a", "session", {
      ...session,
      version: 2,
      location: "Changed pitch",
    });
    expect(comm.jobs("a")[0].state).toBe("CANCELLED");
    expect(repo.find("a", "weekly", r.id)?.status).toBe("INVALIDATED");
    expect(() => notificationContent("a", "WEEKLY", r.id)).toThrow();
  });
  it("includes recorded schedule, venue and preparation in weekly wording without requiring a personal plan", () => {
    database()
      .prepare(
        "DELETE FROM workspace_records WHERE academyId='a' AND kind='plan'",
      )
      .run();
    repo.save("a", "session", {
      ...session,
      objectives: [],
      sharedObjective: {
        goal: "Shared receiving",
        cue: "Look first",
        observe: "First touch",
      },
      preparation: ["Bring water"],
    });
    const r = weekly();
    expect(r.content.personalFocus).toBe("Following the batch plan");
    expect(r.content.preparation).toEqual(["Bring water"]);
    const output = templateParameters(
      "WEEKLY",
      academy.name,
      r.content.period.key,
      "https://example.test/private",
      r.content,
    );
    expect(output.rendered).toContain("05 Jan, 17:00");
    expect(output.rendered).toContain("Recorded pitch");
    expect(output.rendered).toContain("Bring water");
    expect(output.rendered).not.toContain("SECRET STAFF NOTE");
  });
  it("automatically prepares only missing weekly drafts at the configured time without approving or overwriting saved review", () => {
    const s = settings();
    comm.saveSettings({
      ...s,
      weeklyDraftEnabled: true,
      weeklyDraftLeadDays: 2,
      weeklyDraftTime: "09:00",
    });
    database()
      .prepare(
        "UPDATE academy_memberships SET role='OWNER' WHERE userId='coach'",
      )
      .run();
    prepareSchedules(new Date("2027-01-01T14:00:00.000Z"));
    expect(repo.list("a", "weekly")).toEqual([]);
    prepareSchedules(new Date("2027-01-02T04:00:00.000Z"));
    const first = repo.list("a", "weekly");
    expect(first).toHaveLength(2);
    expect(first.every((record) => record.status === "DRAFT")).toBe(true);
    expect(comm.jobs("a")).toEqual([]);
    const original = first[0];
    periodAction(
      { ...ctx, membership: { ...ctx.membership, role: "OWNER" } },
      {
        requestId: randomUUID(),
        action: "weeklyEdit",
        id: original.id,
        expectedVersion: original.recordVersion,
        data: {
          personalFocus: "Human reviewed draft wording",
          observe: "Recorded first touch",
          homePractice: "",
        },
      },
    );
    const revised = repo.find("a", "weekly", original.id)!;
    prepareSchedules(new Date("2027-01-03T04:00:00.000Z"));
    expect(repo.find("a", "weekly", original.id)).toEqual(revised);
    expect(repo.list("a", "weekly")).toHaveLength(2);
  });
  it("cancels queued weekly content after session cancellation rather than sending an outdated schedule", () => {
    const { r } = queued();
    repo.save("a", "session", { ...session, status: "CANCELLED", version: 2 });
    expect(comm.jobs("a")[0].state).toBe("CANCELLED");
    expect(() => notificationContent("a", "WEEKLY", r.id)).toThrow(
      /stale|unapproved/,
    );
  });
  it("preserves issued plans and requires an explicit correction with fresh individual review", () => {
    const r = weekly();
    command("weeklyPublish", {}, r.id);
    expect(() =>
      command(
        "weeklyEdit",
        { personalFocus: "Changed", observe: "Changed", homePractice: "" },
        r.id,
      ),
    ).toThrow(/historical/);
    const correction = command("weeklyCorrection", {
      squadId: "squad",
      week: "2027-01-04",
      correctionOf: r.id,
    }) as WeeklyPlan[];
    expect(correction).toHaveLength(1);
    expect(correction[0].status).toBe("DRAFT");
    expect(correction[0].correctionOf).toBe(r.id);
    expect(repo.find("a", "weekly", r.id)?.snapshot?.personalFocus).toBe(
      "Control",
    );
  });
  it("rejects stale versions, cross-player coaching scope and unverified approval", () => {
    const r = weekly(false);
    expect(() =>
      periodAction(ctx, {
        requestId: randomUUID(),
        action: "weeklyApprove",
        id: r.id,
        expectedVersion: 99,
        data: { verified: true },
      }),
    ).toThrow(/changed/);
    expect(() => command("weeklyApprove", { verified: false }, r.id)).toThrow();
    repo.save("a", "player", {
      ...repo.find("a", "player", "p2")!,
      coachId: "someone-else",
    });
    expect(() =>
      command("weeklyPrepare", { squadId: "squad", week: "2027-01-04" }),
    ).toThrow();
  });
  it("makes identical request retries safe and rejects key reuse", () => {
    const input = {
      requestId: randomUUID(),
      action: "weeklyPrepare",
      data: { squadId: "squad", week: "2027-01-04" },
    };
    expect(periodAction(ctx, input)).toEqual(periodAction(ctx, input));
    expect(() =>
      periodAction(ctx, {
        ...input,
        data: { squadId: "squad", week: "2027-01-11" },
      }),
    ).toThrow(/key/);
  });
  it("assembles honest monthly sources, edits drafts, and preserves approved snapshots and correction history", () => {
    repo.save("a", "session", {
      ...session,
      id: "actual",
      startAt: "2026-09-10T10:00:00.000Z",
      endAt: "2026-09-10T11:00:00.000Z",
      status: "COMPLETED",
    });
    repo.save("a", "session", {
      ...session,
      id: "cancelled",
      startAt: "2026-09-11T10:00:00.000Z",
      status: "CANCELLED",
    });
    const sources = assembleMonthly(ctx, "p", "2026-09");
    expect(sources.sessionIds).toEqual(["actual"]);
    expect(sources.model.evidence[0].text).toContain("1 unmarked");
    expect(sources.model.evidence[0].text).toContain(
      "No marked attendance basis",
    );
    expect(sources.model.evidence[1].text).toContain("No reviewed");
    expect(JSON.stringify(sources)).not.toContain("SECRET STAFF NOTE");
    const r = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2026-09",
      }) as WorkspaceReport[]
    )[0];
    command(
      "monthlyEdit",
      {
        observation: "Recorded coach commentary",
        closingNote: "",
        nextStep: "Continue recorded practice",
      },
      r.id,
    );
    const approved = approveReport(ctx, r.id, true);
    expect(approved.snapshot?.presentationData?.attendance).toEqual({
      total: 1,
      present: 0,
      absent: 0,
      excused: 0,
      unmarked: 1,
    });
    expect(approved.snapshot?.presentationData?.coachEvaluation).toEqual([
      "Recorded coach commentary",
    ]);
    expect(() => notificationContent("a", "MONTHLY", r.id)).not.toThrow();
    repo.save("a", "attendance", {
      id: "late-attendance",
      academyId: "a",
      sportId: "football",
      playerId: "p",
      sessionId: "actual",
      status: "PRESENT",
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: "coach",
      correctionReason: "Recorded attendance correction",
    });
    expect(() => notificationContent("a", "MONTHLY", r.id)).toThrow(
      /changed after approval/,
    );
    expect(repo.find("a", "report", r.id)?.snapshot).toEqual(approved.snapshot);
    expect(approved.snapshot?.evidence.map((e) => e.text).join(" ")).toContain(
      "unmarked",
    );
    expect(approved.snapshot?.evidence.at(-1)?.text).toBe(
      "Recorded coach commentary",
    );
    expect(
      (
        command("monthlyPrepare", {
          playerIds: ["p"],
          month: "2026-09",
        }) as WorkspaceReport[]
      )[0].id,
    ).toBe(r.id);
    expect(() =>
      command(
        "monthlyEdit",
        { observation: "Overwrite", closingNote: "", nextStep: "Other" },
        r.id,
      ),
    ).toThrow(/historical/);
    const correction = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2026-09",
        correctionOf: r.id,
      }) as WorkspaceReport[]
    )[0];
    expect(correction.id).not.toBe(r.id);
    expect(correction.status).toBe("Draft");
  });
  it("prepares an unfinished month as a draft and refuses premature final approval", () => {
    const report = (
      command("monthlyPrepare", {
        playerIds: ["p"],
        month: "2027-01",
      }) as WorkspaceReport[]
    )[0];
    expect(report.status).toBe("Draft");
    expect(() => approveReport(ctx, report.id, true)).toThrow(/month ends/);
  });
  it("projects only the authorised child's historical sources when another roster player changes coach", () => {
    repo.save("a", "session", {
      ...session,
      id: "historical",
      startAt: "2026-09-10T10:00:00.000Z",
      endAt: "2026-09-10T11:00:00.000Z",
      status: "COMPLETED",
    });
    repo.save("a", "player", {
      ...repo.find("a", "player", "p2")!,
      coachId: "different-coach",
    });
    const source = assembleMonthly(ctx, "p", "2026-09");
    expect(source.sessionIds).toEqual(["historical"]);
    expect(source.model.focus).toBe("Control");
    expect(JSON.stringify(source.model)).not.toContain("Passing precision");
    expect(() => assembleMonthly(ctx, "p2", "2026-09")).toThrow();
  });
});
describe("persistent delivery and provider boundary", () => {
  it("keeps approved weekly notifications queued until their private parent view is published", async () => {
    const { job } = queued();
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    const p = new MetaWhatsAppProvider(settings());
    vi.spyOn(p, "verify").mockResolvedValue(true);
    vi.spyOn(p, "deliver").mockResolvedValue({
      providerReference: "synthetic-never-used",
    });
    await workerTick(new Date(), () => p);
    expect(comm.job(job.id)?.state).toBe("QUEUED");
    expect(comm.job(job.id)?.reason).toContain("publication");
    expect(p.deliver).not.toHaveBeenCalled();
  });
  it("prepares only drafts and internal approval reminders when a configured run is due", () => {
    settings();
    weekly(false);
    database()
      .prepare(
        "UPDATE academy_memberships SET role='OWNER' WHERE userId='coach'",
      )
      .run();
    prepareSchedules(new Date("2027-01-03T14:00:00.000Z"));
    expect(repo.list("a", "report").every((r) => r.status === "Draft")).toBe(
      true,
    );
    expect(comm.jobs("a")).toHaveLength(0);
    expect(
      database()
        .prepare(
          "SELECT reason FROM communication_reminders WHERE type='WEEKLY' AND playerId='p'",
        )
        .get()?.reason,
    ).toBe("Awaiting coach approval");
  });
  it("bounds retries of confirmed transient rejections and retains each failed attempt", async () => {
    const { job, r } = queued();
    command("weeklyPublish", {}, r.id);
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    const p = new MetaWhatsAppProvider(settings());
    vi.spyOn(p, "verify").mockResolvedValue(true);
    vi.spyOn(p, "deliver").mockRejectedValue(
      new ProviderFailure(
        "TRANSIENT",
        "Confirmed synthetic HTTP 429 rejection",
      ),
    );
    const start = Date.now();
    for (const minutes of [0, 3, 10, 30])
      await workerTick(new Date(start + minutes * 60000), () => p);
    expect(comm.job(job.id)?.state).toBe("FAILED");
    expect(comm.job(job.id)?.attempts).toBe(4);
    expect(
      database()
        .prepare("SELECT count(*) AS n FROM delivery_attempts WHERE jobId=?")
        .get(job.id)?.n,
    ).toBe(4);
  });
  it("enforces consent, guardian relationship and academy-scoped sender identity", async () => {
    const { job } = queued();
    expect(
      dispatchCheck(job, new Date("2026-10-01T12:00:00Z")).contact.guardianId,
    ).toBe("guardian");
    comm.saveContact({
      ...comm.contact("a", "guardian")!,
      optedOutAt: new Date().toISOString(),
    });
    expect(() => dispatchCheck(job, new Date())).toThrow(/consent/);
    expect(() => contactEligible("other", "guardian", "p", "WEEKLY")).toThrow();
    await expect(
      new MetaWhatsAppProvider({ ...settings(), academyId: "other" }).verify(),
    ).rejects.toThrow(/binding/);
  });
  it("stores one scheduled job per guardian, recovers uncertain claims and does not blindly resend", () => {
    const { r } = queued();
    contact("guardian2", "+12025550102");
    queueNotification(
      "a",
      "WEEKLY",
      r.id,
      ["guardian", "guardian2"],
      "2026-01-01T00:00:00.000Z",
      futurePeriod.startAt,
    );
    expect(comm.jobs("a")).toHaveLength(2);
    const first = claimJob(new Date("2026-10-01T12:00Z"))!;
    expect(first.claim).toBeTruthy();
    claimJob(new Date("2026-10-01T12:03Z"));
    expect(comm.job(first.id)?.state).toBe("UNKNOWN");
    queueNotification(
      "a",
      "WEEKLY",
      r.id,
      ["guardian"],
      "2026-01-01T00:00:00.000Z",
      futurePeriod.startAt,
    );
    expect(comm.job(first.id)?.state).toBe("UNKNOWN");
  });
  it("expires missed weekly notifications instead of blasting old plans", () => {
    queued();
    expect(claimJob(new Date("2027-01-05T00:00Z"))).toBeUndefined();
    expect(comm.jobs("a")[0].state).toBe("CANCELLED");
  });
  it("verifies exact provider templates and blocks development sends by default", async () => {
    const s = settings(),
      fetcher = vi.fn(async (url: RequestInfo | URL) =>
        Response.json(
          String(url).includes("phone_numbers")
            ? { data: [{ id: "111", status: "CONNECTED" }] }
            : {
                data: [
                  {
                    name: String(url).includes("weekly")
                      ? s.weeklyTemplate
                      : s.monthlyTemplate,
                    language: s.language,
                    status: "APPROVED",
                    components: [
                      {
                        type: "BODY",
                        text: String(url).includes("weekly")
                          ? weeklyTemplateBody
                          : monthlyTemplateBody,
                      },
                    ],
                  },
                ],
              },
        ),
      );
    const p = new MetaWhatsAppProvider(s, fetcher);
    expect(await p.verify()).toBe(true);
    const { job } = queued();
    await expect(
      p.deliver(dispatchCheck(job, new Date()).request),
    ).rejects.toThrow(/disabled/);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("sends a template through the real adapter with a transport double and distinguishes unknown acceptance", async () => {
    const { job } = queued();
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("SPORTOZEN_WHATSAPP_TEST_RECIPIENTS", "+12025550101");
    const request = dispatchCheck(job, new Date()).request;
    const transport = vi.fn<typeof fetch>(async () =>
      Response.json({ messages: [{ id: "synthetic-provider-id" }] }),
    );
    const p = new MetaWhatsAppProvider(settings(), transport);
    expect((await p.deliver(request)).providerReference).toBe(
      "synthetic-provider-id",
    );
    const body = JSON.parse(String(transport.mock.calls[0][1]?.body));
    expect(body.type).toBe("template");
    expect(body.to).toBe("12025550101");
    expect(body.template.name).toBe("sportozen_weekly_training");
    expect(body.template.components[0].parameters).toHaveLength(7);
    const unknown = new MetaWhatsAppProvider(
      settings(),
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );
    await expect(unknown.deliver(request)).rejects.toMatchObject({
      outcome: "UNKNOWN",
    });
  });
  it("persists provider acceptance and marks an uncertain worker outcome for reconciliation", async () => {
    const { job, r } = queued();
    command("weeklyPublish", {}, r.id);
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    const p = new MetaWhatsAppProvider(settings());
    vi.spyOn(p, "verify").mockResolvedValue(true);
    vi.spyOn(p, "deliver").mockRejectedValue(
      new ProviderFailure("UNKNOWN", "Transport double timeout"),
    );
    await workerTick(new Date(), () => p);
    expect(comm.job(job.id)?.state).toBe("UNKNOWN");
    expect(comm.job(job.id)?.attempts).toBe(1);
    await workerTick(new Date(), () => p);
    expect(p.deliver).toHaveBeenCalledTimes(1);
  });
});
describe("signed events and private parent replies", () => {
  it("withholds a queued staff WhatsApp reply after the author loses the child's assignment", async () => {
    queued();
    comm.saveContact({
      ...comm.contact("a", "guardian")!,
      lastInboundAt: new Date().toISOString(),
    });
    repo.save("a", "conversation", {
      ...base,
      id: "reply-thread",
      guardianId: "guardian",
      playerId: "p",
      subject: "Synthetic thread",
      status: "OPEN",
      messages: [
        {
          id: "staff-reply",
          senderId: "coach",
          senderRole: "COACH",
          body: "Recorded in-app reply",
          at: new Date().toISOString(),
          internal: false,
          channel: "IN_APP",
        },
      ],
    });
    await communicationAction(ctx, {
      action: "whatsappReply",
      data: {
        conversationId: "reply-thread",
        messageId: "staff-reply",
        verified: true,
      },
    });
    const job = comm.jobs("a").find((j) => j.type === "REPLY")!;
    expect(() => dispatchCheck(job, new Date())).not.toThrow();
    repo.save("a", "player", {
      ...repo.find("a", "player", "p")!,
      coachId: "different-coach",
    });
    expect(() => dispatchCheck(job, new Date())).toThrow(/Reply source/);
  });
  it("rejects invalid signatures, deduplicates valid events and preserves per-guardian out-of-order states", () => {
    const { r, job } = queued();
    contact("guardian2", "+12025550102");
    queueNotification(
      "a",
      "WEEKLY",
      r.id,
      ["guardian2"],
      job.dueAt,
      job.expiresAt,
    );
    database()
      .prepare(
        "UPDATE delivery_jobs SET attempts=1,providerId='synthetic-receipt',state='PROVIDER_ACCEPTED' WHERE id=?",
      )
      .run(job.id);
    const st = (status: string) =>
      signed({
        statuses: [
          {
            id: "synthetic-receipt",
            recipient_id: "12025550101",
            status,
            timestamp: "1790000000",
          },
        ],
      });
    const read = st("read");
    expect(
      validSignature(read.raw, "sha256=" + "0".repeat(64), "synthetic-secret"),
    ).toBe(false);
    expect(() => receiveWebhook("a", read.raw, "invalid")).toThrow(/signature/);
    expect(receiveWebhook("a", read.raw, read.signature).stored).toBe(1);
    expect(receiveWebhook("a", read.raw, read.signature).stored).toBe(0);
    processEvents();
    const sent = st("sent");
    receiveWebhook("a", sent.raw, sent.signature);
    processEvents();
    expect(comm.job(job.id)?.state).toBe("READ");
    expect(
      comm.jobs("a").find((j) => j.guardianId === "guardian2")?.state,
    ).toBe("QUEUED");
  });
  it("matches signed delivery receipts to the persisted attempt after a guardian changes phone", async () => {
    const { job, r } = queued();
    command("weeklyPublish", {}, r.id);
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    const provider = new MetaWhatsAppProvider(settings());
    vi.spyOn(provider, "verify").mockResolvedValue(true);
    vi.spyOn(provider, "deliver").mockResolvedValue({
      providerReference: "original-recipient-receipt",
    });
    await workerTick(new Date(), () => provider);
    const attempt = database()
      .prepare("SELECT metadata FROM delivery_attempts WHERE jobId=?")
      .get(job.id)!;
    expect(String(attempt.metadata)).not.toContain("synthetic-secret");
    expect(String(attempt.metadata)).not.toContain("synthetic-token");
    contact("guardian", "+12025550109");
    const event = signed({
      statuses: [
        {
          id: "original-recipient-receipt",
          recipient_id: "12025550101",
          status: "delivered",
          timestamp: String(Math.floor(Date.now() / 1000)),
        },
      ],
    });
    receiveWebhook("a", event.raw, event.signature);
    processEvents();
    expect(comm.job(job.id)?.state).toBe("DELIVERED");
  });
  it("routes verified replies to existing conversations and never guesses multi-child context", () => {
    queued();
    database()
      .prepare("INSERT INTO guardian_relationships VALUES('a','guardian','p2')")
      .run();
    const message = {
      id: "synthetic-inbound",
      from: "12025550101",
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: "text",
      text: { body: "Which session is this?" },
    };
    const inbound = signed({ messages: [message] });
    receiveWebhook("a", inbound.raw, inbound.signature);
    processEvents();
    expect(repo.list("a", "conversation")).toHaveLength(0);
    expect(communicationView(ctx).unrouted).toEqual([]);
    expect(
      database().prepare("SELECT outcome FROM communication_events").get()
        ?.outcome,
    ).toBe("AMBIGUOUS_CHILD");
    const unknown = signed({
      messages: [{ ...message, id: "unknown-inbound", from: "12025550199" }],
    });
    receiveWebhook("a", unknown.raw, unknown.signature);
    processEvents();
    expect(repo.list("a", "conversation")).toHaveLength(0);
    database()
      .prepare("DELETE FROM guardian_relationships WHERE playerId='p2'")
      .run();
    const known = signed({ messages: [{ ...message, id: "known-inbound" }] });
    receiveWebhook("a", known.raw, known.signature);
    processEvents();
    expect(repo.list("a", "conversation")[0].messages[0].channel).toBe(
      "WHATSAPP",
    );
    expect(visibleRecords(parent, "conversation")).toHaveLength(1);
    const stop = signed({
      messages: [{ ...message, id: "stop-inbound", text: { body: "STOP" } }],
    });
    receiveWebhook("a", stop.raw, stop.signature);
    processEvents();
    expect(comm.contact("a", "guardian")?.optedOutAt).toBeTruthy();
    expect(comm.jobs("a")[0].state).toBe("CANCELLED");
  });
  it("does not let a parent self-verify another contact", async () => {
    await expect(
      communicationAction(parent, {
        action: "contact",
        data: {
          guardianId: "guardian",
          expectedVersion: 0,
          phone: "+12025550101",
          verificationReference: "fake",
          consentReference: "Academy named consent",
          verified: true,
          optedIn: true,
          weekly: true,
          monthly: true,
        },
      }),
    ).rejects.toThrow(/staff/);
  });
});
describe("period and attendance rules", () => {
  it("excludes other children, staff-only/superseded evidence, cancelled sessions and records outside the month", () => {
    const period = periodFor("2026-09", "Asia/Kolkata", "MONTHLY");
    const actual = {
      ...session,
      id: "actual",
      status: "COMPLETED" as const,
      startAt: "2026-09-10T10:00:00.000Z",
    };
    const e: FootballEvidence = {
      ...base,
      id: "eligible",
      version: 1,
      updatedAt: actual.startAt,
      updatedBy: "coach",
      sessionId: actual.id,
      playerId: "p",
      planId: "plan",
      drillId: "drill",
      drillVersion: 1,
      drillName: "Touch",
      conditions: "Recorded pitch conditions",
      observation: "Recorded observation",
      staffNote: "NEVER SHARE",
      type: "COACH_OBSERVATION",
      visibility: "PARENT_ELIGIBLE",
      measurement: "ATTEMPTS",
      unit: "ATTEMPTS",
      attempts: 0,
      successes: 0,
      method: "Coach recording",
      status: "REVIEWED",
      authorId: "coach",
      recordedAt: actual.startAt,
      reviewedBy: "coach",
      reviewedAt: actual.startAt,
    };
    const records = monthlyRecords(
      "p",
      period,
      [actual, { ...actual, id: "cancelled", status: "CANCELLED" }],
      [],
      [
        e,
        { ...e, id: "other", playerId: "p2" },
        { ...e, id: "staff", visibility: "STAFF_ONLY" },
        { ...e, id: "old", status: "SUPERSEDED" },
        { ...e, id: "outside", recordedAt: period.endAt },
        { ...e, id: "cancelled", sessionId: "cancelled" },
      ],
    );
    expect(records.eligible.map((e) => e.id)).toEqual(["eligible"]);
    expect(records.evidence[0].text).toContain("No attempts recorded");
    expect(JSON.stringify(records.evidence)).not.toContain("NEVER SHARE");
  });
  it.each(["Asia/Kolkata", "Europe/London", "Australia/Sydney"])(
    "uses explicit %s month boundaries and honest missing records",
    (zone) => {
      const p = periodFor("2026-10", zone, "MONTHLY");
      const a = {
          ...session,
          id: "a",
          status: "COMPLETED" as const,
          startAt: p.startAt,
        },
        b = {
          ...session,
          id: "b",
          status: "COMPLETED" as const,
          startAt: p.endAt,
        };
      const data = monthlyRecords("p", p, [a, b], [], []);
      expect(data.actual.map((s) => s.id)).toEqual(["a"]);
      expect(data.counts.UNMARKED).toBe(1);
      expect(data.evidence).toHaveLength(0);
      expect(data.basis).toContain("no percentage");
    },
  );
  it("accounts for DST and crossing-midnight quiet hours without regression", () => {
    const p = periodFor("2026-10", "Europe/London", "MONTHLY");
    expect((Date.parse(p.endAt) - Date.parse(p.startAt)) / 3600000).toBe(
      31 * 24 + 1,
    );
    expect(quiet("23:00", "21:00", "08:00")).toBe(true);
    expect(quiet("07:59", "21:00", "08:00")).toBe(true);
    expect(quiet("08:00", "21:00", "08:00")).toBe(false);
    expect(providerState("DELIVERED", "SENT")).toBe("DELIVERED");
    expect(providerState("READ", "FAILED")).toBe("READ");
  });
});
