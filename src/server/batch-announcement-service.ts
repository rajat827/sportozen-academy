import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  AnnouncementDraft,
  AnnouncementPreview,
  AnnouncementRecipient,
  BatchAnnouncement,
  AnnouncementPublic,
  AnnouncementView,
} from "@/domain/batch-announcement";
import type { DeliveryJob } from "@/domain/communication";
import { announcementParameters } from "@/services/communication/whatsapp-templates";
import { localClock, quiet } from "@/services/communication/period-rules";
import { announcementRepository as announcements } from "./batch-announcement-repository";
import { communicationRepository as comm } from "./communication-repository";
import { workspaceRepository as repo } from "./workspace-repository";
import {
  requireRole,
  requireModule,
  requireSport,
  visibleRecords,
  type WorkspaceAccess,
} from "./workspace-access";
import { database, atomic, audit } from "./database";
import { WorkspaceError } from "./auth";

export const announcementKinds = {
  SESSION_CANCELLED: "Session cancelled",
  VENUE_CHANGED: "Venue changed",
  TIME_CHANGED: "Training time changed",
  ACADEMY_HOLIDAY: "Academy holiday",
  SPECIAL_PRACTICE: "Special practice session",
  OPERATIONAL: "Operational update",
} as const;
const draftSchema = z.object({
  kind: z.enum([
    "SESSION_CANCELLED",
    "VENUE_CHANGED",
    "TIME_CHANGED",
    "ACADEMY_HOLIDAY",
    "SPECIAL_PRACTICE",
    "OPERATIONAL",
  ]),
  urgency: z.enum(["NORMAL", "URGENT"]),
  batchIds: z.array(z.string().min(1)).min(1).max(100),
  body: z.string().trim().min(1).max(400),
  expiresAt: z.iso.datetime(),
});
function fail(message: string): never {
  throw new WorkspaceError(409, message);
}
function staff(ctx: WorkspaceAccess) {
  requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
  requireModule(ctx, "update");
  requireSport(ctx, "football");
}
function fresh(ctx: WorkspaceAccess) {
  const membership = repo.membership(ctx.academy.id, ctx.user.id),
    academy = repo.academy(ctx.academy.id);
  if (
    !membership ||
    !academy ||
    membership.role !== ctx.membership.role ||
    database()
      .prepare("SELECT status FROM platform_entitlements WHERE academyId=?")
      .get(ctx.academy.id)?.status !== "ACTIVE"
  )
    throw new WorkspaceError(403, "Current academy membership required.");
  const next = { ...ctx, membership, academy };
  staff(next);
  return next;
}
function batches(ctx: WorkspaceAccess, ids: string[]) {
  const allowed = visibleRecords(ctx, "squad");
  const selected = [...new Set(ids)]
    .sort()
    .map((id) => allowed.find((batch) => batch.id === id));
  if (selected.some((batch) => !batch))
    throw new WorkspaceError(
      403,
      "Select only batches currently authorised for your role.",
    );
  return selected.map((batch) => batch!);
}
export function normalizedVerifiedPhone(value: string) {
  const phone = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : undefined;
}
function assertGeneric(ctx: WorkspaceAccess, body: string) {
  const normalized = body.toLocaleLowerCase().replace(/\s+/g, " ");
  // Operational content has no child interpolation. Explicitly reject known
  // private identities and contacts in addition to the required staff review.
  if (
    repo.list(ctx.academy.id, "player").some((player) => {
      const name = player.name.trim().toLocaleLowerCase().replace(/\s+/g, " ");
      return (
        name.length >= 3 &&
        new RegExp(
          `(^|[^\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`,
          "u",
        ).test(normalized)
      );
    }) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(body) ||
    /\+[1-9][\d ().-]{7,}\d|\b\d{9,15}\b/.test(body)
  )
    throw new WorkspaceError(
      400,
      "Use generic operational wording without child names, personal goals or contact details. Send individual information in a private child conversation.",
    );
}
export function resolveAnnouncement(
  ctx: WorkspaceAccess,
  draft: AnnouncementDraft,
) {
  staff(ctx);
  const selected = batches(ctx, draft.batchIds);
  assertGeneric(ctx, draft.body);
  const players = new Set(selected.flatMap((batch) => batch.playerIds));
  const links = database()
    .prepare(
      "SELECT userId,playerId FROM guardian_relationships WHERE academyId=? ORDER BY userId,playerId",
    )
    .all(ctx.academy.id)
    .filter((link) => players.has(String(link.playerId)));
  const guardians = [...new Set(links.map((link) => String(link.userId)))];
  const recipients: AnnouncementRecipient[] = [],
    excluded: AnnouncementPreview["excluded"] = [];
  const phones = new Set<string>();
  let duplicates = Math.max(0, links.length - guardians.length);
  for (const guardianId of guardians) {
    const member = repo.membership(ctx.academy.id, guardianId),
      contact = comm.contact(ctx.academy.id, guardianId),
      preference = repo.find(ctx.academy.id, "preference", guardianId);
    const phone = contact && normalizedVerifiedPhone(contact.phone);
    const reason =
      member?.role !== "PARENT"
        ? "Guardian membership is inactive or unavailable"
        : !contact || !phone
          ? "Verified contact missing or invalid"
          : !contact.verifiedAt || !contact.verificationReference
            ? "Contact verification missing"
            : !contact.consentAt || !contact.consentReference
              ? "Consent evidence missing"
              : contact.optedOutAt
                ? "Guardian opted out"
                : !contact.operational
                  ? "Operational announcement preference is not enabled"
                  : preference &&
                      !/^(english|en(?:[-_][a-z]{2})?)$/i.test(
                        preference.language.trim(),
                      )
                    ? "Approved template language is unavailable"
                    : undefined;
    if (reason) {
      excluded.push({ guardianId, reason });
      continue;
    }
    if (phones.has(phone!)) {
      duplicates++;
      excluded.push({ guardianId, reason: "Duplicate verified contact" });
      continue;
    }
    phones.add(phone!);
    recipients.push({
      guardianId,
      phone: phone!,
      contactVersion: contact!.version,
      consentReference: contact!.consentReference,
      playerIds: links
        .filter((link) => String(link.userId) === guardianId)
        .map((link) => String(link.playerId))
        .sort(),
    });
  }
  const linkedPlayers = new Set(links.map((link) => String(link.playerId)));
  for (const id of players)
    if (!linkedPlayers.has(id))
      excluded.push({ reason: "Selected player has no linked guardian" });
  const settings = comm.settings(ctx.academy.id);
  const { rendered } = announcementParameters(
    ctx.academy.name,
    `${draft.urgency === "URGENT" ? "Urgent · " : ""}${announcementKinds[draft.kind]}`,
    draft.body,
  );
  const blockers: string[] = [];
  if (!settings?.announcementTemplate)
    blockers.push(
      "An academy-approved operational WhatsApp template is not configured.",
    );
  if (
    !settings?.enabled ||
    settings.paused ||
    !settings.verifiedAt ||
    !["Ready for controlled testing", "Connected"].includes(settings.connection)
  )
    blockers.push("The academy sender is disabled, paused or not verified.");
  if (!recipients.length)
    blockers.push("No eligible verified, opted-in recipients.");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        draft: {
          kind: draft.kind,
          urgency: draft.urgency,
          body: draft.body,
          expiresAt: draft.expiresAt,
          batchIds: selected.map((batch) => batch.id),
        },
        batches: selected.map((batch) => ({
          id: batch.id,
          version: batch.version,
          playerIds: [...batch.playerIds].sort(),
        })),
        recipients,
        excluded,
        template: settings?.announcementTemplate ?? "",
        rendered,
      }),
    )
    .digest("hex");
  return {
    recipients,
    preview: {
      eligibleCount: recipients.length,
      deduplicatedCount: duplicates,
      excluded,
      recipients: recipients.map((recipient) => ({
        guardianId: recipient.guardianId,
        contactEnding: recipient.phone.slice(-4),
      })),
      fingerprint,
      renderedBody: rendered,
      blockers,
    } satisfies AnnouncementPreview,
  };
}
function publicRecord(record: BatchAnnouncement): AnnouncementPublic {
  const { approval, ...rest } = record;
  return {
    ...rest,
    approvedAt: approval?.approvedAt,
    recipientCount: approval?.recipients.length,
  };
}
export function announcementView(ctx: WorkspaceAccess): AnnouncementView {
  staff(ctx);
  const allowed = visibleRecords(ctx, "squad");
  const records = announcements
    .list(ctx.academy.id)
    .filter((record) =>
      record.batchIds.every((id) => allowed.some((batch) => batch.id === id)),
    );
  return {
    batches: allowed.map((batch) => ({
      id: batch.id,
      name: batch.name,
      players: batch.playerIds.length,
    })),
    announcements: records.map(publicRecord),
    jobs: comm
      .jobs(ctx.academy.id)
      .filter(
        (job) =>
          job.type === "ANNOUNCEMENT" &&
          records.some((record) => record.id === job.sourceId),
      )
      .map(({ id, sourceId, guardianId, state, reason }) => ({
        id,
        sourceId,
        guardianId,
        state,
        reason,
      })),
  };
}
export function announcementAction(ctx: WorkspaceAccess, input: unknown) {
  const command = z
    .object({
      requestId: z.uuid(),
      action: z.enum([
        "preview",
        "save",
        "submit",
        "approve",
        "queue",
        "cancel",
      ]),
      id: z.string().optional(),
      expectedVersion: z.number().int().nonnegative().default(0),
      data: z.unknown(),
    })
    .parse(input);
  const digest = createHash("sha256")
    .update(JSON.stringify({ domain: "batch-announcement", command }))
    .digest("hex");
  return atomic(() => {
    ctx = fresh(ctx);
    if (command.action === "preview")
      return resolveAnnouncement(ctx, draftSchema.parse(command.data)).preview;
    const prior = database()
      .prepare(
        "SELECT digest,response FROM training_submissions WHERE academyId=? AND userId=? AND requestId=?",
      )
      .get(ctx.academy.id, ctx.user.id, command.requestId);
    if (prior) {
      if (prior.digest !== digest)
        fail("Submission key was reused with different content.");
      const response = JSON.parse(String(prior.response)) as AnnouncementPublic;
      batches(ctx, response.batchIds);
      return response;
    }
    const old = command.id
      ? announcements.find(ctx.academy.id, command.id)
      : undefined;
    if (command.id && !old)
      throw new WorkspaceError(404, "Announcement unavailable.");
    if ((old?.version ?? 0) !== command.expectedVersion)
      fail("Announcement changed. Reload before continuing.");
    if (old) batches(ctx, old.batchIds);
    const now = new Date().toISOString();
    let record: BatchAnnouncement;
    if (command.action === "save") {
      if (old && ["QUEUED", "CANCELLED"].includes(old.status))
        fail(
          "Issued or cancelled announcements cannot be rewritten. Create a new reviewed announcement.",
        );
      const draft = draftSchema.parse(command.data);
      if (
        draft.expiresAt <= now ||
        Date.parse(draft.expiresAt) > Date.now() + 7 * 86400000
      )
        fail("Choose an expiry within the next seven days.");
      resolveAnnouncement(ctx, draft);
      record = {
        ...draft,
        batchIds: [...new Set(draft.batchIds)].sort(),
        id: old?.id ?? randomUUID(),
        academyId: ctx.academy.id,
        version: (old?.version ?? 0) + 1,
        authorId: old?.authorId ?? ctx.user.id,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
        status: "DRAFT",
      };
    } else {
      if (!old) fail("Save an announcement draft first.");
      record = { ...old, version: old.version + 1, updatedAt: now };
      if (command.action === "submit") {
        if (old.status !== "DRAFT")
          fail("Only a saved draft can be submitted.");
        resolveAnnouncement(ctx, old);
        record.status = "PENDING_APPROVAL";
      } else if (command.action === "approve") {
        requireRole(ctx, ["OWNER", "ADMIN"]);
        const data = z
          .object({
            verified: z.literal(true),
            genericPrivacyConfirmed: z.literal(true),
            fingerprint: z.string().min(1),
          })
          .parse(command.data);
        if (old.status !== "PENDING_APPROVAL" || old.expiresAt <= now)
          fail("Review a current pending announcement.");
        const resolved = resolveAnnouncement(ctx, old);
        if (data.fingerprint !== resolved.preview.fingerprint)
          fail("Recipients or content changed. Preview again before approval.");
        if (!resolved.recipients.length)
          fail("No eligible recipients can be approved.");
        record.status = "APPROVED";
        record.approval = {
          reviewerId: ctx.user.id,
          approvedAt: now,
          fingerprint: resolved.preview.fingerprint,
          renderedBody: resolved.preview.renderedBody,
          templateName:
            comm.settings(ctx.academy.id)?.announcementTemplate ?? "",
          recipients: resolved.recipients,
        };
      } else if (command.action === "queue") {
        const data = z
          .object({ verified: z.literal(true), fingerprint: z.string().min(1) })
          .parse(command.data);
        if (old.status !== "APPROVED" || !old.approval || old.expiresAt <= now)
          fail("Approve a current announcement before queueing.");
        const resolved = resolveAnnouncement(ctx, old);
        if (
          resolved.preview.fingerprint !== old.approval.fingerprint ||
          data.fingerprint !== resolved.preview.fingerprint
        )
          fail(
            "Recipients or content changed after approval. Prepare a new review.",
          );
        if (resolved.preview.blockers.length)
          fail(resolved.preview.blockers.join(" "));
        for (const recipient of resolved.recipients)
          database()
            .prepare(
              "INSERT INTO delivery_jobs(id,academyId,playerId,guardianId,type,sourceId,sourceVersion,period,correction,dueAt,expiresAt,state) VALUES(?,?,'',?,'ANNOUNCEMENT',?,?,?,'',?,?,'QUEUED') ON CONFLICT DO NOTHING",
            )
            .run(
              randomUUID(),
              ctx.academy.id,
              recipient.guardianId,
              old.id,
              record.version,
              old.id,
              now,
              old.expiresAt,
            );
        record.status = "QUEUED";
      } else {
        if (
          comm
            .jobs(ctx.academy.id)
            .some((job) => job.sourceId === old.id && job.claim)
        )
          fail(
            "A delivery is already being processed; reconcile it before cancellation.",
          );
        database()
          .prepare(
            "UPDATE delivery_jobs SET state='CANCELLED',reason='Announcement cancelled by authorised staff' WHERE academyId=? AND sourceId=? AND state='QUEUED'",
          )
          .run(ctx.academy.id, old.id);
        record.status = "CANCELLED";
      }
    }
    announcements.save(record);
    audit(
      ctx.academy.id,
      ctx.user.id,
      `Batch announcement ${record.status}`,
      record.id,
    );
    const response = publicRecord(record);
    database()
      .prepare("INSERT INTO training_submissions VALUES(?,?,?,?,?)")
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
export function announcementDispatchCheck(job: DeliveryJob, now: Date) {
  const record = announcements.find(job.academyId, job.sourceId),
    settings = comm.settings(job.academyId),
    academy = repo.academy(job.academyId);
  if (
    !record?.approval ||
    record.status !== "QUEUED" ||
    record.version !== job.sourceVersion ||
    record.expiresAt <= now.toISOString() ||
    !settings?.announcementTemplate ||
    !academy
  )
    fail("Announcement approval or expiry changed.");
  const reviewer = repo.membership(job.academyId, record.approval.reviewerId);
  if (
    !reviewer ||
    !["OWNER", "ADMIN"].includes(reviewer.role) ||
    (reviewer.sportIds.length > 0 && !reviewer.sportIds.includes("football"))
  )
    fail("Approving staff no longer authorised.");
  const author = repo.membership(job.academyId, record.authorId),
    user = database()
      .prepare('SELECT * FROM "user" WHERE id=?')
      .get(record.authorId);
  if (!author || !user) fail("Announcement author is unavailable.");
  const ctx: WorkspaceAccess = {
    academy,
    membership: author,
    user: {
      id: String(user.id),
      name: String(user.name),
      email: String(user.email),
      emailVerified: Boolean(user.emailVerified),
      createdAt: new Date(String(user.createdAt)),
      updatedAt: new Date(String(user.updatedAt)),
      image: null,
    },
  };
  const resolved = resolveAnnouncement(ctx, record);
  if (
    resolved.preview.fingerprint !== record.approval.fingerprint ||
    record.approval.templateName !== settings.announcementTemplate
  )
    fail(
      "Announcement recipients, consent, batches or content changed after review.",
    );
  const recipient = resolved.recipients.find(
      (recipient) => recipient.guardianId === job.guardianId,
    ),
    contact = comm.contact(job.academyId, job.guardianId);
  if (!recipient || !contact) fail("Recipient is no longer eligible.");
  const clock = localClock(now, settings.timezone),
    preference = repo.find(job.academyId, "preference", job.guardianId);
  return {
    settings,
    contact: { ...contact, phone: recipient.phone },
    deferred:
      quiet(clock.time, settings.quietStart, settings.quietEnd) ||
      (!!preference &&
        quiet(clock.time, preference.quietStart, preference.quietEnd)),
    waitingPublication: false,
    request: {
      draftId: record.id,
      body: record.approval.renderedBody,
      approvedAt: record.approval.approvedAt,
      verifiedGuardianContact: recipient.phone,
      consentRecordId: recipient.consentReference,
      communicationPreferenceId: recipient.guardianId,
      correlationId: job.id,
      template: {
        name: settings.announcementTemplate,
        language: settings.language,
        parameters: announcementParameters(
          academy.name,
          `${record.urgency === "URGENT" ? "Urgent · " : ""}${announcementKinds[record.kind]}`,
          record.body,
        ).parameters,
      },
    },
  };
}
