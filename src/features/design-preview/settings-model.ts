import { previewAdapter, type PreviewState } from "./adapter";
import { previewAcademies, resolvedAcademy } from "./fixtures";
import type { PreviewScenario } from "./catalog";

export interface SettingsDraft {
  name: string;
  location: string;
  about: string;
  email: string;
  phone: string;
  website: string;
  timezone: string;
  language: string;
  logo: string | undefined;
}
export type SettingsErrors = Partial<Record<keyof SettingsDraft, string>>;
// Private editor recovery only: never a confirmed configuration or browser storage.
const recoveredDrafts = new Map<string, SettingsDraft>();
let recoveryGeneration = -1;
function syncRecoveryGeneration() {
  const generation = previewAdapter.resetGeneration();
  if (generation !== recoveryGeneration) {
    recoveredDrafts.clear();
    recoveryGeneration = generation;
  }
}
const draftKey = (academyId: string, version: number, fingerprint: string) =>
  JSON.stringify([academyId, version, fingerprint]);
export function recoverSettingsDraft(
  academyId: string,
  version: number,
  fingerprint: string,
) {
  syncRecoveryGeneration();
  const value = recoveredDrafts.get(draftKey(academyId, version, fingerprint));
  return value ? { ...value } : undefined;
}
export function retainSettingsDraft(
  academyId: string,
  version: number,
  fingerprint: string,
  draft: SettingsDraft,
) {
  syncRecoveryGeneration();
  recoveredDrafts.set(draftKey(academyId, version, fingerprint), { ...draft });
}
export function clearSettingsDraft(
  academyId: string,
  version: number,
  fingerprint: string,
) {
  syncRecoveryGeneration();
  recoveredDrafts.delete(draftKey(academyId, version, fingerprint));
}
export const settingsTabs = [
  { label: "Academy", to: "academy-settings" },
  { label: "Team", to: "staff" },
  { label: "Sessions", to: "weekly-plan" },
  { label: "Notifications", to: "guardian-consent" },
  { label: "Account", to: "owner-more" },
  { label: "Integrations", to: "whatsapp-setup" },
] as const;

/** Projection of the existing isolated adapter. Unsupported customer fields
 * are explicit fictional profile notes, never sent to a customer endpoint. */
export function readSettings(state: PreviewState) {
  if (!previewAcademies.some((a) => a.id === state.academyId)) return undefined;
  const academy = resolvedAcademy(state.academyId, state.profiles);
  const profile = state.profiles[academy.id] ?? {};
  const regional = state.fields[`${academy.id}:academy-settings`] ?? {};
  const draft: SettingsDraft = {
    name: profile["Academy name"] ?? academy.name,
    location:
      profile.Location ??
      (academy.id === "riverside" ? "Gurugram, Haryana" : "United Kingdom"),
    about:
      profile["About Academy"] ??
      "Coach-led football training with shared batch plans, optional personalisation and reviewed parent updates.",
    email: profile["Contact email"] ?? `${academy.id}@example.test`,
    phone: profile["Phone number"] ?? "",
    website: profile.Website ?? "",
    timezone: profile.Timezone ?? regional.Timezone ?? academy.timezone,
    language: profile.Language ?? regional.Language ?? "English",
    logo: profile["Logo data"],
  };
  return {
    academy,
    draft,
    version: Number(profile["Settings version"] ?? 0),
    fingerprint: JSON.stringify(draft),
  };
}

export function validateSettings(draft: SettingsDraft): SettingsErrors {
  const errors: SettingsErrors = {};
  if (draft.name.trim().length < 2 || draft.name.length > 200)
    errors.name = "Use an academy name between 2 and 200 characters.";
  if (!draft.location.trim() || draft.location.length > 200)
    errors.location = "Enter a location of up to 200 characters.";
  if (draft.about.length > 250)
    errors.about = "Keep the fictional description within 250 characters.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ||
    draft.email.length > 200
  )
    errors.email = "Enter a valid fictional academy email address.";
  if (
    draft.phone &&
    (!/^[+\d()\s-]{5,30}$/.test(draft.phone) ||
      (draft.phone.match(/\d/g)?.length ?? 0) < 5)
  )
    errors.phone = "Enter a readable phone number, or leave it blank.";
  if (draft.website) {
    try {
      const url = new URL(draft.website);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        draft.website.length > 200
      )
        throw new Error();
    } catch {
      errors.website =
        "Use an http or https website address, or leave it blank.";
    }
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: draft.timezone }).format();
  } catch {
    errors.timezone = "Choose a valid time zone.";
  }
  if (draft.language !== "English")
    errors.language = "Only the current English interface is available.";
  if (
    draft.logo &&
    (draft.logo.length > 300000 ||
      !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(draft.logo))
  )
    errors.logo = "Choose a PNG logo under 200 KB.";
  return errors;
}

