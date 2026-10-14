import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database, atomic, audit } from "./database";
import { communicationRepository as comm } from "./communication-repository";
import { workspaceRepository as repo } from "./workspace-repository";
import { senderSecret, validSignature } from "./whatsapp-provider";
import { authorisedGuardian, appendInbound } from "./communication-service";
import { providerState } from "@/services/communication/period-rules";
import type {
  GuardianContact,
  DeliveryJob,
  DeliveryState,
} from "@/domain/communication";
import { WorkspaceError } from "./auth";
const statusSchema = z.object({
  id: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  recipient_id: z.string(),
  timestamp: z.string().regex(/^\d+$/),
  biz_opaque_callback_data: z.string().optional(),
});
const messageSchema = z.object({
  id: z.string(),
  from: z.string().regex(/^\d+$/),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string().max(5000) }).optional(),
  context: z.object({ id: z.string().optional() }).optional(),
});
export function webhookChallenge(academyId: string, url: URL) {
  const s = comm.settings(academyId);
  if (!s) throw new WorkspaceError(404, "Sender not configured.");
  const secret = senderSecret(s),
    token = url.searchParams.get("hub.verify_token") ?? "";
  const left = Buffer.from(token),
    right = Buffer.from(secret.verifyToken);
  if (
    url.searchParams.get("hub.mode") !== "subscribe" ||
    left.length !== right.length ||
    !timingSafeEqual(left, right)
  )
    throw new WorkspaceError(403, "Webhook verification failed.");
  return url.searchParams.get("hub.challenge") ?? "";
}
export function receiveWebhook(
  academyId: string,
  raw: string,
  signature: string | null,
) {
  const s = comm.settings(academyId);
  if (!s) throw new WorkspaceError(404, "Sender unavailable.");
  if (!validSignature(raw, signature, senderSecret(s).appSecret))
    throw new WorkspaceError(403, "Webhook signature invalid.");
  const parsed = z
    .object({
      object: z.literal("whatsapp_business_account"),
      entry: z.array(
        z.object({
          id: z.string(),
          changes: z.array(
            z.object({
              field: z.string(),
              value: z.object({
                metadata: z.object({ phone_number_id: z.string() }).optional(),
                statuses: z.array(statusSchema).optional(),
                messages: z.array(messageSchema).optional(),
              }),
            }),
          ),
        }),
      ),
    })
    .parse(JSON.parse(raw));
  return atomic(() => {
    let stored = 0;
    for (const entry of parsed.entry) {
      if (entry.id !== s.wabaId)
        throw new WorkspaceError(
          403,
          "Webhook business identity does not match academy.",
        );
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        if (change.value.metadata?.phone_number_id !== s.phoneNumberId)
          throw new WorkspaceError(
            403,
            "Webhook receiving phone does not match academy.",
          );
        const values = [
          ...(change.value.statuses ?? []).map((status) => ({ status })),
          ...(change.value.messages ?? []).map((message) => ({ message })),
        ];
        for (const value of values) {
          const id = createHash("sha256")
            .update(`${academyId}:${JSON.stringify(value)}`)
            .digest("hex");
          const r = database()
            .prepare(
              "INSERT INTO communication_events(id,academyId,phoneNumberId,body,receivedAt) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
            )
            .run(
              id,
              academyId,
              s.phoneNumberId,
              JSON.stringify(value),
              new Date().toISOString(),
            );
          stored += Number(r.changes);
        }
      }
    }
    return { stored }; // Durable acknowledgement; worker processes later.
  });
}
export function processEvents() {
  const pending = database()
    .prepare(
      "SELECT * FROM communication_events WHERE processedAt IS NULL ORDER BY receivedAt LIMIT 100",
    )
    .all();
  for (const event of pending)
    atomic(() => {
      if (
        database()
          .prepare("SELECT processedAt FROM communication_events WHERE id=?")
          .get(event.id)?.processedAt
      )
        return;
      const academyId = String(event.academyId),
        value = JSON.parse(String(event.body)),
        s = comm.settings(academyId);
      let outcome = "IGNORED";
      if (!s || s.phoneNumberId !== event.phoneNumberId)
        outcome = "SENDER_CHANGED";
      else if (value.status) {
        const st = statusSchema.parse(value.status);
        const row = database()
          .prepare(
            "SELECT * FROM delivery_jobs WHERE academyId=? AND (providerId=? OR id=?)",
          )
          .get(
            academyId,
            st.id,
            st.biz_opaque_callback_data ?? "",
          ) as unknown as DeliveryJob | undefined;
        const contact = row
          ? comm.contact(academyId, row.guardianId)
          : undefined;
        if (
          row &&
          contact?.phone === `+${st.recipient_id}` &&
          (!row.providerId || row.providerId === st.id) &&
          row.attempts > 0
        ) {
          const states = {
            sent: "SENT",
            delivered: "DELIVERED",
            read: "READ",
            failed: "FAILED",
          } as const;
          const state = providerState(row.state, states[st.status]);
          comm.setState(
            row.id,
            state,
            `Provider ${st.status} event at ${st.timestamp}`,
            st.id,
          );
          database()
            .prepare(
              "UPDATE delivery_attempts SET providerId=COALESCE(providerId,?),state=? WHERE jobId=? AND (providerId=? OR state='UNKNOWN')",
            )
            .run(st.id, states[st.status], row.id, st.id);
          outcome = `STATUS_${state}`;
        } else outcome = "UNMATCHED_STATUS";
      } else if (value.message) {
        const m = messageSchema.parse(value.message);
        const contactRow = database()
          .prepare(
            "SELECT body FROM guardian_contacts WHERE academyId=? AND phone=?",
          )
          .get(academyId, `+${m.from}`);
        const c = contactRow
          ? (JSON.parse(String(contactRow.body)) as GuardianContact)
          : undefined;
        const timestamp = Number(m.timestamp) * 1000;
        if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000)
          outcome = "INVALID_TIMESTAMP";
        else if (!c?.verifiedAt || !authorisedGuardian(academyId, c.guardianId))
          outcome = "UNKNOWN_CONTACT";
        else {
          const inboundAt = new Date(timestamp).toISOString();
          comm.saveContact({
            ...c,
            lastInboundAt:
              !c.lastInboundAt || inboundAt > c.lastInboundAt
                ? inboundAt
                : c.lastInboundAt,
          });
          if (m.type !== "text" || !m.text) outcome = "UNSUPPORTED_MESSAGE";
          else if (/^(stop|unsubscribe|opt\s*out)$/i.test(m.text.body.trim())) {
            comm.saveContact({
              ...comm.contact(academyId, c.guardianId)!,
              optedOutAt: new Date().toISOString(),
              version: c.version + 1,
            });
            database()
              .prepare(
                "UPDATE delivery_jobs SET state='CANCELLED',reason='Guardian opt-out' WHERE academyId=? AND guardianId=? AND state='QUEUED'",
              )
              .run(academyId, c.guardianId);
            outcome = "OPTED_OUT";
          } else {
            const linked = database()
              .prepare(
                "SELECT playerId FROM guardian_relationships WHERE academyId=? AND userId=?",
              )
              .all(academyId, c.guardianId)
              .map((r) => String(r.playerId))
              .filter((id) =>
                repo
                  .find(academyId, "player", id)
                  ?.sportIds.includes("football"),
              );
            const context = m.context?.id
              ? database()
                  .prepare(
                    "SELECT playerId FROM delivery_jobs WHERE academyId=? AND guardianId=? AND providerId=?",
                  )
                  .get(academyId, c.guardianId, m.context.id)
              : undefined;
            const playerId =
              context && linked.includes(String(context.playerId))
                ? String(context.playerId)
                : linked.length === 1
                  ? linked[0]
                  : undefined;
            if (playerId) {
              appendInbound(
                academyId,
                c.guardianId,
                playerId,
                m.text.body,
                m.id,
                m.timestamp,
              );
              outcome = "ROUTED";
            } else outcome = "AMBIGUOUS_CHILD";
          }
        }
      }
      database()
        .prepare(
          "UPDATE communication_events SET processedAt=?,outcome=? WHERE id=?",
        )
        .run(new Date().toISOString(), outcome, String(event.id));
      audit(
        academyId,
        "communication-worker",
        `WhatsApp event ${outcome}`,
        String(event.id),
      );
    });
}
