import type { DemoState } from "@/domain/entities";
import { getPlan } from "@/services/development/plans";
import { updateTypes } from "@/services/development/plans";
export function upgradeDevelopmentState(state: DemoState): DemoState {
  return {
    ...state,
    plans: state.plans.map((p) => getPlan(state, p.playerId)),
    parentUpdates: state.parentUpdates ?? [],
    personalisations: state.personalisations ?? [],
    conversations: state.conversations ?? [],
    conversationMessages: state.conversationMessages ?? [],
    internalNotes: state.internalNotes ?? [],
    dietaryRestrictions: state.dietaryRestrictions ?? [],
    nutritionGuidance: state.nutritionGuidance?.length
      ? state.nutritionGuidance
      : [
          {
            id: "hydration-general",
            academyId: state.academy.id,
            title: "Training-day hydration",
            body: "Arrive well hydrated. Carry a water bottle. Choose a suitable light snack before training and an appropriate recovery meal afterwards. Avoid heavy meals immediately before training.",
            disclaimer:
              "This is general academy guidance and is not medical or clinical nutrition advice.",
            approval: "ACADEMY_APPROVED",
            personalised: false,
          },
        ],
    preferences: state.preferences?.length
      ? state.preferences
      : state.guardians.map((g) => ({
          id: `preference-${g.id}`,
          academyId: g.academyId,
          guardianId: g.id,
          categories: Object.fromEntries(
            updateTypes.map((t) => [t, t !== "NUTRITION_HYDRATION"]),
          ) as Record<(typeof updateTypes)[number], boolean>,
          inAppNotifications: true,
          preferredLanguage: "English",
          quietStart: "",
          quietEnd: "",
          futureWhatsApp: false,
        })),
    consents: state.consents?.length
      ? state.consents
      : state.guardians.map((g) => ({
          id: `consent-${g.id}`,
          academyId: g.academyId,
          guardianId: g.id,
          inAppConsent: true,
          externalConsent: false,
        })),
  };
}
