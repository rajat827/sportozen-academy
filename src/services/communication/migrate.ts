import type { MessageDraft } from "@/domain/entities";
import { messageTemplates } from "./message-drafts";
export function migrateMessageDraft(message: MessageDraft): MessageDraft {
  const legacy = message as MessageDraft & { status: string };
  const oldStatus = String(legacy.status);
  const status = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "NOT_SENT",
  ].includes(oldStatus)
    ? (oldStatus as MessageDraft["status"])
    : "DRAFT";
  const aliases: Record<string, string> = {
    "Session update": messageTemplates[0],
    "Weekly progress": messageTemplates[4],
    "Report available": messageTemplates[5],
    "Event announcement": messageTemplates[6],
  };
  return {
    ...message,
    template: aliases[message.template] ?? message.template,
    channel: "Manual copy",
    status: status === "APPROVED" ? "NOT_SENT" : status,
    deliveryStatus: "NOT_SENT",
    relatedType: message.relatedType ?? "player",
    relatedId: message.relatedId ?? message.playerId,
    sources: message.sources ?? [],
    history: message.history ?? [],
    approvedAt: message.approvedAt,
    parentDemo: message.parentDemo ?? false,
  };
}
