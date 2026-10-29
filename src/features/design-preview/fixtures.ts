import type { ReportViewModel } from "@/domain/report";
export interface PreviewAcademy {
  id: string;
  name: string;
  monogram: string;
  accent: string;
  country: string;
  timezone: string;
  currency: "INR" | "GBP";
  symbol: string;
  monthlyFee: number;
  discount: number;
  partPayment: number;
  softwareFee: number;
  venue: string;
}
export function readableAccent(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return false;
  const channels = [1, 3, 5]
    .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return (
    1.05 /
      (0.2126 * channels[0] +
        0.7152 * channels[1] +
        0.0722 * channels[2] +
        0.05) >=
    4.5
  );
}
export function resolvedAcademy(
  id: string,
  profiles: Record<string, Record<string, string>>,
): PreviewAcademy {
  const base = previewAcademies.find((a) => a.id === id) ?? previewAcademies[0],
    profile = profiles[id];
  return {
    ...base,
    name: profile?.["Academy name"] ?? base.name,
    accent:
      profile?.["Brand accent"] && readableAccent(profile["Brand accent"])
        ? profile["Brand accent"]
        : base.accent,
  };
}
export const previewAcademies: PreviewAcademy[] = [
  {
    id: "riverside",
    name: "Riverside Football Academy",
    monogram: "RF",
    accent: "#008463",
    country: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    symbol: "₹",
    monthlyFee: 4500,
    discount: 500,
    partPayment: 1500,
    softwareFee: 2400,
    venue: "North pitch · Riverside ground",
  },
  {
    id: "harbour",
    name: "Harbour Football Academy",
    monogram: "HF",
    accent: "#126aa2",
    country: "United Kingdom",
    timezone: "Europe/London",
    currency: "GBP",
    symbol: "£",
    monthlyFee: 80,
    discount: 10,
    partPayment: 25,
    softwareFee: 45,
    venue: "Harbour training ground · Pitch 2",
  },
];
export const previewPlayers = [
  {
    id: "aarav",
    name: "Aarav Shah",
    initials: "AS",
    category: "U10",
    batch: "U10 Foundations",
    guardian: "Neha Shah",
    goal: "Receive the ball into useful space",
    focus: "Open body position before receiving",
  },
  {
    id: "isha",
    name: "Isha Kapoor",
    initials: "IK",
    category: "U10",
    batch: "U10 Foundations",
    guardian: "Meera Kapoor",
    goal: "Look up before the next pass",
    focus: "",
  },
  {
    id: "leo",
    name: "Leo Shah",
    initials: "LS",
    category: "U12",
    batch: "U12 Development",
    guardian: "Neha Shah",
    goal: "Choose a simple passing option",
    focus: "Look before receiving",
  },
];
export function weekPlanContext(
  fields: Record<string, Record<string, string>>,
  players: PreviewPlayer[] = previewPlayers,
) {
  const saved = fields["weekly-context"],
    batch = saved?.batch ?? "U10 Foundations",
    week = saved?.week ?? "2026-10-19";
  const start = new Date(`${week}T12:00:00Z`),
    safe = Number.isFinite(start.getTime())
      ? start
      : new Date("2026-10-19T12:00:00Z");
  const day = (offset: number) => {
    const value = new Date(safe);
    value.setUTCDate(value.getUTCDate() + offset);
    return {
      number: String(value.getUTCDate()),
      label: new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(value),
    };
  };
  return {
    batch,
    week,
    first: day(1),
    second: day(3),
    notification: day(-1),
    time: batch === "U12 Development" ? "18:45–19:45" : "17:30–18:30",
    playerIds: players.filter((p) => p.batch === batch).map((p) => p.id),
  };
}

/** The preview has two recorded slots in the current batch plan. Navigation
 * metadata selects one of those slots; it cannot invent a different session. */
export function sessionViewContext(
  fields: Record<string, Record<string, string>>,
  players: PreviewPlayer[],
  academyId: string,
  playerId?: string,
) {
  const context = weekPlanContext(fields, players);
  const parsedWeek = new Date(`${context.week}T12:00:00Z`);
  const validWeek =
    /^\d{4}-\d{2}-\d{2}$/.test(context.week) &&
    Number.isFinite(parsedWeek.getTime()) &&
    parsedWeek.toISOString().slice(0, 10) === context.week;
  const week = validWeek ? parsedWeek : new Date("2026-10-19T12:00:00Z");
  const saved = fields["session-context"];
  const requestedSlot = saved?.slot === "second" ? "second" : "first";
  const dateFor = (slot: "first" | "second") => {
    const date = new Date(week);
    date.setUTCDate(date.getUTCDate() + (slot === "first" ? 1 : 3));
    return date.toISOString().slice(0, 10);
  };
  const requestedDate = dateFor(requestedSlot);
  const [start, end] = context.time.split("–");
  const selected =
    !!saved &&
    validWeek &&
    previewAcademies.some((academy) => academy.id === academyId) &&
    context.playerIds.length > 0 &&
    (!playerId || context.playerIds.includes(playerId)) &&
    saved.academyId === academyId &&
    saved.batch === context.batch &&
    (saved.slot === "first" || saved.slot === "second") &&
    saved.date === requestedDate &&
    saved.id === `${academyId}:${context.batch}:${requestedDate}` &&
    saved.start === start &&
    saved.end === end &&
    fields[`home-session:${saved.id}`]?.status !== "Cancelled" &&
    fields[`home-session:${saved.id}`]?.status !== "Completed";
  const slot = selected ? requestedSlot : "first";
  return {
    batch: context.batch,
    time: context.time,
    slot,
    date: dateFor(slot),
    label: context[slot].label,
    number: context[slot].number,
    id: `${academyId}:${context.batch}:${dateFor(slot)}`,
    status:
      fields[`home-session:${academyId}:${context.batch}:${dateFor(slot)}`]
        ?.status === "In progress"
        ? "In progress"
        : "Scheduled",
    selected,
    stale: !!saved && !selected,
  };
}

