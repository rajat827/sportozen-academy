import { describe, expect, it } from "vitest";
import { sessionDraftInput } from "@/services/training-rules";

const minimum = {
  branchId: "branch",
  squadId: "squad",
  coachIds: ["coach"],
  location: "Excelsior American School",
  timezone: "Asia/Kolkata",
  startLocal: "2026-08-03T17:00",
  endLocal: "2026-08-03T18:30",
  theme: "Ball control and first touch",
};
describe("minimum dated session drafts", () => {
  it("does not require optional drills, venue selection or personal planning", () => {
    const parsed = sessionDraftInput.parse(minimum);
    expect(parsed.agenda).toEqual([]);
    expect(parsed.venueId).toBeUndefined();
    expect(parsed.sharedObjective).toBeUndefined();
  });
  it("accepts unfinished focus, location and coach assignment for an authorised draft workflow", () => {
    const parsed = sessionDraftInput.parse({
      branchId: minimum.branchId,
      squadId: minimum.squadId,
      timezone: minimum.timezone,
      startLocal: minimum.startLocal,
      endLocal: minimum.endLocal,
    });
    expect(parsed).toMatchObject({
      location: "",
      theme: "",
      coachIds: [],
      agenda: [],
    });
    expect(
      sessionDraftInput.parse({
        ...minimum,
        location: "   ",
        theme: "  ",
        coachIds: [],
      }),
    ).toMatchObject({ location: "", theme: "", coachIds: [] });
  });
  it.each(["branchId", "startLocal", "endLocal", "squadId"] as const)(
    "identifies missing %s",
    (field) => {
      const result = sessionDraftInput.safeParse({ ...minimum, [field]: "" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some((issue) => issue.path[0] === field),
        ).toBe(true);
    },
  );
  it("rejects invalid coach identifiers, impossible dates and end-before-start", () => {
    expect(
      sessionDraftInput.safeParse({ ...minimum, coachIds: [""] }).success,
    ).toBe(false);
    expect(
      sessionDraftInput.safeParse({
        ...minimum,
        startLocal: "2026-02-30T17:00",
      }).success,
    ).toBe(false);
    const result = sessionDraftInput.safeParse({
      ...minimum,
      endLocal: "2026-08-03T16:00",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["endLocal"] }),
        ]),
      );
  });
  it("retains long custom and special-character themes while rejecting overlong input", () => {
    const theme = `Passing & receiving <practice> — ${"controlled touches ".repeat(50)}`;
    expect(sessionDraftInput.parse({ ...minimum, theme }).theme).toBe(
      theme.trim(),
    );
    expect(
      sessionDraftInput.safeParse({ ...minimum, theme: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });
  it("supports an independent optional custom title without changing the focus", () => {
    expect(
      sessionDraftInput.parse({
        ...minimum,
        title: "  Saturday squad practice  ",
        theme: "",
      }),
    ).toMatchObject({ title: "Saturday squad practice", theme: "" });
    expect(
      sessionDraftInput.safeParse({ ...minimum, title: "x".repeat(201) })
        .success,
    ).toBe(false);
  });
  it("checks optional entered planning consistently and preserves duration limits", () => {
    expect(
      sessionDraftInput.parse({
        ...minimum,
        sharedObjective: { goal: "Receive", cue: "", observe: "" },
      }).sharedObjective,
    ).toEqual({ goal: "Receive", cue: "", observe: "" });
    expect(
      sessionDraftInput.safeParse({
        ...minimum,
        sharedObjective: { goal: "x".repeat(2001), cue: "", observe: "" },
      }).success,
    ).toBe(false);
    expect(
      sessionDraftInput.safeParse({
        ...minimum,
        agenda: [{ drillId: "drill", duration: 100 }],
      }).success,
    ).toBe(false);
  });
});
