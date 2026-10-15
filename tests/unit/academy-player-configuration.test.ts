import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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
import {
  saveRecord,
  updateAcademy,
  workspace,
} from "@/server/workspace-service";
import { academySchema, playerSchema } from "@/server/workspace-schemas";
import type { AcademyConfiguration, AcademyRole } from "@/domain/workspace";
import type { WorkspaceAccess } from "@/server/workspace-access";
import type { FootballSession } from "@/domain/training";

const filename = join(
  tmpdir(),
  "sportozen-academy-settings-" + randomUUID() + ".sqlite",
);
process.env.SPORTOZEN_DATABASE_PATH = filename;
let academy: AcademyConfiguration, owner: WorkspaceAccess;
function actor(role: AcademyRole, config = academy): WorkspaceAccess {
  const userId = role + "-" + config.id;
  return {
    academy: config,
    membership: {
      id: userId,
      userId,
      academyId: config.id,
      role,
      active: true,
      sportIds: ["football"],
    },
    user: {
      id: userId,
      name: role,
      email: role + "@example.test",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    },
  };
}
function seedAcademy(): AcademyConfiguration {
  const id = randomUUID();
  const config: AcademyConfiguration = {
    id,
    academyId: id,
    name: "Synthetic football academy",
    contactEmail: "academy@example.test",
    country: "IN",
    language: "English",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateLocale: "en-IN",
    measurementSystem: "METRIC",
    brandAccent: "#008463",
    sportIds: ["football"],
    ageGroups: ["U12"],
    reviewFrequency: "Monthly",
    modules: ["development", "reports", "communication", "fees"],
    nutritionOptional: true,
    demo: true,
    onboardingStatus: "ACTIVE",
  };
  const db = database();
  db.prepare("INSERT INTO academy_workspaces(id,config) VALUES(?,?)").run(
    id,
    JSON.stringify(config),
  );
  db.prepare(
    "INSERT INTO platform_entitlements(academyId,tier,modules,status) VALUES(?,?,?,?)",
  ).run(id, "TEST", JSON.stringify(config.modules), "ACTIVE");
  for (const role of ["OWNER", "ADMIN", "COACH", "PARENT"] as const) {
    const userId = role + "-" + id;
    db.prepare(
      "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
    ).run(userId, id, userId, role, '["football"]');
    db.prepare("INSERT INTO user(id,name) VALUES(?,?)").run(userId, role);
  }
  return config;
}
function seedPlayer() {
  const base = {
    academyId: academy.id,
    sportId: "football",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: owner.user.id,
  };
  repo.save(academy.id, "branch", {
    id: "branch",
    academyId: academy.id,
    name: "Recorded branch",
    timezone: academy.timezone,
  });
  repo.save(academy.id, "player", {
    id: "player",
    academyId: academy.id,
    name: "Synthetic player",
    coachId: actor("COACH").user.id,
    sportIds: ["football"],
    squad: "U12 Foundations",
    squadId: "first",
    ageCategory: "U12",
    birthDate: "2015-05-02",
    position: "Midfielder",
    status: "ACTIVE",
  });
  for (const [id, name, playerIds] of [
    ["first", "U12 Foundations", ["player"]],
    ["second", "U14 Practice", []],
  ] as const)
    repo.save(academy.id, "squad", {
      ...base,
      id,
      name,
      branchId: "branch",
      playerIds: [...playerIds],
    });
  const session: FootballSession = {
    ...base,
    id: "session",
    branchId: "branch",
    squadId: "first",
    location: "Recorded pitch",
    coachIds: [actor("COACH").user.id],
    timezone: academy.timezone,
    startLocal: "2026-01-05T17:00",
    endLocal: "2026-01-05T18:00",
    startAt: "2026-01-05T11:30:00.000Z",
    endAt: "2026-01-05T12:30:00.000Z",
    theme: "Recorded practice",
    status: "COMPLETED",
    roster: [{ playerId: "player", name: "Synthetic player" }],
    agenda: [],
    objectives: [],
  };
  repo.save(academy.id, "session", session);
  return repo.find(academy.id, "player", "player")!;
}
beforeEach(() => {
  database().exec(
    "CREATE TABLE IF NOT EXISTS user(id TEXT PRIMARY KEY,name TEXT)",
  );
  academy = seedAcademy();
  owner = actor("OWNER");
});
afterAll(() => {
  database().close();
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});

