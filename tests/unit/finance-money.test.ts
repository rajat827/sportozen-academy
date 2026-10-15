import { describe, expect, it } from "vitest";
import {
  parseFinanceAmount,
  formatFinanceMoney,
  financeAmountInput,
} from "@/services/finance-rules";
describe("Exact finance minor units", () => {
  it("round-trips editable values at currency precision without float rounding", () => {
    for (const currency of ["INR", "JPY", "KWD"])
      for (const minor of [1, 10000, Number.MAX_SAFE_INTEGER])
        expect(
          parseFinanceAmount(financeAmountInput(minor, currency), currency),
        ).toBe(minor);
  });
  it("parses international currency precision without rounding a submitted amount", () => {
    expect(parseFinanceAmount("4500.50", "INR")).toBe(450050);
    expect(parseFinanceAmount("1000", "JPY")).toBe(1000);
    expect(parseFinanceAmount("1.001", "KWD")).toBe(1001);
    expect(() => parseFinanceAmount("1.001", "INR")).toThrow();
    expect(() => parseFinanceAmount("100.1", "JPY")).toThrow();
    expect(() => parseFinanceAmount("1e5", "INR")).toThrow();
    expect(() => parseFinanceAmount("0", "INR")).toThrow();
    expect(() => parseFinanceAmount("900719925474099.99", "INR")).toThrow();
  });
  it("keeps all supported final minor digits when displaying a maximum safe value", () => {
    expect(formatFinanceMoney(Number.MAX_SAFE_INTEGER, "USD", "en-US")).toBe(
      "$90,071,992,547,409.91",
    );
    expect(formatFinanceMoney(1001, "KWD", "en-US")).toContain("1.001");
    expect(formatFinanceMoney(1000, "JPY", "en-US")).toContain("1,000");
  });
});
