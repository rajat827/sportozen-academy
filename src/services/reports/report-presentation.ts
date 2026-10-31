import type {
  ApprovedReportPresentationData,
  ReportAttendanceSummary,
  ReportMeasurementPoint,
  ReportMeasurementSeries,
  ReportViewModel,
} from "@/domain/report";
import type { FootballEvidence, FootballSession } from "@/domain/training";
import { comparableEvidence } from "@/services/training-rules";

export type ActivityIllustration =
  | "movement-warm-up"
  | "close-control"
  | "passing-pairs"
  | "small-sided-game"
  | "generic-football";

export interface ReportPresentation extends Omit<ReportViewModel, "evidence"> {
  periodLabel: string;
  reviewDateLabel: string;
  playerInitials: string;
  attendance?: ReportAttendanceSummary;
  activityCards: (ReportViewModel["activities"][number] & {
    illustrationKey: ActivityIllustration;
  })[];
  measurementSeries: ReportMeasurementSeries[];
  observations: string[];
  coachEvaluation: string[];
}

export function activityIllustration(name: string): ActivityIllustration {
  if (/warm[ -]?up|movement|coordination/i.test(name))
    return "movement-warm-up";
  if (/close[ -]?control|dribbl|turns?\b/i.test(name)) return "close-control";
  if (/pass|receiv/i.test(name)) return "passing-pairs";
  if (/small[ -]?sided|\bgame\b|match/i.test(name)) return "small-sided-game";
  return "generic-football";
}

const uuid =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function periodMonth(period: string) {
  const iso = period.match(/^(\d{4})-(0[1-9]|1[0-2])(?:\b|\s)/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const words = period.match(/^(\w+)\s+(\d{4})(?:\b|\s)/);
  const month =
    words &&
    months.findIndex((m) => m.toLowerCase() === words[1].toLowerCase());
  return words && typeof month === "number" && month >= 0
    ? `${words[2]}-${String(month + 1).padStart(2, "0")}`
    : undefined;
}
function friendlyPeriod(period: string) {
  const key = periodMonth(period);
  return key
    ? `${months[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}${/Reviewed correction/.test(period) ? " · Reviewed correction" : ""}`
    : period;
}
function parentText(text: string) {
  return text
    .replace(/\s+Conditions: [\s\S]*$/, "")
    .replace(
      /\s+Recorded attendance: (?:PRESENT|ABSENT|EXCUSED|UNMARKED)\.[\s\S]*$/,
      "",
    )
    .replace(uuid, "")
    .trim();
}
function authoredText(text: string) {
  return text.replace(uuid, "").trim();
}
function attendanceFromEvidence(evidence: ReportViewModel["evidence"]) {
  const saved = evidence.find(
    (e) => e.source === "Recorded session attendance",
  );
  const match = saved?.text.match(
    /^(\d+) completed roster sessions; (\d+) present, (\d+) absent, (\d+) excused, (\d+) unmarked\. Attendance basis: present \/ \(present \+ absent\); excused and unmarked excluded\. (?:\d+\/\d+ \(\d+%\)|No marked attendance basis; no percentage)\. Cancelled and unfinished sessions excluded\.$/,
  );
  if (!match) return undefined;
  const [total, present, absent, excused, unmarked] = match
    .slice(1)
    .map(Number);
  return [total, present, absent, excused, unmarked].every(
    Number.isSafeInteger,
  ) && present + absent + excused + unmarked === total
    ? { total, present, absent, excused, unmarked }
    : undefined;
}
function reviewedDate(source: string, model: ReportViewModel) {
  const timestamp = source.match(
    /^(?:RAW[_ ]RECORD|COACH[_ ]OBSERVATION)(?: -)? reviewed (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)$/,
  )?.[1];
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return undefined;
  const timezone = model.period.match(/\(([^)]+)\)/)?.[1] || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(timestamp));
    const get = (part: string) => parts.find((p) => p.type === part)?.value;
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    return date.slice(0, 7) === periodMonth(model.period) ? date : undefined;
  } catch {
    return undefined;
  }
}
function dateLabel(date: string) {
  return `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1].slice(0, 3)}`;
}

