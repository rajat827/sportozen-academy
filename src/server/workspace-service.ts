import { generalNutritionGuidance } from "@/config/communication/nutrition-guidance";
import "server-only";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import type {
  AcademyConfiguration,
  WorkspaceKind,
  WorkspacePayload,
  WorkspacePlan,
  WorkspaceReport,
  WorkspaceRecords,
  WorkspaceUpdate,
} from "@/domain/workspace";
import type { ReportViewModel } from "@/domain/report";
import { operationalSports } from "@/config/sports/workspace-sports";
import { workspaceRepository as repo } from "./workspace-repository";
import { database, atomic, audit } from "./database";
import { authenticatedUser, WorkspaceError } from "./auth";
import {
  access,
  requireRole,
  requireModule,
  requireSport,
  requirePlayer,
  visibleRecords,
  visibleRecord,
  type WorkspaceAccess,
} from "./workspace-access";
import {
  academySchema,
  playerSchema,
  planSchema,
  reportSchema,
  drillSchema,
  updateSchema,
  inviteSchema,
} from "./workspace-schemas";
export const kinds: WorkspaceKind[] = [
  "player",
  "plan",
  "report",
  "drill",
  "branch",
  "program",
  "update",
  "conversation",
  "fee",
  "preference",
  "dietary",
];
const staff = ["OWNER", "ADMIN", "COACH"] as const;
const now = () => new Date().toISOString();
export function workspaces(userId: string) {
  return database()
    .prepare(
      "SELECT a.config,m.role,m.id AS membershipId FROM academy_workspaces a JOIN academy_memberships m ON m.academyId=a.id WHERE m.userId=? AND m.active=1 AND (m.expiresAt IS NULL OR m.expiresAt>?)",
    )
    .all(userId, now())
    .map((row) => ({
      academy: JSON.parse(String(row.config)) as AcademyConfiguration,
      role: String(row.role),
      membershipId: String(row.membershipId),
    }));
}
function region(config: ReturnType<typeof academySchema.parse>) {
  try {
    new Intl.DateTimeFormat(config.dateLocale, { timeZone: config.timezone });
    new Intl.NumberFormat(config.dateLocale, {
      style: "currency",
      currency: config.currency,
    });
  } catch {
    throw new WorkspaceError(
      400,
      "Choose valid regional formatting and time zone settings.",
    );
  }
}
export async function createAcademy(headers: Headers, input: unknown) {
  const user = await authenticatedUser(headers),
    value = academySchema.parse(input);
  region(value);
  const id = randomUUID();
  const academy: AcademyConfiguration = {
    ...value,
    id,
    academyId: id,
    nutritionOptional: true,
    onboardingStatus: "CONFIGURING",
  };
  atomic(() => {
    database()
      .prepare("INSERT INTO academy_workspaces(id,config) VALUES(?,?)")
      .run(id, JSON.stringify(academy));
    database()
      .prepare(
        "INSERT INTO academy_memberships(id,academyId,userId,role,active) VALUES(?,?,?,?,1)",
      )
      .run(randomUUID(), id, user.id, "OWNER");
    database()
      .prepare(
        "INSERT INTO platform_entitlements(academyId,tier,modules,status) VALUES(?,?,?,?)",
      )
      .run(id, "LOCAL_FOUNDATION", JSON.stringify(value.modules), "ACTIVE");
    audit(id, user.id, "Academy created; empty workspace");
  });
  return academy;
}
export function workspace(ctx: WorkspaceAccess): WorkspacePayload {
  const records = Object.fromEntries(
    kinds.map((kind) => [kind, visibleRecords(ctx, kind)]),
  ) as WorkspacePayload["records"];
  const members = ["OWNER", "ADMIN", "COACH"].includes(ctx.membership.role)
    ? database()
        .prepare(
          `SELECT m.id,m.userId,m.role,m.active,u.name FROM academy_memberships m JOIN "user" u ON u.id=m.userId WHERE m.academyId=? AND (?<>'COACH' OR m.userId=? OR m.role IN ('OWNER','ADMIN') OR (m.role='PARENT' AND EXISTS(SELECT 1 FROM guardian_relationships g JOIN workspace_records p ON p.academyId=g.academyId AND p.id=g.playerId AND p.kind='player' WHERE g.academyId=m.academyId AND g.userId=m.userId AND json_extract(p.body,'$.coachId')=?)))`,
        )
        .all(ctx.academy.id,ctx.membership.role,ctx.user.id,ctx.user.id)
        .map((r) => ({
          id: String(r.id),
          userId: String(r.userId),
          role: r.role as WorkspacePayload["members"][number]["role"],
          active: Boolean(r.active),
          name: String(r.name),
        }))
    : [];
  return { academy: ctx.academy, membership: ctx.membership, records, members };
}
export function updateAcademy(ctx: WorkspaceAccess, input: unknown) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const value = academySchema.parse(input);
  region(value);
  const usedSports = repo.list(ctx.academy.id, "plan").map((p) => p.sportId);
  if (usedSports.some((s) => !value.sportIds.includes(s)))
    throw new WorkspaceError(
      409,
      "A sport with existing plans cannot be disabled.",
    );
  const academy = { ...ctx.academy, ...value };
  database()
    .prepare("UPDATE academy_workspaces SET config=? WHERE id=?")
    .run(JSON.stringify(academy), academy.id);
  audit(academy.id, ctx.user.id, "Academy configuration updated");
  return academy;
}
function coach(ctx: WorkspaceAccess, userId: string) {
  const m = repo.membership(ctx.academy.id, userId);
  if (!m || !staff.includes(m.role as (typeof staff)[number]))
    throw new WorkspaceError(
      400,
      "Assign an active staff member in this academy.",
    );
  if (ctx.membership.role === "COACH" && userId !== ctx.user.id)
    throw new WorkspaceError(403, "Coaches can assign their own player plans.");
}
function planLinks(ctx: WorkspaceAccess, p: WorkspacePlan) {
  const player = requirePlayer(ctx, p.playerId);
  requireSport(ctx, p.sportId);
  if (!player.sportIds.includes(p.sportId))
    throw new WorkspaceError(400, "Player is not enrolled in this sport.");
  coach(ctx, p.coachId);
  if (!operationalSports[p.sportId].skills.includes(p.focus))
    throw new WorkspaceError(
      400,
      "Choose a skill from this sport configuration.",
    );
  for (const id of p.drillIds) {
    const drill = repo.find(ctx.academy.id, "drill", id);
    if (!drill || drill.sportId !== p.sportId)
      throw new WorkspaceError(
        400,
        "Every drill must belong to this academy and sport.",
      );
  }
}
const banned =
  /weight.loss|calorie.restrict|medical.diet|supplement|prescri|diagnos|treat(?:ment)?|injury.recovery.diet/i;
