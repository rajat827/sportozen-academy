"use client";
import { useState } from "react";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { TextField } from "./plan-editor";
import { saveParentPreferences } from "@/services/communication/preferences";
import { updateTypes } from "@/services/development/plans";
import type { NotificationPreference } from "@/domain/parent-development";
const names: Record<string, string> = {
  NEW_DEVELOPMENT_PLAN: "Development Plan Updates",
  WEEKLY_TRAINING_FOCUS: "Weekly Training Updates",
  SESSION_SUMMARY: "Session Summaries",
  NUTRITION_HYDRATION: "Nutrition and Hydration Guidance",
  GENERAL_COACH_UPDATE: "General Coach Updates",
};
export function ParentPreferences() {
  const { data, actor, ready, mutate } = useDevelopmentWorkspace();
  const [edited, setEdited] = useState<NotificationPreference | null>(null),
    [restriction, setRestriction] = useState<string | null>(null);
  if (!ready) return <p>Loading preferences…</p>;
  const pref =
    edited ?? data.preferences.find((p) => p.guardianId === actor.id);
  if (!pref) return <p>Preferences unavailable for this account.</p>;
  const note =
    restriction ??
    data.dietaryRestrictions.find((r) => r.guardianId === actor.id)?.note ??
    "";
  return (
    <Card>
      <h2>Notification preferences</h2>
      <p>
        Categories control new in-app update publication. Nutrition guidance is
        optional. In-app notification indicators respect quiet hours.
      </p>
      <div className="form-stack">
        {([ ["attendance", "Attendance Messages"], ["schedule", "Schedule Changes"], ["fees", "Fee Reminders"] ] as const).map(([key,label]) => <label className="check-row" key={key}><input type="checkbox" aria-label={label} checked={pref[key] ?? true} onChange={e => setEdited({ ...pref,[key]: e.target.checked })} />{label}</label>)}
        {updateTypes.map((type) => (
          <label className="check-row" key={type}>
            <input
              type="checkbox"
              aria-label={names[type] ?? type.replaceAll("_", " ")}
              checked={pref.categories[type]}
              onChange={(e) =>
                setEdited({
                  ...pref,
                  categories: { ...pref.categories, [type]: e.target.checked },
                })
              }
            />
            {names[type] ?? type.replaceAll("_", " ")}
          </label>
        ))}
        <label className="check-row">
          <input
            aria-label="In-App Notifications"
            type="checkbox"
            checked={pref.inAppNotifications}
            onChange={(e) =>
              setEdited({ ...pref, inAppNotifications: e.target.checked })
            }
          />
          In-App Notifications
        </label>
        <label>
          Preferred Language
          <select
            aria-label="Preferred Language"
            value={pref.preferredLanguage}
            onChange={(e) =>
              setEdited({ ...pref, preferredLanguage: e.target.value })
            }
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Marathi</option>
          </select>
        </label>
        <p>
          Language preference is recorded; automatic translation is not
          connected.
        </p>
        <div className="form-grid">
          <TextField
            label="Quiet hours start"
            type="time"
            value={pref.quietStart}
            onChange={(quietStart) => setEdited({ ...pref, quietStart })}
          />
          <TextField
            label="Quiet hours end"
            type="time"
            value={pref.quietEnd}
            onChange={(quietEnd) => setEdited({ ...pref, quietEnd })}
          />
        </div>
        <label className="check-row">
          <input
            aria-label="Future external notifications"
            type="checkbox"
            checked={false}
            disabled
          />
          Future external notifications · NOT CONNECTED
        </label>
        <TextField
          label="Dietary restriction or allergy note"
          value={note}
          onChange={setRestriction}
          multiline
        />
        <p>
          Use fictional demo details only. Your note is restricted to you and
          authorised staff; it is never included automatically in an update or
          sent externally.
        </p>
        <Button
          onClick={() => {
            if (mutate((s) => saveParentPreferences(s, actor, pref, note))) {
              setEdited(null);
              setRestriction(null);
            }
          }}
        >
          Save Parent Preferences
        </Button>
        <Badge>External: NOT_SENT</Badge>
      </div>
    </Card>
  );
}
