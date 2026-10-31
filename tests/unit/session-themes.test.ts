import { describe, expect, it } from "vitest";
import { academySchema } from "@/domain/academy-configuration-schema";
import {
  footballSessionThemes,
  sessionThemes,
} from "@/services/session-themes";
describe("academy football session themes", () => {
  it("provides twelve compatible defaults without mutating legacy academy configuration", () => {
    const academy = {};
    expect(sessionThemes(academy)).toEqual(footballSessionThemes);
    expect(sessionThemes(academy)).toHaveLength(12);
    expect(sessionThemes(academy)).toContain("Goalkeeping");
    expect(academy).not.toHaveProperty("sessionThemes");
  });
  it("uses an academy's configured suggestions while keeping session free text independent", () => {
    const themes = academySchema.shape.sessionThemes.parse([
      "Receiving in space",
      "Defending together",
    ]);
    expect(sessionThemes({ sessionThemes: themes })).toEqual(themes);
  });
  it("rejects empty, duplicate, overlong and excessive configuration values", () => {
    for (const themes of [
      [],
      [""],
      ["Passing", "passing"],
      ["x".repeat(201)],
      Array.from({ length: 31 }, (_, index) => `Theme ${index}`),
    ])
      expect(academySchema.shape.sessionThemes.safeParse(themes).success).toBe(
        false,
      );
  });
});