export function formatRecordedDate(value?: string): string {
  const date = value?.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  return date
    ? `${Number(date[3])} ${months[Number(date[2]) - 1]} ${date[1]}`
    : (value ?? "");
}

/** Capture public facts while approval still has the verified source records. */
export function approvedReportPresentationData({
  attendance,
  evidence,
  sessions,
  timezone,
  coachEvaluation = [],
}: {
  attendance?: ReportAttendanceSummary;
  evidence: FootballEvidence[];
  sessions: Pick<FootballSession, "id" | "startAt">[];
  timezone: string;
  coachEvaluation?: string[];
}): ApprovedReportPresentationData {
  const groups: {
    source: FootballEvidence;
    series: ReportMeasurementSeries;
  }[] = [];
  const observations: string[] = [];
  for (const item of evidence) {
    if (item.status !== "REVIEWED" || item.visibility !== "PARENT_ELIGIBLE")
      continue;
    const session = sessions.find((s) => s.id === item.sessionId);
    const instant = session && new Date(session.startAt);
    const parts =
      instant && Number.isFinite(instant.getTime())
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(instant)
        : undefined;
    const part = (kind: string) => parts?.find((p) => p.type === kind)?.value;
    const date = parts
      ? `${part("year")}-${part("month")}-${part("day")}`
      : undefined;
    const attempts =
      item.measurement === "ATTEMPTS" &&
      item.attempts !== undefined &&
      item.successes !== undefined &&
      Number.isSafeInteger(item.attempts) &&
      Number.isSafeInteger(item.successes) &&
      item.attempts > 0 &&
      item.successes >= 0 &&
      item.successes <= item.attempts;
    const elapsed =
      item.measurement === "ELAPSED_TIME" &&
      item.elapsedSeconds !== undefined &&
      Number.isFinite(item.elapsedSeconds) &&
      item.elapsedSeconds >= 0;
    if (!attempts && !elapsed) {
      observations.push(authoredText(item.observation));
      continue;
    }
    const point: ReportMeasurementPoint = {
      date,
      dateLabel: date ? dateLabel(date) : `Observation ${groups.length + 1}`,
      dateKind: date ? "SESSION" : "UNSPECIFIED",
      value: attempts ? item.successes! : item.elapsedSeconds!,
      ...(attempts
        ? {
            total: item.attempts,
            successes: item.successes,
            attempts: item.attempts,
          }
        : { elapsedSeconds: item.elapsedSeconds }),
      observation: authoredText(item.observation),
    };
    const group =
      date &&
      groups.find(
        (g) =>
          g.series.points.every((p) => p.date) &&
          comparableEvidence(g.source, item) &&
          g.source.attempts === item.attempts,
      );
    if (group) {
      group.series.points.push(point);
      group.series.comparable = true;
    } else
      groups.push({
        source: item,
        series: {
          label: item.drillName,
          unit: attempts ? "ATTEMPTS" : "SECONDS",
          comparable: false,
          points: [point],
        },
      });
  }
  return {
    version: 1,
    attendance: attendance && { ...attendance },
    measurementSeries: groups.map(({ series }) => ({
      ...series,
      points: series.points.sort((a, b) =>
        (a.date ?? "").localeCompare(b.date ?? ""),
      ),
    })),
    observations: [...new Set(observations.filter(Boolean))],
    coachEvaluation: coachEvaluation.map(authoredText).filter(Boolean),
  };
}

