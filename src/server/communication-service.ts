import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  CommunicationSettings,
  GuardianContact,
  NotificationType,
  DeliveryJob,
} from "@/domain/communication";
import {
  periodFor,
  localClock,
  shiftDate,
  quiet,
  inPeriod,
} from "@/services/communication/period-rules";
import { resolveSessionTime } from "@/services/training-rules";
import { templateParameters } from "@/services/communication/whatsapp-templates";
import { privateSourcePath } from "@/services/communication/private-source-path";
import { communicationRepository as comm } from "./communication-repository";
import { workspaceRepository as repo } from "./workspace-repository";
import { MetaWhatsAppProvider } from "./whatsapp-provider";
import { weeklyCurrent } from "./period-service";
import { monthlySourceData } from "./monthly-source-data";
import {
  requireRole,
  requireModule,
  requirePlayer,
  visibleRecord,
  visibleRecords,
  type WorkspaceAccess,
} from "./workspace-access";
import { atomic, database, audit } from "./database";
import { WorkspaceError } from "./auth";
import { announcementDispatchCheck } from "./batch-announcement-service";
export function defaults(
  academyId: string,
  timezone: string,
): CommunicationSettings {
  return {
    academyId,
    timezone,
    version: 0,
    enabled: false,
    paused: true,
    weeklyDay: 0,
    weeklyTime: "18:00",
    weeklyLeadDays: 1,
    weeklyDraftEnabled: false,
    weeklyDraftLeadDays: 2,
    weeklyDraftTime: "09:00",
    announcementTemplate: "",
    monthlyDraftDay: 1,
    monthlyDay: 3,
    monthlyTime: "18:00",
    quietStart: "21:00",
    quietEnd: "08:00",
    phoneNumberId: "",
    wabaId: "",
    credentialRef: "",
    weeklyTemplate: "sportozen_weekly_training",
    monthlyTemplate: "sportozen_monthly_report",
    language: "en_GB",
    mode: "TEST",
    connection: "Not configured",
  };
}
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  text = z.string().trim().max(200);
const settingsSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  timezone: text.min(1),
  enabled: z.boolean(),
  paused: z.boolean(),
  weeklyDay: z.number().int().min(0).max(6),
  weeklyTime: time,
  weeklyLeadDays: z.number().int().min(0).max(6),
  weeklyDraftEnabled: z.boolean().default(false),
  weeklyDraftLeadDays: z.number().int().min(0).max(6).default(2),
  weeklyDraftTime: time.default("09:00"),
  announcementTemplate: z
    .string()
    .regex(/^[a-z0-9_]*$/)
    .default(""),
  monthlyDraftDay: z.number().int().min(1).max(28),
  monthlyDay: z.number().int().min(1).max(28),
  monthlyTime: time,
  quietStart: time,
  quietEnd: time,
  phoneNumberId: z.string().regex(/^\d*$/),
  wabaId: z.string().regex(/^\d*$/),
  credentialRef: z.string().regex(/^(SPORTOZEN_WA_[A-Z0-9_]+)?$/),
  weeklyTemplate: z.string().regex(/^[a-z0-9_]+$/),
  monthlyTemplate: z.string().regex(/^[a-z0-9_]+$/),
  language: z.literal("en_GB"),
  mode: z.enum(["TEST", "LIVE"]),
});
export function authorisedGuardian(
  academyId: string,
  guardianId: string,
  playerId?: string,
) {
  const m = repo.membership(academyId, guardianId);
  if (m?.role !== "PARENT") return false;
  return !!database()
    .prepare(
      `SELECT 1 FROM guardian_relationships WHERE academyId=? AND userId=?${playerId ? " AND playerId=?" : ""}`,
    )
    .get(
      ...(playerId
        ? [academyId, guardianId, playerId]
        : [academyId, guardianId]),
    );
}
export function communicationView(ctx: WorkspaceAccess) {
  requireModule(ctx, "update");
  const parent = ctx.membership.role === "PARENT";
  requireRole(ctx, ["OWNER", "ADMIN", "COACH", "PARENT"]);
  const players = new Set(visibleRecords(ctx, "player").map((p) => p.id));
  const jobs = comm
    .jobs(ctx.academy.id)
    .filter(
      (j) =>
        players.has(j.playerId) && (!parent || j.guardianId === ctx.user.id),
    );
  const contacts = database()
    .prepare("SELECT body FROM guardian_contacts WHERE academyId=?")
    .all(ctx.academy.id)
    .map((r) => JSON.parse(String(r.body)) as GuardianContact)
    .filter((c) =>
      parent
        ? c.guardianId === ctx.user.id
        : database()
            .prepare(
              "SELECT playerId FROM guardian_relationships WHERE academyId=? AND userId=?",
            )
            .all(ctx.academy.id, c.guardianId)
            .some((r) => players.has(String(r.playerId))),
    );
  const settings =
    comm.settings(ctx.academy.id) ??
    defaults(ctx.academy.id, ctx.academy.timezone);
  return {
    settings: parent
      ? { mode: settings.mode, connection: settings.connection }
      : settings,
    contacts,
    jobs,
    reminders: parent
      ? []
      : database()
          .prepare("SELECT * FROM communication_reminders WHERE academyId=?")
          .all(ctx.academy.id)
          .filter((r) => players.has(String(r.playerId))),
    unrouted: !["OWNER", "ADMIN"].includes(ctx.membership.role)
      ? []
      : database()
          .prepare(
            "SELECT id,receivedAt,outcome,body FROM communication_events WHERE academyId=? AND outcome IN ('AMBIGUOUS_CHILD','UNKNOWN_CONTACT','UNSUPPORTED_MESSAGE')",
          )
          .all(ctx.academy.id)
          .map((row) => {
            const message = JSON.parse(String(row.body)).message;
            const contact = contacts.find(
              (c) => c.phone === `+${message?.from}`,
            );
            return {
              id: String(row.id),
              receivedAt: String(row.receivedAt),
              outcome: String(row.outcome),
              guardianId:
                row.outcome === "AMBIGUOUS_CHILD"
                  ? contact?.guardianId
                  : undefined,
              body:
                row.outcome === "AMBIGUOUS_CHILD"
                  ? message?.text?.body
                  : undefined,
            };
          }),
  };
}
export function privateSourceUrl(
  academyId: string,
  playerId: string,
  sourceId: string,
  type: NotificationType,
) {
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000")
    .origin;
  return origin + privateSourcePath(academyId, playerId, sourceId, type);
}
export function notificationContent(
  academyId: string,
  type: NotificationType,
  sourceId: string,
) {
  const academy = repo.academy(academyId);
  if (!academy) throw new WorkspaceError(404, "Academy unavailable.");
  if (type === "WEEKLY") {
    const r = repo.find(academyId, "weekly", sourceId);
    if (!r || !weeklyCurrent(academyId, r))
      throw new WorkspaceError(409, "Weekly plan is unapproved or stale.");
    const c = r.snapshot!;
    return {
      playerId: r.playerId,
      period: c.period,
      version: r.version,
      approvedAt: r.approvedAt!,
      correction: r.correctionOf ? r.id : "",
      ...templateParameters(
        type,
        academy.name,
        c.period.key + (r.correctionOf ? " · Reviewed correction" : ""),
        privateSourceUrl(academyId, r.playerId, r.id, type),
        c,
      ),
    };
  }
  const r = repo.find(academyId, "report", sourceId);
  if (!r || r.status !== "Approved" || !r.snapshot || !r.reportingPeriod)
    throw new WorkspaceError(
      409,
      "Approve an explicit-period monthly report first.",
    );
  for (const evidenceId of r.sourceEvidenceIds ?? []) {
    const e = repo.find(academyId, "evidence", evidenceId),
      session = e ? repo.find(academyId, "session", e.sessionId) : undefined;
    if (
      !e ||
      e.playerId !== r.playerId ||
      e.status !== "REVIEWED" ||
      e.visibility !== "PARENT_ELIGIBLE" ||
      !session ||
      session.status !== "COMPLETED" ||
      !inPeriod(session.startAt, r.reportingPeriod) ||
      !inPeriod(e.recordedAt, r.reportingPeriod)
    )
      throw new WorkspaceError(
        409,
        "Monthly notification sources were cancelled, superseded or are no longer parent-eligible.",
      );
  }
  if (
    r.monthlySources &&
    r.monthlySources.trainingFingerprint !==
      monthlySourceData(academyId, r.playerId, r.reportingPeriod).fingerprint
  )
    throw new WorkspaceError(
      409,
      "Monthly training or attendance changed after approval. Prepare and approve a correction before notifying parents.",
    );
  return {
    playerId: r.playerId,
    period: r.reportingPeriod,
    version: r.recordVersion!,
    approvedAt: String(
      database()
        .prepare(
          "SELECT at FROM report_approval_history WHERE academyId=? AND reportId=? ORDER BY at DESC LIMIT 1",
        )
        .get(academyId, r.id)?.at ?? "",
    ),
    correction: r.correctionOf ? r.id : "",
    ...templateParameters(
      type,
      academy.name,
      r.reportingPeriod.key + (r.correctionOf ? " · Reviewed correction" : ""),
      privateSourceUrl(academyId, r.playerId, r.id, type),
    ),
  };
}
export function contactEligible(
  academyId: string,
  guardianId: string,
  playerId: string,
  type: NotificationType | "REPLY",
) {
  const contact = comm.contact(academyId, guardianId);
  const preference = repo.find(academyId, "preference", guardianId);
  if (
    preference &&
    !/^(english|en(?:[-_][a-z]{2})?)$/i.test(preference.language.trim())
  )
    throw new WorkspaceError(
      409,
      "No approved WhatsApp template supports this guardian's preferred language.",
    );
  if (
    !authorisedGuardian(academyId, guardianId, playerId) ||
    !contact?.verifiedAt ||
    !contact.consentAt ||
    contact.optedOutAt ||
    (type === "WEEKLY" && !contact.weekly) ||
    (type === "MONTHLY" && !contact.monthly) ||
    preference?.development === false
  )
    throw new WorkspaceError(
      409,
      "Guardian link, verified contact, consent or preferences do not permit sending.",
    );
  return contact;
}
export function queueNotification(
  academyId: string,
  type: NotificationType,
  sourceId: string,
  guardians: string[],
  dueAt: string,
  expiresAt: string,
) {
  const source = notificationContent(academyId, type, sourceId);
  for (const guardianId of guardians) {
    contactEligible(academyId, guardianId, source.playerId, type);
    const jobId = randomUUID();
    database()
      .prepare(
        "INSERT INTO delivery_jobs(id,academyId,playerId,guardianId,type,sourceId,sourceVersion,period,correction,dueAt,expiresAt,state) VALUES(?,?,?,?,?,?,?,?,?,?,?,'QUEUED') ON CONFLICT(academyId,playerId,guardianId,type,period,correction) DO UPDATE SET sourceId=excluded.sourceId,sourceVersion=excluded.sourceVersion,dueAt=excluded.dueAt,expiresAt=excluded.expiresAt,state='QUEUED',reason=NULL WHERE delivery_jobs.state='CANCELLED' AND delivery_jobs.attempts=0 AND delivery_jobs.claim IS NULL",
      )
      .run(
        jobId,
        academyId,
        source.playerId,
        guardianId,
        type,
        sourceId,
        source.version,
        source.period.key,
        source.correction,
        dueAt,
        expiresAt,
      );
  }
  database()
    .prepare(
      "DELETE FROM communication_reminders WHERE academyId=? AND period=? AND type=? AND playerId=?",
    )
    .run(academyId, source.period.key, type, source.playerId);
}
export function scheduleTimes(
  s: CommunicationSettings,
  type: NotificationType,
  periodKey: string,
) {
  let date: string;
  if (type === "WEEKLY") {
    const base = shiftDate(periodKey, -s.weeklyLeadDays),
      day = new Date(base + "T12:00Z").getUTCDay();
    date = shiftDate(base, -((day - s.weeklyDay + 7) % 7));
    // Sending is before the training period; at most a day's missed-run catch-up.
  } else {
    const period = periodFor(periodKey, s.timezone, "MONTHLY");
    date =
      localClock(new Date(period.endAt), s.timezone).date.slice(0, 7) +
      `-${String(s.monthlyDay).padStart(2, "0")}`;
  }
  const dueAt = resolveSessionTime(
    `${date}T${type === "WEEKLY" ? s.weeklyTime : s.monthlyTime}`,
    s.timezone,
  );
  const cutoff =
    type === "WEEKLY"
      ? periodFor(periodKey, s.timezone, "WEEKLY").startAt
      : periodFor(date.slice(0, 7), s.timezone, "MONTHLY").endAt;
  return {
    dueAt,
    expiresAt:
      type === "WEEKLY"
        ? new Date(
            Math.min(Date.parse(cutoff), Date.parse(dueAt) + 86400000),
          ).toISOString()
        : cutoff,
  };
}
export async function communicationAction(
  ctx: WorkspaceAccess,
  input: unknown,
) {
  requireModule(ctx, "update");
  const cmd = z
    .object({
      action: z.enum([
        "settings",
        "verifyProvider",
        "contact",
        "optOut",
        "queue",
        "cancel",
        "resolveReply",
        "whatsappReply",
      ]),
      data: z.unknown(),
    })
    .parse(input);
  if (cmd.action === "verifyProvider") {
    requireRole(ctx, ["OWNER", "ADMIN"]);
    const s = comm.settings(ctx.academy.id);
    if (!s) throw new WorkspaceError(409, "Configure sender first.");
    let connection: CommunicationSettings["connection"] = "Configuration error";
    try {
      await new MetaWhatsAppProvider(s).verify();
      connection =
        s.mode === "TEST" ? "Ready for controlled testing" : "Connected";
    } catch {
      connection = "Configuration error";
    }
    return atomic(() => {
      const membership = repo.membership(ctx.academy.id, ctx.user.id);
      if (!membership || !["OWNER", "ADMIN"].includes(membership.role))
        throw new WorkspaceError(403, "Sender verification access revoked.");
      if (comm.settings(ctx.academy.id)?.version !== s.version)
        throw new WorkspaceError(409, "Settings changed during verification.");
      const next = {
        ...s,
        version: s.version + 1,
        connection,
        verifiedAt:
          connection === "Configuration error"
            ? undefined
            : new Date().toISOString(),
      };
      comm.saveSettings(next);
      return next;
    });
  }
  return atomic(() => {
    const membership = repo.membership(ctx.academy.id, ctx.user.id),
      academy = repo.academy(ctx.academy.id);
    if (!membership || !academy || membership.role !== ctx.membership.role)
      throw new WorkspaceError(403, "Membership revoked.");
    ctx = { ...ctx, membership, academy };
    requireModule(ctx, "update");
    if (cmd.action === "settings") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const { expectedVersion, ...d } = settingsSchema.parse(cmd.data);
      new Intl.DateTimeFormat("en", { timeZone: d.timezone });
      if (d.timezone !== ctx.academy.timezone)
        throw new WorkspaceError(
          400,
          "Reporting timezone must match the academy's declared timezone. Update academy settings first.",
        );
      if (d.monthlyDraftDay > d.monthlyDay)
        throw new WorkspaceError(
          400,
          "Draft generation must precede notification day.",
        );
      if (d.weeklyDay === 1 && d.weeklyLeadDays === 0)
        throw new WorkspaceError(
          400,
          "A Monday sending schedule needs at least one planning lead day, before the training week begins.",
        );
      if (d.weeklyTemplate === d.monthlyTemplate)
        throw new WorkspaceError(
          400,
          "Use distinct weekly and monthly provider templates.",
        );
      if (
        d.announcementTemplate &&
        [d.weeklyTemplate, d.monthlyTemplate].includes(d.announcementTemplate)
      )
        throw new WorkspaceError(
          400,
          "Use a distinct operational announcement template.",
        );
      if (d.weeklyDraftEnabled) {
        const sample = "2027-01-11";
        const send = scheduleTimes(
          {
            ...d,
            academyId: ctx.academy.id,
            version: 0,
            connection: "Not configured",
          },
          "WEEKLY",
          sample,
        ).dueAt;
        const prepare = resolveSessionTime(
          `${shiftDate(sample, -d.weeklyDraftLeadDays)}T${d.weeklyDraftTime}`,
          d.timezone,
        );
        if (prepare > send)
          throw new WorkspaceError(
            400,
            "Weekly draft preparation must precede the notification schedule. Increase preparation lead days or move notification later.",
          );
      }
      const old = comm.settings(ctx.academy.id);
      if ((old?.version ?? 0) !== expectedVersion)
        throw new WorkspaceError(409, "Settings changed. Reload.");
      if (
        d.phoneNumberId &&
        database()
          .prepare(
            "SELECT academyId FROM communication_settings WHERE academyId<>? AND json_extract(body,'$.phoneNumberId')=?",
          )
          .get(ctx.academy.id, d.phoneNumberId)
      )
        throw new WorkspaceError(
          409,
          "This business sender is already bound to another academy.",
        );
      const identityUnchanged =
        old &&
        [
          "phoneNumberId",
          "wabaId",
          "credentialRef",
          "weeklyTemplate",
          "monthlyTemplate",
          "announcementTemplate",
          "language",
          "mode",
        ].every((k) =>
          k === "announcementTemplate"
            ? (old.announcementTemplate ?? "") ===
              (d.announcementTemplate ?? "")
            : old[k as keyof CommunicationSettings] === d[k as keyof typeof d],
        );
      const s: CommunicationSettings = {
        ...d,
        academyId: ctx.academy.id,
        version: expectedVersion + 1,
        connection: identityUnchanged
          ? old.connection
          : d.phoneNumberId
            ? "Awaiting provider/template setup"
            : "Not configured",
        verifiedAt: identityUnchanged ? old.verifiedAt : undefined,
      };
      comm.saveSettings(s);
      audit(ctx.academy.id, ctx.user.id, "Communication settings updated");
      return s;
    }
    if (cmd.action === "contact" || cmd.action === "optOut") {
      requireRole(ctx, ["OWNER", "ADMIN", "PARENT"]);
      const d = z
        .object({
          guardianId: z.string(),
          expectedVersion: z.number().int().nonnegative(),
          phone: z
            .string()
            .regex(/^\+[1-9]\d{7,14}$/)
            .optional(),
          verificationReference: text,
          consentReference: z.string().trim().max(1000),
          weekly: z.boolean(),
          monthly: z.boolean(),
          operational: z.boolean().optional(),
          verified: z.boolean().default(false),
          optedIn: z.boolean().default(false),
        })
        .parse(cmd.data);
      if (ctx.membership.role === "PARENT" && d.guardianId !== ctx.user.id)
        throw new WorkspaceError(403, "Only your own contact can be changed.");
      if (!authorisedGuardian(ctx.academy.id, d.guardianId))
        throw new WorkspaceError(403, "Active authorised guardian required.");
      const old = comm.contact(ctx.academy.id, d.guardianId);
      if ((old?.version ?? 0) !== d.expectedVersion)
        throw new WorkspaceError(409, "Contact changed. Reload.");
      if (ctx.membership.role === "PARENT" && d.verified)
        throw new WorkspaceError(
          403,
          "Contact verification requires academy staff evidence.",
        );
      if (d.verified && !d.verificationReference)
        throw new WorkspaceError(
          400,
          "Record the contact-verification evidence reference.",
        );
      if (d.optedIn && !d.consentReference)
        throw new WorkspaceError(
          400,
          "Record explicit academy-named consent evidence.",
        );
      const phone = d.phone ?? old?.phone;
      if (!phone) throw new WorkspaceError(400, "Contact phone is required.");
      const same = old?.phone === phone;
      const c: GuardianContact = {
        academyId: ctx.academy.id,
        guardianId: d.guardianId,
        phone,
        version: d.expectedVersion + 1,
        weekly: d.weekly,
        monthly: d.monthly,
        operational: d.operational ?? old?.operational ?? false,
        verificationReference: d.verificationReference,
        consentReference: d.consentReference,
        verifiedAt: d.verified
          ? new Date().toISOString()
          : same
            ? old?.verifiedAt
            : undefined,
        verifiedBy: d.verified
          ? ctx.user.id
          : same
            ? old?.verifiedBy
            : undefined,
        consentAt: d.optedIn
          ? new Date().toISOString()
          : same
            ? old?.consentAt
            : undefined,
        optedOutAt:
          cmd.action === "optOut" || !d.optedIn
            ? new Date().toISOString()
            : undefined,
        lastInboundAt: same ? old?.lastInboundAt : undefined,
      };
      comm.saveContact(c);
      if (c.optedOutAt || !same)
        database()
          .prepare(
            "UPDATE delivery_jobs SET state='CANCELLED',reason='Contact changed or opted out' WHERE academyId=? AND guardianId=? AND state='QUEUED'",
          )
          .run(ctx.academy.id, c.guardianId);
      audit(
        ctx.academy.id,
        ctx.user.id,
        cmd.action === "optOut"
          ? "Guardian opted out"
          : "Guardian messaging contact updated",
        d.guardianId,
      );
      return c;
    }
    requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
    if (cmd.action === "queue") {
      const d = z
        .object({
          type: z.enum(["WEEKLY", "MONTHLY"]),
          sourceId: z.string(),
          guardianIds: z.array(z.string()).min(1),
          verified: z.literal(true),
        })
        .parse(cmd.data);
      const s = comm.settings(ctx.academy.id);
      if (!s || !s.enabled || s.paused || !s.verifiedAt)
        throw new WorkspaceError(
          409,
          "Configure and verify an enabled sender first.",
        );
      visibleRecord(ctx, d.type === "WEEKLY" ? "weekly" : "report", d.sourceId);
      const c = notificationContent(ctx.academy.id, d.type, d.sourceId);
      const now = new Date().toISOString();
      if (
        d.type === "WEEKLY" &&
        now >= (c.correction ? c.period.endAt : c.period.startAt)
      )
        throw new WorkspaceError(
          409,
          "Missed weekly plans cannot be sent after their period begins.",
        );
      if (d.type === "MONTHLY" && now < c.period.endAt)
        throw new WorkspaceError(409, "Wait until the reporting month ends.");
      const expiresAt =
        d.type === "WEEKLY"
          ? c.correction
            ? c.period.endAt
            : c.period.startAt
          : periodFor(
              localClock(new Date(c.period.endAt), s.timezone).date.slice(0, 7),
              s.timezone,
              "MONTHLY",
            ).endAt;
      queueNotification(
        ctx.academy.id,
        d.type,
        d.sourceId,
        d.guardianIds,
        now,
        expiresAt,
      );
      audit(
        ctx.academy.id,
        ctx.user.id,
        "Recipients reviewed and notification queued",
        d.sourceId,
      );
      return { queued: true };
    }
    if (cmd.action === "cancel") {
      const d = z.object({ id: z.string() }).parse(cmd.data),
        j = comm.job(d.id);
      if (!j || j.academyId !== ctx.academy.id)
        throw new WorkspaceError(404, "Delivery job unavailable.");
      requirePlayer(ctx, j.playerId);
      if (j.claim || j.state !== "QUEUED")
        throw new WorkspaceError(
          409,
          "Only unclaimed queued jobs can be cancelled.",
        );
      comm.setState(j.id, "CANCELLED", "Cancelled deliberately by staff");
      return { cancelled: true };
    }
    if (cmd.action === "resolveReply") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const d = z
        .object({ eventId: z.string(), playerId: z.string() })
        .parse(cmd.data);
      requirePlayer(ctx, d.playerId);
      const event = database()
        .prepare(
          "SELECT * FROM communication_events WHERE academyId=? AND id=? AND outcome='AMBIGUOUS_CHILD'",
        )
        .get(ctx.academy.id, d.eventId);
      if (!event)
        throw new WorkspaceError(
          404,
          "Reply requiring clarification unavailable.",
        );
      const body = JSON.parse(String(event.body));
      const contact = database()
        .prepare(
          "SELECT body FROM guardian_contacts WHERE academyId=? AND phone=?",
        )
        .get(ctx.academy.id, `+${body.message.from}`);
      const c = contact
        ? (JSON.parse(String(contact.body)) as GuardianContact)
        : undefined;
      if (
        !c?.verifiedAt ||
        !authorisedGuardian(ctx.academy.id, c.guardianId, d.playerId)
      )
        throw new WorkspaceError(
          403,
          "Verified guardian relationship required.",
        );
      appendInbound(
        ctx.academy.id,
        c.guardianId,
        d.playerId,
        body.message.text.body,
        body.message.id,
        body.message.timestamp,
      );
      database()
        .prepare(
          "UPDATE communication_events SET outcome='ROUTED_AFTER_CLARIFICATION' WHERE id=?",
        )
        .run(d.eventId);
      audit(
        ctx.academy.id,
        ctx.user.id,
        "Inbound reply child context confirmed",
        d.eventId,
      );
      return { resolved: true };
    }
    const d = z
      .object({
        conversationId: z.string(),
        messageId: z.string(),
        verified: z.literal(true),
      })
      .parse(cmd.data);
    const conversation = visibleRecord(ctx, "conversation", d.conversationId),
      message = conversation.messages.find((m) => m.id === d.messageId);
    const c = contactEligible(
        ctx.academy.id,
        conversation.guardianId,
        conversation.playerId,
        "REPLY",
      ),
      s = comm.settings(ctx.academy.id);
    if (
      !s ||
      !s.enabled ||
      s.paused ||
      !message ||
      message.internal ||
      !["OWNER", "ADMIN", "COACH"].includes(message.senderRole)
    )
      throw new WorkspaceError(
        409,
        "Select an intentional staff reply and enabled sender.",
      );
    const expiresAt = new Date(
      Date.parse(c.lastInboundAt ?? "1970-01-01") + 86400000,
    ).toISOString();
    if (expiresAt <= new Date().toISOString())
      throw new WorkspaceError(
        409,
        "The 24-hour customer service window has closed. Respond in-app.",
      );
    database()
      .prepare(
        "INSERT INTO delivery_jobs(id,academyId,playerId,guardianId,type,sourceId,sourceVersion,period,correction,dueAt,expiresAt,state) VALUES(?,?,?,?, 'REPLY',?,0,?,'',?,?,'QUEUED') ON CONFLICT DO NOTHING",
      )
      .run(
        randomUUID(),
        ctx.academy.id,
        conversation.playerId,
        conversation.guardianId,
        conversation.id,
        message.id,
        new Date().toISOString(),
        expiresAt,
      );
    audit(
      ctx.academy.id,
      ctx.user.id,
      "Staff intentionally selected WhatsApp reply",
      message.id,
    );
    return { queued: true };
  });
}
export function appendInbound(
  academyId: string,
  guardianId: string,
  playerId: string,
  body: string,
  id: string,
  timestamp: string,
) {
  let c = repo
    .list(academyId, "conversation")
    .find(
      (c) =>
        c.guardianId === guardianId &&
        c.playerId === playerId &&
        c.status === "OPEN",
    );
  c ??= {
    id: randomUUID(),
    academyId,
    guardianId,
    playerId,
    subject: "WhatsApp parent reply",
    status: "OPEN",
    messages: [],
  };
  if (!c.messages.some((m) => m.id === id)) {
    c = {
      ...c,
      messages: [
        ...c.messages,
        {
          id,
          senderId: guardianId,
          senderRole: "PARENT",
          body: body.slice(0, 5000),
          at: new Date(Number(timestamp) * 1000).toISOString(),
          internal: false,
          channel: "WHATSAPP",
        },
      ],
    };
    repo.save(academyId, "conversation", c);
  }
}
export function dispatchCheck(job: DeliveryJob, now: Date) {
  const s = comm.settings(job.academyId),
    academy = repo.academy(job.academyId);
  if (
    !s ||
    !academy ||
    !s.enabled ||
    s.paused ||
    !s.verifiedAt ||
    !["Ready for controlled testing", "Connected"].includes(s.connection)
  )
    throw new WorkspaceError(409, "Sender or schedule paused/unverified.");
  if (
    academy.timezone !== s.timezone ||
    !academy.sportIds.includes("football") ||
    !academy.modules.includes("communication") ||
    database()
      .prepare(
        "SELECT status,modules FROM platform_entitlements WHERE academyId=?",
      )
      .get(job.academyId)?.status !== "ACTIVE"
  )
    throw new WorkspaceError(
      409,
      "Academy configuration or entitlement changed.",
    );
  const player = repo.find(job.academyId, "player", job.playerId);
  const requiredModule =
    job.type === "WEEKLY"
      ? "development"
      : job.type === "MONTHLY"
        ? "reports"
        : "communication";
  const entitlement = database()
    .prepare("SELECT modules FROM platform_entitlements WHERE academyId=?")
    .get(job.academyId);
  if (
    !academy.modules.includes(requiredModule) ||
    !entitlement ||
    !JSON.parse(String(entitlement.modules)).includes(requiredModule) ||
    !JSON.parse(String(entitlement.modules)).includes("communication")
  )
    throw new WorkspaceError(
      409,
      "Notification source module or communication entitlement is unavailable.",
    );
  if (job.type === "ANNOUNCEMENT") return announcementDispatchCheck(job, now);
  if (!player?.sportIds.includes("football"))
    throw new WorkspaceError(409, "Player no longer eligible.");
  const contact = contactEligible(
    job.academyId,
    job.guardianId,
    job.playerId,
    job.type,
  );
  if (now.toISOString() >= job.expiresAt)
    throw new WorkspaceError(
      409,
      "Notification expired; no stale catch-up send.",
    );
  const preference = repo.find(job.academyId, "preference", job.guardianId),
    clock = localClock(now, s.timezone);
  const deferred =
    quiet(clock.time, s.quietStart, s.quietEnd) ||
    (!!preference &&
      quiet(clock.time, preference.quietStart, preference.quietEnd));
  if (job.type === "REPLY") {
    const c = repo.find(job.academyId, "conversation", job.sourceId),
      m = c?.messages.find((m) => m.id === job.period);
    const author = m ? repo.membership(job.academyId, m.senderId) : undefined;
    if (
      !m ||
      m.internal ||
      !author ||
      !["OWNER", "ADMIN", "COACH"].includes(author.role) ||
      (author.sportIds.length > 0 && !author.sportIds.includes("football")) ||
      (author.role === "COACH" &&
        repo.find(job.academyId, "player", job.playerId)?.coachId !==
          m.senderId) ||
      c?.guardianId !== job.guardianId ||
      c.playerId !== job.playerId ||
      !contact.lastInboundAt ||
      Date.parse(contact.lastInboundAt) + 86400000 <= now.getTime()
    )
      throw new WorkspaceError(
        409,
        "Reply source or customer-service window changed.",
      );
    return {
      settings: s,
      contact,
      deferred,
      waitingPublication: false,
      request: {
        draftId: c.id,
        body: m.body,
        replyText: m.body,
        approvedAt: m.at,
        verifiedGuardianContact: contact.phone,
        consentRecordId: contact.consentReference,
        communicationPreferenceId: contact.guardianId,
        correlationId: job.id,
      },
    };
  }
  const source = notificationContent(job.academyId, job.type, job.sourceId);
  if (
    source.version !== job.sourceVersion ||
    source.playerId !== job.playerId ||
    source.period.key !== job.period
  )
    throw new WorkspaceError(409, "Approved content version changed.");
  const coachId = repo.find(job.academyId, "player", job.playerId)?.coachId;
  const author =
    job.type === "WEEKLY"
      ? repo.find(job.academyId, "weekly", job.sourceId)?.reviewerId
      : database()
          .prepare(
            "SELECT approvedBy FROM report_approval_history WHERE academyId=? AND reportId=? ORDER BY at DESC LIMIT 1",
          )
          .get(job.academyId, job.sourceId)?.approvedBy;
  const m = author ? repo.membership(job.academyId, String(author)) : undefined;
  if (
    !m ||
    !["OWNER", "ADMIN", "COACH"].includes(m.role) ||
    (m.sportIds.length > 0 && !m.sportIds.includes("football")) ||
    (m.role === "COACH" && coachId !== author)
  )
    throw new WorkspaceError(409, "Approving staff is no longer authorised.");
  return {
    settings: s,
    contact,
    deferred,
    waitingPublication:
      job.type === "WEEKLY" &&
      !repo.find(job.academyId, "weekly", job.sourceId)?.issuedAt,
    request: {
      draftId: job.sourceId,
      body: source.rendered,
      approvedAt: source.approvedAt,
      verifiedGuardianContact: contact.phone,
      consentRecordId: contact.consentReference,
      communicationPreferenceId: contact.guardianId,
      correlationId: job.id,
      template: {
        name: job.type === "WEEKLY" ? s.weeklyTemplate : s.monthlyTemplate,
        language: s.language,
        parameters: source.parameters,
      },
    },
  };
}
