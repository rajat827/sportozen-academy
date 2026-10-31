import type { DemoState, DevelopmentPlan } from "@/domain/entities";
import type {
  PlayerDevelopmentPlan,
  PublicPlan,
  UpdateType,
} from "@/domain/parent-development";
export const updateTypes: UpdateType[] = [
  "NEW_DEVELOPMENT_PLAN",
  "WEEKLY_TRAINING_FOCUS",
  "SESSION_SUMMARY",
  "DRILL_ASSIGNMENT",
  "HOME_PRACTICE",
  "PROGRESS_UPDATE",
  "NEXT_GOAL",
  "NUTRITION_HYDRATION",
  "FITNESS_RECOVERY",
  "GENERAL_COACH_UPDATE",
];
export const planStatuses = [
  "DRAFT",
  "ACTIVE",
  "NEEDS_REVIEW",
  "CONTINUE",
  "ADAPT",
  "COMPLETED",
  "PAUSED",
] as const;
export const progressStates = [
  "NOT_STARTED",
  "INTRODUCED",
  "DEVELOPING",
  "IMPROVING",
  "CONSISTENT",
  "READY_FOR_NEXT_STAGE",
  "NEEDS_MORE_EVIDENCE",
  "NEEDS_REVIEW",
  "COMPLETED",
  "PAUSED",
] as const;
export function getPlan(
  state: DemoState,
  playerId: string,
): PlayerDevelopmentPlan {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const existing:
    (DevelopmentPlan & Partial<PlayerDevelopmentPlan>) | undefined =
    state.plans.find((p) => p.playerId === playerId);
  return {
    id: `${playerId}-plan`,
    academyId: player.academyId,
    sportId: player.sportId,
    playerId,
    coachId: state.squads.find((s) => s.name === player.squad)?.coachId ?? "c1",
    goalIds: state.goals
      .filter((g) => g.playerId === playerId)
      .map((g) => g.id),
    weeklyPlan: "",
    focusAreas: [],
    reason: "",
    assignments: [],
    frequency: "Two academy sessions per week",
    startDate: "2026-10-07",
    reviewDate: "2026-10-21",
    period: "October 2026",
    coachNotes: "",
    parentSummary: "",
    homePractice: "",
    nextGoal: "Review the current focus before setting the next goal.",
    progress: "NEEDS_MORE_EVIDENCE",
    status: "DRAFT",
    ...existing,
  };
}
export function publicPlan(plan: PlayerDevelopmentPlan): PublicPlan {
  const { coachNotes: privateNotes, ...visible } = plan;
  void privateNotes;
  return structuredClone(visible);
}
export function savePlayerPlan(
  state: DemoState,
  plan: PlayerDevelopmentPlan,
): DemoState {
  const player = state.players.find(
    (p) =>
      p.id === plan.playerId &&
      p.academyId === plan.academyId &&
      p.sportId === plan.sportId,
  );
  if (
    !player ||
    !state.coaches.some(
      (c) => c.id === plan.coachId && c.academyId === plan.academyId,
    )
  )
    throw new Error("Invalid player or coach");
  if (plan.reviewDate < plan.startDate)
    throw new Error("Review date must follow the start date");
  if (
    plan.assignments.some(
      (a) =>
        !state.drills.some(
          (d) =>
            d.id === a.drillId &&
            d.sportId === plan.sportId &&
            d.academyId === plan.academyId,
        ),
    )
  )
    throw new Error("Drills must belong to this academy and sport");
  return {
    ...state,
    plans: [
      ...state.plans.filter((p) => p.playerId !== plan.playerId),
      structuredClone(plan),
    ],
  };
}