describe("persistent academy configuration and player placement", () => {
  it("exposes compatible legacy defaults without rewriting stored configuration", () => {
    expect(workspace(owner).academy).toMatchObject({
      configVersion: 0,
      location: "",
      weekStartsOn: 1,
      dateFormat: "DD_MMM_YYYY",
      timeFormat: "12_HOUR",
    });
    expect(repo.academy(academy.id)).not.toHaveProperty("configVersion");
    expect(workspace(owner).subscription).toEqual({
      tier: "TEST",
      status: "ACTIVE",
      modules: academy.modules,
    });
    expect(workspace(actor("COACH"))).not.toHaveProperty("subscription");
    expect(workspace(actor("PARENT"))).not.toHaveProperty("subscription");
  });
  it("confirms a versioned configuration save without changing historical sessions", () => {
    seedPlayer();
    const before = repo.find(academy.id, "session", "session");
    const saved = updateAcademy(owner, {
      ...academy,
      expectedVersion: 0,
      location: "Recorded city",
      about: "Football practice",
      phone: "+91 90000 00000",
      website: "https://academy.example.test",
      timezone: "UTC",
      weekStartsOn: 0,
      dateFormat: "YYYY_MM_DD",
      timeFormat: "24_HOUR",
    });
    expect(saved).toMatchObject({
      configVersion: 1,
      location: "Recorded city",
      weekStartsOn: 0,
      timeFormat: "24_HOUR",
      timezone: "UTC",
    });
    expect(repo.academy(academy.id)).toMatchObject({
      configVersion: 1,
      phone: "+91 90000 00000",
      website: "https://academy.example.test",
    });
    expect(repo.find(academy.id, "session", "session")).toEqual(before);
    expect(repo.find(academy.id, "branch", "branch")!.timezone).toBe(
      "Asia/Kolkata",
    );
    expect(() =>
      updateAcademy(owner, {
        ...academy,
        expectedVersion: 0,
        name: "Stale overwrite",
      }),
    ).toThrow(/configuration changed/);
  });
  it("requires an expected configuration version and current owner/admin membership", () => {
    expect(() => updateAcademy(owner, academy)).toThrow();
    for (const role of ["COACH", "PARENT"] as const)
      expect(() =>
        updateAcademy(actor(role), { ...academy, expectedVersion: 0 }),
      ).toThrow(/role/);
    database()
      .prepare("UPDATE academy_memberships SET active=0 WHERE id=?")
      .run(owner.membership.id);
    expect(() =>
      updateAcademy(owner, { ...academy, expectedVersion: 0 }),
    ).toThrow(/no longer active/);
    expect(repo.academy(academy.id)).not.toHaveProperty("configVersion");
  });
  it("enables fees for new defaults while preserving an existing academy's omitted module choices", () => {
    const { modules: _modules, ...input } = academy;
    void _modules;
    expect(academySchema.parse(input).modules).toContain("fees");
    const legacy = { ...academy, modules: ["development"] };
    database()
      .prepare("UPDATE academy_workspaces SET config=? WHERE id=?")
      .run(JSON.stringify(legacy), academy.id);
    const updated = updateAcademy(owner, {
      expectedVersion: 0,
      phone: "+91 90000 00000",
    });
    expect(updated.modules).toEqual(["development"]);
    expect(
      JSON.parse(
        String(
          database()
            .prepare(
              "SELECT modules FROM platform_entitlements WHERE academyId=?",
            )
            .get(academy.id)!.modules,
        ),
      ),
    ).toEqual(academy.modules);
  });
  it("validates supported profile/display fields and optional player metadata", () => {
    for (const invalid of [
      { about: "x".repeat(251) },
      { phone: "telephone" },
      { website: "javascript:alert(1)" },
      { weekStartsOn: 4 },
      { dateFormat: "invented" },
      { timeFormat: "invented" },
    ])
      expect(academySchema.safeParse({ ...academy, ...invalid }).success).toBe(
        false,
      );
    const input = {
      name: "Player",
      squad: "Recorded batch",
      coachId: actor("COACH").user.id,
    };
    expect(
      playerSchema.safeParse({ ...input, birthDate: "2099-01-01" }).success,
    ).toBe(false);
    expect(playerSchema.safeParse({ ...input, status: "PAID" }).success).toBe(
      false,
    );
    expect(playerSchema.parse(input)).not.toHaveProperty("ageCategory");
  });
  it("versions demographics independently of batch and historical training", () => {
    const previous = seedPlayer(),
      session = repo.find(academy.id, "session", "session");
    const saved = saveRecord(
      owner,
      "player",
      {
        ...previous,
        expectedVersion: previous.recordVersion,
        name: "Updated player",
        position: "Defender",
        status: "TRIAL",
      },
      previous.id,
    );
    expect(saved).toMatchObject({
      recordVersion: 2,
      ageCategory: "U12",
      squadId: "first",
      birthDate: "2015-05-02",
      status: "TRIAL",
    });
    expect(repo.find(academy.id, "squad", "first")!.playerIds).toEqual([
      "player",
    ]);
    expect(repo.find(academy.id, "session", "session")).toEqual(session);
    expect(() =>
      saveRecord(
        owner,
        "player",
        { ...previous, expectedVersion: 1, name: "Stale" },
        previous.id,
      ),
    ).toThrow(/Record changed/);
    expect(() => saveRecord(owner, "player", previous, previous.id)).toThrow(
      /Record changed/,
    );
  });
  it("requires reviewed admin placement and synchronises only current batch rosters", () => {
    const previous = seedPlayer(),
      session = repo.find(academy.id, "session", "session");
    const draft = {
      ...previous,
      expectedVersion: 1,
      squadId: "second",
      squad: "U14 Practice",
    };
    expect(() => saveRecord(owner, "player", draft, previous.id)).toThrow(
      /Review the training-batch/,
    );
    expect(() =>
      saveRecord(
        actor("COACH"),
        "player",
        { ...draft, placementReviewed: true },
        previous.id,
      ),
    ).toThrow(/role/);
    const saved = saveRecord(
      owner,
      "player",
      { ...draft, placementReviewed: true },
      previous.id,
    );
    expect(saved).toMatchObject({
      squadId: "second",
      ageCategory: "U12",
      recordVersion: 2,
    });
    expect(repo.find(academy.id, "squad", "first")).toMatchObject({
      playerIds: [],
      version: 2,
    });
    expect(repo.find(academy.id, "squad", "second")).toMatchObject({
      playerIds: ["player"],
      version: 2,
    });
    expect(repo.find(academy.id, "session", "session")).toEqual(session);
  });
  it("rejects foreign academy batches and mismatched labels without writing", () => {
    const previous = seedPlayer(),
      other = seedAcademy();
    repo.save(other.id, "squad", {
      id: "foreign",
      academyId: other.id,
      sportId: "football",
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: actor("OWNER", other).user.id,
      name: "Foreign",
      branchId: "other",
      playerIds: [],
    });
    expect(() =>
      saveRecord(
        owner,
        "player",
        {
          ...previous,
          expectedVersion: 1,
          placementReviewed: true,
          squadId: "foreign",
          squad: "Foreign",
        },
        previous.id,
      ),
    ).toThrow(/not available/);
    expect(() =>
      saveRecord(
        owner,
        "player",
        {
          ...previous,
          expectedVersion: 1,
          placementReviewed: true,
          squadId: "second",
          squad: "Wrong label",
        },
        previous.id,
      ),
    ).toThrow(/label must match/);
    expect(repo.find(academy.id, "player", previous.id)).toEqual(previous);
  });
  it("rolls back current roster changes when the player write fails", () => {
    const previous = seedPlayer();
    database().exec(
      "CREATE TRIGGER reject_settings_test_player BEFORE UPDATE ON workspace_records WHEN NEW.kind='player' BEGIN SELECT RAISE(ABORT,'Simulated write failure'); END",
    );
    try {
      expect(() =>
        saveRecord(
          owner,
          "player",
          {
            ...previous,
            expectedVersion: 1,
            placementReviewed: true,
            squadId: "second",
            squad: "U14 Practice",
          },
          previous.id,
        ),
      ).toThrow(/Simulated write failure/);
      expect(repo.find(academy.id, "squad", "first")).toMatchObject({
        playerIds: ["player"],
        version: 1,
      });
      expect(repo.find(academy.id, "squad", "second")).toMatchObject({
        playerIds: [],
        version: 1,
      });
      expect(repo.find(academy.id, "player", previous.id)).toEqual(previous);
    } finally {
      database().exec("DROP TRIGGER reject_settings_test_player");
    }
  });
});
