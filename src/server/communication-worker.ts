import "server-only";
import { randomUUID } from "node:crypto";
import type {
  CommunicationSettings,
  DeliveryJob,
} from "@/domain/communication";
import { localClock, shiftDate } from "@/services/communication/period-rules";
import { database, atomic, audit } from "./database";
import { communicationRepository as comm } from "./communication-repository";
import { workspaceRepository as repo } from "./workspace-repository";
import {
  queueNotification,
  notificationContent,
  contactEligible,
  dispatchCheck,
  scheduleTimes,
} from "./communication-service";
import { periodAction, weeklyCurrent } from "./period-service";
import type { WorkspaceAccess } from "./workspace-access";
import { MetaWhatsAppProvider, ProviderFailure } from "./whatsapp-provider";
import { processEvents } from "./whatsapp-webhooks";
function reminder(
  s: CommunicationSettings,
  type: string,
  period: string,
  playerId: string,
  reason: string,
) {
  database()
    .prepare(
      "INSERT INTO communication_reminders VALUES(?,?,?,?,?) ON CONFLICT(academyId,period,type,playerId) DO UPDATE SET reason=excluded.reason",
    )
    .run(s.academyId, period, type, playerId, reason);
}
function ownerContext(s: CommunicationSettings): WorkspaceAccess | undefined {
  const academy = repo.academy(s.academyId),
    row = database()
      .prepare(
        "SELECT u.* FROM academy_memberships m JOIN \"user\" u ON u.id=m.userId WHERE m.academyId=? AND m.active=1 AND m.role IN ('OWNER','ADMIN') AND (m.expiresAt IS NULL OR m.expiresAt>?) LIMIT 1",
      )
      .get(s.academyId, new Date().toISOString());
  if (!academy || !row) return;
  const membership = repo.membership(s.academyId, String(row.id));
  if (!membership) return;
  return {
    academy,
    membership,
    user: {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      emailVerified: Boolean(row.emailVerified),
      createdAt: new Date(String(row.createdAt)),
      updatedAt: new Date(String(row.updatedAt)),
      image: null,
    },
  };
}
export function prepareSchedules(now: Date) {
  for (const row of database()
    .prepare("SELECT body FROM communication_settings")
    .all()) {
    const s = JSON.parse(String(row.body)) as CommunicationSettings;
    if (!s.enabled || s.paused) continue;
    const academy = repo.academy(s.academyId);
    if (
      !academy ||
      database()
        .prepare("SELECT status FROM platform_entitlements WHERE academyId=?")
        .get(s.academyId)?.status !== "ACTIVE"
    )
      continue;
    const clock = localClock(now, s.timezone),
      day = new Date(clock.date + "T12:00Z").getUTCDay();
    const week = shiftDate(clock.date, (8 - day) % 7);
    const previousMonth = new Date(
      Date.UTC(
        Number(clock.date.slice(0, 4)),
        Number(clock.date.slice(5, 7)) - 2,
        1,
      ),
    )
      .toISOString()
      .slice(0, 7);
    const ctx = ownerContext(s);
    if (ctx && Number(clock.date.slice(-2)) >= s.monthlyDraftDay) {
      for (const p of repo
        .list(s.academyId, "player")
        .filter((p) => p.sportIds.includes("football"))) {
        if (
          repo
            .list(s.academyId, "report")
            .some(
              (r) =>
                r.playerId === p.id && r.reportingPeriod?.key === previousMonth,
            )
        )
          continue;
        try {
          periodAction(ctx, {
            requestId: randomUUID(),
            action: "monthlyPrepare",
            data: { playerIds: [p.id], month: previousMonth },
          });
        } catch {
          reminder(
            s,
            "MONTHLY",
            previousMonth,
            p.id,
            "Draft preparation needs recorded development plan/source review",
          );
        }
      }
    }
    for (const [type, key] of [
      ["WEEKLY", week],
      ["MONTHLY", previousMonth],
    ] as const) {
      let times: ReturnType<typeof scheduleTimes>;
      try {
        times = scheduleTimes(s, type, key);
      } catch {
        for (const p of repo.list(s.academyId, "player"))
          reminder(
            s,
            type,
            key,
            p.id,
            "Schedule time invalid or ambiguous in reporting timezone",
          );
        continue;
      }
      if (
        now.toISOString() < times.dueAt ||
        now.toISOString() >= times.expiresAt
      )
        continue;
      for (const player of repo
        .list(s.academyId, "player")
        .filter((p) => p.sportIds.includes("football"))) {
        const source =
          type === "WEEKLY"
            ? repo
                .list(s.academyId, "weekly")
                .find(
                  (r) =>
                    r.playerId === player.id &&
                    r.content.period.key === key &&
                    !r.correctionOf &&
                    weeklyCurrent(s.academyId, r),
                )
            : repo
                .list(s.academyId, "report")
                .find(
                  (r) =>
                    r.playerId === player.id &&
                    r.reportingPeriod?.key === key &&
                    r.status === "Approved",
                );
        if (!source) {
          reminder(s, type, key, player.id, "Awaiting coach approval");
          continue;
        }
        const guardians = database()
          .prepare(
            "SELECT userId FROM guardian_relationships WHERE academyId=? AND playerId=?",
          )
          .all(s.academyId, player.id)
          .map((g) => String(g.userId))
          .filter((id) => {
            try {
              contactEligible(s.academyId, id, player.id, type);
              return true;
            } catch {
              return false;
            }
          });
        if (!guardians.length) {
          reminder(
            s,
            type,
            key,
            player.id,
            "Verified recipient consent/preferences required",
          );
          continue;
        }
        try {
          atomic(() => {
            notificationContent(s.academyId, type, source.id);
            queueNotification(
              s.academyId,
              type,
              source.id,
              guardians,
              times.dueAt,
              times.expiresAt,
            );
          });
        } catch {
          reminder(
            s,
            type,
            key,
            player.id,
            "Approved source/template rendering requires review",
          );
        }
      }
    }
  }
}
export function claimJob(now: Date): DeliveryJob | undefined {
  return atomic(() => {
    // Crash after a possible provider call is uncertain. Never recycle a lease into a send.
    database()
      .prepare(
        "UPDATE delivery_jobs SET state='UNKNOWN',reason='Interrupted claim requires reconciliation',claim=NULL,claimedAt=NULL WHERE claim IS NOT NULL AND claimedAt<?",
      )
      .run(new Date(now.getTime() - 120000).toISOString());
    database()
      .prepare(
        "UPDATE delivery_jobs SET state='CANCELLED',reason='Expired; missed-run catch-up withheld' WHERE state='QUEUED' AND claim IS NULL AND expiresAt<=?",
      )
      .run(now.toISOString());
    const row = database()
      .prepare(
        "SELECT * FROM delivery_jobs WHERE state='QUEUED' AND claim IS NULL AND dueAt<=? AND expiresAt>? ORDER BY dueAt LIMIT 1",
      )
      .get(now.toISOString(), now.toISOString()) as unknown as
      DeliveryJob | undefined;
    if (!row) return;
    const claim = randomUUID();
    database()
      .prepare(
        "UPDATE delivery_jobs SET claim=?,claimedAt=? WHERE id=? AND claim IS NULL",
      )
      .run(claim, now.toISOString(), row.id);
    return { ...row, claim, claimedAt: now.toISOString() };
  });
}
export async function workerTick(
  now = new Date(),
  providerFactory = (s: CommunicationSettings) => new MetaWhatsAppProvider(s),
) {
  processEvents();
  prepareSchedules(now);
  // Source changes cancel pending plans before claims, even when send mode is disabled.
  for (const row of database()
    .prepare(
      "SELECT * FROM delivery_jobs WHERE type='WEEKLY' AND state='QUEUED' AND claim IS NULL",
    )
    .all()) {
    const j = row as unknown as DeliveryJob,
      r = repo.find(j.academyId, "weekly", j.sourceId);
    if (!r || !weeklyCurrent(j.academyId, r))
      comm.setState(
        j.id,
        "CANCELLED",
        "Training schedule or source changed; review required",
      );
  }
  if (
    process.env.SPORTOZEN_WHATSAPP_SEND_ENABLED !== "true" ||
    process.env.CI ||
    process.env.NODE_ENV === "test"
  )
    return { sending: "disabled" };
  const job = claimJob(now);
  if (!job) return { sending: "idle" };
  try {
    let check = dispatchCheck(job, now);
    if (check.deferred) {
      database()
        .prepare(
          "UPDATE delivery_jobs SET claim=NULL,claimedAt=NULL,dueAt=? WHERE id=? AND claim=?",
        )
        .run(
          new Date(now.getTime() + 15 * 60000).toISOString(),
          job.id,
          job.claim!,
        );
      return { sending: "quiet hours" };
    }
    const provider = providerFactory(check.settings);
    await provider.verify(); // Fresh provider/template evidence, outside database transaction.
    check = dispatchCheck(job, new Date()); // Immediate recheck after network verification.
    if (check.deferred)
      throw new ProviderFailure(
        "TRANSIENT",
        "Quiet hours began before dispatch.",
      );
    const attempt = randomUUID();
    atomic(() => {
      const current = comm.job(job.id);
      if (!current || current.claim !== job.claim || current.state !== "QUEUED")
        throw new ProviderFailure("PERMANENT", "Delivery claim cancelled.");
      database()
        .prepare("UPDATE delivery_jobs SET attempts=attempts+1 WHERE id=?")
        .run(job.id);
      database()
        .prepare(
          "INSERT INTO delivery_attempts(id,jobId,at,state) VALUES(?,?,?,'UNKNOWN')",
        )
        .run(attempt, job.id, new Date().toISOString());
    });
    const receipt = await provider.deliver(check.request);
    atomic(() => {
      // A webhook may arrive before the HTTP receipt. Preserve its stronger state.
      const current = comm.job(job.id)!;
      const state = ["SENT", "DELIVERED", "READ"].includes(current.state)
        ? current.state
        : "PROVIDER_ACCEPTED";
      comm.setState(
        job.id,
        state,
        "Provider accepted; delivery not yet confirmed",
        receipt.providerReference,
      );
      database()
        .prepare(
          "UPDATE delivery_attempts SET state='PROVIDER_ACCEPTED',providerId=? WHERE id=?",
        )
        .run(receipt.providerReference, attempt);
      audit(
        job.academyId,
        "communication-worker",
        "Provider accepted notification",
        job.id,
      );
    });
    return { sending: "accepted" };
  } catch (e) {
    const outcome = e instanceof ProviderFailure ? e.outcome : "PERMANENT";
    const current = comm.job(job.id)!;
    if (["SENT", "DELIVERED", "READ"].includes(current.state))
      return { sending: current.state };
    const reason =
      e instanceof ProviderFailure ||
      (e instanceof Error && e.name === "WorkspaceError")
        ? (e as Error).message
        : "Dispatch checks failed; staff review required";
    const attempts = current.attempts;
    const state =
      outcome === "UNKNOWN"
        ? "UNKNOWN"
        : outcome === "TRANSIENT" && attempts < 4
          ? "QUEUED"
          : "FAILED";
    atomic(() => {
      comm.setState(job.id, state, reason);
      if (state === "QUEUED")
        database()
          .prepare("UPDATE delivery_jobs SET dueAt=? WHERE id=?")
          .run(
            new Date(
              now.getTime() + Math.min(60, 2 ** Math.max(1, attempts)) * 60000,
            ).toISOString(),
            job.id,
          );
      database()
        .prepare(
          "UPDATE delivery_attempts SET state=?,reason=? WHERE jobId=? AND state='UNKNOWN'",
        )
        .run(state, reason, job.id);
    });
    return { sending: state };
  }
}
