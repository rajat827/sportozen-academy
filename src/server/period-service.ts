import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { WeeklyPlan, MonthlySources } from "@/domain/communication";
import type { WorkspaceReport } from "@/domain/workspace";
import type { ReportViewModel } from "@/domain/report";
import {
  periodFor,
  inPeriod,
  weeklyWording,
} from "@/services/communication/period-rules";
import { workspaceRepository as repo } from "./workspace-repository";
import {
  requireRole,
  requireModule,
  requireSport,
  requirePlayer,
  visibleRecord,
  visibleRecords,
  type WorkspaceAccess,
} from "./workspace-access";
import { authorisedSession } from "./training-service";
import { monthlySourceData } from "./monthly-source-data";
import { atomic, database, audit } from "./database";
import { WorkspaceError } from "./auth";
function fail(message: string): never {
  throw new WorkspaceError(409, message);
}
function staff(ctx: WorkspaceAccess) {
  requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
  requireSport(ctx, "football");
}
function saveWeekly(ctx: WorkspaceAccess, r: WeeklyPlan) {
  repo.save(ctx.academy.id, "weekly", r);
  database()
    .prepare(
      "INSERT INTO training_history(academyId,kind,recordId,version,body,actorId,at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      ctx.academy.id,
      "weekly",
      r.id,
      r.version,
      JSON.stringify(r),
      ctx.user.id,
      new Date().toISOString(),
    );
  audit(
    ctx.academy.id,
    ctx.user.id,
    `Weekly plan ${r.status} version ${r.version}`,
    r.id,
  );
  return r;
}
export function weeklyCurrent(academyId: string, r: WeeklyPlan) {
  const c = r.snapshot ?? r.content;
  if (r.status !== "APPROVED" || !r.snapshot) return false;
  const currentSessions = repo
    .list(academyId, "session")
    .filter(
      (s) =>
        s.squadId === r.squadId &&
        s.status === "SCHEDULED" &&
        inPeriod(s.startAt, c.period) &&
        (!c.remainingFrom || s.startAt >= c.remainingFrom) &&
        s.roster.some((p) => p.playerId === r.playerId),
    );
  if (
    currentSessions.length !== c.sessions.length ||
    c.sessions.some((s) => {
      const v = currentSessions.find((t) => t.id === s.id);
      return !v || v.version !== s.version;
    })
  )
    return false;
  if (
    c.sourcePlanId &&
    repo.find(academyId, "plan", c.sourcePlanId)?.recordVersion !==
      c.sourcePlanVersion
  )
    return false;
  return true;
}
export function weeklySource(
  ctx: WorkspaceAccess,
  id: string,
): ReportViewModel {
  const r = visibleRecord(ctx, "weekly", id);
  if (!weeklyCurrent(ctx.academy.id, r))
    fail("Weekly source changed. Prepare and review a new version.");
  const c = r.snapshot!;
  return {
    reportId: r.id,
    playerId: r.playerId,
    academy: ctx.academy.name,
    player: c.playerName,
    period: c.period.key,
    status: "Approved",
    externalDelivery: "Not sent",
    demo: ctx.academy.demo,
    focus: c.personalFocus,
    practised: "Planned activities — not completed achievements",
    activities: c.activities.map((a) => ({ ...a, drillId: a.id })),
    evidence: [
      {
        text: weeklyWording(c),
        source: `Weekly plan version ${r.version}, approved ${r.approvedAt}`,
      },
    ],
    nextStep: c.observe,
    observationCriteria: c.observe,
    note: c.homePractice,
  };
}
export function assembleMonthly(
  ctx: WorkspaceAccess,
  playerId: string,
  key: string,
): MonthlySources {
  requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
  requireModule(ctx, "report");
  requirePlayer(ctx, playerId);
  const period = periodFor(key, ctx.academy.timezone, "MONTHLY");
  const plans = visibleRecords(ctx, "plan").filter(
    (p) => p.playerId === playerId,
  );
  const data = monthlySourceData(ctx.academy.id, playerId, period),
    records = data.records;
  const participation = records.actual.filter(
    (session) =>
      repo.find(ctx.academy.id, "attendance", `${session.id}:${playerId}`)
        ?.status === "PRESENT",
  );
  const activities = participation.flatMap((s) =>
    s.agenda.map((a) => ({
      name: a.drill.name,
      purpose: a.drill.purpose,
      cue: a.drill.cue,
      drillId: a.drill.id,
    })),
  );
  return {
    trainingFingerprint: data.fingerprint,
    period,
    sessionIds: records.actual.map((s) => s.id),
    evidenceIds: records.eligible.map((e) => e.id),
    fingerprint: createHash("sha256")
      .update(
        JSON.stringify({
          training: data.fingerprint,
          plans,
        }),
      )
      .digest("hex"),
    model: {
      focus:
        [
          ...new Set(
            records.actual.map(
              (s) =>
                s.objectives.find((o) => o.playerId === playerId)?.goal ||
                s.sharedObjective?.goal ||
                s.theme,
            ),
          ),
        ].join("; ") || "No training focus recorded in this month",
      practised: participation.length
        ? [...new Set(activities.map((a) => a.name))].join("; ")
        : "No confirmed completed-session participation recorded",
      activities: activities.filter(
        (a, i, list) => list.findIndex((b) => b.drillId === a.drillId) === i,
      ),
      evidence: [
        { text: records.basis, source: "Recorded session attendance" },
        ...records.evidence,
        ...(!records.eligible.length
          ? [
              {
                text: "No reviewed parent-eligible observations recorded in this period.",
                source: "Missing evidence — no result inferred",
              },
            ]
          : []),
      ],
    },
  };
}
export function assertMonthlyCurrent(ctx: WorkspaceAccess, r: WorkspaceReport) {
  if (
    r.monthlySources &&
    assembleMonthly(ctx, r.playerId, r.monthlySources.period.key)
      .fingerprint !== r.monthlySources.fingerprint
  )
    fail("Monthly sources changed. Regenerate the draft and review again.");
}
export function periodAction(ctx: WorkspaceAccess, input: unknown) {
  staff(ctx);
  const command = z
    .object({
      requestId: z.uuid(),
      action: z.enum([
        "weeklyPrepare",
        "weeklyEdit",
        "weeklyApprove",
        "weeklyPublish",
        "weeklyCorrection",
        "monthlyPrepare",
        "monthlyEdit",
      ]),
      id: z.string().optional(),
      expectedVersion: z.number().int().nonnegative().default(0),
      data: z.unknown(),
    })
    .parse(input);
  const digest = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return atomic(() => {
    const membership = repo.membership(ctx.academy.id, ctx.user.id),
      academy = repo.academy(ctx.academy.id);
    if (!membership || !academy || membership.role !== ctx.membership.role)
      fail("Membership revoked.");
    ctx = { ...ctx, membership, academy };
    staff(ctx);
    const prior = database()
      .prepare(
        "SELECT digest,response FROM training_submissions WHERE academyId=? AND userId=? AND requestId=?",
      )
      .get(ctx.academy.id, ctx.user.id, command.requestId);
    if (prior) {
      if (prior.digest !== digest)
        fail("Submission key reused with different content.");
      const response = JSON.parse(String(prior.response));
      for (const record of Array.isArray(response) ? response : [response])
        if (record.playerId) requirePlayer(ctx, record.playerId);
      return response;
    }
    let result: unknown;
    if (command.action.startsWith("weekly")) {
      requireModule(ctx, "weekly");
      if (
        command.action === "weeklyPrepare" ||
        command.action === "weeklyCorrection"
      ) {
        const d = z
          .object({
            squadId: z.string(),
            week: z.iso.date(),
            correctionOf: z.string().optional(),
          })
          .parse(command.data);
        const squad = visibleRecord(ctx, "squad", d.squadId),
          period = periodFor(d.week, ctx.academy.timezone, "WEEKLY");
        if (command.action === "weeklyCorrection" && !d.correctionOf)
          fail("Select the issued plan to correct.");
        const correction = d.correctionOf
          ? visibleRecord(ctx, "weekly", d.correctionOf)
          : undefined;
        if (
          correction &&
          (!correction.issuedAt ||
            correction.squadId !== squad.id ||
            correction.content.period.key !== d.week)
        )
          fail("Correction requires an issued plan for this squad and week.");
        const remainingFrom = correction ? new Date().toISOString() : undefined;
        result = squad.playerIds
          .filter((p) => !correction || p === correction.playerId)
          .map((playerId) => {
            const player = requirePlayer(ctx, playerId);
            const existing = repo
              .list(ctx.academy.id, "weekly")
              .find(
                (r) =>
                  r.playerId === playerId &&
                  r.content.period.key === d.week &&
                  r.correctionOf === d.correctionOf,
              );
            if (existing?.issuedAt) return existing;
            if (existing)
              database()
                .prepare(
                  "UPDATE delivery_jobs SET state='CANCELLED',reason='Weekly draft regenerated' WHERE academyId=? AND sourceId=? AND state='QUEUED'",
                )
                .run(ctx.academy.id, existing.id);
            const plan = visibleRecords(ctx, "plan").find(
              (p) =>
                p.playerId === playerId &&
                ["ACTIVE", "CONTINUE", "ADAPT", "NEEDS_REVIEW"].includes(
                  p.status,
                ),
            );
            const sessions = visibleRecords(ctx, "session").filter(
              (s) =>
                s.squadId === squad.id &&
                s.status === "SCHEDULED" &&
                inPeriod(s.startAt, period) &&
                (!remainingFrom || s.startAt >= remainingFrom) &&
                s.roster.some((p) => p.playerId === playerId),
            );
            sessions.forEach((s) => authorisedSession(ctx, s.id));
            const objectives = sessions.flatMap((s) =>
              s.objectives.filter((o) => o.playerId === playerId),
            );
            const drills = sessions.flatMap((s) =>
              s.agenda.map((a) => a.drill),
            );
            for (const id of plan?.drillIds ?? []) {
              const drill = visibleRecord(ctx, "drill", id);
              if (!drills.some((d) => d.id === id)) drills.push(drill);
            }
            const content = {
              remainingFrom,
              period,
              playerName: player.name,
              teamFocus: [
                ...new Set(
                  sessions.map((s) => s.sharedObjective?.goal || s.theme),
                ),
              ].join("; "),
              personalFocus:
                [...new Set(objectives.map((o) => o.goal))].join("; ") ||
                plan?.focus ||
                "Following the batch plan",
              observe:
                [...new Set(objectives.map((o) => o.observe))].join("; ") ||
                [
                  ...new Set(
                    sessions
                      .map((s) => s.sharedObjective?.observe)
                      .filter(Boolean),
                  ),
                ].join("; ") ||
                plan?.observe ||
                "the planned batch activities; individual observation criteria are not recorded",
              homePractice: plan?.homePractice ?? "",
              sessions: sessions.map((s) => ({
                id: s.id,
                version: s.version,
                startAt: s.startAt,
                endAt: s.endAt,
                timezone: s.timezone,
                location: s.location,
              })),
              activities: drills
                .filter(
                  (d, i, all) => all.findIndex((a) => a.id === d.id) === i,
                )
                .map((d) => ({
                  id: d.id,
                  name: d.name,
                  purpose: d.purpose,
                  cue: d.cue,
                })),
              sourcePlanId: plan?.id,
              sourcePlanVersion: plan?.recordVersion,
              missing: [] as string[],
            };
            if (!sessions.length)
              content.missing.push(
                "No confirmed sessions recorded for this week",
              );
            if (!drills.length)
              content.missing.push("Assigned activities missing");
            return saveWeekly(ctx, {
              id: existing?.id ?? randomUUID(),
              academyId: ctx.academy.id,
              sportId: "football",
              playerId,
              squadId: squad.id,
              version: (existing?.version ?? 0) + 1,
              content,
              authorId: ctx.user.id,
              status: "DRAFT",
              correctionOf: d.correctionOf,
            });
          });
      } else {
        const r = visibleRecord(ctx, "weekly", command.id ?? "");
        requirePlayer(ctx, r.playerId);
        if (r.recordVersion !== command.expectedVersion)
          fail("Weekly plan changed. Reload before review.");
        if (command.action === "weeklyPublish") {
          if (!weeklyCurrent(ctx.academy.id, r))
            fail("Approve a current weekly plan before publication.");
          if (!r.publishedGuardianIds?.length) {
            const recipients = database()
              .prepare(
                "SELECT userId FROM guardian_relationships WHERE academyId=? AND playerId=?",
              )
              .all(ctx.academy.id, r.playerId)
              .map((g) => String(g.userId))
              .filter((userId) => {
                return (
                  repo.membership(ctx.academy.id, userId)?.role === "PARENT"
                );
              });
            if (!recipients.length)
              fail("No current guardian permits in-app publication.");
            result = {
              ...r,
              issuedAt: r.issuedAt ?? new Date().toISOString(),
              publishedGuardianIds: recipients,
            };
            repo.save(ctx.academy.id, "weekly", result as WeeklyPlan);
            audit(
              ctx.academy.id,
              ctx.user.id,
              "Weekly plan issued privately",
              r.id,
            );
          } else result = r;
        } else {
          if (r.issuedAt)
            fail("Issued plans are historical. Use an explicit correction.");
          if (command.action === "weeklyEdit") {
            const d = z
              .object({
                personalFocus: z.string().trim().min(1).max(500),
                observe: z.string().trim().min(1).max(1000),
                homePractice: z.string().max(1500),
              })
              .parse(command.data);
            database()
              .prepare(
                "UPDATE delivery_jobs SET state='CANCELLED',reason='Weekly approval invalidated' WHERE academyId=? AND sourceId=? AND state='QUEUED'",
              )
              .run(ctx.academy.id, r.id);
            result = saveWeekly(ctx, {
              ...r,
              status: "DRAFT",
              snapshot: undefined,
              approvedAt: undefined,
              reviewerId: undefined,
              version: r.version + 1,
              content: {
                ...r.content,
                ...d,
                missing: r.content.missing.filter(
                  (m) =>
                    !m.startsWith("Personal") && !m.startsWith("Observation"),
                ),
              },
            });
          } else {
            if (
              !z.object({ verified: z.literal(true) }).safeParse(command.data)
                .success
            )
              fail(
                "Verify each player's content and recipients before approval.",
              );
            if (r.content.missing.length)
              fail(
                "Complete missing source records before approval. Prepare a fresh draft after recording them.",
              );
            if (
              !weeklyCurrent(ctx.academy.id, {
                ...r,
                status: "APPROVED",
                snapshot: r.content,
              })
            )
              fail("Source records changed. Prepare a fresh draft.");
            result = saveWeekly(ctx, {
              ...r,
              status: "APPROVED",
              snapshot: structuredClone(r.content),
              reviewerId: ctx.user.id,
              approvedAt: new Date().toISOString(),
              version: r.version + 1,
            });
          }
        }
      }
    } else {
      requireModule(ctx, "report");
      if (command.action === "monthlyPrepare") {
        const d = z
          .object({
            playerIds: z.array(z.string()).min(1),
            month: z.string().regex(/^\d{4}-\d{2}$/),
            correctionOf: z.string().optional(),
          })
          .parse(command.data);
        result = [...new Set(d.playerIds)].map((playerId) => {
          if (d.correctionOf) {
            const original = visibleRecord(ctx, "report", d.correctionOf);
            if (
              original.status !== "Approved" ||
              original.playerId !== playerId ||
              original.reportingPeriod?.key !== d.month
            )
              fail(
                "Select an approved monthly report for this player's explicit correction.",
              );
          }
          const plan = visibleRecords(ctx, "plan").find(
            (p) => p.playerId === playerId,
          );
          const existing = visibleRecords(ctx, "report").find(
            (r) =>
              r.playerId === playerId &&
              r.reportingPeriod?.key === d.month &&
              r.correctionOf === d.correctionOf,
          );
          if (existing) return existing; // Approved historical months never overwritten by regeneration.
          const sources = assembleMonthly(ctx, playerId, d.month);
          const r: WorkspaceReport = {
            id: randomUUID(),
            academyId: ctx.academy.id,
            sportId: "football",
            playerId,
            planId: plan?.id ?? "",
            period: `${d.month} (${sources.period.timezone})`,
            reportingPeriod: sources.period,
            correctionOf: d.correctionOf,
            monthlySources: sources,
            sourceEvidenceIds: sources.evidenceIds,
            observation: "",
            evidenceType: sources.evidenceIds.length
              ? "COACH_OBSERVATION"
              : "MISSING_OR_UNCLEAR",
            nextStep: plan?.nextStep ?? "",
            closingNote: "",
            status: "Draft",
            externalDeliveryStatus: "NOT_SENT",
          };
          repo.save(ctx.academy.id, "report", r);
          audit(ctx.academy.id, ctx.user.id, "Monthly draft assembled", r.id);
          return r;
        });
      } else {
        const r = visibleRecord(ctx, "report", command.id ?? "");
        if (!r.monthlySources || !r.reportingPeriod)
          fail("Use the existing report editor for non-monthly reports.");
        if (r.status === "Approved")
          fail(
            "Approved monthly reports remain historical; create an explicit reviewed correction.",
          );
        if (r.recordVersion !== command.expectedVersion)
          fail("Monthly draft changed. Reload.");
        const d = z
          .object({
            observation: z.string().max(5000),
            closingNote: z.string().max(10000),
            nextStep: z.string().trim().min(1).max(5000),
            regenerate: z.boolean().default(false),
          })
          .parse(command.data);
        const sources = d.regenerate
          ? assembleMonthly(ctx, r.playerId, r.reportingPeriod!.key)
          : r.monthlySources;
        result = {
          ...r,
          observation: d.observation,
          closingNote: d.closingNote,
          nextStep: d.nextStep,
          monthlySources: sources,
          sourceEvidenceIds: sources?.evidenceIds,
        };
        repo.save(ctx.academy.id, "report", result as WorkspaceReport);
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
        JSON.stringify(result),
      );
    return result;
  });
}
