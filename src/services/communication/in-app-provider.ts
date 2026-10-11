import type { DemoState } from "@/domain/entities";
import type { ParentDevelopmentUpdate } from "@/domain/parent-development";
export interface ParentMessagingProvider {
  publish(state: DemoState, update: ParentDevelopmentUpdate): DemoState;
}
export class InAppMessagingProvider implements ParentMessagingProvider {
  publish(state: DemoState, update: ParentDevelopmentUpdate): DemoState {
    if (
      update.approvalStatus !== "APPROVED" ||
      !update.approvalSnapshot ||
      update.approvalSnapshot.version !== update.messageVersion || update.approvalSnapshot.body !== update.messageBody
    )
      throw new Error("Only the approved version can be published");
    const prefs = state.preferences.find(
      (p) => p.guardianId === update.guardianId,
    );
    const consent = state.consents.find(
      (c) => c.guardianId === update.guardianId,
    );
    const allowed =
      consent?.inAppConsent && (prefs?.categories[update.updateType] ?? false);
    const at = new Date().toISOString();
    const published = {
      ...update,
      inAppPublicationStatus: allowed
        ? ("PUBLISHED" as const)
        : ("WITHHELD" as const),
      publishedAt: allowed ? at : undefined,
      externalDeliveryStatus: "NOT_SENT" as const,
    };
    let next = {
      ...state,
      parentUpdates: state.parentUpdates.map((u) =>
        u.id === update.id ? published : u,
      ),
    };
    if (!allowed) return next;
    const id = state.conversations.find(c => c.updateId === update.id)?.id ?? `conversation-${update.id}`;
    if (!next.conversations.some((c) => c.id === id))
      next = {
        ...next,
        conversations: [
          ...next.conversations,
          {
            id,
            academyId: update.academyId,
            playerId: update.playerId,
            guardianId: update.guardianId,
            coachId: update.coachId,
            planId: update.developmentPlanId,
            updateId: update.id,
            topic:
              update.updateType === "NUTRITION_HYDRATION"
                ? "NUTRITION"
                : "PLAYER_DEVELOPMENT",
            title: update.updateType.replaceAll("_", " "),
            status: "OPEN",
            participants: [
              { id: update.guardianId, role: "parent" },
              { id: update.coachId, role: "coach" },
            ],
            history: [
              {
                at,
                action: "Approved update published privately in app",
                actor: update.coachId,
              },
            ],
          },
        ],
      };
    const messageId = `${id}-v${update.messageVersion}`;
    if (!next.conversationMessages.some((m) => m.id === messageId))
      next = {
        ...next,
        conversationMessages: [
          ...next.conversationMessages,
          {
            id: messageId,
            academyId: update.academyId,
            conversationId: id,
            body: update.approvalSnapshot.body,
            senderId: update.coachId,
            senderRole: "coach",
            createdAt: at,
          },
        ],
      };
    return next;
  }
}
class DisabledExternalProvider implements ParentMessagingProvider {
  publish(): DemoState {
    throw new Error(
      "External provider NOT CONNECTED. External delivery remains NOT_SENT.",
    );
  }
}
export class FutureWhatsAppProvider extends DisabledExternalProvider {}
export class FutureEmailProvider extends DisabledExternalProvider {}
export class FutureSMSProvider extends DisabledExternalProvider {}
export class FuturePushProvider extends DisabledExternalProvider {}
export function orchestratePublication(
  state: DemoState,
  update: ParentDevelopmentUpdate,
) {
  return new InAppMessagingProvider().publish(state, update);
}
