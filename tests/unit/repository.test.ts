import { describe, expect, it } from "vitest";
import { seed } from "@/data/demo/seed";
import {
  createRepository,
  parentRecords,
} from "@/data/repositories/demo-repository";
import { browserStorage } from "@/services/storage/demo-storage";
describe("Demo repository boundaries", () => {
  it("persists edits through a replaceable adapter", () => {
    let stored = structuredClone(seed);
    const repo = createRepository({
      load: () => structuredClone(stored),
      save: (s) => {
        stored = structuredClone(s);
      },
      reset: () => {
        stored = structuredClone(seed);
      },
    });
    const state = repo.load();
    state.goals[0].status = "Coach Verified";
    repo.save(state);
    expect(repo.load().goals[0].status).toBe("Coach Verified");
    repo.reset();
    expect(repo.load().goals[0].status).toBe("Developing");
  });
  it("excludes other players, private notes and unreviewed evidence from parents", () => {
    const state = structuredClone(seed);
    state.observations.push({
      ...state.observations[0],
      id: "private",
      public: false,
    });
    state.evidence.push({
      ...state.evidence[0],
      id: "unreviewed",
      status: "Awaiting Review",
    });
    state.reports.push({ ...state.reports[0], id: "draft", status: "Draft" });
    const records = parentRecords(state, "g1");
    expect(records.players.map((p) => p.id)).toEqual(["p1"]);
    expect(records.evidence.map((e) => e.id)).toEqual(["e1"]);
    expect(records.observations.map((o) => o.id)).toEqual(["o1"]);
    expect(records.reports.map((r) => r.id)).toEqual(["r1"]);
    expect(records.messages).toHaveLength(0);
    expect(parentRecords(state, "unknown").players).toHaveLength(0);
  });
  it("has coherent tenant and sport references across fictional records", () => {
    expect(seed.players).toHaveLength(24);
    expect(seed.drills).toHaveLength(16);
    for (const record of [
      ...seed.players,
      ...seed.sessions,
      ...seed.evidence,
      ...seed.goals,
      ...seed.reports,
    ]) {
      expect(record.academyId).toBe(seed.academy.id);
      expect(record.sportId).toBe("football");
    }
    for (const evidence of seed.evidence) {
      expect(seed.players.some((p) => p.id === evidence.playerId)).toBe(true);
      expect(
        seed.goals.some(
          (g) => g.id === evidence.goalId && g.playerId === evidence.playerId,
        ),
      ).toBe(true);
    }
  });
  it("preserves missing attendance separately from absence", () => {
    expect(
      seed.attendance.every(
        (a) => a.status === "Unmarked" && a.checkIn === null,
      ),
    ).toBe(true);
  });
  it("recovers from malformed browser storage and stores a versioned envelope", () => {
    const memory = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => memory.get(k),
          setItem: (k: string, v: string) => memory.set(k, v),
          removeItem: (k: string) => memory.delete(k),
        },
      },
    });
    memory.set("sportozen-demo-v1", "{bad json");
    expect(browserStorage.load().players).toHaveLength(24);
    const state = structuredClone(seed);
    state.academy.city = "Test City";
    browserStorage.save(state);
    expect(browserStorage.load().academy.city).toBe("Test City");
    expect(JSON.parse(memory.get("sportozen-demo-v1")!).version).toBe(1);
    browserStorage.reset();
    expect(browserStorage.load().academy.city).toBe(seed.academy.city);
  });
});

