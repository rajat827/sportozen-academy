export function currencyDigits(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
/** Parse major units without a floating-point multiplication or rounding. */
export function parseFinanceAmount(value: string, currency: string) {
  const digits = currencyDigits(currency);
  const valid = digits ? new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`) : /^\d+$/;
  if (!valid.test(value.trim()))
    throw new Error(
      `Enter a positive ${currency} amount with at most ${digits} decimal places.`,
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const amount =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Enter an amount within the supported positive range.");
  return Number(amount);
}
/** Keep the final minor digits exact even near Number.MAX_SAFE_INTEGER. */
export function formatFinanceMoney(
  amountMinor: number,
  currency: string,
  locale = "en-IN",
) {
  if (!Number.isSafeInteger(amountMinor)) return "Amount unavailable";
  const digits = currencyDigits(currency),
    scale = 10n ** BigInt(digits);
  const absolute = BigInt(Math.abs(amountMinor));
  const fraction = (absolute % scale).toString().padStart(digits, "0");
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).formatToParts(absolute / scale);
  return (
    (amountMinor < 0 ? "−" : "") +
    parts
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("")
  );
}
