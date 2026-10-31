import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  TrialEnrolment,
  TrialPayload,
  TrialSources,
  TrialStatus,
  TrialView,
} from "@/domain/trial";
import { database, atomic, audit } from "./database";
import { WorkspaceError } from "./auth";
import { workspaceRepository as people } from "./workspace-repository";
import { trialRepository as repo } from "./trial-repository";
import {
  requireModule,
  requirePlayer,
  requireRole,
  requireSport,
  type WorkspaceAccess,
} from "./workspace-access";
import { financeActionInTransaction } from "./finance-service";
import { financeRepository } from "./finance-repository";
const id = z.string().trim().min(1).max(100),
  text = z.string().trim().min(1).max(4000);
const currency = z
  .string()
  .refine(
    (v) => Intl.supportedValuesOf("currency").includes(v),
    "Choose a supported currency.",
  );
const commandSchema = z.object({
  requestId: z.uuid(),
  action: z.enum([
    "policy",
    "create",
    "transition",
    "feedback",
    "review",
    "publish",
    "convert",
    "invoice",
  ]),
  id: id.optional(),
  expectedVersion: z.number().int().nonnegative().default(0),
  data: z.unknown(),
});
function fail(message: string, status = 400): never {
  throw new WorkspaceError(status, message);
}
function current(context: WorkspaceAccess) {
  const academy = people.academy(context.academy.id),
    membership = people.membership(context.academy.id, context.user.id);
  if (
    !academy ||
    !membership ||
    membership.role !== context.membership.role ||
    database()
      .prepare("SELECT status FROM platform_entitlements WHERE academyId=?")
      .get(academy.id)?.status !== "ACTIVE"
  )
    fail("Current active academy membership is required.", 403);
  const ctx = { ...context, academy, membership };
  requireRole(ctx, ["OWNER", "ADMIN", "COACH", "PARENT"]);
  requireModule(ctx, "player");
  requireSport(ctx, "football");
  return ctx;
}
function today(ctx: WorkspaceAccess) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: ctx.academy.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const p = (type: string) => parts.find((v) => v.type === type)!.value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
function effective(t: TrialEnrolment, date: string): TrialStatus {
  return ["SCHEDULED", "ACTIVE"].includes(t.status) && date > t.endDate
    ? "EXPIRED"
    : t.status;
}
function source(ctx: WorkspaceAccess, t: TrialEnrolment) {
  const sessions = people
    .list(ctx.academy.id, "session")
    .filter(
      (s) =>
        s.status === "COMPLETED" &&
        s.startLocal.slice(0, 10) >= t.startDate &&
        s.startLocal.slice(0, 10) <= t.endDate &&
        s.roster.some((p) => p.playerId === t.playerId),
    );
  const attendance = people
    .list(ctx.academy.id, "attendance")
    .filter(
      (a) =>
        a.playerId === t.playerId && sessions.some((s) => s.id === a.sessionId),
    );
  const evidence = people
    .list(ctx.academy.id, "evidence")
    .filter(
      (e) =>
        e.playerId === t.playerId &&
        e.status === "REVIEWED" &&
        e.visibility === "PARENT_ELIGIBLE" &&
        sessions.some((s) => s.id === e.sessionId) &&
        attendance.some(
          (a) => a.sessionId === e.sessionId && a.status === "PRESENT",
        ),
    );
  const sources: TrialSources = {
    sessionIds: sessions.map((s) => s.id),
    attendanceIds: attendance.map((a) => a.id),
    evidenceIds: evidence.map((e) => e.id),
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ sessions, attendance, evidence }))
    .digest("hex");
  return { sources, fingerprint };
}
function project(ctx: WorkspaceAccess, t: TrialEnrolment): TrialView {
  const { sources, fingerprint } = source(ctx, t);
  const fresh = t.reviewedSummary?.sourceFingerprint === fingerprint;
  return {
    ...t,
    effectiveStatus: effective(t, today(ctx)),
    sources,
    reviewedSummary: fresh ? t.reviewedSummary : undefined,
    publishedSummary:
      fresh && t.publishedSummary?.sourceFingerprint === fingerprint
        ? t.publishedSummary
        : undefined,
  };
}
function available(ctx: WorkspaceAccess, trialId: string) {
  const t = repo.find(ctx.academy.id, trialId);
  if (!t) fail("Trial enrolment unavailable.", 404);
  requirePlayer(ctx, t.playerId);
  return t;
}
export function trialView(
  context: WorkspaceAccess,
  playerId?: string,
): TrialPayload {
  const ctx = current(context),
    parent = ctx.membership.role === "PARENT";
  if (playerId) requirePlayer(ctx, playerId);
  const enrolments = repo
    .list(ctx.academy.id)
    .filter((t) => !playerId || t.playerId === playerId)
    .filter((t) => {
      try {
        requirePlayer(ctx, t.playerId);
        return true;
      } catch {
        return false;
      }
    })
    .map((t) => project(ctx, t))
    .filter((t) => !parent || !!t.publishedSummary)
    .map((t) =>
      parent
        ? {
            ...t,
            feedback: "",
            reviewedSummary: undefined,
            history: [],
            sources: { sessionIds: [], attendanceIds: [], evidenceIds: [] },
            feeMinor: 0,
            invoiceId: undefined,
          }
        : t,
    );
  return {
    policy: repo.policy(ctx.academy.id, ctx.academy.currency),
    enrolments,
    canManage: ["OWNER", "ADMIN"].includes(ctx.membership.role),
  };
}
function version(t: TrialEnrolment, value: number) {
  if (t.version !== value)
    fail("Trial changed. Reload before reviewing or saving.", 409);
}
const transitions: Record<string, TrialStatus[]> = {
  SCHEDULED: ["ACTIVE", "CANCELLED", "EXPIRED", "NOT_CONVERTED"],
  ACTIVE: ["COMPLETED", "EXPIRED", "CANCELLED", "NOT_CONVERTED"],
  COMPLETED: ["NOT_CONVERTED"],
  EXPIRED: ["NOT_CONVERTED"],
};
export function trialAction(
  context: WorkspaceAccess,
  input: unknown,
): TrialEnrolment | ReturnType<typeof repo.policy> {
  const command = commandSchema.parse(input);
  if (command.action === "invoice")
    return atomic(() => invoiceTrial(context, command));
  const digest = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return atomic(() => {
    const ctx = current(context);
    requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
    if (command.action !== "feedback") requireRole(ctx, ["OWNER", "ADMIN"]);
    const prior = database()
      .prepare(
        "SELECT digest,response FROM academy_trial_submissions WHERE academyId=? AND userId=? AND requestId=?",
      )
      .get(ctx.academy.id, ctx.user.id, command.requestId);
    if (prior) {
      if (prior.digest !== digest)
        fail("Submission key already used for different trial content.", 409);
      const result = JSON.parse(String(prior.response));
      if ("playerId" in result) requirePlayer(ctx, result.playerId);
      return result;
    }
    const at = new Date().toISOString();
    let result: TrialEnrolment | ReturnType<typeof repo.policy>;
    if (command.action === "policy") {
      const data = z
        .object({
          defaultDurationDays: z.number().int().min(1).max(366).nullable(),
          paidTrialsAllowed: z.boolean(),
          defaultFeeMinor: z
            .number()
            .int()
            .nonnegative()
            .max(Number.MAX_SAFE_INTEGER),
          currency,
          feeRuleNote: z.string().trim().max(2000),
        })
        .parse(command.data);
      const old = repo.policy(ctx.academy.id, ctx.academy.currency);
      if (old.version !== command.expectedVersion)
        fail("Trial policy changed. Reload before saving.", 409);
      if (data.currency !== ctx.academy.currency)
        fail("Use the academy currency for trial fees.");
      if (
        data.paidTrialsAllowed &&
        (!data.defaultFeeMinor || !data.feeRuleNote)
      )
        fail(
          "Paid trial rules require an amount and an approved billing explanation.",
        );
      result = repo.savePolicy(ctx.academy.id, {
        ...data,
        version: old.version + 1,
      });
    } else if (command.action === "create") {
      const data = z
        .object({
          playerId: id,
          squadId: id,
          coachId: id,
          startDate: z.iso.date(),
          endDate: z.iso.date(),
          pricing: z.enum(["FREE", "PAID"]),
          feeMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
          currency,
        })
        .parse(command.data);
      const player = requirePlayer(ctx, data.playerId),
        squad = people.find(ctx.academy.id, "squad", data.squadId),
        coach = people.membership(ctx.academy.id, data.coachId),
        policy = repo.policy(ctx.academy.id, ctx.academy.currency);
      if (player.status === "INACTIVE")
        fail(
          "Restore the archived player profile before creating an enrolment.",
        );
      if (
        !squad ||
        !squad.playerIds.includes(player.id) ||
        player.squadId !== squad.id ||
        player.coachId !== data.coachId ||
        !coach ||
        !["OWNER", "ADMIN", "COACH"].includes(coach.role)
      )
        fail("Choose the player's current batch and active assigned coach.");
      if (
        data.endDate < data.startDate ||
        (Date.parse(data.endDate) - Date.parse(data.startDate)) / 86400000 > 365
      )
        fail("Trial end must follow its start, within 366 inclusive days.");
      if (data.currency !== ctx.academy.currency)
        fail("Use the academy currency for trial fees.");
      if (data.pricing === "FREE" && data.feeMinor !== 0)
        fail("A free trial has no fee.");
      if (
        data.pricing === "PAID" &&
        (!policy.paidTrialsAllowed ||
          data.feeMinor !== policy.defaultFeeMinor ||
          !policy.feeRuleNote)
      )
        fail("Paid trial must follow the currently approved academy fee rule.");
      if (
        repo
          .list(ctx.academy.id)
          .some(
            (t) =>
              t.playerId === player.id &&
              ["SCHEDULED", "ACTIVE", "COMPLETED"].includes(
                effective(t, today(ctx)),
              ),
          )
      )
        fail(
          "Resolve the player's existing trial enrolment before creating another.",
          409,
        );
      const status: TrialStatus =
        data.startDate > today(ctx)
          ? "SCHEDULED"
          : data.endDate < today(ctx)
            ? "EXPIRED"
            : "ACTIVE";
      result = repo.save(
        {
          ...data,
          id: randomUUID(),
          academyId: ctx.academy.id,
          sportId: "football",
          version: 1,
          status,
          feedback: "",
          createdAt: at,
          history: [
            {
              status,
              by: ctx.user.id,
              at,
              reason: "Trial enrolment created; no charge issued.",
            },
          ],
        },
        0,
      );
      people.save(ctx.academy.id, "player", { ...player, status: "TRIAL" });
    } else {
      const old = available(ctx, command.id ?? "");
      if (command.action === "convert" && old.status === "CONVERTED")
        return old;
      version(old, command.expectedVersion);
      const next = { ...old, version: old.version + 1 };
      if (command.action === "transition") {
        const data = z
          .object({
            status: z.enum([
              "ACTIVE",
              "COMPLETED",
              "EXPIRED",
              "CANCELLED",
              "NOT_CONVERTED",
            ]),
            reason: text,
          })
          .parse(command.data);
        if (!transitions[old.status]?.includes(data.status))
          fail("This trial status transition is unavailable.");
        if (
          data.status === "ACTIVE" &&
          (today(ctx) < old.startDate || today(ctx) > old.endDate)
        )
          fail("Only activate a trial during its dated enrolment period.");
        if (data.status === "EXPIRED" && today(ctx) <= old.endDate)
          fail("The trial period has not expired.");
        next.status = data.status;
        next.history = [
          ...old.history,
          { ...data, status: data.status, by: ctx.user.id, at },
        ];
      } else if (command.action === "feedback") {
        const data = z.object({ feedback: text }).parse(command.data);
        next.feedback = data.feedback;
        next.reviewedSummary = undefined;
        next.publishedSummary = undefined;
      } else if (command.action === "review") {
        const data = z
            .object({ summary: text, reviewed: z.literal(true) })
            .parse(command.data),
          { sources, fingerprint } = source(ctx, old);
        if (
          !sources.evidenceIds.length &&
          !/insufficient reviewed evidence/i.test(data.summary)
        )
          fail(
            "No eligible reviewed observations exist. The summary must state insufficient reviewed evidence.",
          );
        next.reviewedSummary = {
          body: data.summary,
          sourceFingerprint: fingerprint,
          reviewedBy: ctx.user.id,
          at,
        };
        next.publishedSummary = undefined;
      } else if (command.action === "publish") {
        z.object({ publish: z.literal(true) }).parse(command.data);
        const p = project(ctx, old);
        if (!p.reviewedSummary)
          fail(
            "Review the summary against current trial records before parent publication.",
            409,
          );
        next.publishedSummary = {
          body: p.reviewedSummary.body,
          sourceFingerprint: p.reviewedSummary.sourceFingerprint,
          publishedBy: ctx.user.id,
          at,
        };
      } else if (command.action === "convert") {
        const data = z
          .object({ reviewed: z.literal(true), reason: text })
          .parse(command.data);
        if (
          !["ACTIVE", "COMPLETED", "EXPIRED"].includes(
            effective(old, today(ctx)),
          )
        )
          fail("Only active, completed or expired trials can be converted.");
        const player = requirePlayer(ctx, old.playerId);
        if (player.status === "INACTIVE")
          fail("Restore the archived profile before conversion.");
        next.status = "CONVERTED";
        next.history = [
          ...old.history,
          { status: "CONVERTED", by: ctx.user.id, at, reason: data.reason },
        ];
        people.save(ctx.academy.id, "player", { ...player, status: "ACTIVE" });
      }
      result = repo.save(next, old.version);
    }
    audit(
      ctx.academy.id,
      ctx.user.id,
      `Trial ${command.action}`,
      "playerId" in result ? result.id : ctx.academy.id,
    );
    database()
      .prepare(
        "INSERT INTO academy_trial_submissions(academyId,userId,requestId,digest,response) VALUES(?,?,?,?,?)",
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
function invoiceTrial(
  context: WorkspaceAccess,
  command: z.infer<typeof commandSchema>,
): TrialEnrolment {
  const ctx = current(context);
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const old = available(ctx, command.id ?? "");
  z.object({ reviewed: z.literal(true), dueDate: z.iso.date() }).parse(
    command.data,
  );
  if (old.invoiceId) return old;
  version(old, command.expectedVersion);
  const policy = repo.policy(ctx.academy.id, ctx.academy.currency);
  if (
    old.pricing !== "PAID" ||
    !policy.paidTrialsAllowed ||
    old.feeMinor !== policy.defaultFeeMinor ||
    !policy.feeRuleNote ||
    ["CANCELLED", "NOT_CONVERTED"].includes(old.status)
  )
    fail(
      "Trial is not eligible for an invoice under the current approved fee rule.",
    );
  const label = `Trial enrolment ${old.id}`;
  const existing = financeRepository
    .list(ctx.academy.id, "invoice")
    .find(
      (i) =>
        i.playerId === old.playerId &&
        i.label === label &&
        i.periodStart === old.startDate &&
        i.periodEnd === old.endDate,
    );
  const invoice =
    existing ??
    financeActionInTransaction(ctx, {
      requestId: command.requestId,
      action: "invoice",
      data: {
        playerId: old.playerId,
        label,
        chargeMinor: old.feeMinor,
        currency: old.currency,
        periodStart: old.startDate,
        periodEnd: old.endDate,
        dueDate: (command.data as { dueDate: string }).dueDate,
      },
    });
  if (
    !("chargeMinor" in invoice) ||
    invoice.chargeMinor !== old.feeMinor ||
    invoice.currency !== old.currency
  )
    fail("Existing trial invoice does not match the reviewed fee rule.", 409);
  const result = repo.save(
    { ...old, version: old.version + 1, invoiceId: invoice.id },
    old.version,
  );
  audit(ctx.academy.id, ctx.user.id, "Trial invoice explicitly issued", old.id);
  return result;
}
