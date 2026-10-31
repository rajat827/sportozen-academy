import { describe, expect, it } from "vitest";
import type { FootballSession } from "@/domain/training";
import {
  SESSION_FOCUS_FALLBACK,
  sessionFocus,
  sessionHeading,
  sessionSummary,
} from "@/services/session-display";

const session = (overrides: Partial<FootballSession> = {}) =>
  ({
    title: undefined,
    theme: "",
    sharedObjective: undefined,
    ...overrides,
  }) as FootballSession;

describe("session display fallbacks", () => {
  it("prefers an optional title, then the recorded focus", () => {
    expect(
      sessionSummary(session({ title: "U12 Training", theme: "Passing" })),
    ).toBe("U12 Training");
    expect(sessionSummary(session({ theme: "Passing" }))).toBe("Passing");
    expect(
      sessionHeading(session({ title: "Saturday match prep" }), "U12"),
    ).toBe("Saturday match prep");
    expect(sessionHeading(session({ theme: "Receiving" }), "U12")).toBe(
      "Receiving",
    );
  });
  it("never returns a blank line when both title and focus are empty or whitespace", () => {
    for (const blank of [session(), session({ title: "   ", theme: "  " })]) {
      expect(sessionSummary(blank)).toBe(SESSION_FOCUS_FALLBACK);
      expect(sessionHeading(blank, "U12 Foundations")).toBe(
        "U12 Foundations Training",
      );
      expect(sessionHeading(blank)).toBe("Football training");
      expect(sessionFocus(blank)).toBe(SESSION_FOCUS_FALLBACK);
    }
  });
  it("keeps the shared focus separate from the session title", () => {
    expect(
      sessionFocus(
        session({
          title: "U12 Training",
          theme: "Passing",
          sharedObjective: {
            goal: "Receive on the half turn",
            cue: "",
            observe: "",
          },
        }),
      ),
    ).toBe("Receive on the half turn");
    expect(
      sessionFocus(
        session({
          title: "U12 Training",
          theme: "Passing",
          sharedObjective: { goal: " ", cue: "", observe: "" },
        }),
      ),
    ).toBe("Passing");
    expect(sessionFocus(session({ title: "U12 Training" }))).toBe(
      SESSION_FOCUS_FALLBACK,
    );
  });
});