export const previewDrills = [
  {
    id: "receive",
    name: "Receive and turn",
    skill: "Receiving",
    minutes: 15,
    purpose: "Practise an open body position and a first touch into space",
    cue: "Look, open, receive",
    setup: "Pairs, one ball, two gates 5 metres apart",
    instructions:
      "Pass through a gate. Receiver checks the space, opens their body and takes a touch toward the free gate. Swap roles after each turn.",
    adaptation:
      "Widen the gate or reduce passing distance. Optional extension: choose between two gates.",
  },
  {
    id: "pass",
    name: "Pass and move",
    skill: "Passing",
    minutes: 20,
    purpose: "Practise a useful passing angle after moving",
    cue: "Pass, find space, show",
    setup: "Groups of three, a 10-metre triangle, one ball",
    instructions:
      "Pass to a teammate and move to the open cone. Receiver looks up before returning the pass.",
    adaptation: "Shorten the triangle; allow an extra touch before passing.",
  },
  {
    id: "game",
    name: "Small-sided gate game",
    skill: "Decision making",
    minutes: 20,
    purpose: "Use receiving and passing choices in a small-sided game",
    cue: "Find the free gate",
    setup: "3 v 3 on a 20 × 15 metre area with four gates",
    instructions:
      "Play through a free gate to a teammate. Coach pauses only to clarify a task; no player rankings are recorded.",
    adaptation: "Add a neutral support player or use a wider gate.",
  },
];
export type PreviewPlayer = (typeof previewPlayers)[number];
export function reportFixture(
  academy: PreviewAcademy,
  playerId: string,
  variant: "default" | "long" | "limited" = "default",
  commentary = "The first touch moved into useful space during the paired task. Continue observing this in small-sided play.",
  player?: PreviewPlayer,
): ReportViewModel {
  const p =
    player ??
    previewPlayers.find((p) => p.id === playerId) ??
    previewPlayers[0];
  const limited = variant === "limited" || p.id !== "aarav";
  return {
    reportId: `preview-${academy.id}-${p.id}-${variant}`,
    playerId: p.id,
    academy: academy.name,
    brandAccent: academy.accent,
    player: p.name,
    period: "September 2026",
    status: "Approved",
    externalDelivery: "Not sent",
    demo: true,
    sport: "Football",
    squad: p.batch,
    coach: "Maya Rao",
    reviewDate: "2026-10-31",
    focus: p.goal,
    reviewedReason: "Coach-reviewed September source records",
    practised: limited
      ? "Completed participation is not yet recorded."
      : "Receive and turn; Pass and move",
    activities: limited
      ? []
      : previewDrills.slice(0, 2).map((d) => ({
          name: d.name,
          purpose: d.purpose,
          cue: d.cue,
          drillId: d.id,
        })),
    evidence: limited
      ? [
          {
            text: "Attendance remains unmarked. No reviewed parent-eligible observations are recorded. No result or percentage is inferred.",
            source: "Missing / Unclear",
          },
        ]
      : [
          {
            text: "3 completed roster sessions: 2 present, 0 absent, 0 excused, 1 unmarked. Attendance basis: present / (present + absent) = 2/2. The unmarked session is excluded from this basis.",
            source: "Fictional September session and attendance records",
            reference: "SEPT-01 · SEPT-08 · SEPT-15",
          },
          {
            text: commentary,
            source: "Coach observation reviewed by Maya Rao · 30 September",
            reference: "OBS-SEPT-08 · paired receiving task · widened gate",
          },
        ],
    nextStep: limited
      ? "Record the next session and review the observations before setting an individual next step."
      : "Repeat the receiving task and observe the first touch before the next pass.",
    observationCriteria: limited
      ? undefined
      : "First touch goes toward the free gate",
    note:
      variant === "long"
        ? Array.from(
            { length: 12 },
            () =>
              "Recorded coaching context: the paired receiving task used a widened gate and a short passing distance. The next session will retain these conditions before extending the task. This commentary explains the same source observation; it does not add another observation or an improvement claim.",
          ).join("\n\n")
        : "Reviewed by Maya Rao on 30 September. Keep practice optional, short and comfortable. Ask the coach if an instruction needs clarification.",
  };
}
export const money = (academy: PreviewAcademy, amount: number) =>
  `${academy.symbol}${amount.toLocaleString(academy.currency === "INR" ? "en-IN" : "en-GB")}`;
