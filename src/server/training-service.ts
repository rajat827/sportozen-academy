import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type {
  TrainingKind,
  TrainingRecords,
  FootballSession,
  FootballEvidence,
} from "@/domain/training";
import type {
  WorkspacePlan,
  WorkspaceReport,
  WorkspaceRecords,
} from "@/domain/workspace";
import {
  evidenceInput,
  resolveSessionTime,
  measurementText,
  sessionDraftInput,
} from "@/services/training-rules";
import {
  sessionConflicts,
  venueHierarchyError,
} from "@/services/session-scheduling";
import { workspaceRepository as repo } from "./workspace-repository";
import { inPeriod } from "@/services/communication/period-rules";
import { atomic, database, audit } from "./database";
import { WorkspaceError } from "./auth";
import { verifyPlaceConfirmation } from "./google-places";
import {
  requireRole,
  requireModule,
  requireSport,
  requirePlayer,
  visibleRecord,
  type WorkspaceAccess,
} from "./workspace-access";
const id = z.string().min(1).max(100),
  text = z.string().trim().min(1).max(2000);
const envelope = z.object({
  requestId: z.uuid(),
  action: z.enum([
    "squad",
    "venue",
    "session",
    "reschedule",
    "copy",
    "objective",
    "status",
    "attendance",
    "evidence",
    "review",
    "report",
    "nextStep",
  ]),
  id: id.optional(),
  expectedVersion: z.number().int().nonnegative().default(0),
  data: z.unknown(),
});
const staff = ["OWNER", "ADMIN", "COACH"] as const;
function fail(message: string, status = 400): never {
  throw new WorkspaceError(status, message);
}
export function authorisedSession(
  ctx: WorkspaceAccess,
  sessionId: string,
): FootballSession {
  requireRole(ctx, [...staff]);
  requireModule(ctx, "session");
  requireSport(ctx, "football");
  const session = repo.find(ctx.academy.id, "session", sessionId);
  if (
    !session ||
    session.sportId !== "football" ||
    (ctx.membership.role === "COACH" &&
      (!session.coachIds.includes(ctx.user.id) ||
        session.roster.some(
          (p) =>
            repo.find(ctx.academy.id, "player", p.playerId)?.coachId !==
            ctx.user.id,
        )))
  )
    fail("Session is not available for your coaching assignment.", 404);
  return session;
}
function scoped<K extends TrainingKind>(
  ctx: WorkspaceAccess,
  kind: K,
  recordId: string,
): TrainingRecords[K] {
  const r = repo.find(ctx.academy.id, kind, recordId);
  if (!r) fail("Record unavailable.", 404);
  if ("sessionId" in r) authorisedSession(ctx, r.sessionId);
  if ("playerId" in r) requirePlayer(ctx, r.playerId);
  return r;
}
function playerInSession(
  ctx: WorkspaceAccess,
  s: FootballSession,
  playerId: string,
) {
  requirePlayer(ctx, playerId);
  if (!s.roster.some((p) => p.playerId === playerId))
    fail("Player is not in the historical session roster.");
}
function sessionTimes(startLocal: string, endLocal: string, timezone: string) {
  let startAt: string, endAt: string;
  try {
    startAt = resolveSessionTime(startLocal, timezone);
    endAt = resolveSessionTime(endLocal, timezone);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid session time.");
  }
  if (endAt <= startAt || Date.parse(endAt) - Date.parse(startAt) > 8 * 3600000)
    fail("Session must end after starting, within eight hours.");
  return { startAt, endAt };
}
function assertAssignments(ctx: WorkspaceAccess, session: FootballSession) {
  const branch = visibleRecord(ctx, "branch", session.branchId);
  if (session.timezone !== branch.timezone)
    fail("Use the recorded branch time zone.");
  if (
    session.venueId &&
    scoped(ctx, "venue", session.venueId).branchId !== session.branchId
  )
    fail("Venue must belong to this branch.");
  if (
    ctx.membership.role === "COACH" &&
    !session.coachIds.includes(ctx.user.id)
  )
    fail("Assign yourself to the session.", 403);
  for (const coachId of session.coachIds) {
    const member = repo.membership(ctx.academy.id, coachId);
    if (
      !member ||
      !staff.includes(member.role as (typeof staff)[number]) ||
      (member.sportIds.length && !member.sportIds.includes("football"))
    )
      fail("Choose active academy football coaches.");
    if (
      member.role === "COACH" &&
      session.roster.some(
        (player) =>
          repo.find(ctx.academy.id, "player", player.playerId)?.coachId !==
          coachId,
      )
    )
      fail(
        "Every assigned coach must be authorised for every player in the session roster.",
      );
  }
  session.roster.forEach((player) => requirePlayer(ctx, player.playerId));
}
function assertBooking(ctx: WorkspaceAccess, session: FootballSession) {
  assertAssignments(ctx, session);
  const resolved = sessionTimes(
    session.startLocal,
    session.endLocal,
    session.timezone,
  );
  if (
    Date.parse(resolved.startAt) !== Date.parse(session.startAt) ||
    Date.parse(resolved.endAt) !== Date.parse(session.endAt)
  )
    fail(
      "Saved session times are inconsistent. Review the dated schedule before confirming it.",
    );
  if (
    session.agenda.reduce((sum, item) => sum + item.duration, 0) >
    (Date.parse(session.endAt) - Date.parse(session.startAt)) / 60000
  )
    fail("Drill durations exceed the session length.");
  const conflicts = sessionConflicts(
    session,
    repo.list(ctx.academy.id, "session"),
    repo.list(ctx.academy.id, "venue"),
  );
  if (conflicts.length) {
    const kinds = [...new Set(conflicts.map((conflict) => conflict.kind))].join(
      ", ",
    );
    fail(
      `Scheduling conflict: ${kinds} already booked for an overlapping time. Choose another time or configured space.`,
      409,
    );
  }
}
function save<K extends TrainingKind>(
  ctx: WorkspaceAccess,
  kind: K,
  body: Omit<TrainingRecords[K], "version" | "updatedAt" | "updatedBy">,
  expected: number,
) {
  const old = repo.find(ctx.academy.id, kind, body.id);
  if ((old?.version ?? 0) !== expected)
    fail(
      "A newer version exists. Reload and review your unsaved changes before retrying.",
      409,
    );
  const record = {
    ...body,
    version: expected + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: ctx.user.id,
  } as TrainingRecords[K];
  repo.save(ctx.academy.id, kind, record as WorkspaceRecords[K]);
  database()
    .prepare(
      "INSERT INTO training_history(academyId,kind,recordId,version,body,actorId,at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      ctx.academy.id,
      kind,
      record.id,
      record.version,
      JSON.stringify(record),
      ctx.user.id,
      record.updatedAt,
    );
  audit(
    ctx.academy.id,
    ctx.user.id,
    `Training ${kind} saved version ${record.version}`,
    record.id,
  );
  return record;
}
export function trainingAction(ctx: WorkspaceAccess, input: unknown) {
  requireRole(ctx, [...staff]);
  requireModule(ctx, "session");
  requireSport(ctx, "football");
  const command = envelope.parse(input),
    digest = createHash("sha256").update(JSON.stringify(command)).digest("hex");
  return atomic(() => {
    // Re-check active permissions inside the write transaction, including retries.
    const currentMembership = repo.membership(ctx.academy.id, ctx.user.id);
    if (
      !currentMembership ||
      currentMembership.role !== ctx.membership.role ||
      (currentMembership.sportIds.length &&
        !currentMembership.sportIds.includes("football"))
    )
      fail("Membership is no longer active.", 403);
    const prior = database()
      .prepare(
        "SELECT digest,response FROM training_submissions WHERE academyId=? AND userId=? AND requestId=?",
      )
      .get(ctx.academy.id, ctx.user.id, command.requestId);
    if (prior) {
      if (prior.digest !== digest)
        fail(
          "This submission key was already used for different content.",
          409,
        );
      const response = JSON.parse(String(prior.response)) as
        TrainingRecords[TrainingKind] | WorkspaceReport | WorkspacePlan;
      if ("coachIds" in response) authorisedSession(ctx, response.id);
      if ("sessionId" in response) authorisedSession(ctx, response.sessionId);
      if ("playerId" in response) requirePlayer(ctx, response.playerId);
      if (command.action === "squad" || command.action === "venue")
        requireRole(ctx, ["OWNER", "ADMIN"]);
      return response;
    }
    const recordId = command.id ?? randomUUID(),
      base = { id: recordId, academyId: ctx.academy.id, sportId: "football" },
      v = command.expectedVersion;
    let response:
      TrainingRecords[TrainingKind] | WorkspaceReport | WorkspacePlan;
    switch (command.action) {
      case "squad": {
        requireRole(ctx, ["OWNER", "ADMIN"]);
        const d = z
          .object({ name: text, branchId: id, playerIds: z.array(id) })
          .parse(command.data);
        visibleRecord(ctx, "branch", d.branchId);
        if (new Set(d.playerIds).size !== d.playerIds.length)
          fail("Duplicate roster player.");
        d.playerIds.forEach((p) => requirePlayer(ctx, p));
        response = save(ctx, "squad", { ...base, ...d }, v);
        break;
      }
      case "venue": {
        requireRole(ctx, ["OWNER", "ADMIN"]);
        const d = z
          .object({
            name: text,
            branchId: id,
            location: text,
            parentVenueId: id.optional(),
            exclusive: z.boolean().default(true),
            independentChildren: z.boolean().default(false),
            bufferMinutes: z.number().int().min(0).max(120).default(0),
          })
          .parse(command.data);
        visibleRecord(ctx, "branch", d.branchId);
        const hierarchyError = venueHierarchyError(
          { ...base, ...d, version: v, updatedAt: "", updatedBy: ctx.user.id },
          repo.list(ctx.academy.id, "venue"),
        );
        if (hierarchyError) fail(hierarchyError);
        response = save(ctx, "venue", { ...base, ...d }, v);
        break;
      }
      case "session": {
        const { placeConfirmation, ...d } = sessionDraftInput.parse(
          command.data,
        );
        const branch = visibleRecord(ctx, "branch", d.branchId),
          squad = scoped(ctx, "squad", d.squadId);
        if (squad.branchId !== branch.id) fail("Squad and branch must match.");
        if (d.timezone !== branch.timezone)
          fail("Use the recorded branch time zone.");
        if (d.venueId && scoped(ctx, "venue", d.venueId).branchId !== branch.id)
          fail("Venue must belong to this branch.");
        for (const coachId of d.coachIds) {
          const m = repo.membership(ctx.academy.id, coachId);
          if (
            !m ||
            !staff.includes(m.role as (typeof staff)[number]) ||
            (m.sportIds.length && !m.sportIds.includes("football"))
          )
            fail("Choose active academy football coaches.");
        }
        if (
          ctx.membership.role === "COACH" &&
          !d.coachIds.includes(ctx.user.id)
        )
          fail("Assign yourself to the session.", 403);
        let startAt: string, endAt: string;
        try {
          startAt = resolveSessionTime(d.startLocal, d.timezone);
          endAt = resolveSessionTime(d.endLocal, d.timezone);
        } catch (e) {
          fail(e instanceof Error ? e.message : "Invalid time.");
        }
        if (
          endAt <= startAt ||
          Date.parse(endAt) - Date.parse(startAt) > 8 * 3600000
        )
          fail("Session must end after starting, within eight hours.");
        if (
          d.agenda.reduce((sum, a) => sum + a.duration, 0) >
          (Date.parse(endAt) - Date.parse(startAt)) / 60000
        )
          fail("Drill durations exceed the session length.");
        const old = command.id ? authorisedSession(ctx, recordId) : undefined;
        const googlePlaceId = placeConfirmation
          ? verifyPlaceConfirmation(
              placeConfirmation,
              { academyId: ctx.academy.id, userId: ctx.user.id },
              d.location,
            )
          : old?.location === d.location
            ? old.googlePlaceId
            : undefined;
        if (old && old.status !== "DRAFT")
          fail(
            "Only draft sessions can change their schedule and agenda.",
            409,
          );
        if (
          old?.objectives.some(
            (o) => !d.agenda.some((a) => a.drillId === o.drillId),
          )
        )
          fail(
            "Existing objectives refer to a removed drill. Update objectives before removing that drill.",
          );
        const roster =
          old?.roster ??
          squad.playerIds.map((playerId) => {
            const p = requirePlayer(ctx, playerId);
            return { playerId, name: p.name };
          });
        roster.forEach((p) => requirePlayer(ctx, p.playerId));
        for (const coachId of d.coachIds) {
          if (
            repo.membership(ctx.academy.id, coachId)?.role === "COACH" &&
            roster.some(
              (p) =>
                repo.find(ctx.academy.id, "player", p.playerId)?.coachId !==
                coachId,
            )
          )
            fail(
              "Every assigned coach must be authorised for every player in the session roster.",
            );
        }
        const agenda = d.agenda.map((a) => {
          const drill = visibleRecord(ctx, "drill", a.drillId);
          return {
            drill,
            duration: a.duration,
            drillVersion: Number(
              database()
                .prepare(
                  "SELECT version FROM workspace_records WHERE academyId=? AND kind=? AND id=?",
                )
                .get(ctx.academy.id, "drill", drill.id)?.version,
            ),
          };
        });
        response = save(
          ctx,
          "session",
          {
            ...base,
            ...d,
            startAt,
            endAt,
            googlePlaceId,
            agenda,
            roster,
            objectives: old?.objectives ?? [],
            sharedObjective: d.sharedObjective ?? old?.sharedObjective,
            preparation: d.preparation ?? old?.preparation,
            copiedFromSessionId: old?.copiedFromSessionId,
            status: "DRAFT",
          },
          v,
        );
        if (!old)
          for (const p of roster)
            save(
              ctx,
              "attendance",
              {
                id: `${recordId}:${p.playerId}`,
                academyId: ctx.academy.id,
                sportId: "football",
                sessionId: recordId,
                playerId: p.playerId,
                status: "UNMARKED",
                correctionReason: "",
              },
              0,
            );
        break;
      }
      case "copy": {
        z.object({}).strict().parse(command.data);
        const source = authorisedSession(ctx, recordId);
        if (source.version !== v)
          fail(
            "A newer version exists. Reload before copying this session.",
            409,
          );
        const copyId = randomUUID();
        const roster = source.roster.map((player) => ({
          playerId: player.playerId,
          name: requirePlayer(ctx, player.playerId).name,
        }));
        response = save(
          ctx,
          "session",
          {
            id: copyId,
            academyId: ctx.academy.id,
            sportId: "football",
            branchId: source.branchId,
            squadId: source.squadId,
            venueId: source.venueId,
            location: source.location,
            coachIds: [...source.coachIds],
            timezone: source.timezone,
            startLocal: "",
            endLocal: "",
            startAt: "",
            endAt: "",
            theme: source.theme,
            status: "DRAFT",
            roster,
            agenda: structuredClone(source.agenda),
            objectives: source.objectives.map((objective) => ({
              ...objective,
              playerName:
                roster.find((player) => player.playerId === objective.playerId)
                  ?.name ?? objective.playerName,
            })),
            sharedObjective: source.sharedObjective
              ? { ...source.sharedObjective }
              : undefined,
            preparation: source.preparation
              ? [...source.preparation]
              : undefined,
            copiedFromSessionId: source.id,
          },
          0,
        );
        for (const player of roster)
          save(
            ctx,
            "attendance",
            {
              id: `${copyId}:${player.playerId}`,
              academyId: ctx.academy.id,
              sportId: "football",
              sessionId: copyId,
              playerId: player.playerId,
              status: "UNMARKED",
              correctionReason: "",
            },
            0,
          );
        break;
      }
      case "reschedule": {
        const session = authorisedSession(ctx, recordId);
        if (!["DRAFT", "SCHEDULED"].includes(session.status))
          fail("Only draft or scheduled sessions can be rescheduled.", 409);
        const d = z
          .object({
            startLocal: text,
            endLocal: text,
            timezone: text,
            location: text,
            venueId: id.optional(),
            coachIds: z.array(id).min(1),
            reason: z.string().trim().min(3).max(1000),
          })
          .parse(command.data);
        const { reason, ...schedule } = d;
        const next = {
          ...session,
          ...schedule,
          ...sessionTimes(d.startLocal, d.endLocal, d.timezone),
        };
        assertAssignments(ctx, next);
        if (next.status === "SCHEDULED") assertBooking(ctx, next);
        else if (
          next.agenda.reduce((sum, item) => sum + item.duration, 0) >
          (Date.parse(next.endAt) - Date.parse(next.startAt)) / 60000
        )
          fail("Drill durations exceed the session length.");
        response = save(ctx, "session", next, v);
        audit(
          ctx.academy.id,
          ctx.user.id,
          `Session rescheduled: ${reason}`,
          session.id,
        );
        break;
      }
      case "objective": {
        const s = authorisedSession(ctx, recordId);
        if (!["DRAFT", "SCHEDULED"].includes(s.status))
          fail("Objectives are locked after training begins.", 409);
        const d = z
          .object({
            playerId: id,
            planId: id.optional(),
            goal: text,
            drillId: id,
            cue: text,
            observe: text,
          })
          .parse(command.data);
        playerInSession(ctx, s, d.playerId);
        if (!s.agenda.some((a) => a.drill.id === d.drillId))
          fail("Select a session drill.");
        if (d.planId) {
          const p = visibleRecord(ctx, "plan", d.planId);
          if (
            p.playerId !== d.playerId ||
            !["ACTIVE", "CONTINUE", "ADAPT", "NEEDS_REVIEW"].includes(
              p.status,
            ) ||
            !p.drillIds.includes(d.drillId)
          )
            fail("Select this player’s current plan and assigned drill.");
        }
        response = save(
          ctx,
          "session",
          {
            ...s,
            objectives: [
              ...s.objectives.filter((o) => o.playerId !== d.playerId),
              {
                ...d,
                playerName: s.roster.find((p) => p.playerId === d.playerId)!
                  .name,
              },
            ],
          },
          v,
        );
        break;
      }
      case "status": {
        const s = authorisedSession(ctx, recordId),
          d = z
            .object({
              status: z.enum([
                "SCHEDULED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
              ]),
              reason: z.string().max(1000).default(""),
            })
            .parse(command.data);
        const allowed: Record<string, string[]> = {
          DRAFT: ["SCHEDULED", "CANCELLED"],
          SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
          IN_PROGRESS: ["COMPLETED", "CANCELLED"],
          COMPLETED: [],
          CANCELLED: [],
        };
        if (!allowed[s.status].includes(d.status))
          fail("Invalid session status transition.", 409);
        if (d.status === "SCHEDULED")
          assertBooking(ctx, { ...s, status: "SCHEDULED" });
        if (d.status === "CANCELLED" && !d.reason.trim())
          fail("Record a cancellation reason.");
        if (d.status === "COMPLETED") {
          if (
            repo
              .list(ctx.academy.id, "attendance")
              .some((a) => a.sessionId === s.id && a.status === "UNMARKED")
          )
            fail("Mark attendance before completing the session.");
          if (
            repo
              .list(ctx.academy.id, "evidence")
              .some(
                (e) =>
                  e.sessionId === s.id &&
                  ["DRAFT", "AWAITING_REVIEW"].includes(e.status),
              )
          )
            fail("Review outstanding evidence before completion.");
        }
        response = save(ctx, "session", { ...s, status: d.status }, v);
        audit(
          ctx.academy.id,
          ctx.user.id,
          `Session ${d.status}: ${d.reason}`,
          s.id,
        );
        break;
      }
      case "attendance": {
        const s = authorisedSession(ctx, recordId);
        if (s.status === "CANCELLED")
          fail("Cancelled attendance cannot be changed.");
        const d = z
          .object({
            entries: z
              .array(
                z.object({
                  playerId: id,
                  status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "UNMARKED"]),
                  expectedVersion: z.number().int().positive(),
                }),
              )
              .min(1),
            correctionReason: z.string().max(1000).default(""),
          })
          .parse(command.data);
        if (new Set(d.entries.map((e) => e.playerId)).size !== d.entries.length)
          fail("Duplicate attendance player.");
        for (const e of d.entries) {
          playerInSession(ctx, s, e.playerId);
          const a = scoped(ctx, "attendance", `${s.id}:${e.playerId}`);
          if (
            a.status !== "UNMARKED" &&
            a.status !== e.status &&
            !d.correctionReason.trim()
          )
            fail("Explain the attendance correction.");
          save(
            ctx,
            "attendance",
            { ...a, status: e.status, correctionReason: d.correctionReason },
            e.expectedVersion,
          );
        }
        response = s;
        break;
      }
      case "evidence": {
        const d = evidenceInput.parse(command.data),
          s = authorisedSession(ctx, d.sessionId);
        playerInSession(ctx, s, d.playerId);
        if (s.status !== "IN_PROGRESS")
          fail("Capture evidence during an in-progress session.");
        if (
          scoped(ctx, "attendance", `${s.id}:${d.playerId}`).status !==
          "PRESENT"
        )
          fail("Record present attendance before training evidence.");
        const a = s.agenda.find((a) => a.drill.id === d.drillId);
        if (!a) fail("Select a drill from this session.");
        const objective = s.objectives.find((o) => o.playerId === d.playerId);
        if (d.planId && objective?.planId !== d.planId)
          fail("Evidence goal must match the session objective.");
        if (d.planId && objective?.drillId !== d.drillId)
          fail("Evidence drill must match this player’s session objective.");
        const old = command.id ? scoped(ctx, "evidence", recordId) : undefined;
        if (
          old &&
          (old.playerId !== d.playerId || old.sessionId !== d.sessionId)
        )
          fail("Evidence ownership cannot be changed.", 403);
        if (old && !["DRAFT", "AWAITING_REVIEW"].includes(old.status))
          fail(
            "Reviewed records are immutable. Capture a new observation instead.",
            409,
          );
        response = save(
          ctx,
          "evidence",
          {
            ...base,
            ...d,
            unit:
              d.measurement === "ATTEMPTS"
                ? "ATTEMPTS"
                : d.measurement === "ELAPSED_TIME"
                  ? "SECONDS"
                  : "NONE",
            drillVersion: a.drillVersion,
            drillName: a.drill.name,
            status: "AWAITING_REVIEW",
            authorId: old?.authorId ?? ctx.user.id,
            recordedAt: old?.recordedAt ?? new Date().toISOString(),
          },
          v,
        );
        break;
      }
      case "review": {
        const e = scoped(ctx, "evidence", recordId),
          d = z
            .object({
              status: z.enum(["REVIEWED", "UNCLEAR", "REJECTED", "SUPERSEDED"]),
              verified: z.literal(true),
            })
            .parse(command.data);
        if (
          !["AWAITING_REVIEW", "DRAFT"].includes(e.status) &&
          d.status !== "SUPERSEDED"
        )
          fail("This reviewed evidence is immutable.", 409);
        response = save(
          ctx,
          "evidence",
          {
            ...e,
            status: d.status,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date().toISOString(),
          },
          v,
        );
        break;
      }
      case "nextStep": {
        const d = z
            .object({
              evidenceId: id,
              nextStep: text,
              status: z.enum([
                "CONTINUE",
                "ADAPT",
                "COMPLETED",
                "NEEDS_REVIEW",
              ]),
            })
            .parse(command.data),
          e = scoped(ctx, "evidence", d.evidenceId),
          p = visibleRecord(ctx, "plan", recordId);
        if (
          e.playerId !== p.playerId ||
          e.planId !== p.id ||
          e.status !== "REVIEWED"
        )
          fail("Use reviewed evidence for this development plan.");
        const current = Number(
          database()
            .prepare(
              "SELECT version FROM workspace_records WHERE academyId=? AND kind=? AND id=?",
            )
            .get(ctx.academy.id, "plan", p.id)?.version,
        );
        if (current !== v)
          fail("Plan changed. Reload before updating its next step.", 409);
        response = { ...p, nextStep: d.nextStep, status: d.status };
        repo.save(ctx.academy.id, "plan", response);
        audit(
          ctx.academy.id,
          ctx.user.id,
          "Plan next step reviewed against session evidence",
          e.id,
        );
        break;
      }
      case "report": {
        const d = z
            .object({
              playerId: id,
              planId: id,
              evidenceIds: z.array(id).min(1),
              period: text,
              closingNote: z.string().max(10000),
            })
            .parse(command.data),
          p = visibleRecord(ctx, "plan", d.planId);
        requirePlayer(ctx, d.playerId);
        if (p.playerId !== d.playerId) fail("Plan belongs to another player.");
        const records = d.evidenceIds.map((e) => scoped(ctx, "evidence", e));
        for (const e of records)
          if (
            e.playerId !== p.playerId ||
            e.planId !== p.id ||
            e.status !== "REVIEWED" ||
            e.visibility !== "PARENT_ELIGIBLE" ||
            authorisedSession(ctx, e.sessionId).status !== "COMPLETED"
          )
            fail(
              "Reports require parent-eligible reviewed evidence from completed sessions.",
            );
        if (repo.find(ctx.academy.id, "report", recordId))
          fail("Report already exists.", 409);
        response = {
          ...base,
          playerId: d.playerId,
          planId: d.planId,
          period: d.period,
          sourceEvidenceIds: d.evidenceIds,
          observation: records
            .map((e) => `${e.observation} - ${measurementText(e)}`)
            .join("\n"),
          evidenceType: "COACH_OBSERVATION",
          nextStep: p.nextStep,
          closingNote: d.closingNote,
          status: "Draft",
          externalDeliveryStatus: "NOT_SENT",
        };
        repo.save(ctx.academy.id, "report", response);
        audit(
          ctx.academy.id,
          ctx.user.id,
          "Report prepared from reviewed session records",
          recordId,
        );
        break;
      }
    }
    database()
      .prepare(
        "INSERT INTO training_submissions(academyId,userId,requestId,digest,response) VALUES(?,?,?,?,?)",
      )
      .run(
        ctx.academy.id,
        ctx.user.id,
        command.requestId,
        digest,
        JSON.stringify(response),
      );
    return response;
  });
}
export function reportTrainingSources(
  ctx: WorkspaceAccess,
  report: WorkspaceReport,
): FootballEvidence[] {
  requirePlayer(ctx, report.playerId);
  return (report.sourceEvidenceIds ?? []).map((id) => {
    const e = report.monthlySources
      ? repo.find(ctx.academy.id, "evidence", id)
      : scoped(ctx, "evidence", id);
    const session =
      e &&
      (report.monthlySources
        ? repo.find(ctx.academy.id, "session", e.sessionId)
        : authorisedSession(ctx, e.sessionId));
    if (
      !e ||
      e.sportId !== "football" ||
      !session ||
      session.sportId !== "football" ||
      e.playerId !== report.playerId ||
      (!report.monthlySources && e.planId !== report.planId) ||
      e.status !== "REVIEWED" ||
      e.visibility !== "PARENT_ELIGIBLE" ||
      session.status !== "COMPLETED" ||
      (report.monthlySources &&
        (!session.roster.some((p) => p.playerId === report.playerId) ||
          !inPeriod(session.startAt, report.monthlySources.period) ||
          !inPeriod(e.recordedAt, report.monthlySources.period)))
    )
      fail(
        "A report source is no longer eligible. Review its sources again.",
        409,
      );
    return e;
  });
}
export function trainingHistory(
  ctx: WorkspaceAccess,
  kind: TrainingKind,
  recordId: string,
) {
  requireRole(ctx, [...staff]);
  requireModule(ctx, kind);
  visibleRecord(ctx, kind, recordId);
  audit(ctx.academy.id, ctx.user.id, "Training audit history read", recordId);
  return database()
    .prepare(
      "SELECT version,body,actorId,at FROM training_history WHERE academyId=? AND kind=? AND recordId=? ORDER BY version",
    )
    .all(ctx.academy.id, kind, recordId)
    .map((row) => ({ ...row, body: JSON.parse(String(row.body)) }));
}