/** Reads only frozen approved wording. It never looks up mutable training records. */
function legacyPresentationData(
  model: ReportViewModel,
): ApprovedReportPresentationData {
  const groups = new Map<string, ReportMeasurementSeries>();
  const observations: string[] = [],
    coachEvaluation: string[] = [];
  for (const [index, evidence] of model.evidence.entries()) {
    if (evidence.source === "Recorded session attendance") continue;
    const text = parentText(evidence.text);
    if (!text) continue;
    if (evidence.source === "Coach reviewed commentary") {
      coachEvaluation.push(evidence.text.replace(uuid, "").trim());
      continue;
    }
    const attempts = evidence.text.match(
      /\b(\d+) successful out of (\d+) recorded attempts\b/,
    );
    const elapsed = evidence.text.match(
      /\b(\d+(?:\.\d+)?) seconds for the defined course\b/,
    );
    const value = Number(attempts?.[1] ?? elapsed?.[1]);
    const total = attempts ? Number(attempts[2]) : undefined;
    if (
      (!attempts && !elapsed) ||
      !Number.isFinite(value) ||
      value < 0 ||
      (total !== undefined &&
        (!Number.isSafeInteger(total) || total < 1 || value > total))
    ) {
      observations.push(
        [evidence.label, evidence.headline, text].filter(Boolean).join(" · "),
      );
      continue;
    }
    const date = reviewedDate(evidence.source, model);
    const version = evidence.reference?.match(
      /^Session [\da-f-]+; evidence [\da-f-]+; drill version (\d+)$/i,
    )?.[1];
    const conditions = evidence.text
      .match(/\bConditions: ([\s\S]+)$/)?.[1]
      ?.replace(/\s+Recorded attendance:[\s\S]*$/, "")
      .trim();
    const description = text.slice(0, (attempts ?? elapsed)!.index).trim();
    const meaning = description
      .toLowerCase()
      .replace(/\b\d+(?:\.\d+)?\b/g, "#");
    const canCompare =
      !!date && !!version && !!conditions && meaning.length >= 20;
    const key = canCompare
      ? JSON.stringify([
          attempts ? "ATTEMPTS" : "SECONDS",
          total,
          version,
          conditions,
          meaning,
        ])
      : `separate-${index}`;
    const point: ReportMeasurementPoint = {
      date,
      dateLabel: date ? dateLabel(date) : `Observation ${index + 1}`,
      dateKind: date ? "REVIEWED" : "UNSPECIFIED",
      value,
      total,
      ...(attempts
        ? { successes: value, attempts: total }
        : { elapsedSeconds: value }),
      observation: text,
    };
    const existing = groups.get(key);
    if (existing) {
      existing.points.push(point);
      existing.comparable = true;
    } else {
      const matchingActivity = model.activities.find(
        (a) =>
          /close[ -]?control/i.test(a.name) &&
          /close[ -]?control/i.test(description),
      );
      groups.set(key, {
        label:
          matchingActivity?.name ||
          (attempts ? "Recorded attempts" : "Defined-course time"),
        unit: attempts ? "ATTEMPTS" : "SECONDS",
        comparable: false,
        points: [point],
      });
    }
  }
  return {
    version: 1,
    attendance: attendanceFromEvidence(model.evidence),
    measurementSeries: [...groups.values()].map((series) => ({
      ...series,
      points: [...series.points].sort((a, b) =>
        (a.date ?? "").localeCompare(b.date ?? ""),
      ),
    })),
    observations: [...new Set(observations)],
    coachEvaluation: [...new Set(coachEvaluation)],
  };
}

export function reportPresentation(model: ReportViewModel): ReportPresentation {
  const { evidence: _evidence, ...identity } = model;
  void _evidence;
  const data = model.presentationData ?? legacyPresentationData(model);
  return {
    ...identity,
    periodLabel: friendlyPeriod(model.period),
    reviewDateLabel: formatRecordedDate(model.reviewDate),
    playerInitials: model.player
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toLocaleUpperCase(),
    attendance: data.attendance,
    activityCards: model.activities.map((a) => ({
      ...a,
      illustrationKey: activityIllustration(a.name),
    })),
    measurementSeries: structuredClone(data.measurementSeries),
    observations: [...data.observations],
    coachEvaluation: [...data.coachEvaluation],
  };
}

/** Public read projection only; the original approved snapshot stays in storage. */
export function parentReportSnapshot(model: ReportViewModel): ReportViewModel {
  const presentation = reportPresentation(model);
  return {
    ...model,
    activities: model.activities.map(({ drillId: _id, ...activity }) => {
      void _id;
      return activity;
    }),
    evidence: [
      ...presentation.observations.map((text) => ({
        text,
        source: "Coach-reviewed observation",
      })),
      ...presentation.coachEvaluation.map((text) => ({
        text,
        source: "Coach reviewed commentary",
      })),
    ],
    presentationData: {
      version: 1,
      attendance: presentation.attendance,
      measurementSeries: presentation.measurementSeries,
      observations: presentation.observations,
      coachEvaluation: presentation.coachEvaluation,
    },
  };
}
