import {
  beforeEach,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
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
    }
  },
  authenticatedUser: vi.fn(),
}));
import { database } from "@/server/database";
import { workspaceRepository as repo } from "@/server/workspace-repository";
import { communicationRepository as comm } from "@/server/communication-repository";
import { announcementRepository } from "@/server/batch-announcement-repository";
import {
  announcementAction,
  announcementView,
  resolveAnnouncement,
  normalizedVerifiedPhone,
} from "@/server/batch-announcement-service";
import {
  defaults,
  dispatchCheck,
  communicationAction,
} from "@/server/communication-service";
import { workerTick } from "@/server/communication-worker";
import { MetaWhatsAppProvider } from "@/server/whatsapp-provider";
import type { WorkspaceAccess } from "@/server/workspace-access";
import type { AcademyConfiguration, AcademyRole } from "@/domain/workspace";
import type {
  AnnouncementDraft,
  AnnouncementPublic,
} from "@/domain/batch-announcement";
const filename = join(
  tmpdir(),
  `sportozen-announcements-${randomUUID()}.sqlite`,
);
process.env.SPORTOZEN_DATABASE_PATH = filename;
const academy: AcademyConfiguration = {
  id: "a",
  academyId: "a",
  name: "Synthetic Football Academy",
  contactEmail: "academy@example.test",
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
function ctx(id = "owner", role: AcademyRole = "OWNER"): WorkspaceAccess {
  return {
    academy,
    membership: {
      id: `m-${id}`,
      academyId: "a",
      userId: id,
      role,
      active: true,
      sportIds: ["football"],
    },
    user: {
      id,
      name: id,
      email: `${id}@example.test`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    },
  };
}
const draft = (): AnnouncementDraft => ({
  kind: "VENUE_CHANGED",
  urgency: "NORMAL",
  batchIds: ["one", "two"],
  body: "Training will use the academy's confirmed alternate pitch. Please check the saved schedule before travelling.",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
});
function command(
  action: string,
  data: unknown,
  id?: string,
  expectedVersion = 0,
) {
  return { requestId: randomUUID(), action, data, id, expectedVersion };
}
function run(
  action: string,
  data: unknown = {},
  record?: AnnouncementPublic,
  actor = ctx(),
) {
  return announcementAction(
    actor,
    command(action, data, record?.id, record?.version ?? 0),
  ) as AnnouncementPublic;
}
function approval() {
  let record = run("save", draft());
  record = run("submit", {}, record);
  const preview = resolveAnnouncement(ctx(), record).preview;
  record = run(
    "approve",
    {
      verified: true,
      genericPrivacyConfirmed: true,
      fingerprint: preview.fingerprint,
    },
    record,
  );
  return record;
}
function queue() {
  const record = approval();
  return run(
    "queue",
    {
      verified: true,
      fingerprint: resolveAnnouncement(ctx(), record).preview.fingerprint,
    },
    record,
  );
}
beforeEach(() => {
  const db = database();
  db.exec(
    `DELETE FROM batch_announcement_history;DELETE FROM batch_announcements;DELETE FROM communication_events;DELETE FROM delivery_attempts;DELETE FROM delivery_jobs;DELETE FROM communication_reminders;DELETE FROM guardian_contacts;DELETE FROM communication_settings;DELETE FROM training_history;DELETE FROM training_submissions;DELETE FROM guardian_relationships;DELETE FROM academy_memberships;DELETE FROM workspace_records;DELETE FROM platform_entitlements;DELETE FROM academy_workspaces;CREATE TABLE IF NOT EXISTS user(id TEXT PRIMARY KEY,name TEXT,email TEXT,emailVerified INTEGER,createdAt TEXT,updatedAt TEXT);DELETE FROM user;`,
  );
  db.prepare("INSERT INTO academy_workspaces VALUES(?,?)").run(
    "a",
    JSON.stringify(academy),
  );
  db.prepare("INSERT INTO platform_entitlements VALUES(?,?,?,'ACTIVE')").run(
    "a",
    "test",
    JSON.stringify(academy.modules),
  );
  for (const [id, role] of [
    ["owner", "OWNER"],
    ["coach", "COACH"],
    ["other", "COACH"],
    ["parent", "PARENT"],
    ["second", "PARENT"],
    ["excluded", "PARENT"],
  ] as const) {
    db.prepare(
      "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
    ).run(`m-${id}`, "a", id, role, '["football"]');
    db.prepare("INSERT INTO user VALUES(?,?,?,?,?,?)").run(
      id,
      id,
      `${id}@example.test`,
      0,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  }
  for (const id of ["p1", "p2", "p3", "p4"])
    repo.save("a", "player", {
      id,
      academyId: "a",
      name: `Fictional Child ${id}`,
      sportIds: ["football"],
      squad: "U12",
      coachId: id === "p4" ? "other" : "coach",
    });
  for (const [id, playerIds] of [
    ["one", ["p1", "p3"]],
    ["two", ["p2"]],
    ["other-batch", ["p4"]],
  ] as const)
    repo.save("a", "squad", {
      id,
      name: id,
      playerIds: [...playerIds],
      academyId: "a",
      sportId: "football",
      branchId: "branch",
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: "owner",
    });
  for (const [guardian, child] of [
    ["parent", "p1"],
    ["parent", "p2"],
    ["second", "p3"],
    ["excluded", "p3"],
  ])
    db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
      "a",
      guardian,
      child,
    );
  for (const [index, id] of ["parent", "second", "excluded"].entries())
    comm.saveContact({
      academyId: "a",
      guardianId: id,
      phone: `+1202555010${index + 1}`,
      version: 1,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "owner",
      verificationReference: "Synthetic contact verified",
      consentAt: new Date().toISOString(),
      consentReference: "Synthetic academy operational consent",
      weekly: true,
      monthly: true,
      operational: id !== "excluded",
    });
  comm.saveSettings({
    ...defaults("a", academy.timezone),
    enabled: true,
    paused: false,
    quietStart: "00:00",
    quietEnd: "00:00",
    verifiedAt: new Date().toISOString(),
    connection: "Ready for controlled testing",
    announcementTemplate: "sportozen_operational",
  });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => {
  (
    globalThis as typeof globalThis & {
      sportozenDatabase?: { close: () => void };
    }
  ).sportozenDatabase?.close();
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});
describe("academy batch announcements", () => {
  it("resolves one, multiple and all authorised batches with shared-guardian dedup and precise exclusions", () => {
    expect(
      resolveAnnouncement(ctx(), { ...draft(), batchIds: ["one"] }).preview
        .eligibleCount,
    ).toBe(2);
    const result = resolveAnnouncement(ctx(), draft());
    expect(result.preview.eligibleCount).toBe(2);
    expect(result.preview.deduplicatedCount).toBe(1);
    expect(result.preview.excluded).toEqual([
      {
        guardianId: "excluded",
        reason: "Operational announcement preference is not enabled",
      },
    ]);
    expect(result.recipients[0].playerIds).toEqual(["p1", "p2"]);
    expect(
      announcementView(ctx("coach", "COACH"))
        .batches.map((batch) => batch.id)
        .sort(),
    ).toEqual(["one", "two"]);
    const all = resolveAnnouncement(ctx(), {
      ...draft(),
      batchIds: announcementView(ctx()).batches.map((batch) => batch.id),
    }).preview;
    expect(all.eligibleCount).toBe(2);
    expect(
      all.excluded.some((item) => item.reason.includes("no linked guardian")),
    ).toBe(true);
  });
  it("normalizes valid verified contact identifiers and never invents a number", () => {
    expect(normalizedVerifiedPhone(" +1 (202) 555-0101 ")).toBe("+12025550101");
    expect(normalizedVerifiedPhone("202-555-0101")).toBeUndefined();
    const contact = comm.contact("a", "parent")!;
    comm.saveContact({ ...contact, phone: " +1 (202) 555-0101 " });
    expect(resolveAnnouncement(ctx(), draft()).recipients[0].phone).toBe(
      "+12025550101",
    );
  });
  it("blocks parent, cross-academy, and coach batches outside current assignment without leaking contacts", () => {
    expect(() => announcementView(ctx("parent", "PARENT"))).toThrow();
    expect(() =>
      run(
        "save",
        { ...draft(), batchIds: ["other-batch"] },
        undefined,
        ctx("coach", "COACH"),
      ),
    ).toThrow(/authorised/);
    expect(() =>
      announcementAction(
        { ...ctx(), academy: { ...academy, id: "b", academyId: "b" } },
        command("save", draft()),
      ),
    ).toThrow();
    const view = JSON.stringify(announcementView(ctx()));
    expect(view).not.toContain("+1202555");
  });
  it("rejects known child names and contact details in generic operational bodies", () => {
    for (const body of [
      "Fictional Child p1 needs special help",
      "Please email parent@example.test",
      "Call +12025550101 for a child's plan",
    ])
      expect(() => run("save", { ...draft(), body })).toThrow(
        /generic operational/,
      );
    expect(
      resolveAnnouncement(ctx(), { ...draft(), urgency: "URGENT" }).preview
        .renderedBody,
    ).toContain("Urgent");
    expect(
      resolveAnnouncement(ctx(), {
        ...draft(),
        body: "Training time changed on 20-10-2026 to 17:30. Check the saved schedule.",
      }).preview.eligibleCount,
    ).toBe(2);
  });
  it("requires immutable final recipient review and admin approval, then queues only one generic copy per eligible parent", () => {
    let record = run("save", draft(), undefined, ctx("coach", "COACH"));
    record = run("submit", {}, record, ctx("coach", "COACH"));
    const preview = resolveAnnouncement(ctx(), record).preview;
    expect(() =>
      run(
        "approve",
        {
          verified: true,
          genericPrivacyConfirmed: true,
          fingerprint: preview.fingerprint,
        },
        record,
        ctx("coach", "COACH"),
      ),
    ).toThrow();
    expect(() =>
      run(
        "approve",
        {
          verified: false,
          genericPrivacyConfirmed: true,
          fingerprint: preview.fingerprint,
        },
        record,
      ),
    ).toThrow();
    record = run(
      "approve",
      {
        verified: true,
        genericPrivacyConfirmed: true,
        fingerprint: preview.fingerprint,
      },
      record,
    );
    const request = command(
      "queue",
      { verified: true, fingerprint: preview.fingerprint },
      record.id,
      record.version,
    );
    announcementAction(ctx(), request);
    announcementAction(ctx(), request);
    expect(comm.jobs("a")).toHaveLength(2);
    expect(
      comm
        .jobs("a")
        .every((job) => job.playerId === "" && job.type === "ANNOUNCEMENT"),
    ).toBe(true);
    expect(
      database()
        .prepare("SELECT COUNT(*) total FROM batch_announcement_history")
        .get()?.total,
    ).toBe(4);
    expect(JSON.stringify(announcementView(ctx()))).not.toContain("+1202555");
  });
  it("fails stale contact/count fingerprints and never silently approves a changed audience", () => {
    let record = run("save", draft());
    record = run("submit", {}, record);
    const preview = resolveAnnouncement(ctx(), record).preview;
    comm.saveContact({
      ...comm.contact("a", "parent")!,
      operational: false,
      version: 2,
    });
    expect(() =>
      run(
        "approve",
        {
          verified: true,
          genericPrivacyConfirmed: true,
          fingerprint: preview.fingerprint,
        },
        record,
      ),
    ).toThrow(/changed/);
    expect(comm.jobs("a")).toEqual([]);
  });
  it("keeps missing Meta setup blocked even for an urgent approved announcement", () => {
    comm.saveSettings({
      ...comm.settings("a")!,
      announcementTemplate: "",
      verifiedAt: undefined,
    });
    let record = run("save", { ...draft(), urgency: "URGENT" });
    record = run("submit", {}, record);
    const preview = resolveAnnouncement(ctx(), record).preview;
    expect(preview.blockers.length).toBeGreaterThan(0);
    record = run(
      "approve",
      {
        verified: true,
        genericPrivacyConfirmed: true,
        fingerprint: preview.fingerprint,
      },
      record,
    );
    expect(() =>
      run(
        "queue",
        { verified: true, fingerprint: preview.fingerprint },
        record,
      ),
    ).toThrow(/configured|verified/);
    expect(comm.jobs("a")).toEqual([]);
  });
  it("rechecks consent, coach scope, current reviewed content and quiet hours before dispatch", () => {
    queue();
    const job = comm.jobs("a")[0];
    const check = dispatchCheck(job, new Date());
    expect(check.request.body).not.toContain("Fictional Child");
    if (!("template" in check.request))
      throw new Error(
        "Operational announcements require an approved template.",
      );
    expect(check.request.template.name).toBe("sportozen_operational");
    comm.saveSettings({
      ...comm.settings("a")!,
      quietStart: "00:00",
      quietEnd: "23:59",
    });
    expect(dispatchCheck(job, new Date()).deferred).toBe(true);
    comm.saveContact({
      ...comm.contact("a", "parent")!,
      optedOutAt: new Date().toISOString(),
      version: 2,
    });
    expect(() => dispatchCheck(job, new Date())).toThrow(/changed/);
  });
  it("rejects changed batch links and revoked approving staff, preserves issued source history", () => {
    const record = queue(),
      job = comm.jobs("a")[0];
    const batch = repo.find("a", "squad", "two")!;
    repo.save("a", "squad", { ...batch, playerIds: [], version: 2 });
    expect(() => dispatchCheck(job, new Date())).toThrow(/changed/);
    expect(() => run("save", draft(), record)).toThrow(/cannot be rewritten/);
    expect(
      announcementRepository.find("a", record.id)?.approval?.recipients,
    ).toHaveLength(2);
    database()
      .prepare("UPDATE academy_memberships SET active=0 WHERE userId='owner'")
      .run();
    expect(() => dispatchCheck(job, new Date())).toThrow(/Approving staff/);
  });
  it("rechecks a distinct approving reviewer's current football scope while retaining legacy empty assignments", () => {
    const author = ctx("coach", "COACH");
    let record = run("save", draft(), undefined, author);
    record = run("submit", {}, record, author);
    const fingerprint = resolveAnnouncement(ctx(), record).preview.fingerprint;
    record = run(
      "approve",
      { verified: true, genericPrivacyConfirmed: true, fingerprint },
      record,
    );
    run("queue", { verified: true, fingerprint }, record, author);
    const job = comm.jobs("a")[0];
    database()
      .prepare(
        "UPDATE academy_memberships SET sportIds='[]' WHERE userId='owner'",
      )
      .run();
    expect(() => dispatchCheck(job, new Date())).not.toThrow();
    database()
      .prepare(
        `UPDATE academy_memberships SET sportIds='["cricket"]' WHERE userId='owner'`,
      )
      .run();
    expect(() => dispatchCheck(job, new Date())).toThrow(
      /Approving staff no longer authorised/,
    );
    expect(
      comm
        .jobs("a")
        .every((item) => item.state === "QUEUED" && item.attempts === 0),
    ).toBe(true);
    database()
      .prepare(
        `UPDATE academy_memberships SET sportIds='["football"]' WHERE userId='owner'`,
      )
      .run();
    expect(() => dispatchCheck(job, new Date())).not.toThrow();
  });
  it("keeps fake-provider accepted separate from delivered and respects the server send guard", async () => {
    queue();
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "false");
    const provider = new MetaWhatsAppProvider(comm.settings("a")!);
    vi.spyOn(provider, "verify").mockResolvedValue(true);
    vi.spyOn(provider, "deliver").mockResolvedValue({
      providerReference: "synthetic-announcement-receipt",
    });
    await workerTick(new Date(), () => provider);
    expect(provider.deliver).not.toHaveBeenCalled();
    vi.stubEnv("SPORTOZEN_WHATSAPP_SEND_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    await workerTick(new Date(), () => provider);
    expect(provider.deliver).toHaveBeenCalledTimes(1);
    expect(
      comm.jobs("a").filter((job) => job.state === "PROVIDER_ACCEPTED"),
    ).toHaveLength(1);
    expect(
      comm
        .jobs("a")
        .some((job) => ["SENT", "DELIVERED", "READ"].includes(job.state)),
    ).toBe(false);
  });
  it("preserves operational preference unless explicitly changed, with no legacy opt-in invention", async () => {
    const original = comm.contact("a", "parent")!;
    await communicationAction(ctx(), {
      action: "contact",
      data: {
        guardianId: "parent",
        expectedVersion: 1,
        phone: original.phone,
        verificationReference: original.verificationReference,
        consentReference: original.consentReference,
        weekly: true,
        monthly: true,
        optedIn: true,
      },
    });
    expect(comm.contact("a", "parent")?.operational).toBe(true);
    const contact = comm.contact("a", "second")!;
    comm.saveContact({ ...contact, operational: undefined });
    expect(
      resolveAnnouncement(ctx(), draft()).preview.excluded.some(
        (item) => item.guardianId === "second",
      ),
    ).toBe(true);
  });
});