export function saveRecord(
  ctx: WorkspaceAccess,
  kind: WorkspaceKind,
  input: unknown,
  id: string = randomUUID(),
) {
  requireModule(ctx, kind);
  const base = { id, academyId: ctx.academy.id };
  let record: WorkspaceRecords[WorkspaceKind];
  if (!["preference", "dietary", "conversation"].includes(kind))
    requireRole(ctx, [...staff]);
  switch (kind) {
    case "player": {
      const value = playerSchema.parse(input);
      value.sportIds.forEach((s) => requireSport(ctx, s));
      coach(ctx, value.coachId);
      record = { ...base, ...value };
      break;
    }
    case "plan": {
      const value = { ...base, ...planSchema.parse(input) };
      planLinks(ctx, value);
      record = value;
      break;
    }
    case "report": {
      const value = reportSchema.parse(input),
        plan = visibleRecord(ctx, "plan", value.planId);
      if (plan.playerId !== value.playerId || plan.sportId !== value.sportId)
        throw new WorkspaceError(
          400,
          "Report must match its player and sport plan.",
        );
      requireSport(ctx, value.sportId);
      record = {
        ...base,
        ...value,
        status: "Draft",
        externalDeliveryStatus: "NOT_SENT",
      };
      break;
    }
    case "drill": {
      const value = drillSchema.parse(input);
      requireSport(ctx, value.sportId);
      if (!operationalSports[value.sportId].skills.includes(value.focusArea))
        throw new WorkspaceError(
          400,
          "Drill focus must use this sport's vocabulary.",
        );
      record = { ...base, ...value, ownership: "ACADEMY_CURRICULUM" };
      break;
    }
    case "branch": {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const value = z
        .object({
          name: z.string().trim().min(2).max(200),
          timezone: z.string().max(100),
        })
        .parse(input);
      try {
        new Intl.DateTimeFormat("en", { timeZone: value.timezone });
      } catch {
        throw new WorkspaceError(400, "Invalid branch time zone.");
      }
      record = { ...base, ...value };
      break;
    }
    case "program": {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const value = z
        .object({
          name: z.string().min(2).max(200),
          sportId: z.string(),
          branchId: z.string(),
        })
        .parse(input);
      requireSport(ctx, value.sportId);
      if (!repo.find(ctx.academy.id, "branch", value.branchId))
        throw new WorkspaceError(400, "Choose a branch in this academy.");
      record = { ...base, ...value };
      break;
    }
    case "update": {
      const value = updateSchema.parse(input);
      requirePlayer(ctx, value.playerId);
      requireSport(ctx, value.sportId);
      const p = visibleRecord(ctx, "plan", value.planId);
      if (p.playerId !== value.playerId || p.sportId !== value.sportId)
        throw new WorkspaceError(400, "Update plan does not match.");
      if (banned.test(value.messageBody))
        throw new WorkspaceError(
          400,
          "Medical or unsupported nutrition recommendations are not allowed.",
        );
      if (value.sourceReportId) {
        const r = repo.find(ctx.academy.id, "report", value.sourceReportId);
        if (
          !r ||
          r.playerId !== value.playerId ||
          r.sportId !== value.sportId ||
          r.status !== "Approved"
        )
          throw new WorkspaceError(
            400,
            "Choose the player's approved sport report.",
          );
      }
      const existing = repo.find(ctx.academy.id, "update", id);
      record = {
        ...base,
        ...value,
        version: (existing?.version ?? 0) + 1,
        approvalStatus: "DRAFT",
        inAppPublicationStatus: "UNPUBLISHED",
        externalDeliveryStatus: "NOT_SENT",
      };
      break;
    }
    case "conversation": {
      requireRole(ctx, [...staff, "PARENT"]);
      const value = z
        .object({
          playerId: z.string(),
          guardianId: z.string(),
          subject: z.string().min(2).max(200),
        })
        .parse(input);
      requirePlayer(ctx, value.playerId);
      if (ctx.membership.role === "PARENT" && value.guardianId !== ctx.user.id)
        throw new WorkspaceError(
          403,
          "Only your own private conversation can be created.",
        );
      if (
        !database()
          .prepare(
            "SELECT 1 FROM guardian_relationships WHERE academyId=? AND userId=? AND playerId=?",
          )
          .get(ctx.academy.id, value.guardianId, value.playerId)
      )
        throw new WorkspaceError(
          403,
          "An authorised guardian relationship is required.",
        );
      record = { ...base, ...value, status: "OPEN", messages: [] };
      break;
    }
    case "preference": {
      requireRole(ctx, ["PARENT"]);
      const value = z
        .object({
          nutrition: z.boolean(),
          development: z.boolean(),
          inApp: z.boolean(),
          language: z.string().max(50),
          quietStart: z.string().regex(/^(?:\d\d:\d\d)?$/),
          quietEnd: z.string().regex(/^(?:\d\d:\d\d)?$/),
        })
        .parse(input);
      record = {
        ...base,
        id: ctx.user.id,
        userId: ctx.user.id,
        ...value,
        externalEnabled: false,
      };
      break;
    }
    case "dietary": {
      requireRole(ctx, ["PARENT"]);
      const value = z
        .object({ playerId: z.string(), note: z.string().max(2000) })
        .parse(input);
      requirePlayer(ctx, value.playerId);
      record = {
        ...base,
        id: `${ctx.user.id}-${value.playerId}`,
        userId: ctx.user.id,
        ...value,
      };
      break;
    }
    case "fee": {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const value = z
        .object({
          playerId: z.string(),
          amountMinor: z
            .number()
            .int()
            .nonnegative()
            .max(Number.MAX_SAFE_INTEGER),
          currency: z.string().regex(/^[A-Z]{3}$/),
          label: z.string().min(1).max(200),
        })
        .parse(input);
      requirePlayer(ctx, value.playerId);
      record = { ...base, ...value };
      break;
    }
    default:
      throw new WorkspaceError(400, "Unsupported record kind.");
  }
  atomic(() => {
    repo.save(ctx.academy.id, kind, record);
    audit(
      ctx.academy.id,
      ctx.user.id,
      "Record saved; approval cleared for edited reports/updates",
      record.id,
    );
  });
  return record;
}
export function approveReport(
  ctx: WorkspaceAccess,
  id: string,
  verified: boolean,
) {
  requireRole(ctx, [...staff]);
  if (!verified)
    throw new WorkspaceError(400, "Verify the source records before approval.");
  const report = visibleRecord(ctx, "report", id),
    plan = visibleRecord(ctx, "plan", report.planId),
    player = requirePlayer(ctx, report.playerId);
  if (report.status === "Approved")
    throw new WorkspaceError(
      409,
      "Edit and save a draft before approving a new report version.",
    );
  planLinks(ctx, plan);
  const assigned = plan.drillIds.map((id) =>
    repo.find(ctx.academy.id, "drill", id)!,
  );
  const coachName = database()
    .prepare('SELECT name FROM "user" WHERE id=?')
    .get(plan.coachId)?.name;
  const { privateNote: _private, ...approvedPlan } = plan;
  void _private;
  const snapshot: ReportViewModel = {
    reportId: report.id,
    playerId: player.id,
    academy: ctx.academy.name,
    brandAccent: ctx.academy.brandAccent,
    logoData: ctx.academy.logoData || undefined,
    player: player.name,
    period: report.period,
    status: "Approved",
    externalDelivery: "Not sent",
    demo: ctx.academy.demo,
    sport: operationalSports[report.sportId].name,
    squad: player.squad || undefined,
    coach: coachName ? String(coachName) : undefined,
    focus: plan.focus,
    reviewedReason: plan.reason,
    practised: assigned.length
      ? assigned.map((d) => d.name).join("; ")
      : plan.focus,
    activities: assigned.map((d) => ({ name: d.name, purpose: d.purpose })),
    evidence: [
      {
        text: report.observation,
        source:
          report.evidenceType === "AI_ESTIMATE"
            ? "AI estimate - coach reviewed"
            : report.evidenceType.replaceAll("_", " ").toLowerCase(),
      },
    ],
    nextStep: report.nextStep,
    observationCriteria: plan.observe,
    reviewDate: plan.reviewDate,
    note: report.closingNote,
  };
  const approved: WorkspaceReport = {
    ...report,
    status: "Approved",
    snapshot,
    approvedPlan,
    externalDeliveryStatus: "NOT_SENT",
  };
  atomic(() => {
    repo.save(ctx.academy.id, "report", approved);
    database()
      .prepare(
        "INSERT INTO report_approval_history(id,academyId,reportId,snapshot,approvedPlan,approvedBy,at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        ctx.academy.id,
        id,
        JSON.stringify(snapshot),
        JSON.stringify(approvedPlan),
        ctx.user.id,
        now(),
      );
    audit(
      ctx.academy.id,
      ctx.user.id,
      "Report source verified and approved",
      id,
    );
  });
  return approved;
}
export const nutritionGuidance = generalNutritionGuidance;
export function reviewUpdate(
  ctx: WorkspaceAccess,
  id: string,
  action: "submit" | "approve" | "reject",
  verified: boolean,
) {
  requireRole(ctx, [...staff]);
  const record = visibleRecord(ctx, "update", id);
  let next: WorkspaceUpdate = { ...record, externalDeliveryStatus: "NOT_SENT" };
  if (action === "submit") {
    if (!["DRAFT", "REJECTED"].includes(record.approvalStatus))
      throw new WorkspaceError(
        409,
        "Only a draft or rejected update can be submitted.",
      );
    next.approvalStatus = "PENDING_APPROVAL";
  } else {
    if (record.approvalStatus !== "PENDING_APPROVAL")
      throw new WorkspaceError(409, "Submit this draft for review first.");
    if (action === "reject") next.approvalStatus = "REJECTED";
    else {
      if (record.type === "NUTRITION_HYDRATION")
        requireRole(ctx, ["OWNER", "ADMIN"]);
      if (!verified)
        throw new WorkspaceError(
          400,
          "Verify player, guardian and approved source records.",
        );
      if (
        record.type === "NUTRITION_HYDRATION" &&
        record.messageBody !== nutritionGuidance
      )
        throw new WorkspaceError(
          400,
          "Only the approved general nutrition guideline is allowed.",
        );
      if (record.type === "DEVELOPMENT") {
        const r = record.sourceReportId
          ? repo.find(ctx.academy.id, "report", record.sourceReportId)
          : undefined;
        if (
          !r ||
          r.status !== "Approved" ||
          !r.snapshot ||
          r.playerId !== record.playerId ||
          r.sportId !== record.sportId
        )
          throw new WorkspaceError(
            400,
            "An approved report for this player and sport is required.",
          );
      }
      const guardians = database()
        .prepare(
          "SELECT g.userId FROM guardian_relationships g JOIN academy_memberships m ON m.academyId=g.academyId AND m.userId=g.userId WHERE g.academyId=? AND g.playerId=? AND m.role='PARENT' AND m.active=1",
        )
        .all(ctx.academy.id, record.playerId)
        .map((r) => String(r.userId));
      next = {
        ...next,
        approvalStatus: "APPROVED",
        approvedBody: record.messageBody,
        approvedSource:
          record.type === "NUTRITION_HYDRATION"
            ? { guideline: nutritionGuidance, approval: "ACADEMY_APPROVED" }
            : repo.find(ctx.academy.id, "report", record.sourceReportId!)!
                .snapshot,
        inAppPublicationStatus: "PUBLISHED",
        publishedGuardianIds: guardians.filter((id) => {
          const p = repo.find(ctx.academy.id, "preference", id);
          return (
            (!p || p.inApp) &&
            (record.type === "NUTRITION_HYDRATION"
              ? p?.nutrition === true
              : p?.development !== false)
          );
        }),
      };
      if (!next.publishedGuardianIds?.length)
        next.inAppPublicationStatus = "UNPUBLISHED";
    }
  }
  atomic(() => {
    repo.save(ctx.academy.id, "update", next);
    if (action === "approve")
      database()
        .prepare(
          "INSERT INTO update_approval_history(id,academyId,updateId,version,body,source,approvedBy,at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          ctx.academy.id,
          id,
          next.version,
          next.approvedBody!,
          JSON.stringify(next.approvedSource),
          ctx.user.id,
          now(),
        );
  });
  audit(
    ctx.academy.id,
    ctx.user.id,
    `Update ${action}; external delivery NOT_SENT`,
    id,
  );
  return next;
}
export function reply(ctx: WorkspaceAccess, id: string, input: unknown) {
  requireRole(ctx, [...staff, "PARENT"]);
  const value = z
      .object({
        body: z.string().trim().min(1).max(5000),
        internal: z.boolean().default(false),
        action: z.enum(["reply", "close", "reopen"]).default("reply"),
      })
      .parse(input),
    authorisedConversation = visibleRecord(ctx, "conversation", id),
    conversation = repo.find(
      ctx.academy.id,
      "conversation",
      authorisedConversation.id,
    )!;
  if (value.internal && ctx.membership.role === "PARENT")
    throw new WorkspaceError(403, "Parents cannot create staff-only notes.");
  if (value.action === "reply" && conversation.status !== "OPEN")
    throw new WorkspaceError(409, "Reopen the conversation before replying.");
  const next = {
    ...conversation,
    messages:
      value.action === "reply"
        ? [
            ...conversation.messages,
            {
              id: randomUUID(),
              senderId: ctx.user.id,
              senderRole: ctx.membership.role,
              body: value.body,
              internal: value.internal,
              at: now(),
            },
          ]
        : conversation.messages,
    status:
      value.action === "close"
        ? ("CLOSED" as const)
        : value.action === "reopen"
          ? ("OPEN" as const)
          : conversation.status,
  };
  repo.save(ctx.academy.id, "conversation", next);
  audit(
    ctx.academy.id,
    ctx.user.id,
    `Conversation ${value.action}${value.internal ? " staff-only note" : ""}`,
    id,
  );
  return ctx.membership.role === "PARENT"
    ? { ...next, messages: next.messages.filter((m) => !m.internal) }
    : next;
}
export function invite(ctx: WorkspaceAccess, input: unknown) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const value = inviteSchema.parse(input);
  if (value.role !== "PARENT" && value.playerIds.length)
    throw new WorkspaceError(
      400,
      "Staff invitations cannot create guardian relationships.",
    );
  if (
    value.role === "PARENT" &&
    (!value.guardianVerified || !value.playerIds.length)
  )
    throw new WorkspaceError(
      400,
      "Explicitly verify the guardian relationship and linked player.",
    );
  value.playerIds.forEach((id) => requirePlayer(ctx, id));
  const token = randomBytes(32).toString("hex"),
    id = randomUUID();
  database()
    .prepare(
      "INSERT INTO workspace_invitations(id,academyId,email,role,playerIds,tokenHash,expiresAt) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      id,
      ctx.academy.id,
      value.email.toLowerCase(),
      value.role,
      JSON.stringify(value.playerIds),
      createHash("sha256").update(token).digest("hex"),
      new Date(Date.now() + 86400000 * 7).toISOString(),
    );
  audit(
    ctx.academy.id,
    ctx.user.id,
    "Invitation prepared for manual sharing; not sent",
    id,
  );
  return { id, token, status: "NOT_SENT" };
}
export async function acceptInvitation(headers: Headers, token: string) {
  const user = await authenticatedUser(headers),
    hash = createHash("sha256").update(token).digest("hex");
  const invitation = database()
    .prepare(
      "SELECT * FROM workspace_invitations WHERE tokenHash=? AND acceptedAt IS NULL AND expiresAt>?",
    )
    .get(hash, now());
  if (
    !invitation ||
    String(invitation.email).toLowerCase() !== user.email.toLowerCase()
  )
    throw new WorkspaceError(
      403,
      "Invitation is invalid or belongs to a different account.",
    );
  const academyId = String(invitation.academyId);
  if (repo.membership(academyId, user.id))
    throw new WorkspaceError(
      409,
      "Account already has an active academy membership.",
    );
  atomic(() => {
    database()
      .prepare(
        "INSERT INTO academy_memberships(id,academyId,userId,role,active) VALUES(?,?,?,?,1) ON CONFLICT(academyId,userId) DO UPDATE SET role=excluded.role,active=1",
      )
      .run(randomUUID(), academyId, user.id, String(invitation.role));
    database()
      .prepare(
        "DELETE FROM guardian_relationships WHERE academyId=? AND userId=?",
      )
      .run(academyId, user.id);
    for (const playerId of (invitation.role === "PARENT"
      ? JSON.parse(String(invitation.playerIds))
      : []) as string[])
      database()
        .prepare(
          "INSERT OR IGNORE INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
        )
        .run(academyId, user.id, playerId);
    database()
      .prepare("UPDATE workspace_invitations SET acceptedAt=? WHERE id=?")
      .run(now(), String(invitation.id));
    audit(
      academyId,
      user.id,
      "Explicit academy invitation accepted",
      String(invitation.id),
    );
  });
  return { academyId };
}
export function revokeMembership(ctx: WorkspaceAccess, id: string) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const membership = database()
    .prepare("SELECT * FROM academy_memberships WHERE academyId=? AND id=?")
    .get(ctx.academy.id, id);
  if (!membership) throw new WorkspaceError(404, "Membership not found.");
  if (membership.role === "OWNER")
    throw new WorkspaceError(
      403,
      "Owner transfer is required before revocation.",
    );
  database()
    .prepare(
      "UPDATE academy_memberships SET active=0 WHERE academyId=? AND id=?",
    )
    .run(ctx.academy.id, id);
  audit(ctx.academy.id, ctx.user.id, "Membership revoked", id);
}
export async function context(headers: Headers, academyId: string) {
  return access(headers, academyId);
}