export function saveSettings(
  draft: SettingsDraft,
  academyId: string,
  expectedVersion: number,
  expectedFingerprint: string,
  scenario: PreviewScenario,
  permitted: boolean,
) {
  if (!permitted)
    return {
      ok: false as const,
      error: "Academy changes require owner or admin permission.",
    };
  const state = previewAdapter.read(),
    saved = readSettings(state);
  if (!saved || state.academyId !== academyId)
    return {
      ok: false as const,
      error:
        "This academy is unavailable. Your draft has not been applied elsewhere.",
    };
  const errors = validateSettings(draft);
  if (Object.keys(errors).length)
    return {
      ok: false as const,
      error: "Check the labelled fields before saving.",
      errors,
    };
  if (scenario === "failed-save")
    return {
      ok: false as const,
      error:
        "Simulated save failure. Your entered values remain unsaved; enable retry to keep this draft and try again.",
    };
  if (
    scenario === "conflict" ||
    saved.version !== expectedVersion ||
    saved.fingerprint !== expectedFingerprint
  )
    return {
      ok: false as const,
      error:
        "The saved configuration changed. Your draft remains here; review the saved values before retrying.",
    };
  const fields = {
    ...state.fields,
    [`${academyId}:academy-settings`]: {
      ...state.fields[`${academyId}:academy-settings`],
      Timezone: draft.timezone,
      Language: draft.language,
    },
  };
  const profile = {
    ...state.profiles[academyId],
    "Academy name": draft.name.trim(),
    Location: draft.location.trim(),
    "About Academy": draft.about.trim(),
    "Contact email": draft.email.trim(),
    "Phone number": draft.phone.trim(),
    Website: draft.website.trim(),
    Timezone: draft.timezone,
    Language: draft.language,
    "Settings version": String(saved.version + 1),
    ...(draft.logo !== undefined ? { "Logo data": draft.logo } : {}),
  };
  const result = previewAdapter.saveConfirmed({
    fields,
    profiles: { ...state.profiles, [academyId]: profile },
    notice: "",
  });
  if (!result.ok) return result;
  const confirmed = readSettings(previewAdapter.read());
  if (!confirmed || confirmed.version !== saved.version + 1)
    return {
      ok: false as const,
      error:
        "The configuration could not be confirmed. Keep this draft and retry.",
    };
  return { ok: true as const, saved: confirmed };
}

/** Local selection only; same supported file type/limit as the existing form. */
export function stageSettingsLogo(file: File): Promise<string> {
  if (file.type !== "image/png" || file.size > 200000)
    return Promise.reject(
      new Error(
        "Choose a PNG logo under 200 KB. JPG is not supported by the current asset handler.",
      ),
    );
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        new Error(
          "The local logo could not be read. Your current logo is retained.",
        ),
      );
    reader.onload = () => {
      const data = String(reader.result);
      if (!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(data))
        reject(new Error("This file does not contain a supported PNG logo."));
      else resolve(data);
    };
    reader.readAsDataURL(file);
  });
}

export function settingsVenue(state: PreviewState) {
  const saved = state.fields[`${state.academyId}:venue-edit`];
  return {
    name:
      saved?.["Venue name"] ??
      (state.academyId === "riverside" ? "North pitch" : "Pitch 2"),
    address:
      saved?.Location ??
      (state.academyId === "riverside"
        ? "Riverside ground"
        : "Harbour training ground"),
    branch: saved?.Branch ?? "North branch",
    type: "Not recorded",
    status: "Available",
  };
}
