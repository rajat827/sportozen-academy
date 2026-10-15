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
  it.each(["location", "theme", "startLocal", "endLocal", "squadId"] as const)(
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
  it("rejects no assigned coach, impossible dates and end-before-start", () => {
    expect(
      sessionDraftInput.safeParse({ ...minimum, coachIds: [] }).success,
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
  it("retains long custom and special-character themes while rejecting blank/overlong input", () => {
    const theme = `Passing & receiving <practice> — ${"controlled touches ".repeat(50)}`;
    expect(sessionDraftInput.parse({ ...minimum, theme }).theme).toBe(
      theme.trim(),
    );
    expect(
      sessionDraftInput.safeParse({ ...minimum, theme: "   " }).success,
    ).toBe(false);
    expect(
      sessionDraftInput.safeParse({ ...minimum, theme: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });
  it("checks optional entered planning consistently and preserves duration limits", () => {
    expect(
      sessionDraftInput.safeParse({
        ...minimum,
        sharedObjective: { goal: "Receive", cue: "", observe: "" },
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
