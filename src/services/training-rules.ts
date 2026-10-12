import { z } from "zod";
import type { FootballEvidence } from "@/domain/training";
const id = z.string().min(1).max(100),
  text = z.string().trim().min(1).max(2000);
export const evidenceInput = z
  .object({
    sessionId: id,
    playerId: id,
    planId: id.optional(),
    drillId: id,
    conditions: text,
    observation: text,
    staffNote: z.string().max(2000).default(""),
    type: z.enum(["COACH_OBSERVATION", "RAW_RECORD"]),
    visibility: z.enum(["PARENT_ELIGIBLE", "STAFF_ONLY"]),
    measurement: z.enum(["OBSERVATION", "ATTEMPTS", "ELAPSED_TIME"]),
    attempts: z.number().int().nonnegative().max(100000).optional(),
    successes: z.number().int().nonnegative().max(100000).optional(),
    elapsedSeconds: z.number().positive().max(86400).optional(),
    method: text,
  })
  .superRefine((v, c) => {
    if (
      v.measurement === "ATTEMPTS" &&
      (v.attempts === undefined ||
        v.successes === undefined ||
        v.successes > v.attempts)
    )
      c.addIssue({
        code: "custom",
        message: "Record valid attempts and successes.",
      });
    if (v.measurement === "ELAPSED_TIME" && v.elapsedSeconds === undefined)
      c.addIssue({
        code: "custom",
        message: "Record positive elapsed seconds.",
      });
  });
// Resolve a local wall time only if exactly one UTC instant represents it.
// Both the spring gap and autumn fold are rejected, rather than guessed.
export function resolveSessionTime(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error("Use a dated local time.");
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const centre = Date.parse(local + "Z");
  if (!Number.isFinite(centre)) throw new Error("Invalid session date.");
  const matches: number[] = [];
  // IANA offsets are multiples of minutes; sample all possible offsets, including quarter-hour zones.
  for (let offset = -14 * 60; offset <= 14 * 60; offset++) {
    const instant = centre + offset * 60000,
      p = Object.fromEntries(
        format.formatToParts(instant).map((p) => [p.type, p.value]),
      );
    if (`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === local)
      matches.push(instant);
  }
  if (matches.length !== 1)
    throw new Error(
      "This local time is invalid or ambiguous in the selected time zone. Choose another time.",
    );
  return new Date(matches[0]).toISOString();
}
export function measurementText(
  e: Pick<
    FootballEvidence,
    "measurement" | "attempts" | "successes" | "elapsedSeconds"
  >,
) {
  if (e.measurement === "ATTEMPTS")
    return e.attempts
      ? `${e.successes} successful out of ${e.attempts} recorded attempts`
      : "No attempts recorded — no percentage or skill score";
  if (e.measurement === "ELAPSED_TIME")
    return `${e.elapsedSeconds} seconds for the defined course`;
  return "Coach observation";
}
export function comparableEvidence(a: FootballEvidence, b: FootballEvidence) {
  return (
    a.playerId === b.playerId &&
    a.drillId === b.drillId &&
    a.drillVersion === b.drillVersion &&
    a.conditions === b.conditions &&
    a.method === b.method &&
    a.unit === b.unit &&
    a.measurement === b.measurement &&
    a.status === "REVIEWED" &&
    b.status === "REVIEWED"
  );
}
