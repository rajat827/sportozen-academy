import { describe, expect, it } from "vitest";
import { reportMatchesPeriod } from "@/services/report-period-filter";

const september = {
  key: "2026-09",
  timezone: "Asia/Kolkata",
  startAt: "2026-08-31T18:30:00.000Z",
  endAt: "2026-09-30T18:30:00.000Z",
};
describe("Authenticated report period filter", () => {
  it("finds the60 final-month reports among120 timezone-labelled reports without modifying records", () => {
    const reports = ["2026-08", "2026-09"].flatMap((month) =>
      Array.from({ length: 60 }, (_, player) =>
        Object.freeze({
          id: `${month}:player-${player + 1}`,
          period: `${month} (Asia/Kolkata)`,
          reportingPeriod: Object.freeze(
            month === "2026-09"
              ? september
              : {
                  key: month,
                  timezone: "Asia/Kolkata",
                  startAt: "2026-07-31T18:30:00.000Z",
                  endAt: "2026-08-31T18:30:00.000Z",
                },
          ),
        }),
      ),
    );
    const before = JSON.stringify(reports);
    const selected = reports.filter((report) =>
      reportMatchesPeriod(report, "2026-09"),
    );
    expect(selected).toHaveLength(60);
    expect(new Set(selected.map((report) => report.id)).size).toBe(60);
    expect(
      selected.every((report) => report.reportingPeriod.key === "2026-09"),
    ).toBe(true);
    expect(
      reports.filter((report) => reportMatchesPeriod(report, "2026-08")),
    ).toHaveLength(60);
    expect(
      reports.filter((report) => reportMatchesPeriod(report, "")),
    ).toHaveLength(120);
    expect(JSON.stringify(reports)).toBe(before);
  });
  it("uses canonical metadata even if a legacy display label names a different period", () => {
    const report = {
      period: "2026-08 (Asia/Kolkata)",
      reportingPeriod: september,
    };
    expect(reportMatchesPeriod(report, "2026-09")).toBe(true);
    expect(reportMatchesPeriod(report, "2026-08")).toBe(false);
  });
  it.each(["2026-09", "2026-09 (Asia/Kolkata)"])(
    "retains older monthly records without canonical metadata: %s",
    (period) => {
      expect(reportMatchesPeriod({ period }, "2026-09")).toBe(true);
      expect(reportMatchesPeriod({ period }, "2026-08")).toBe(false);
    },
  );
  it("preserves exact legacy free-text matching without guessing a new month", () => {
    expect(
      reportMatchesPeriod({ period: "September 2026" }, "September 2026"),
    ).toBe(true);
    expect(reportMatchesPeriod({ period: "September 2026" }, "2026-09")).toBe(
      false,
    );
    expect(reportMatchesPeriod({ period: "September 2026" }, "")).toBe(true);
  });
  it.each([
    "2026-090",
    "2026-09-15",
    "2026-09 additional period",
    "2026-19 (Asia/Kolkata)",
  ])(
    "does not widen a monthly match to unrelated legacy labels: %s",
    (period) => {
      expect(reportMatchesPeriod({ period }, "2026-09")).toBe(false);
    },
  );
});
