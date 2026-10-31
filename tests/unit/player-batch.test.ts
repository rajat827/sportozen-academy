import { describe, expect, it } from "vitest";
import type {
  AcademyRole,
  WorkspacePayload,
  WorkspacePlayer,
} from "@/domain/workspace";
import { playerBatch } from "@/services/portal-records";
import { UNASSIGNED_PLAYER_BATCH } from "@/services/player-form-options";

const player = (overrides: Partial<WorkspacePlayer> = {}) =>
  ({
    id: "child",
    academyId: "academy",
    name: "Synthetic child",
    sportIds: ["football"],
    squad: "U12 Foundations",
    squadId: "first",
    ...overrides,
  }) as WorkspacePlayer;
const batch = (id: string, name: string, playerIds: string[]) => ({
  id,
  name,
  playerIds,
});
function payload(
  role: AcademyRole,
  squads = [batch("first", "U12 Foundations", ["child"])],
) {
  return {
    membership: { role },
    records: { squad: squads },
  } as unknown as WorkspacePayload;
}

describe("player batch display", () => {
  it("resolves the saved batch, then roster membership, for every role that can read batches", () => {
    for (const role of ["OWNER", "ADMIN", "COACH"] as const) {
      expect(playerBatch(payload(role), player())).toBe("U12 Foundations");
      expect(
        playerBatch(
          payload(role, [batch("first", "Renamed U12", ["child"])]),
          player({ squadId: undefined, squad: "Legacy label" }),
        ),
      ).toBe("Renamed U12");
    }
  });
  it("shows the recorded placement when the viewer cannot read the batch record", () => {
    for (const role of ["PARENT", "SUPPORT", "COACH"] as const)
      expect(playerBatch(payload(role, []), player())).toBe("U12 Foundations");
    expect(
      playerBatch(payload("PARENT", []), player({ squadId: undefined })),
    ).toBe("U12 Foundations");
  });
  it("never revives a historical label after an explicit unassignment", () => {
    for (const role of [
      "OWNER",
      "ADMIN",
      "COACH",
      "PARENT",
      "SUPPORT",
    ] as const)
      expect(playerBatch(payload(role, []), player({ squadId: "" }))).toBe(
        UNASSIGNED_PLAYER_BATCH,
      );
  });
  it("keeps owner and admin views tied to actual batch records", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(playerBatch(payload(role, []), player())).toBe(
        UNASSIGNED_PLAYER_BATCH,
      );
      expect(
        playerBatch(payload(role, []), player({ squadId: undefined })),
      ).toBe(UNASSIGNED_PLAYER_BATCH);
    }
    expect(
      playerBatch(
        payload("PARENT", []),
        player({ squad: "", squadId: undefined }),
      ),
    ).toBe(UNASSIGNED_PLAYER_BATCH);
  });
});
