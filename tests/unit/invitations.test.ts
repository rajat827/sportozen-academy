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
import { authenticatedUser } from "@/server/auth";
import { database } from "@/server/database";
import { workspaceRepository as repo } from "@/server/workspace-repository";
import {
  acceptInvitation,
  invite,
  revokeMembership,
} from "@/server/workspace-service";
import type { AcademyConfiguration, AcademyRole } from "@/domain/workspace";
import type { WorkspaceAccess } from "@/server/workspace-access";

const filename = join(
  tmpdir(),
  "sportozen-invitations-" + randomUUID() + ".sqlite",
);
process.env.SPORTOZEN_DATABASE_PATH = filename;
let academy: AcademyConfiguration, owner: WorkspaceAccess;
const guardian = { id: "guardian", email: "guardian@example.test" },
  coach = { id: "coach", email: "coach@example.test" };

function seed() {
  const id = randomUUID();
  academy = {
    id,
    academyId: id,
    name: "Synthetic invitation academy",
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
    JSON.stringify(academy),
  );
  db.prepare(
    "INSERT INTO platform_entitlements(academyId,tier,modules,status) VALUES(?,?,?,?)",
  ).run(id, "TEST", JSON.stringify(academy.modules), "ACTIVE");
  db.prepare(
    "INSERT INTO academy_memberships(id,academyId,userId,role,sportIds) VALUES(?,?,?,?,?)",
  ).run("owner-" + id, id, "owner-" + id, "OWNER", '["football"]');
  owner = {
    academy,
    membership: {
      id: "owner-" + id,
      userId: "owner-" + id,
      academyId: id,
      role: "OWNER",
      active: true,
      sportIds: ["football"],
    },
    user: {
      id: "owner-" + id,
      name: "Owner",
      email: "owner@example.test",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    },
  };
  for (const [playerId, name] of [
    ["elder", "Synthetic elder sibling"],
    ["younger", "Synthetic younger sibling"],
  ])
    repo.save(id, "player", {
      id: playerId,
      academyId: id,
      name,
      coachId: owner.user.id,
      sportIds: ["football"],
      squad: "",
      squadId: "",
      ageCategory: "U12",
      birthDate: "",
      position: "",
      status: "ACTIVE",
    });
}
function accept(
  user: { id: string; email: string },
  role: Exclude<AcademyRole, "OWNER" | "SUPPORT">,
  playerIds: string[] = [],
) {
  const { token } = invite(owner, {
    email: user.email,
    role,
    playerIds,
    guardianVerified: role === "PARENT",
  });
  vi.mocked(authenticatedUser).mockResolvedValue(
    user as Awaited<ReturnType<typeof authenticatedUser>>,
  );
  return { token, result: acceptInvitation(new Headers(), token) };
}
function linkedPlayers(userId: string) {
  return database()
    .prepare(
      "SELECT playerId FROM guardian_relationships WHERE academyId=? AND userId=? ORDER BY playerId",
    )
    .all(academy.id, userId)
    .map((row) => String(row.playerId));
}

afterAll(() => {
  database().close();
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(filename + suffix, { force: true });
});

describe("academy invitations", () => {
  beforeEach(seed);

  it("adds a verified sibling link for an active guardian without replacing earlier links", async () => {
    await accept(guardian, "PARENT", ["elder"]).result;
    expect(linkedPlayers(guardian.id)).toEqual(["elder"]);
    const sibling = accept(guardian, "PARENT", ["younger"]);
    await expect(sibling.result).resolves.toEqual({ academyId: academy.id });
    expect(linkedPlayers(guardian.id)).toEqual(["elder", "younger"]);
    expect(repo.membership(academy.id, guardian.id)?.role).toBe("PARENT");
    await expect(
      acceptInvitation(new Headers(), sibling.token),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("keeps one academy role per account", async () => {
    await accept(coach, "COACH").result;
    await expect(
      accept(coach, "PARENT", ["elder"]).result,
    ).rejects.toMatchObject({ status: 409 });
    expect(linkedPlayers(coach.id)).toEqual([]);
    expect(repo.membership(academy.id, coach.id)?.role).toBe("COACH");
    await accept(guardian, "PARENT", ["elder"]).result;
    await expect(accept(guardian, "ADMIN").result).rejects.toMatchObject({
      status: 409,
    });
    expect(repo.membership(academy.id, guardian.id)?.role).toBe("PARENT");
    expect(linkedPlayers(guardian.id)).toEqual(["elder"]);
  });

  it("replaces links when a revoked guardian is invited again", async () => {
    await accept(guardian, "PARENT", ["elder"]).result;
    revokeMembership(
      owner,
      repo.membership(academy.id, guardian.id)!.id as string,
    );
    await accept(guardian, "PARENT", ["younger"]).result;
    expect(linkedPlayers(guardian.id)).toEqual(["younger"]);
  });
});
