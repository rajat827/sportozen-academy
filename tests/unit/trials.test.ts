import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
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
import { workspaceRepository as people } from "@/server/workspace-repository";
import { trialAction, trialView } from "@/server/trial-service";
import type { WorkspaceAccess } from "@/server/workspace-access";
import type { AcademyConfiguration, AcademyRole } from "@/domain/workspace";
import type { TrialEnrolment, TrialPolicy } from "@/domain/trial";
import { financeView } from "@/server/finance-service";
import { trialRepository } from "@/server/trial-repository";
const filename = join(tmpdir(), `academy-trials-${randomUUID()}.sqlite`);
process.env.SPORTOZEN_DATABASE_PATH = filename;
const academy: AcademyConfiguration = {
  id: "a",
  academyId: "a",
  name: "Synthetic Trials",
  contactEmail: "trials@example.test",
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
  modules: ["development", "fees"],
  nutritionOptional: true,
  demo: true,
  onboardingStatus: "ACTIVE",
};
function ctx(
  userId = "owner",
  role: AcademyRole = "OWNER",
  academyId = "a",
): WorkspaceAccess {
  return {
    academy: { ...academy, id: academyId, academyId },
    membership: {
      id: userId,
      academyId,
      userId,
      role,
      active: true,
      sportIds: ["football"],
    },
    user: {
      id: userId,
      name: userId,
      email: `${userId}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}
function cmd(action: string, data: unknown, id?: string, expectedVersion = 0) {
  return { requestId: randomUUID(), action, data, id, expectedVersion };
}
function create(extra = {}) {
  return trialAction(
    ctx(),
    cmd("create", {
      playerId: "p",
      squadId: "batch",
      coachId: "coach",
      startDate: "2026-10-10",
      endDate: "2026-10-21",
      pricing: "FREE",
      feeMinor: 0,
      currency: "INR",
      ...extra,
    }),
  ) as TrialEnrolment;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
  const db = database();
  db.exec(
    `DELETE FROM academy_trial_enrolments;DELETE FROM academy_trial_submissions;DELETE FROM academy_trial_policies;DELETE FROM academy_finance_records;DELETE FROM academy_finance_history;DELETE FROM academy_finance_submissions;DELETE FROM workspace_records;DELETE FROM guardian_relationships;DELETE FROM support_relationships;DELETE FROM academy_memberships;DELETE FROM platform_entitlements;DELETE FROM academy_workspaces;`,
  );
  for (const a of ["a", "b"]) {
    db.prepare("INSERT INTO academy_workspaces VALUES(?,?)").run(
      a,
      JSON.stringify({ ...academy, id: a, academyId: a }),
    );
    db.prepare("INSERT INTO platform_entitlements VALUES(?,?,?,?)").run(
      a,
      "TEAM",
      JSON.stringify(academy.modules),
      "ACTIVE",
    );
  }
  for (const [user, role, a] of [
    ["owner", "OWNER", "a"],
    ["coach", "COACH", "a"],
    ["parent", "PARENT", "a"],
    ["other", "PARENT", "a"],
    ["support", "SUPPORT", "a"],
    ["owner-b", "OWNER", "b"],
  ])
    db.prepare(
      "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
    ).run(`${a}-${user}`, a, user, role, '["football"]');
  people.save("a", "player", {
    id: "p",
    academyId: "a",
    name: "Fictional trial child",
    sportIds: ["football"],
    squad: "U12",
    squadId: "batch",
    coachId: "coach",
    status: "ACTIVE",
  });
  people.save("a", "squad", {
    id: "batch",
    academyId: "a",
    sportId: "football",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "owner",
    branchId: "branch",
    name: "U12",
    playerIds: ["p"],
  });
  db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
    "a",
    "parent",
    "p",
  );
});
afterAll(() => {
  vi.useRealTimers();
  const g = globalThis as typeof globalThis & {
    sportozenDatabase?: DatabaseSync;
  };
  g.sportozenDatabase?.close();
  delete g.sportozenDatabase;
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});
describe("trial enrolment lifecycle", () => {
  it("rolls back an issued invoice if linking the trial fails, then safely retries the exact reviewed command", () => {
    trialAction(
      ctx(),
      cmd("policy", {
        defaultDurationDays: null,
        paidTrialsAllowed: true,
        defaultFeeMinor: 120000,
        currency: "INR",
        feeRuleNote: "One reviewed dated trial invoice.",
      }),
    );
    const trial = create({ pricing: "PAID", feeMinor: 120000 }),
      request = cmd(
        "invoice",
        { reviewed: true, dueDate: "2026-10-20" },
        trial.id,
        trial.version,
      ),
      db = database();
    db.exec(
      "CREATE TRIGGER qa_reject_trial_link BEFORE UPDATE ON academy_trial_enrolments BEGIN SELECT RAISE(ABORT,'Synthetic trial link persistence failure'); END;",
    );
    try {
      expect(() => trialAction(ctx(), request)).toThrow(
        /Synthetic trial link persistence failure/,
      );
      expect(financeView(ctx()).invoices).toHaveLength(0);
      expect(
        db.prepare("SELECT COUNT(*) total FROM academy_finance_history").get()
          ?.total,
      ).toBe(0);
      expect(
        db
          .prepare("SELECT COUNT(*) total FROM academy_finance_submissions")
          .get()?.total,
      ).toBe(0);
      expect(trialRepository.find("a", trial.id)?.invoiceId).toBeUndefined();
    } finally {
      db.exec("DROP TRIGGER qa_reject_trial_link");
    }
    const saved = trialAction(ctx(), request) as TrialEnrolment;
    expect(saved.invoiceId).toBeTruthy();
    expect(financeView(ctx()).invoices).toHaveLength(1);
    expect(trialAction(ctx(), request)).toEqual(saved);
    expect(financeView(ctx()).invoices).toHaveLength(1);
  });
  it("withholds a published trial summary after attendance or reviewed evidence changes while retaining recorded history", () => {
    let trial = create();
    const base = {
      academyId: "a",
      sportId: "football",
      version: 1,
      updatedBy: "coach",
      updatedAt: new Date().toISOString(),
    };
    people.save("a", "session", {
      ...base,
      id: "trial-session",
      branchId: "branch",
      squadId: "batch",
      location: "Recorded pitch",
      coachIds: ["coach"],
      timezone: "Asia/Kolkata",
      startLocal: "2026-10-12T17:00",
      endLocal: "2026-10-12T18:00",
      startAt: "2026-10-12T11:30:00.000Z",
      endAt: "2026-10-12T12:30:00.000Z",
      theme: "Receiving",
      status: "COMPLETED",
      roster: [{ playerId: "p", name: "Fictional trial child" }],
      agenda: [],
      objectives: [],
    });
    const attendance = {
      ...base,
      id: "trial-session:p",
      sessionId: "trial-session",
      playerId: "p",
      status: "PRESENT" as const,
      correctionReason: "",
    };
    people.save("a", "attendance", attendance);
    const evidence = {
      ...base,
      id: "trial-evidence",
      sessionId: "trial-session",
      playerId: "p",
      drillId: "receiving-drill",
      drillVersion: 1,
      drillName: "First touch",
      conditions: "Recorded same pitch and practice distance",
      observation: "Opened body position before receiving",
      staffNote: "PRIVATE_COACH_NOTE",
      type: "COACH_OBSERVATION" as const,
      visibility: "PARENT_ELIGIBLE" as const,
      measurement: "OBSERVATION" as const,
      unit: "NONE" as const,
      method: "Coach recorded observation",
      status: "REVIEWED" as const,
      authorId: "coach",
      recordedAt: "2026-10-12T12:20:00.000Z",
      reviewedBy: "owner",
      reviewedAt: "2026-10-13T10:00:00.000Z",
    };
    people.save("a", "evidence", evidence);
    trial = trialAction(
      ctx(),
      cmd(
        "review",
        {
          reviewed: true,
          summary:
            "Recorded first-touch observation supports continued receiving practice; no improvement percentage inferred.",
        },
        trial.id,
        trial.version,
      ),
    ) as TrialEnrolment;
    trial = trialAction(
      ctx(),
      cmd("publish", { publish: true }, trial.id, trial.version),
    ) as TrialEnrolment;
    expect(
      trialView(ctx("parent", "PARENT")).enrolments[0].publishedSummary?.body,
    ).toContain("Recorded first-touch");
    expect(JSON.stringify(trialView(ctx("parent", "PARENT")))).not.toContain(
      "PRIVATE_COACH_NOTE",
    );
    const stored = trialRepository.find("a", trial.id)!;
    people.save("a", "attendance", {
      ...attendance,
      status: "ABSENT",
      version: 2,
      correctionReason: "Reviewed attendance correction",
    });
    expect(trialView(ctx("parent", "PARENT")).enrolments).toEqual([]);
    expect(trialView(ctx()).enrolments[0].reviewedSummary).toBeUndefined();
    expect(trialRepository.find("a", trial.id)?.publishedSummary).toEqual(
      stored.publishedSummary,
    );
    expect(trialRepository.find("a", trial.id)?.history).toEqual(
      stored.history,
    );
    people.save("a", "attendance", { ...attendance, version: 3 });
    people.save("a", "evidence", {
      ...evidence,
      status: "SUPERSEDED",
      version: 2,
    });
    expect(trialView(ctx("parent", "PARENT")).enrolments).toEqual([]);
    expect(() =>
      trialAction(
        ctx(),
        cmd(
          "review",
          { reviewed: true, summary: "Unsupported improvement" },
          trial.id,
          trial.version,
        ),
      ),
    ).toThrow(/insufficient reviewed evidence/);
    expect(people.find("a", "session", "trial-session")?.id).toBe(
      "trial-session",
    );
    expect(trialRepository.find("a", trial.id)?.history).toEqual(
      stored.history,
    );
  });
  it("keeps one person, guard relationships and all history on repeated conversion without charges", () => {
    const t = create();
    const id = t.playerId;
    const guardian = database()
      .prepare("SELECT * FROM guardian_relationships")
      .all();
    const converted = trialAction(
      ctx(),
      cmd(
        "convert",
        {
          reviewed: true,
          reason: "Reviewed actual trial participation; regular place offered.",
        },
        t.id,
        t.version,
      ),
    ) as TrialEnrolment;
    expect(converted.status).toBe("CONVERTED");
    expect(
      trialAction(
        ctx(),
        cmd("convert", { reviewed: true, reason: "Retry" }, t.id, t.version),
      ),
    ).toEqual(converted);
    expect(people.list("a", "player")).toHaveLength(1);
    expect(people.find("a", "player", id)?.status).toBe("ACTIVE");
    expect(
      database().prepare("SELECT * FROM guardian_relationships").all(),
    ).toEqual(guardian);
    expect(financeView(ctx()).invoices).toHaveLength(0);
  });
  it("supports configurable duration and explicitly approved paid rules; invoices only on a reviewed command", () => {
    const policy = trialAction(
      ctx(),
      cmd("policy", {
        defaultDurationDays: 23,
        paidTrialsAllowed: true,
        defaultFeeMinor: 120000,
        currency: "INR",
        feeRuleNote:
          "One dated trial invoice only after owner review; no automatic collection.",
      }),
    ) as TrialPolicy;
    expect(policy.defaultDurationDays).toBe(23);
    const t = create({ pricing: "PAID", feeMinor: 120000 });
    expect(financeView(ctx()).invoices).toHaveLength(0);
    const invoice = trialAction(
      ctx(),
      cmd(
        "invoice",
        { reviewed: true, dueDate: "2026-10-20" },
        t.id,
        t.version,
      ),
    ) as TrialEnrolment;
    expect(invoice.invoiceId).toBeTruthy();
    expect(
      trialAction(
        ctx(),
        cmd(
          "invoice",
          { reviewed: true, dueDate: "2026-10-20" },
          t.id,
          t.version,
        ),
      ),
    ).toEqual(invoice);
    const converted = trialAction(
      ctx(),
      cmd(
        "convert",
        {
          reviewed: true,
          reason: "Regular place approved without additional billing.",
        },
        invoice.id,
        invoice.version,
      ),
    ) as TrialEnrolment;
    expect(converted.invoiceId).toBe(invoice.invoiceId);
    expect(financeView(ctx()).invoices).toHaveLength(1);
    expect(financeView(ctx()).payments).toHaveLength(0);
  });
  it("rejects unapproved paid trials, invalid free amount, mismatched coach and invalid dates", () => {
    expect(() => create({ pricing: "PAID", feeMinor: 1 })).toThrow(
      /approved academy fee rule/,
    );
    expect(() => create({ feeMinor: 1 })).toThrow(/free trial/);
    expect(() => create({ coachId: "owner" })).toThrow(/current batch/);
    expect(() => create({ endDate: "2026-10-01" })).toThrow(/Trial end/);
    expect(() => create({ startDate: "2026-02-30" })).toThrow();
  });
  it("separates expiry/cancellation/nonconversion from profile archiving", () => {
    const t = create({ startDate: "2026-09-01", endDate: "2026-09-10" });
    expect(t.status).toBe("EXPIRED");
    const n = trialAction(
      ctx(),
      cmd(
        "transition",
        {
          status: "NOT_CONVERTED",
          reason: "Family declined regular enrolment.",
        },
        t.id,
        t.version,
      ),
    ) as TrialEnrolment;
    expect(people.find("a", "player", "p")?.status).toBe("TRIAL");
    expect(() =>
      trialAction(
        ctx(),
        cmd(
          "convert",
          { reviewed: true, reason: "Invalid retry" },
          n.id,
          n.version,
        ),
      ),
    ).toThrow(/Only active/);
    const next = create({ startDate: "2026-11-01", endDate: "2026-11-09" });
    expect(next.status).toBe("SCHEDULED");
    const cancelled = trialAction(
      ctx(),
      cmd(
        "transition",
        { status: "CANCELLED", reason: "Trial date cancelled by family." },
        next.id,
        next.version,
      ),
    ) as TrialEnrolment;
    expect(() =>
      trialAction(
        ctx(),
        cmd(
          "convert",
          { reviewed: true, reason: "Invalid conversion" },
          cancelled.id,
          cancelled.version,
        ),
      ),
    ).toThrow();
  });
  it("requires current owner authority, scopes coaches/parents and blocks cross-academy IDs", () => {
    const t = create();
    expect(() =>
      trialAction(
        ctx("coach", "COACH"),
        cmd("convert", { reviewed: true, reason: "Denied" }, t.id, t.version),
      ),
    ).toThrow(/role/);
    expect(() =>
      trialAction(ctx("parent", "PARENT"), cmd("create", {})),
    ).toThrow(/role/);
    expect(() => trialView(ctx("support", "SUPPORT"))).toThrow(/role/);
    expect(() =>
      trialAction(
        ctx("owner-b", "OWNER", "b"),
        cmd("feedback", { feedback: "wrong academy" }, t.id, t.version),
      ),
    ).toThrow(/unavailable/);
    database()
      .prepare("UPDATE academy_memberships SET active=0 WHERE userId='owner'")
      .run();
    expect(() =>
      trialAction(
        ctx(),
        cmd("convert", { reviewed: true, reason: "Revoked" }, t.id, t.version),
      ),
    ).toThrow(/Current active/);
  });
  it("does not publish a raw staff note; reviewed insufficient-evidence summary is private to linked parent", () => {
    let t = create();
    t = trialAction(
      ctx("coach", "COACH"),
      cmd("feedback", { feedback: "PRIVATE_TRIAL_NOTE" }, t.id, t.version),
    ) as TrialEnrolment;
    expect(trialView(ctx("parent", "PARENT")).enrolments).toEqual([]);
    expect(() =>
      trialAction(
        ctx(),
        cmd(
          "review",
          { reviewed: true, summary: "Unsupported improvement" },
          t.id,
          t.version,
        ),
      ),
    ).toThrow(/insufficient reviewed evidence/);
    t = trialAction(
      ctx(),
      cmd(
        "review",
        {
          reviewed: true,
          summary:
            "Insufficient reviewed evidence. Continue observation at the next attended session.",
        },
        t.id,
        t.version,
      ),
    ) as TrialEnrolment;
    t = trialAction(
      ctx(),
      cmd("publish", { publish: true }, t.id, t.version),
    ) as TrialEnrolment;
    const p = trialView(ctx("parent", "PARENT"));
    expect(p.enrolments[0].publishedSummary?.body).toMatch(/Insufficient/);
    expect(JSON.stringify(p)).not.toContain("PRIVATE_TRIAL_NOTE");
    expect(trialView(ctx("other", "PARENT")).enrolments).toHaveLength(0);
    expect(() =>
      trialAction(ctx(), cmd("feedback", { feedback: "Stale edit" }, t.id, 1)),
    ).toThrow(/changed/);
  });
  it("persists request receipts, rejects changed retries and prevents overlapping trials", () => {
    const c = cmd("create", {
      playerId: "p",
      squadId: "batch",
      coachId: "coach",
      startDate: "2026-10-10",
      endDate: "2026-10-21",
      pricing: "FREE",
      feeMinor: 0,
      currency: "INR",
    });
    const t = trialAction(ctx(), c);
    expect(trialAction(ctx(), c)).toEqual(t);
    expect(() =>
      trialAction(ctx(), {
        ...c,
        data: { ...(c.data as object), endDate: "2026-10-22" },
      }),
    ).toThrow(/Submission key/);
    expect(() => create()).toThrow(/existing trial/);
  });
});
