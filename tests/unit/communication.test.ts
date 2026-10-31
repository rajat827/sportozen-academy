import { describe, expect, it } from "vitest";
import { seed } from "@/data/demo/seed";
import {
  newDraft,
  prepareMessage,
  transitionDraft,
} from "@/services/communication/message-drafts";
import { parentRecords } from "@/data/repositories/demo-repository";
import { migrateMessageDraft } from "@/services/communication/migrate";
describe("Internal communication boundary", () => {
  it("requires verification and review, retains approval as NOT_SENT and invalidates approval on revision", () => {
    const initial = newDraft(seed);
    const edited = {
      ...initial,
      ...prepareMessage(seed, "Weekly progress update", "player", "p1"),
      sourceVerified: true,
    };
    expect(() => transitionDraft(initial, initial, "submit")).toThrow();
    expect(() => transitionDraft(initial, edited, "approve")).toThrow();
    const pending = transitionDraft(initial, edited, "submit");
    const approved = transitionDraft(pending, pending, "approve");
    expect(approved.status).toBe("NOT_SENT");
    expect(approved.approvedAt).toBeTruthy();
    expect(approved.history?.map((h) => h.status)).toEqual([
      "PENDING_APPROVAL",
      "APPROVED",
      "NOT_SENT",
    ]);
    expect(transitionDraft(approved, approved, "copy").status).toBe("NOT_SENT");
    const revision = transitionDraft(
      approved,
      { ...approved, body: "Changed" },
      "save",
    );
    expect(revision.status).toBe("DRAFT");
    expect(revision.approvedAt).toBeUndefined();
    expect(() => transitionDraft(revision, revision, "copy")).toThrow();
    expect(transitionDraft(pending, pending, "reject").status).toBe("REJECTED");
    expect(
      parentRecords({ ...seed, messages: [approved] }, "g1").messages,
    ).toEqual([]);
  });
  it("prepares only reviewed progress records and scopes squad sources", () => {
    const prepared = prepareMessage(
      seed,
      "Weekly progress update",
      "player",
      "p1",
    );
    expect(prepared.sources.some((s) => s.id === "e1")).toBe(true);
    expect(prepared.sources.some((s) => s.id === "e2")).toBe(false);
    const squad = prepareMessage(
      seed,
      "Attendance check",
      "squad",
      seed.squads[0].id,
    );
    expect(squad.sources.some((s) => s.label === "Attendance")).toBe(true);
  });
  it("migrates legacy approvals to internal drafts without inventing delivery or approval evidence", () => {
    const old = JSON.parse(
      JSON.stringify({
        ...seed.messages[0],
        status: "Approved",
        channel: "WhatsApp preview",
      }),
    );
    const migrated = migrateMessageDraft(old);
    expect(migrated.status).toBe("DRAFT");
    expect(migrated.deliveryStatus).toBe("NOT_SENT");
    expect(migrated.parentDemo).toBe(false);
    expect(migrated.approvedAt).toBeUndefined();
    expect(migrated.channel).toBe("Manual copy");
  });
});
