import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
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
import type { AcademyConfiguration, AcademyRole } from "@/domain/workspace";
import type {
  FinanceInvoice,
  FinancePayment,
  FinancePlan,
} from "@/domain/finance";
import { database } from "@/server/database";
import { migrateAcademyFinance } from "@/server/migrations/004-academy-finance";
import { financeAction, financeView } from "@/server/finance-service";
import { financeRepository } from "@/server/finance-repository";
import { workspaceRepository } from "@/server/workspace-repository";
import type { WorkspaceAccess } from "@/server/workspace-access";
import { authenticatedUser } from "@/server/auth";
import { workspace } from "@/server/workspace-service";

const filename = join(tmpdir(), `sportozen-finance-${randomUUID()}.sqlite`);
process.env.SPORTOZEN_DATABASE_PATH = filename;
const academy: AcademyConfiguration = {
  id: "academy-a",
  academyId: "academy-a",
  name: "Synthetic Academy A",
  contactEmail: "finance@example.test",
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
  demo: false,
  onboardingStatus: "ACTIVE",
};
function context(
  userId = "owner",
  role: AcademyRole = "OWNER",
  academyId = academy.id,
): WorkspaceAccess {
  return {
    academy: { ...academy, id: academyId, academyId },
    membership: {
      id: `${academyId}-${userId}`,
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
const owner = () => context();
function command(
  action: string,
  data: unknown,
  extra: { id?: string; expectedVersion?: number; requestId?: string } = {},
) {
  return { requestId: randomUUID(), action, data, ...extra };
}
function invoice(playerId = "child-a", extra = {}): FinanceInvoice {
  return financeAction(
    owner(),
    command("invoice", {
      playerId,
      label: "Monthly football",
      chargeMinor: 10000,
      currency: "INR",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      dueDate: "2026-10-20",
      ...extra,
    }),
  ) as FinanceInvoice;
}
function reference(
  invoiceId: string,
  amountMinor = 4000,
  extra = {},
): FinancePayment {
  return financeAction(
    owner(),
    command("reference", {
      invoiceId,
      amountMinor,
      currency: "INR",
      reference: `SYNTHETIC-${randomUUID()}`,
      method: "BANK_TRANSFER",
      paidOn: "2026-10-15",
      ...extra,
    }),
  ) as FinancePayment;
}
function verify(payment: FinancePayment) {
  return financeAction(
    owner(),
    command(
      "verify",
      {
        reviewed: true,
        note: "Matched synthetic bank record to invoice amount.",
      },
      { id: payment.id, expectedVersion: payment.version },
    ),
  ) as FinancePayment;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
  const db = database();
  migrateAcademyFinance(db);
  db.exec(
    'CREATE TABLE IF NOT EXISTS "user"(id TEXT PRIMARY KEY,name TEXT NOT NULL);',
  );
  db.exec(`DELETE FROM academy_finance_records; DELETE FROM academy_finance_history; DELETE FROM academy_finance_submissions;
    DELETE FROM workspace_records; DELETE FROM guardian_relationships; DELETE FROM support_relationships;
    DELETE FROM academy_memberships; DELETE FROM platform_entitlements; DELETE FROM academy_workspaces; DELETE FROM workspace_audit;`);
  for (const academyId of ["academy-a", "academy-b"]) {
    db.prepare("INSERT INTO academy_workspaces VALUES(?,?)").run(
      academyId,
      JSON.stringify({ ...academy, id: academyId, academyId }),
    );
    db.prepare("INSERT INTO platform_entitlements VALUES(?,?,?,?)").run(
      academyId,
      "TEAM",
      JSON.stringify(academy.modules),
      "ACTIVE",
    );
  }
  for (const [userId, role, academyId] of [
    ["owner", "OWNER", "academy-a"],
    ["admin", "ADMIN", "academy-a"],
    ["coach", "COACH", "academy-a"],
    ["parent", "PARENT", "academy-a"],
    ["other-parent", "PARENT", "academy-a"],
    ["support", "SUPPORT", "academy-a"],
    ["owner-b", "OWNER", "academy-b"],
  ])
    db.prepare(
      "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
    ).run(`${academyId}-${userId}`, academyId, userId, role, '["football"]');
  for (const [playerId, academyId] of [
    ["child-a", "academy-a"],
    ["child-other", "academy-a"],
    ["child-b", "academy-b"],
  ])
    workspaceRepository.save(academyId, "player", {
      id: playerId,
      academyId,
      name: playerId,
      sportIds: ["football"],
      squad: "U10",
      coachId: "coach",
    });
  for (const userId of [
    "owner",
    "admin",
    "coach",
    "parent",
    "other-parent",
    "support",
    "owner-b",
  ])
    db.prepare('INSERT OR REPLACE INTO "user"(id,name) VALUES(?,?)').run(
      userId,
      userId,
    );
  db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
    "academy-a",
    "parent",
    "child-a",
  );
  db.prepare("INSERT INTO guardian_relationships VALUES(?,?,?)").run(
    "academy-a",
    "other-parent",
    "child-other",
  );
});
afterEach(() => vi.useRealTimers());
afterAll(() => {
  const global = globalThis as typeof globalThis & {
    sportozenDatabase?: DatabaseSync;
  };
  global.sportozenDatabase?.close();
  delete global.sportozenDatabase;
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});

describe("Persistent academy training finance", () => {
  it("saves dated reusable plans idempotently without issuing invoices or charges", () => {
    const submitted = command("plan", {
      name: "Term football",
      amountMinor: 123450,
      currency: "GBP",
      billingFrequency: "TERM",
      applicableStartDate: "2026-11-01",
      active: true,
    });
    const saved = financeAction(owner(), submitted) as FinancePlan;
    expect(financeAction(owner(), submitted)).toEqual(saved);
    expect(saved).toMatchObject({
      billingFrequency: "TERM",
      cadence: "TERM",
      applicableStartDate: "2026-11-01",
      currency: "GBP",
    });
    expect(financeView(owner()).plans).toHaveLength(1);
    expect(financeView(owner()).invoices).toEqual([]);
    expect(financeView(owner()).payments).toEqual([]);
    const updated = financeAction(
      owner(),
      command(
        "plan",
        { ...saved, name: "Updated football" },
        { id: saved.id, expectedVersion: saved.version },
      ),
    ) as FinancePlan;
    expect(updated).toMatchObject({
      id: saved.id,
      version: 2,
      name: "Updated football",
      applicableStartDate: "2026-11-01",
    });
    expect(() =>
      financeAction(
        owner(),
        command(
          "plan",
          { ...updated, currency: "INR" },
          { id: saved.id, expectedVersion: updated.version },
        ),
      ),
    ).toThrow(/Currency must match/);
  });
  it.each([
    { amountMinor: 0 },
    { amountMinor: -1 },
    { amountMinor: 1.5 },
    { currency: "ZZZ" },
    { billingFrequency: "WEEKLY" },
    { applicableStartDate: "2026-02-30" },
    { applicableStartDate: "" },
    { applicableStartDate: undefined },
    { name: " " },
    { cadence: "MONTHLY" },
  ])(
    "rejects invalid dated fee plan input without partial records: %j",
    (invalid) => {
      expect(() =>
        financeAction(
          owner(),
          command("plan", {
            name: "Term football",
            amountMinor: 10000,
            currency: "INR",
            billingFrequency: "TERM",
            applicableStartDate: "2026-11-01",
            active: true,
            ...invalid,
          }),
        ),
      ).toThrow();
      expect(financeView(owner()).plans).toEqual([]);
      expect(financeView(owner()).invoices).toEqual([]);
    },
  );
  it("preserves legacy cadence-only plans without inventing a historical start date", () => {
    const saved = financeAction(
      owner(),
      command("plan", {
        name: "Legacy",
        amountMinor: 10000,
        currency: "INR",
        cadence: "MONTHLY",
        active: true,
      }),
    ) as FinancePlan;
    expect(saved.applicableStartDate).toBeUndefined();
    const stored = { ...saved };
    delete stored.billingFrequency;
    database()
      .prepare(
        "UPDATE academy_finance_records SET body=? WHERE academyId=? AND kind='plan' AND id=?",
      )
      .run(JSON.stringify(stored), academy.id, saved.id);
    expect(financeView(owner()).plans[0]).toEqual(stored);
    const updated = financeAction(
      owner(),
      command(
        "plan",
        { ...stored, active: false },
        { id: saved.id, expectedVersion: saved.version },
      ),
    ) as FinancePlan;
    expect(updated.applicableStartDate).toBeUndefined();
    expect(updated.billingFrequency).toBe("MONTHLY");
  });
  it("does not issue an invoice before a dated plan starts and does not rewrite issued invoices when a plan is edited", () => {
    const plan = financeAction(
      owner(),
      command("plan", {
        name: "October",
        amountMinor: 10000,
        currency: "INR",
        billingFrequency: "MONTHLY",
        applicableStartDate: "2026-10-01",
        active: true,
      }),
    ) as FinancePlan;
    expect(() =>
      invoice("child-a", { planId: plan.id, periodStart: "2026-09-30" }),
    ).toThrow(/applicable start date/);
    const issued = invoice("child-a", { planId: plan.id });
    financeAction(
      owner(),
      command(
        "plan",
        { ...plan, amountMinor: 20000 },
        { id: plan.id, expectedVersion: plan.version },
      ),
    );
    expect(financeView(owner()).invoices[0]).toMatchObject({
      id: issued.id,
      chargeMinor: 10000,
      version: 1,
    });
  });
  it("starts empty and preserves legacy unclassified fees without inventing invoices or payments", () => {
    workspaceRepository.save(academy.id, "fee", {
      id: "legacy",
      academyId: academy.id,
      playerId: "child-a",
      amountMinor: 12500,
      currency: "INR",
      label: "Historical note",
    });
    const view = financeView(owner());
    expect(view.onlineCollection).toBe("NOT_CONNECTED");
    expect(view.invoices).toEqual([]);
    expect(view.payments).toEqual([]);
    expect(view.receipts).toEqual([]);
    expect(view.summary).toEqual([]);
    expect(view.legacyRecords).toHaveLength(1);
    expect(financeView(context("parent", "PARENT")).legacyRecords).toHaveLength(
      1,
    );
  });
  it("keeps legacy finance out of coach/support bootstrap payloads while linked parents retain only their own rows", () => {
    for (const playerId of ["child-a", "child-other"])
      workspaceRepository.save(academy.id, "fee", {
        id: `legacy-${playerId}`,
        academyId: academy.id,
        playerId,
        amountMinor: 12500,
        currency: "INR",
        label: "Historical training note",
      });
    expect(workspace(context("coach", "COACH")).records.fee).toEqual([]);
    expect(workspace(context("support", "SUPPORT")).records.fee).toEqual([]);
    expect(
      workspace(context("parent", "PARENT")).records.fee.map(
        (row) => row.playerId,
      ),
    ).toEqual(["child-a"]);
    expect(workspace(owner()).records.fee).toHaveLength(2);
  });
  it("creates a reusable plan and immutable dated invoice with current academy/player branding", () => {
    const plan = financeAction(
      owner(),
      command("plan", {
        name: "Monthly",
        amountMinor: 10000,
        currency: "INR",
        cadence: "MONTHLY",
        active: true,
      }),
    ) as FinancePlan;
    const issued = invoice("child-a", { planId: plan.id });
    expect(issued.number).toMatch(/^INV-/);
    expect(issued.snapshot.academyName).toBe(academy.name);
    expect(issued.version).toBe(1);
    expect(financeView(owner()).invoices[0]).toMatchObject({
      billedMinor: 10000,
      paidMinor: 0,
      outstandingMinor: 10000,
      status: "PENDING",
    });
    expect(() =>
      invoice("child-a", {
        planId: plan.id,
        label: "Different",
        chargeMinor: 9000,
      }),
    ).toThrow(/plan amount/);
    expect(() => invoice()).toThrow(/already exists/);
  });
  it.each([
    ["coach", "COACH"],
    ["support", "SUPPORT"],
  ] as const)("denies %s all finance reads", (user, role) => {
    invoice();
    expect(() => financeView(context(user, role))).toThrow(/role/);
  });
  it.each([
    ["parent", "PARENT"],
    ["coach", "COACH"],
    ["support", "SUPPORT"],
  ] as const)("denies %s finance mutations", (user, role) => {
    for (const action of [
      "plan",
      "invoice",
      "reference",
      "verify",
      "reject",
      "adjustment",
      "reminder",
    ])
      expect(() =>
        financeAction(context(user, role), command(action, {})),
      ).toThrow(/role/);
  });
  it("keeps a submitted reference pending with unchanged balance and no receipt", () => {
    const issued = invoice();
    const payment = reference(issued.id);
    expect(payment.status).toBe("PENDING");
    expect(financeView(owner()).invoices[0]).toMatchObject({
      paidMinor: 0,
      outstandingMinor: 10000,
      pendingReferenceMinor: 4000,
    });
    expect(financeView(owner()).receipts).toEqual([]);
  });
  it("credits only verified events, supports partial/full settlement and freezes receipt snapshots", () => {
    const issued = invoice();
    const payment = reference(issued.id);
    verify(payment);
    expect(financeView(owner()).invoices[0]).toMatchObject({
      status: "PARTIAL",
      paidMinor: 4000,
      outstandingMinor: 6000,
    });
    expect(financeView(owner()).receipts).toHaveLength(1);
    const savedReceipt = financeView(owner()).receipts[0];
    verify(reference(issued.id, 6000));
    const view = financeView(context("parent", "PARENT"));
    expect(view.invoices[0]).toMatchObject({
      status: "PAID",
      paidMinor: 10000,
      outstandingMinor: 0,
    });
    expect(view.receipts).toHaveLength(2);
    expect(view.payments.every((item) => item.decisionNote === undefined)).toBe(
      true,
    );
    database()
      .prepare("UPDATE academy_workspaces SET config=? WHERE id=?")
      .run(JSON.stringify({ ...academy, name: "Renamed Academy" }), academy.id);
    expect(financeView(owner()).receipts[0]).toEqual(savedReceipt);
    expect(financeView(owner()).summary[0]).toMatchObject({
      billedMinor: 10000,
      collectedMinor: 10000,
      outstandingMinor: 0,
      paidInvoiceCount: 1,
    });
  });
  it("records rejection without crediting it and prevents a second decision", () => {
    const payment = reference(invoice().id);
    financeAction(
      owner(),
      command(
        "reject",
        {
          reviewed: true,
          note: "Reference does not match the supplied record.",
        },
        { id: payment.id, expectedVersion: 1 },
      ),
    );
    expect(financeView(owner()).invoices[0].paidMinor).toBe(0);
    expect(financeView(owner()).receipts).toEqual([]);
    expect(() => verify(payment)).toThrow(/changed/);
    const rejected = financeView(owner()).payments[0];
    expect(() => verify(rejected)).toThrow(/already/);
  });
  it("isolates academies and linked children for lists and guessed invoice actions", () => {
    const first = invoice();
    const other = invoice("child-other");
    expect(
      financeView(context("parent", "PARENT")).invoices.map((item) => item.id),
    ).toEqual([first.id]);
    expect(() =>
      financeView(context("parent", "PARENT"), "child-other"),
    ).toThrow(/not available/);
    expect(
      financeView(context("owner-b", "OWNER", "academy-b")).invoices,
    ).toEqual([]);
    expect(() =>
      financeAction(
        context("owner-b", "OWNER", "academy-b"),
        command("reference", {
          invoiceId: other.id,
          amountMinor: 1,
          currency: "INR",
          reference: "SYNTHETIC-OTHER",
          method: "CASH",
          paidOn: "2026-10-15",
        }),
      ),
    ).toThrow(/unavailable/);
    expect(() => invoice("child-b")).toThrow(/not available/);
  });
  it("rechecks revoked membership, disabled module/entitlement and guardian relationships on reads and retries", () => {
    const input = command("invoice", {
      playerId: "child-a",
      label: "Monthly",
      chargeMinor: 100,
      currency: "INR",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      dueDate: "2026-10-20",
    });
    financeAction(owner(), input);
    database()
      .prepare("UPDATE academy_memberships SET active=0 WHERE userId='owner'")
      .run();
    expect(() => financeAction(owner(), input)).toThrow(/membership/);
    database()
      .prepare("UPDATE academy_memberships SET active=1 WHERE userId='owner'")
      .run();
    database()
      .prepare(
        "UPDATE platform_entitlements SET status='SUSPENDED' WHERE academyId=?",
      )
      .run(academy.id);
    expect(() => financeView(owner())).toThrow(/membership/);
    database()
      .prepare(
        "UPDATE platform_entitlements SET status='ACTIVE',modules='[]' WHERE academyId=?",
      )
      .run(academy.id);
    expect(() => financeView(owner())).toThrow(/module/);
    database()
      .prepare("UPDATE platform_entitlements SET modules=? WHERE academyId=?")
      .run(JSON.stringify(academy.modules), academy.id);
    database()
      .prepare("DELETE FROM guardian_relationships WHERE userId='parent'")
      .run();
    expect(financeView(context("parent", "PARENT")).invoices).toEqual([]);
  });
  it("makes command retries idempotent, detects key reuse and prevents duplicate normalized references", () => {
    const issued = invoice();
    const input = command("reference", {
      invoiceId: issued.id,
      amountMinor: 4000,
      currency: "INR",
      reference: " SYNTHETIC Bank 001 ",
      method: "BANK_TRANSFER",
      paidOn: "2026-10-15",
    });
    const payment = financeAction(owner(), input) as FinancePayment;
    expect(financeAction(owner(), input)).toEqual(payment);
    expect(() =>
      financeAction(owner(), {
        ...input,
        data: { ...(input.data as object), amountMinor: 3000 },
      }),
    ).toThrow(/Submission key/);
    expect(() =>
      reference(issued.id, 1000, { reference: "syntheticbank001" }),
    ).toThrow(/already recorded/);
    const decision = command(
      "verify",
      { reviewed: true, note: "Confirmed matching synthetic record." },
      { id: payment.id, expectedVersion: 1 },
    );
    financeAction(owner(), decision);
    financeAction(owner(), decision);
    expect(financeView(owner()).receipts).toHaveLength(1);
    expect(financeView(owner()).invoices[0].paidMinor).toBe(4000);
  });
  it("serializes competing pending settlements, rejects overpayment and requires reviewed versioned decisions", () => {
    const issued = invoice();
    const one = reference(issued.id, 6000);
    const two = reference(issued.id, 6000);
    expect(() =>
      financeAction(
        owner(),
        command(
          "verify",
          { reviewed: false, note: "Not reviewed" },
          { id: one.id, expectedVersion: 1 },
        ),
      ),
    ).toThrow();
    expect(() =>
      financeAction(
        owner(),
        command(
          "verify",
          { reviewed: true, note: "Reviewed" },
          { id: one.id, expectedVersion: 0 },
        ),
      ),
    ).toThrow(/changed/);
    verify(one);
    expect(() => verify(two)).toThrow(/exceed/);
    expect(() => reference(issued.id, 5000)).toThrow(/exceeds/);
    expect(financeView(owner()).receipts).toHaveLength(1);
    expect(financeView(owner()).invoices[0].outstandingMinor).toBe(4000);
  });
  it("applies reasoned approved credits/debits, rejects stale credits and cannot erase verified collections", () => {
    const issued = invoice();
    verify(reference(issued.id, 4000));
    const adjustment = {
      invoiceId: issued.id,
      direction: "CREDIT",
      amountMinor: 1000,
      currency: "INR",
      reason: "Approved synthetic scholarship",
      reviewed: true,
    };
    expect(() =>
      financeAction(
        owner(),
        command("adjustment", adjustment, { expectedVersion: 1 }),
      ),
    ).toThrow(/changed/);
    financeAction(
      owner(),
      command("adjustment", adjustment, { expectedVersion: 2 }),
    );
    expect(financeView(owner()).invoices[0]).toMatchObject({
      billedMinor: 9000,
      paidMinor: 4000,
      outstandingMinor: 5000,
      version: 3,
    });
    expect(() =>
      financeAction(
        owner(),
        command(
          "adjustment",
          { ...adjustment, amountMinor: 6000 },
          { expectedVersion: 3 },
        ),
      ),
    ).toThrow(/remaining/);
    expect(() =>
      financeAction(
        owner(),
        command(
          "adjustment",
          { ...adjustment, reason: "" },
          { expectedVersion: 3 },
        ),
      ),
    ).toThrow();
    financeAction(
      owner(),
      command(
        "adjustment",
        {
          ...adjustment,
          direction: "DEBIT",
          amountMinor: 2000,
          reason: "Reviewed additional training charge",
        },
        { expectedVersion: 3 },
      ),
    );
    expect(financeView(owner()).invoices[0].billedMinor).toBe(11000);
  });
  it("derives overdue in academy local time and retains an overdue flag on partial invoices", () => {
    const issued = invoice("child-a", { dueDate: "2026-10-14" });
    expect(financeView(owner()).invoices[0]).toMatchObject({
      status: "OVERDUE",
      overdue: true,
    });
    verify(reference(issued.id, 1000));
    expect(financeView(owner()).invoices[0]).toMatchObject({
      status: "PARTIAL",
      overdue: true,
    });
    expect(financeView(owner()).summary[0].overdueMinor).toBe(9000);
  });
  it("publishes private reminders only to current linked guardians and never queues external delivery", () => {
    const issued = invoice();
    financeAction(
      owner(),
      command("reminder", {
        invoiceId: issued.id,
        body: "Please review your academy invoice in the private fee account.",
      }),
    );
    const own = financeView(context("parent", "PARENT")).reminders;
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({
      guardianIds: ["parent"],
      inAppStatus: "PUBLISHED",
      externalStatus: "NOT_SENT",
    });
    expect(financeView(context("other-parent", "PARENT")).reminders).toEqual(
      [],
    );
    expect(
      database().prepare("SELECT COUNT(*) AS n FROM delivery_jobs").get()?.n,
    ).toBe(0);
    verify(reference(issued.id, 10000));
    expect(() =>
      financeAction(
        owner(),
        command("reminder", {
          invoiceId: issued.id,
          body: "No reminder needed",
        }),
      ),
    ).toThrow(/settled/);
  });
  it("rejects malformed money, currency mismatches, invalid periods and future payments", () => {
    for (const amount of [-1, 0, 1.2, Number.MAX_SAFE_INTEGER + 1])
      expect(() => invoice("child-a", { chargeMinor: amount })).toThrow();
    expect(() => invoice("child-a", { currency: "XYZ" })).toThrow();
    expect(() => invoice("child-a", { currency: "GBP" })).toThrow(/Currency/);
    expect(() => invoice("child-a", { periodEnd: "2026-09-30" })).toThrow(
      /period/,
    );
    const issued = invoice();
    expect(() => reference(issued.id, 1, { currency: "GBP" })).toThrow(
      /Currency/,
    );
    expect(() => reference(issued.id, 1, { paidOn: "2026-10-16" })).toThrow(
      /future/,
    );
  });
  it("rolls verification, receipt, invoice version, audit and request receipt back after SQLite failure", () => {
    const issued = invoice();
    const payment = reference(issued.id);
    const before = database()
      .prepare("SELECT COUNT(*) AS n FROM workspace_audit")
      .get()?.n;
    const decision = command(
      "verify",
      { reviewed: true, note: "Verified synthetic record" },
      { id: payment.id, expectedVersion: 1 },
    );
    database().exec(
      "CREATE TRIGGER finance_test_failure BEFORE INSERT ON academy_finance_records WHEN NEW.kind='receipt' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END;",
    );
    expect(() => financeAction(owner(), decision)).toThrow(
      /synthetic receipt failure/,
    );
    expect(financeView(owner()).payments[0].status).toBe("PENDING");
    expect(financeView(owner()).receipts).toEqual([]);
    expect(financeView(owner()).invoices[0].version).toBe(1);
    expect(
      database().prepare("SELECT COUNT(*) AS n FROM workspace_audit").get()?.n,
    ).toBe(before);
    expect(
      database()
        .prepare("SELECT 1 FROM academy_finance_submissions WHERE requestId=?")
        .get(decision.requestId),
    ).toBeUndefined();
    database().exec("DROP TRIGGER finance_test_failure;");
    verify(payment);
    expect(financeView(owner()).receipts).toHaveLength(1);
  });
  it("preserves verified events/receipts after connection restart and reruns additive migration without rewriting legacy data", () => {
    const issued = invoice();
    verify(reference(issued.id));
    const original = financeView(owner());
    const global = globalThis as typeof globalThis & {
      sportozenDatabase?: DatabaseSync;
    };
    global.sportozenDatabase!.close();
    delete global.sportozenDatabase;
    migrateAcademyFinance(database());
    migrateAcademyFinance(database());
    expect(financeView(owner())).toEqual(original);
    expect(() =>
      financeRepository.save(
        academy.id,
        "receipt",
        original.receipts[0],
        1,
        "owner",
      ),
    ).toThrow(/immutable/);
  });
  it("keeps a fully approved waiver distinct from a paid invoice", () => {
    const issued = invoice();
    financeAction(
      owner(),
      command(
        "adjustment",
        {
          invoiceId: issued.id,
          direction: "CREDIT",
          amountMinor: 10000,
          currency: "INR",
          reason: "Approved full scholarship",
          reviewed: true,
        },
        { expectedVersion: 1 },
      ),
    );
    expect(financeView(owner()).invoices[0]).toMatchObject({
      status: "WAIVED",
      billedMinor: 0,
      paidMinor: 0,
      outstandingMinor: 0,
    });
    expect(financeView(owner()).receipts).toEqual([]);
    expect(financeView(owner()).summary[0].paidInvoiceCount).toBe(0);
  });
  it("keeps currencies separate after an academy currency change", () => {
    invoice();
    database()
      .prepare("UPDATE academy_workspaces SET config=? WHERE id=?")
      .run(JSON.stringify({ ...academy, currency: "GBP" }), academy.id);
    invoice("child-other", { currency: "GBP" });
    expect(
      financeView(owner()).summary.map((row) => [
        row.currency,
        row.billedMinor,
      ]),
    ).toEqual([
      ["INR", 10000],
      ["GBP", 10000],
    ]);
  });
  it("can archive a historical-currency plan without rewriting its issued invoice", () => {
    const plan = financeAction(
      owner(),
      command("plan", {
        name: "Original INR plan",
        amountMinor: 10000,
        currency: "INR",
        cadence: "MONTHLY",
        active: true,
      }),
    ) as FinancePlan;
    const issued = invoice("child-a", { planId: plan.id });
    database()
      .prepare("UPDATE academy_workspaces SET config=? WHERE id=?")
      .run(JSON.stringify({ ...academy, currency: "GBP" }), academy.id);
    financeAction(
      owner(),
      command(
        "plan",
        {
          name: plan.name,
          amountMinor: plan.amountMinor,
          currency: plan.currency,
          cadence: plan.cadence,
          active: false,
        },
        { id: plan.id, expectedVersion: 1 },
      ),
    );
    expect(financeView(owner()).plans[0].active).toBe(false);
    expect(financeView(owner()).invoices[0]).toMatchObject({
      id: issued.id,
      currency: "INR",
      chargeMinor: 10000,
    });
  });
  it("rejects aggregate minor-unit overflow instead of corrupting collection summaries", () => {
    const issued = invoice("child-a", { chargeMinor: Number.MAX_SAFE_INTEGER });
    expect(() => invoice("child-other", { chargeMinor: 1 })).toThrow(
      /safe minor-unit/,
    );
    reference(issued.id, Number.MAX_SAFE_INTEGER);
    expect(() => reference(issued.id, 1)).toThrow(/safe minor-unit/);
    expect(financeView(owner()).invoices[0].billedMinor).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
  it("reruns additive finance migration without changing legacy rows or downgrading a later schema", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        "CREATE TABLE academy_workspaces(id TEXT PRIMARY KEY); CREATE TABLE workspace_records(id TEXT PRIMARY KEY,body TEXT); INSERT INTO workspace_records VALUES('historical','unchanged'); PRAGMA user_version=17;",
      );
      migrateAcademyFinance(db);
      migrateAcademyFinance(db);
      expect(
        db
          .prepare("SELECT body FROM workspace_records WHERE id='historical'")
          .get()?.body,
      ).toBe("unchanged");
      expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(17);
    } finally {
      db.close();
    }
  });
  it("exports real authenticated invoice and verified-receipt PDFs only within current child scope", async () => {
    vi.useRealTimers();
    const issued = invoice();
    verify(reference(issued.id));
    const receipt = financeView(owner()).receipts[0];
    const { GET } =
      await import("@/app/api/workspaces/[academyId]/finance/[kind]/[recordId]/pdf/route");
    const { PDFDocument } = await import("pdf-lib");
    const download = (kind: string, recordId: string) =>
      GET(
        new Request(
          `http://127.0.0.1:3000/api/workspaces/${academy.id}/finance/${kind}/${recordId}/pdf`,
        ),
        { params: Promise.resolve({ academyId: academy.id, kind, recordId }) },
      );
    vi.mocked(authenticatedUser).mockResolvedValue(
      context("parent", "PARENT").user,
    );
    for (const [kind, recordId] of [
      ["invoice", issued.id],
      ["receipt", receipt.id],
    ]) {
      const response = await download(kind, recordId);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Cache-Control")).toContain("private");
      expect(
        (await PDFDocument.load(await response.arrayBuffer())).getPageCount(),
      ).toBeGreaterThan(0);
    }
    vi.mocked(authenticatedUser).mockResolvedValue(
      context("other-parent", "PARENT").user,
    );
    expect((await download("receipt", receipt.id)).status).toBe(404);
    vi.mocked(authenticatedUser).mockResolvedValue(
      context("coach", "COACH").user,
    );
    expect((await download("invoice", issued.id)).status).toBe(403);
    vi.mocked(authenticatedUser).mockResolvedValue(
      context("parent", "PARENT").user,
    );
    database()
      .prepare("DELETE FROM guardian_relationships WHERE userId='parent'")
      .run();
    expect((await download("receipt", receipt.id)).status).toBe(404);
  }, 30000);
});
