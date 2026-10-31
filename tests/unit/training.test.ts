import { describe, it, expect } from "vitest";
import {
  resolveSessionTime,
  evidenceInput,
  measurementText,
  comparableEvidence,
} from "../../src/services/training-rules";
import type { FootballEvidence } from "../../src/domain/training";
describe("recorded football training rules", () => {
  it("resolves regional local times without using the browser zone", () => {
    expect(resolveSessionTime("2026-10-12T18:00", "Asia/Kolkata")).toBe(
      "2026-10-12T12:30:00.000Z",
    );
    expect(resolveSessionTime("2026-10-12T18:00", "Australia/Perth")).toBe(
      "2026-10-12T10:00:00.000Z",
    );
    expect(resolveSessionTime("2026-10-12T18:00", "Europe/London")).toBe(
      "2026-10-12T17:00:00.000Z",
    );
  });
  it("rejects DST gaps, folds and impossible dates", () => {
    for (const value of [
      "2026-03-29T01:30",
      "2026-10-25T01:30",
      "2026-02-30T12:00",
    ])
      expect(() => resolveSessionTime(value, "Europe/London")).toThrow();
  });
  const input = {
    sessionId: "s",
    playerId: "p",
    drillId: "d",
    conditions: "Same cones and distance",
    observation: "Coach recorded touches",
    type: "RAW_RECORD",
    visibility: "PARENT_ELIGIBLE",
    measurement: "ATTEMPTS",
    attempts: 6,
    successes: 3,
    method: "Coach tallied",
  };
  it("rejects impossible drill results", () => {
    expect(evidenceInput.safeParse({ ...input, attempts: -1 }).success).toBe(
      false,
    );
    expect(evidenceInput.safeParse({ ...input, successes: 7 }).success).toBe(
      false,
    );
  });
  it("never turns missing attempts into a zero skill score", () => {
    expect(
      evidenceInput.safeParse({ ...input, attempts: 0, successes: 0 }).success,
    ).toBe(true);
    expect(
      measurementText({ measurement: "ATTEMPTS", attempts: 0, successes: 0 }),
    ).toBe("No attempts recorded — no percentage or skill score");
  });
  it("requires a positive elapsed measurement", () => {
    expect(
      evidenceInput.safeParse({
        ...input,
        measurement: "ELAPSED_TIME",
        elapsedSeconds: 0,
      }).success,
    ).toBe(false);
  });
  it("does not compare changed conditions, drills, players or unreviewed evidence", () => {
    const a = {
      playerId: "p",
      drillId: "d",
      drillVersion: 1,
      conditions: "10m course",
      method: "Coach stopwatch",
      unit: "SECONDS",
      measurement: "ELAPSED_TIME",
      status: "REVIEWED",
    } as FootballEvidence;
    expect(comparableEvidence(a, { ...a })).toBe(true);
    for (const change of [
      { conditions: "20m course" },
      { drillVersion: 2 },
      { playerId: "other" },
      { status: "AWAITING_REVIEW" },
      { method: "Different timing" },
    ])
      expect(
        comparableEvidence(a, { ...a, ...change } as FootballEvidence),
      ).toBe(false);
  });
});
