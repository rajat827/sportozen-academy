import type { DemoState } from "@/domain/entities";
import type { NotificationPreference } from "@/domain/parent-development";
import type { Actor } from "./parent-updates";
export function saveParentPreferences(
  state: DemoState,
  actor: Actor,
  preferences: NotificationPreference,
  restriction: string,
): DemoState {
  if (
    actor.role !== "parent" ||
    actor.id !== preferences.guardianId ||
    !state.guardians.some(
      (g) => g.id === actor.id && g.academyId === preferences.academyId,
    )
  )
    throw new Error("Preference access denied");
  const playerId = state.guardians.find((g) => g.id === actor.id)!.playerIds[0];
  return {
    ...state,
    preferences: state.preferences.map((p) =>
      p.guardianId === actor.id ? { ...preferences, futureWhatsApp: false } : p,
    ),
    dietaryRestrictions: [
      ...state.dietaryRestrictions.filter(
        (r) => !(r.guardianId === actor.id && r.playerId === playerId),
      ),
      {
        id: `${actor.id}-${playerId}-restriction`,
        academyId: preferences.academyId,
        guardianId: actor.id,
        playerId,
        note: restriction.trim(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}
export function notificationsEnabled(
  preferences: NotificationPreference,
  clock = new Date(),
): boolean {
  if (!preferences.inAppNotifications) return false;
  const now = `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}`;
  if (
    !preferences.quietStart ||
    !preferences.quietEnd ||
    preferences.quietStart === preferences.quietEnd
  )
    return true;
  return !(preferences.quietStart < preferences.quietEnd
    ? now >= preferences.quietStart && now < preferences.quietEnd
    : now >= preferences.quietStart || now < preferences.quietEnd);
}
