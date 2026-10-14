import { describe, it, expect } from "vitest";
import { screenCatalog, screenById } from "@/features/design-preview/catalog";
import {
  initialPreviewState,
  previewTransition,
  playerWeeklyState,
} from "@/features/design-preview/adapter";
import {
  previewAcademies,
  reportFixture,
  readableAccent,
  weekPlanContext,
} from "@/features/design-preview/fixtures";
describe("isolated football design prototype", () => {
  it("keeps monthly approval and saved next steps with their selected child", () => {
    const aarav = previewTransition(initialPreviewState, {
      reportStatus: "Draft",
      nextStep: "Aarav's reviewed next task",
    });
    const isha = previewTransition(aarav, { playerId: "isha" });
    expect(isha.reportStatus).toBe("Draft");
    expect(isha.nextStep).not.toBe("Aarav's reviewed next task");
    const approvedIsha = previewTransition(isha, { reportStatus: "Approved" });
    const back = previewTransition(approvedIsha, { playerId: "aarav" });
    expect(back.reportStatus).toBe("Draft");
    expect(back.nextStep).toBe("Aarav's reviewed next task");
  });
  it("uses the saved batch/week without changing recorded age categories", () => {
    const state = previewTransition(initialPreviewState, {
      fields: {
        "weekly-context": { batch: "U12 Development", week: "2026-11-02" },
      },
    });
    const context = weekPlanContext(state.fields);
    expect(context.playerIds).toEqual(["leo"]);
    expect(context.first.label).toBe("3 November");
    expect(context.second.label).toBe("5 November");
    expect(state.weeklyStatus).toBe("Review needed");
  });
  it("rejects unreadable or malformed academy accents", () => {
    expect(previewAcademies.every((a) => readableAccent(a.accent))).toBe(true);
    expect(readableAccent("#eeeeee")).toBe(false);
    expect(readableAccent("invalid")).toBe(false);
  });
  it("keeps every registered route unique and its workflow links resolvable", () => {
    expect(new Set(screenCatalog.map((s) => s.id)).size).toBe(
      screenCatalog.length,
    );
    expect(screenCatalog.length).toBeGreaterThan(100);
    for (const s of screenCatalog) {
      expect(s.description.length).toBeGreaterThan(20);
      if (s.next) expect(screenById(s.next)).toBeDefined();
    }
    expect(
      new Set(screenCatalog.map((s) => s.area)).size,
    ).toBeGreaterThanOrEqual(16);
  });
  it("requires a separate per-child review/publication after a shared plan changes", () => {
    const source = structuredClone(initialPreviewState);
    const changed = previewTransition(source, {
      batchFocus: "A changed recorded focus",
    });
    expect(changed.weeklyStatus).toBe("Review needed");
    expect(playerWeeklyState(changed).published).toBe(false);
    const reviewed = previewTransition(changed, { weeklyStatus: "Approved" });
    expect(playerWeeklyState(reviewed).approved).toBe(true);
    expect(playerWeeklyState(reviewed).published).toBe(false);
    expect(playerWeeklyState(reviewed, "isha").approved).toBe(false);
    expect(
      playerWeeklyState(previewTransition(reviewed, { published: true }))
        .published,
    ).toBe(true);
    expect(source.batchFocus).toBe(initialPreviewState.batchFocus);
  });
  it("keeps payment-reference verification and different children/academies independent", () => {
    const pending = previewTransition(initialPreviewState, {
      manualReference: "PREVIEW-001",
      payment: "pending-verification",
    });
    expect(pending.payment).not.toBe("paid");
    const otherChild = previewTransition(pending, { playerId: "leo" });
    expect(otherChild.payment).toBe("unpaid");
    expect(otherChild.manualReference).toBe("");
    const returned = previewTransition(otherChild, { playerId: "aarav" });
    expect(returned.payment).toBe("pending-verification");
    expect(returned.manualReference).toBe("PREVIEW-001");
    const otherAcademy = previewTransition(returned, { academyId: "harbour" });
    expect(otherAcademy.payment).toBe("unpaid");
    expect(otherAcademy.observation).toBe("");
  });
  it("uses the same approved source facts for PDFs and never invents another child's evidence", () => {
    const model = reportFixture(previewAcademies[0], "aarav"),
      limited = reportFixture(previewAcademies[0], "isha"),
      long = reportFixture(previewAcademies[0], "aarav", "long");
    expect(model.evidence[0].text).toContain("1 unmarked");
    expect(model.evidence[0].text).toContain("2/2");
    expect(limited.evidence[0].text).toContain("No reviewed");
    expect(long.evidence).toEqual(model.evidence);
    expect(long.note.length).toBeGreaterThan(model.note.length);
    expect(reportFixture(previewAcademies[1], "aarav").academy).toBe(
      "Harbour Football Academy",
    );
  });
});
