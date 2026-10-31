import type { DemoState } from "@/domain/entities";
import type {
  ParentDevelopmentUpdate,
  ParentUpdateSource,
} from "@/domain/parent-development";
import { getPlan, publicPlan } from "@/services/development/plans";
import { orchestratePublication } from "./in-app-provider";
export type Actor = { role: "coach" | "owner" | "parent"; id: string };
export function assertStaff(state: DemoState, actor: Actor, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  if (
    !player ||
    actor.role === "parent" ||
    (actor.role === "coach" && getPlan(state, playerId).coachId !== actor.id)
  )
    throw new Error("Staff access denied");
  return player;
}
export function updateSources(
  state: DemoState,
  playerId: string,
): ParentUpdateSource[] {
  const plan = getPlan(state, playerId);
  const player = state.players.find((p) => p.id === playerId)!;
  const sources: ParentUpdateSource[] = [
    {
      id: plan.id,
      kind: "PLAN",
      label: "Active development plan",
      text: JSON.stringify(publicPlan(plan)),
    },
  ];
  state.goals
    .filter((g) => g.playerId === playerId && plan.goalIds.includes(g.id))
    .forEach((g) =>
      sources.push({
        id: g.id,
        kind: "GOAL",
        label: "Development goal",
        text: `${g.title} · ${g.criteria} · ${g.reviewDate}`,
      }),
    );
  plan.assignments.forEach((a) => {
    const d = state.drills.find((d) => d.id === a.drillId);
    if (d)
      sources.push({
        id: d.id,
        kind: "DRILL",
        label: "Assigned drill",
        text: `${d.name} · ${a.reason} · ${a.cue} · ${a.successCriteria} · ${a.evidenceMethod}`,
      });
  });
  state.sessions
    .filter((s) => s.squad === player.squad && s.status !== "Draft")
    .forEach((s) =>
      sources.push({
        id: s.id,
        kind: "SESSION",
        label: "Session record",
        text: `${s.title} · ${s.date} ${s.time} · ${s.focuses[playerId] ?? "Objective not recorded"}`,
      }),
    );
  state.attendance
    .filter((a) => a.playerId === playerId)
    .forEach((a) =>
      sources.push({
        id: a.id,
        kind: "ATTENDANCE",
        label: "Attendance record",
        text: `${a.sessionId} · ${a.status} · ${a.reason || "No reason recorded"}`,
      }),
    );
  state.evidence
    .filter(
      (e) =>
        e.playerId === playerId &&
        e.status === "Coach Reviewed" &&
        e.type !== "Missing / Unclear",
    )
    .forEach((e) =>
      sources.push({
        id: e.id,
        kind: "EVIDENCE",
        label: "Coach-reviewed evidence",
        text: `${e.title} · ${e.note} · bookmarks ${e.bookmarks.join(", ")}s`,
        evidenceType: e.type,
      }),
    );
  state.observations
    .filter(
      (o) =>
        o.playerId === playerId &&
        o.public &&
        state.evidence.some(
          (e) =>
            e.playerId === playerId &&
            e.sessionId === o.sessionId &&
            e.status === "Coach Reviewed",
        ),
    )
    .forEach((o) =>
      sources.push({
        id: o.id,
        kind: "OBSERVATION",
        label: "Reviewed public observation",
        text: o.note,
        evidenceType: "Coach Observation",
      }),
    );
  state.reports
    .filter((r) => r.playerId === playerId && r.status === "Approved")
    .forEach((r) =>
      sources.push({
        id: r.id,
        kind: "REPORT",
        label: "Approved report card",
        text: `${r.period} · ${JSON.stringify(r.sections)}`,
      }),
    );
  state.nutritionGuidance
    .filter((g) => g.approval === "ACADEMY_APPROVED" && !g.personalised)
    .forEach((g) =>
      sources.push({
        id: g.id,
        kind: "NUTRITION",
        label: "Academy nutrition guideline",
        text: `${g.body}\n${g.disclaimer}`,
      }),
    );
  state.parentUpdates
    .filter((u) => u.playerId === playerId && u.approvalStatus === "APPROVED")
    .forEach((u) =>
      sources.push({
        id: u.id,
        kind: "PREVIOUS_UPDATE",
        label: "Previous approved update",
        text: u.approvalSnapshot?.body ?? "",
      }),
    );
  return sources;
}
export function draftParentUpdate(
  state: DemoState,
  actor: Actor,
  playerId: string,
): ParentDevelopmentUpdate {
  const player = assertStaff(state, actor, playerId),
    plan = getPlan(state, playerId),
    at = new Date().toISOString();
  const result: ParentDevelopmentUpdate = {
    id: crypto.randomUUID(),
    academyId: player.academyId,
    sportId: player.sportId,
    playerId,
    guardianId: player.guardianId,
    coachId: plan.coachId,
    developmentPlanId: plan.id,
    updateType: "NEW_DEVELOPMENT_PLAN",
    focusAreas: plan.focusAreas,
    assignedDrillIds: plan.assignments.map((a) => a.drillId),
    coachReason: plan.reason,
    successCriteria: plan.assignments.map((a) => a.successCriteria).join("\n"),
    homePractice: plan.homePractice,
    nutritionGuidanceId: "",
    reviewDate: plan.reviewDate,
    nextGoal: plan.nextGoal,
    sourceRecords: updateSources(state, playerId).filter(
      (s) => s.kind !== "NUTRITION",
    ),
    messageBody: "",
    messageVersion: 1,
    approvalStatus: "DRAFT",
    inAppPublicationStatus: "UNPUBLISHED",
    externalDeliveryStatus: "NOT_SENT",
    createdAt: at,
    updatedAt: at,
    history: [],
  };
  result.messageBody = parentMessage(state, result);
  return result;
}
export function parentMessage(
  state: DemoState,
  update: ParentDevelopmentUpdate,
): string {
  const player = state.players.find((p) => p.id === update.playerId)!;
  const guardian = state.guardians.find((g) => g.id === update.guardianId)!;
  const plan = getPlan(state, player.id);
  const header = `Hi ${guardian.name},\n${player.name} — ${update.updateType.replaceAll("_", " ")}\n`;
  if (update.updateType === "NUTRITION_HYDRATION") {
    const guidance = state.nutritionGuidance.find(
      (g) =>
        g.id === update.nutritionGuidanceId &&
        g.approval === "ACADEMY_APPROVED" &&
        !g.personalised,
    );
    return `${header}${guidance ? `${guidance.body}\n${guidance.disclaimer}` : "Select an academy-approved guideline."}\nPlease let us know about any allergies, dietary restrictions or health-related requirements through your private profile note.\n— ${state.academy.name}`;
  }
  const drills = update.assignedDrillIds
    .map((id) => {
      const drill = state.drills.find((d) => d.id === id);
      const a = plan.assignments.find((a) => a.drillId === id);
      return `${drill?.name}: ${a?.reason || drill?.objective || "Purpose not recorded"}`;
    })
    .join("\n");
  const evidence = update.sourceRecords
    .filter((s) => ["EVIDENCE", "OBSERVATION", "ATTENDANCE"].includes(s.kind))
    .map((s) => `[${s.evidenceType ?? s.kind} · ${s.id}] ${s.text}`)
    .join("\n");
  return `${header}Current focus: ${update.focusAreas.join(", ")}\nWhy selected: ${update.coachReason}\nPlanned drills:\n${drills}\nTraining frequency: ${plan.frequency}\nWhat the coach will observe:\n${update.successCriteria}\nReviewed progress: ${plan.progress}\n${evidence || "NEEDS_MORE_EVIDENCE: no reviewed observation selected."}\nOptional home practice: ${update.homePractice || "Not assigned"}\nNext goal: ${update.nextGoal}\nNext review: ${update.reviewDate}\nThis plan is personalised for ${player.name} and may be adjusted based on reviewed training evidence. You can reply privately in Sportozen Academy.\n— ${state.academy.name}`;
}
export function validateParentUpdate(
  state: DemoState,
  u: ParentDevelopmentUpdate,
) {
  if (
    state.players.some(
      (p) => p.id !== u.playerId && u.messageBody.includes(p.name),
    ) ||
    state.guardians.some(
      (g) => g.id !== u.guardianId && u.messageBody.includes(g.name),
    )
  )
    throw new Error(
      "Only the selected child and guardian may appear in this update",
    );
  const player = state.players.find(
    (p) =>
      p.id === u.playerId &&
      p.academyId === u.academyId &&
      p.sportId === u.sportId,
  );
  if (
    !player ||
    player.guardianId !== u.guardianId ||
    !state.guardians.some(
      (g) => g.id === u.guardianId && g.playerIds.includes(u.playerId),
    )
  )
    throw new Error("Player and guardian must match");
  const plan = getPlan(state, player.id);
  if (
    u.developmentPlanId !== plan.id ||
    u.coachId !== plan.coachId ||
    !u.reviewDate ||
    u.reviewDate < plan.startDate ||
    !u.messageBody.trim() ||
    !u.focusAreas.length
  )
    throw new Error(
      "Complete the current plan, focus, message and review date",
    );
  if (
    u.assignedDrillIds.some(
      (id) => !plan.assignments.some((a) => a.drillId === id),
    ) ||
    u.focusAreas.some((f) => !plan.focusAreas.includes(f))
  )
    throw new Error("Focus and drills must be assigned in the current plan");
  const available = updateSources(state, player.id);
  if (
    !u.sourceRecords.some((s) => s.kind === "PLAN") ||
    u.sourceRecords.some(
      (s) =>
        !available.some(
          (a) => a.id === s.id && a.kind === s.kind && a.text === s.text,
        ),
    )
  )
    throw new Error(
      "Source records changed or are not authorised. Refresh sources before review",
    );
  if (
    u.assignedDrillIds.some(
      (id) => !u.sourceRecords.some((s) => s.kind === "DRILL" && s.id === id),
    )
  )
    throw new Error("Select source records for every assigned drill");
  if (
    u.updateType === "PROGRESS_UPDATE" &&
    !u.sourceRecords.some((s) => ["EVIDENCE", "OBSERVATION"].includes(s.kind))
  )
    throw new Error("Progress statements require reviewed evidence");
  if (
    /weight[ -]?loss|calorie|supplement|prescri|diagnos|treat(?:ment)?|clinical diet|injury recovery diet|medical diet|keto/i.test(
      u.messageBody,
    )
  )
    throw new Error(
      "Medical diets, restrictions, supplements and clinical recommendations are not supported",
    );
  if (
    u.updateType === "NUTRITION_HYDRATION" &&
    (!u.nutritionGuidanceId ||
      !u.sourceRecords.some(
        (s) => s.kind === "NUTRITION" && s.id === u.nutritionGuidanceId,
      ) ||
      u.messageBody !== parentMessage(state, u))
  )
    throw new Error(
      "Nutrition updates must use unchanged academy-approved general guidance and its disclaimer",
    );
}
export function saveParentUpdate(
  state: DemoState,
  actor: Actor,
  edited: ParentDevelopmentUpdate,
  submit = false,
): DemoState {
  assertStaff(state, actor, edited.playerId);
  const current = state.parentUpdates.find((u) => u.id === edited.id);
  if (submit) validateParentUpdate(state, edited);
  const version = (current?.messageVersion ?? 0) + 1,
    at = new Date().toISOString();
  const update: ParentDevelopmentUpdate = {
    ...structuredClone(edited),
    messageVersion: version,
    approvalStatus: submit ? "PENDING_APPROVAL" : "DRAFT",
    inAppPublicationStatus: "UNPUBLISHED",
    externalDeliveryStatus: "NOT_SENT",
    approvedAt: undefined,
    publishedAt: undefined,
    approvalSnapshot: undefined,
    updatedAt: at,
    history: [
      ...(current?.history ?? []),
      {
        at,
        actor: actor.id,
        action: submit
          ? "Submitted for review"
          : "Draft saved; approval cleared",
        version,
      },
    ],
  };
  return {
    ...state,
    parentUpdates: [
      ...state.parentUpdates.filter((u) => u.id !== update.id),
      update,
    ],
  };
}
export function reviewParentUpdate(
  state: DemoState,
  actor: Actor,
  id: string,
  approve: boolean,
  verified: boolean,
): DemoState {
  const current = state.parentUpdates.find((u) => u.id === id);
  if (!current) throw new Error("Update not found");
  assertStaff(state, actor, current.playerId);
  if (current.approvalStatus !== "PENDING_APPROVAL")
    throw new Error("Only pending updates may be reviewed");
  if (approve && !verified)
    throw new Error("Confirm every source verification item");
  if (approve) validateParentUpdate(state, current);
  const at = new Date().toISOString(),
    update: ParentDevelopmentUpdate = {
      ...current,
      approvalStatus: approve ? "APPROVED" : "REJECTED",
      approvedAt: approve ? at : undefined,
      approvalSnapshot: approve
        ? {
            at,
            actor: actor.id,
            action: "Approved after source verification",
            version: current.messageVersion,
            body: current.messageBody,
            sources: structuredClone(current.sourceRecords),
            plan: publicPlan(getPlan(state, current.playerId)),
          }
        : undefined,
      history: [
        ...current.history,
        {
          at,
          actor: actor.id,
          action: approve ? "Approved" : "Rejected",
          version: current.messageVersion,
        },
      ],
    };
  const next = {
    ...state,
    parentUpdates: state.parentUpdates.map((u) => (u.id === id ? update : u)),
  };
  return approve ? orchestratePublication(next, update) : next;
}
