import type { DemoState, Drill } from "@/domain/entities";
import { getPlan, publicPlan } from "@/services/development/plans";
import {
  draftParentUpdate,
  parentMessage,
} from "@/services/communication/parent-updates";
export function personalisedFixtures(state: DemoState): DemoState {
  const names = [
    "Both-foot close-control touches",
    "Cone slalom",
    "Change-direction-and-finish",
    "One-versus-one attacking drill",
  ];
  const drills: Drill[] = names.map((name, i) => ({
    id: `personal-drill-${i + 1}`,
    academyId: state.academy.id,
    sportId: "football",
    name,
    skill: i < 2 ? "Dribbling" : "Finishing",
    ageGroup: "U-13",
    difficulty: "Developing",
    duration: 8,
    players: "Pairs",
    equipment: "Ball, cones and safe marked space",
    objective:
      i < 2
        ? "Keep the ball close while changing direction using both feet"
        : "Control the ball before finishing with fewer unnecessary touches",
    instructions: [
      "Coach demonstrates at a comfortable pace",
      "Practise in a safe marked space with rest breaks",
      "Repeat comparable attempts and record observations",
    ],
    coachingPoints: [
      "Keep touches close",
      "Look up between touches",
      "Set body position before finishing",
    ],
    progression: "Add light coach-controlled pressure",
    regression: "Slow down and increase space",
    evidenceMethod:
      "Coach records close-control attempts in comparable practice conditions",
  }));
  state = { ...state, drills: [...state.drills, ...drills] };
  const plan = {
    ...getPlan(state, "p1"),
    focusAreas: ["Dribbling", "Shooting"],
    reason:
      "Aarav is confident carrying the ball forward but sometimes loses close control while changing direction before shooting.",
    assignments: drills.map((d) => ({
      drillId: d.id,
      reason: d.objective,
      cue: d.coachingPoints.join("; "),
      successCriteria:
        "Coach observes close turns, both-foot use and body position before finishing in comparable attempts",
      evidenceMethod: d.evidenceMethod,
    })),
    frequency: "Included in two sessions per week",
    startDate: "2026-10-07",
    reviewDate: "2026-10-21",
    period: "October 2026 · four comparable sessions",
    parentSummary:
      "Close-control dribbling and finishing after changing direction",
    homePractice:
      "Optional: five minutes of comfortable both-foot touches in a safe open space, supervised where appropriate. Stop if uncomfortable.",
    progress: "INTRODUCED" as const,
    status: "ACTIVE" as const,
    nextGoal: "Apply close control before finishing under light pressure",
    coachNotes:
      "Private working note: collect comparable attempts before adapting the plan.",
  };
  state = {
    ...state,
    plans: state.plans.map((p) => (p.playerId === "p1" ? plan : p)),
    players: state.players.map((p) =>
      p.id === "p1" ? { ...p, goal: plan.parentSummary } : p,
    ),
    goals: state.goals.map((g) =>
      g.id === "p1-goal1"
        ? {
            ...g,
            title: "Close-control dribbling and finishing",
            criteria: plan.assignments[0].successCriteria,
            reviewDate: plan.reviewDate,
          }
        : g,
    ),
    evidence: state.evidence.map((e) =>
      e.id === "e1"
        ? {
            ...e,
            title: "Aarav · close-control practice",
            type: "Coach Observation",
            note: "Kept the ball close during three of six direction-change attempts in introductory practice. More comparable sessions are needed before judging consistency.",
          }
        : e,
    ),
    observations: state.observations.map((o) =>
      o.id === "o1"
        ? {
            ...o,
            note: "Kept the ball close during three of six introductory direction-change attempts; further comparable evidence is needed.",
          }
        : o,
    ),
    sessions: state.sessions.map((s) =>
      s.id === "s1"
        ? {
            ...s,
            title: "Dribbling and Finishing",
            drillIds: drills.map((d) => d.id),
            focuses: {
              ...s.focuses,
              p1: "Keep close control while changing direction before shooting",
              p2: "Use the weaker foot during dribbling",
              p3: "Release the shot within three touches",
              p4: "Recover into position after the attacking action",
            },
          }
        : s,
    ),
    reports: state.reports.map((r) =>
      r.id === "r1"
        ? {
            ...r,
            period: "October 2026",
            sections: [
              { question: "What was practised?", answer: plan.parentSummary },
              {
                question: "What does reviewed evidence show?",
                answer:
                  "Coach observation e1: close control in three of six introductory attempts; more comparable sessions are needed.",
              },
              { question: "What comes next?", answer: plan.nextGoal },
            ],
          }
        : r,
    ),
  };
  state.personalisations = state.players
    .filter((p) => p.squad === "U-13")
    .map((p, i) => ({
      id: `s1-${p.id}-objective`,
      academyId: p.academyId,
      sportId: p.sportId,
      sessionId: "s1",
      playerId: p.id,
      goalId: state.goals.find((g) => g.playerId === p.id)!.id,
      focus: state.sessions.find((s) => s.id === "s1")!.focuses[p.id],
      drillId: drills[i % 4].id,
      cue: drills[i % 4].coachingPoints[0],
      evidenceMethod: drills[i % 4].evidenceMethod,
      reviewStatus: "NEEDS_REVIEW",
    }));
  const u = draftParentUpdate(state, { role: "coach", id: "c1" }, "p1"),
    at = "2026-10-07T09:00:00Z";
  u.id = "aarav-initial-update";
  u.createdAt = at;
  u.updatedAt = at;
  u.approvalStatus = "APPROVED";
  u.inAppPublicationStatus = "PUBLISHED";
  u.approvedAt = at;
  u.publishedAt = at;
  u.messageBody = parentMessage(state, u);
  u.approvalSnapshot = {
    at,
    actor: "c1",
    action: "Fictional approved starting plan",
    version: 1,
    body: u.messageBody,
    sources: structuredClone(u.sourceRecords),
    plan: publicPlan(plan),
  };
  u.history = [
    {
      at,
      actor: "c1",
      action: "Fictional plan approved and published in app",
      version: 1,
    },
  ];
  state.parentUpdates = [u];
  state.conversations = [
    {
      id: "aarav-development-thread",
      academyId: state.academy.id,
      playerId: "p1",
      guardianId: "g1",
      coachId: "c1",
      planId: plan.id,
      updateId: u.id,
      topic: "PLAYER_DEVELOPMENT",
      title: "Aarav's development plan",
      status: "OPEN",
      participants: [
        { id: "g1", role: "parent" },
        { id: "c1", role: "coach" },
      ],
      history: [
        {
          at,
          actor: "c1",
          action: "Fictional approved plan published privately in app",
        },
      ],
    },
  ];
  state.conversationMessages = [
    {
      id: "initial-parent-plan",
      academyId: state.academy.id,
      conversationId: "aarav-development-thread",
      body: u.messageBody,
      senderRole: "coach",
      senderId: "c1",
      createdAt: at,
    },
  ];
  return state;
}
