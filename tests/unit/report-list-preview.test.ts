import { describe, expect, it } from "vitest";
import {
  REPORT_PAGE_SIZE,
  reportListPage,
  reportPreviewExcerpt,
} from "@/services/report-list-preview";

describe("Compact authorised report list and literal preview", () => {
  it("keeps all60 players accessible once across eight ordered pages", () => {
    const players = Object.freeze(
      Array.from({ length: 60 }, (_, index) =>
        Object.freeze({ id: `player-${index + 1}` }),
      ),
    );
    const pages = Array.from({ length: 8 }, (_, index) =>
      reportListPage(players, index + 1),
    );
    expect(REPORT_PAGE_SIZE).toBe(8);
    expect(pages.slice(0, 7).every((page) => page.items.length === 8)).toBe(
      true,
    );
    expect(pages[7]).toMatchObject({
      page: 8,
      totalPages: 8,
      first: 57,
      last: 60,
    });
    expect(pages.flatMap((page) => page.items)).toEqual(players);
    expect(
      new Set(pages.flatMap((page) => page.items.map((player) => player.id)))
        .size,
    ).toBe(60);
  });
  it("clamps pages when a filter shrinks the list and handles empty results", () => {
    const rows = Array.from({ length: 10 }, (_, index) => index);
    expect(reportListPage(rows, 8)).toMatchObject({
      page: 2,
      totalPages: 2,
      items: [8, 9],
      first: 9,
      last: 10,
    });
    expect(reportListPage(rows, -1)).toMatchObject({
      page: 1,
      first: 1,
      last: 8,
    });
    expect(reportListPage([], 8)).toEqual({
      page: 1,
      totalPages: 1,
      items: [],
      first: 0,
      last: 0,
    });
  });
  it("keeps short comments verbatim and cuts a long literal excerpt at a word boundary", () => {
    expect(reportPreviewExcerpt("Keep the ball close.")).toBe(
      "Keep the ball close.",
    );
    expect(reportPreviewExcerpt("")).toBe("");
    expect(
      reportPreviewExcerpt(
        "Keep the ball close before changing direction.",
        22,
      ),
    ).toBe("Keep the ball close…");
  });
  it("bounds long comments without rewriting the full immutable report text", () => {
    const report = Object.freeze({
      note: `${"Actual reviewed coach wording. ".repeat(250)}Review note30 remains available in the full report.`,
    });
    const excerpt = reportPreviewExcerpt(report.note);
    expect(Array.from(excerpt).length).toBeLessThanOrEqual(241);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(report.note.startsWith(excerpt.slice(0, -1))).toBe(true);
    expect(excerpt).not.toContain("Review note30");
    expect(report.note).toContain(
      "Review note30 remains available in the full report.",
    );
  });
  it("does not split surrogate-pair characters in a bounded preview", () => {
    expect(reportPreviewExcerpt("🧒🧒🧒🧒🧒", 4)).toBe("🧒🧒🧒🧒…");
  });
});
