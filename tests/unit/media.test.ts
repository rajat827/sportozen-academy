import { expect, it } from "vitest";
import { demoMediaFor, formatMediaTime } from "@/features/evidence/demo-media";
it("only provides illustrative video for seeded demo evidence", () => {
  expect(demoMediaFor("e1")?.src).toBe("/demo/receiving-practice.mp4");
  expect(demoMediaFor("e-observation-new")).toBeNull();
});
it("formats minutes properly, including timestamps beyond the first minute", () => {
  expect(formatMediaTime(60)).toBe("1:00");
  expect(formatMediaTime(75.7)).toBe("1:15");
  expect(formatMediaTime(Number.NaN)).toBe("0:00");
});
