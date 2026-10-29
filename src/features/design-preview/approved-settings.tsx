"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Camera,
  Mail,
  Phone,
  Link as LinkIcon,
  MapPin,
  Upload,
  Trash2,
  Plus,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewRoute, type PreviewScenario } from "./catalog";
import { money } from "./fixtures";
import { ApprovedWorkspaceShell } from "./approved-workspace-shell";
import { GalleryParentFrame } from "./gallery-parent-frame";
import {
  readSettings,
  recoverSettingsDraft,
  retainSettingsDraft,
  clearSettingsDraft,
  saveSettings,
  settingsTabs,
  settingsVenue,
  stageSettingsLogo,
  type SettingsDraft,
  type SettingsErrors,
} from "./settings-model";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import "./approved-settings.css";

function SettingsCard({
  title,
  note,
  action,
  className = "",
  children,
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`as-card ${className}`}>
      <div className="as-card-heading">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Logo({
  value,
  academyId,
  initials,
  large = false,
}: {
  value: string | undefined;
  academyId: string;
  initials: string;
  large?: boolean;
}) {
  const src =
    value ||
    (value !== "" && academyId === "riverside"
      ? "/design-preview/approved-settings/riverside-logo.png"
      : "");
  return (
    <span className={`as-logo${large ? " large" : ""}`}>
      {src ? (
        <Image
          src={src}
          width={large ? 122 : 110}
          height={large ? 122 : 110}
          alt="Academy logo preview"
          unoptimized
        />
      ) : (
        <span aria-label="Academy initials fallback">{initials}</span>
      )}
    </span>
  );
}

export function ApprovedSettings({
  scenario = "default",
  role = "OWNER",
}: {
  scenario?: PreviewScenario;
  role?: "OWNER" | "COACH" | "PARENT";
}) {
  const state = usePreviewState(),
    saved = readSettings(state);
  if (!saved)
    return (
      <div className="design-preview as-unavailable">
        <h1>Settings</h1>
        <p role="alert">
          This academy is unavailable. No other academy was selected.
        </p>
        <Link href="/design-preview/prototype">
          Return to the preview gallery
        </Link>
        <p className="hd-preview-notice">
          Design preview — fictional data; no payments or messages are
          processed.
        </p>
      </div>
    );
  if (role === "PARENT") {
    const linked = state.players.some(
      (player) =>
        player.id === state.playerId && player.guardian === "Neha Shah",
    );
    if (!linked)
      return (
        <div className="design-preview as-unavailable">
          <h1>Settings</h1>
          <p role="alert">
            Choose your linked child in the existing parent workflow. No other
            child was selected.
          </p>
          <Link href={previewRoute("channel-settings")}>
            Open parent account preferences
          </Link>
          <p className="hd-preview-notice">
            Design preview — fictional data; no payments or messages are
            processed.
          </p>
        </div>
      );
    return (
      <GalleryParentFrame screenId="parent-more" title="Settings">
        <section className="as-restricted">
          <h2>Academy administration is unavailable for this role</h2>
          <p>
            Parents can use their linked account preferences; academy
            configuration, subscription and deletion are not available.
          </p>
          <Link href={previewRoute("channel-settings")}>
            Open permitted account tools
          </Link>
          <p>
            Explicit fictional parent permission preview; customer authorisation
            remains server-derived.
          </p>
        </section>
      </GalleryParentFrame>
    );
  }
  return (
    <ApprovedWorkspaceShell
      active="More"
      role={role === "OWNER" ? "OWNER" : "COACH"}
      scenario={scenario}
      className="settings-screen"
    >
      <SettingsEditor
        key={`${saved.academy.id}:${scenario}:${role}:${previewAdapter.resetGeneration()}`}
        scenario={scenario}
        role={role}
      />
    </ApprovedWorkspaceShell>
  );
}

const subscribeHydration = () => () => {};
function SettingsEditor(props: {
  scenario: PreviewScenario;
  role: "OWNER" | "COACH" | "PARENT";
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  if (!hydrated)
    return (
      <>
        <div className="as-title">
          <h1>Settings</h1>
          <p>Manage your academy, team, notifications and preferences.</p>
        </div>
        <p role="status" className="as-state">
          Loading academy configuration…
        </p>
      </>
    );
  return <HydratedSettingsEditor {...props} />;
}

function HydratedSettingsEditor({
  scenario,
  role,
}: {
  scenario: PreviewScenario;
  role: "OWNER" | "COACH" | "PARENT";
}) {
  const state = usePreviewState(),
    record = readSettings(state)!;
  const [draft, setDraft] = useState<SettingsDraft>(
    () =>
      recoverSettingsDraft(
        record.academy.id,
        record.version,
        record.fingerprint,
      ) ?? {
        ...record.draft,
        ...(scenario === "unsaved"
          ? { name: `${record.draft.name} · edited` }
          : {}),
        ...(scenario === "validation" ? { email: "invalid-address" } : {}),
      },
  );
  const [base, setBase] = useState(record),
    [errors, setErrors] = useState<SettingsErrors>({}),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [logoBusy, setLogoBusy] = useState(false),
    [venueOpen, setVenueOpen] = useState(false),
    [faultReviewed, setFaultReviewed] = useState(false),
    [reviewOpen, setReviewOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    venueTrigger = useRef<HTMLButtonElement>(null),
    reviewTrigger = useRef<HTMLButtonElement>(null),
    saveButton = useRef<HTMLButtonElement>(null),
    saveLock = useRef(false),
    logoRead = useRef(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base.draft),
    permitted = role === "OWNER" && scenario !== "archived";
  const clearRecovery = useCallback(() => {
    clearSettingsDraft(base.academy.id, base.version, base.fingerprint);
  }, [base.academy.id, base.version, base.fingerprint]);
  useUnsavedChanges(dirty, clearRecovery);
  useEffect(() => {
    if (dirty && permitted)
      retainSettingsDraft(
        base.academy.id,
        base.version,
        base.fingerprint,
        draft,
      );
    else clearRecovery();
  }, [
    dirty,
    permitted,
    draft,
    base.academy.id,
    base.version,
    base.fingerprint,
    clearRecovery,
  ]);
  const update = (key: keyof SettingsDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setError("");
  };
  const venue = settingsVenue(state);
  const fallbackInitials =
    draft.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || base.academy.monogram;
  const logoTrigger = () => fileInput.current?.click();
  const field = (
    label: string,
    key: keyof SettingsDraft,
    type = "text",
    icon?: ReactNode,
  ) => (
    <label className="as-field">
      {label}
      <span className={icon ? "as-input-icon" : ""}>
        {icon}
        <input
          aria-label={label}
          name={key}
          type={type}
          value={draft[key] ?? ""}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `as-${key}-error` : undefined}
          onChange={(event) => update(key, event.target.value)}
        />
      </span>
      {errors[key] && (
        <small className="as-field-error" id={`as-${key}-error`}>
          {errors[key]}
        </small>
      )}
    </label>
  );
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saveLock.current || logoBusy) return;
    saveLock.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = saveSettings(
        draft,
        base.academy.id,
        base.version,
        base.fingerprint,
        faultReviewed ? "default" : scenario,
        permitted,
      );
      if (!result.ok) {
        setError(result.error);
        const validation = "errors" in result ? (result.errors ?? {}) : {};
        setErrors(validation);
        const first = Object.keys(validation)[0];
        const invalid = first
          ? event.currentTarget.elements.namedItem(first)
          : null;
        if (invalid instanceof HTMLElement) invalid.focus();
      } else {
        clearRecovery();
        setDraft(result.saved.draft);
        setBase(result.saved);
        setErrors({});
        setNotice(
          "Changes saved in this fictional preview. No customer records were updated.",
        );
      }
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <div className="as-title">
        <h1>Settings</h1>
        <p>Manage your academy, team, notifications and preferences.</p>
      </div>
      {role !== "OWNER" ? (
        <section
          className="as-restricted"
          aria-label="Restricted academy settings"
        >
          <h2>Academy administration is unavailable for this role</h2>
          <p>
            {role === "PARENT"
              ? "Parents can use their linked account preferences; academy configuration, subscription and deletion are not available."
              : "Academy configuration requires owner or admin permission. Coaches keep their existing training and account access."}
          </p>
          <Link
            href={previewRoute(
              role === "PARENT" ? "channel-settings" : "coach-more",
            )}
          >
            Open permitted account tools
          </Link>
          <p className="as-support-note">
            Explicit fictional {role.toLowerCase()} permission preview; customer
            authorisation remains server-derived.
          </p>
        </section>
      ) : scenario === "loading" ? (
        <div className="as-loading" role="status">
          <p>Loading academy configuration…</p>
          <div />
          <div />
          <div />
        </div>
      ) : (
        <>
          <nav className="as-tabs" aria-label="Settings sections">
            {settingsTabs.map((tab) => (
              <Link
                key={tab.label}
                href={previewRoute(tab.to)}
                aria-current={tab.label === "Academy" ? "page" : undefined}
                className={tab.label === "Academy" ? "active" : ""}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {scenario === "archived" && (
            <p className="as-state" role="status">
              Archived configuration preview · read-only. Create a new
              authorised draft to change records.
            </p>
          )}
          {error && (
            <div className="as-state error" role="alert">
              {error}
              {scenario === "failed-save" && (
                <button
                  type="button"
                  className="as-text-button"
                  onClick={() => {
                    setFaultReviewed(true);
                    setError("");
                  }}
                >
                  Keep draft and enable retry
                </button>
              )}
              {(scenario === "conflict" ||
                error.includes("saved configuration changed")) && (
                <button
                  ref={reviewTrigger}
                  type="button"
                  className="as-text-button"
                  onClick={() => setReviewOpen(true)}
                >
                  Review saved values
                </button>
              )}
            </div>
          )}
          {notice && (
            <p className="as-state success" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit} noValidate aria-label="Academy configuration">
            <input
              ref={fileInput}
              className="as-file-input"
              type="file"
              tabIndex={-1}
              accept="image/png"
              aria-label="Choose academy PNG logo"
              disabled={!permitted || logoBusy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const request = ++logoRead.current;
                setLogoBusy(true);
                try {
                  const logo = await stageSettingsLogo(file);
                  if (request === logoRead.current) update("logo", logo);
                } catch (failure) {
                  if (request === logoRead.current)
                    setErrors((current) => ({
                      ...current,
                      logo:
                        failure instanceof Error
                          ? failure.message
                          : "The logo could not be read.",
                    }));
                } finally {
                  if (request === logoRead.current) setLogoBusy(false);
                }
              }}
            />
            <div className={`as-layout${dirty ? " is-dirty" : ""}`}>
              <div className="as-main-column">
                <SettingsCard
                  title="Academy Profile"
                  note="Update your academy details and brand information."
                  action={
                    <button
                      ref={saveButton}
                      type="submit"
                      aria-describedby="as-save-scope"
                      className="as-button primary"
                      disabled={!permitted || busy || logoBusy || !dirty}
                    >
                      {busy ? "Saving…" : "Save Changes"}
                    </button>
                  }
                >
                  <fieldset
                    disabled={!permitted || busy}
                    className="as-profile-grid"
                  >
                    <button
                      type="button"
                      className="as-thumbnail-button"
                      aria-label="Change academy profile logo"
                      onClick={logoTrigger}
                    >
                      <Logo
                        value={draft.logo}
                        academyId={base.academy.id}
                        initials={fallbackInitials}
                      />
                      <span className="as-camera">
                        <Camera size={17} />
                      </span>
                    </button>
                    <div className="as-profile-fields">
                      {field("Academy Name", "name")}{" "}
                      {field(
                        "Location (preview)",
                        "location",
                        "text",
                        <MapPin size={16} />,
                      )}
                    </div>
                    <label className="as-field as-about">
                      About Academy (preview)
                      <textarea
                        aria-label="About Academy (preview)"
                        name="about"
                        value={draft.about}
                        aria-invalid={!!errors.about}
                        aria-describedby={
                          errors.about ? "as-about-error" : undefined
                        }
                        maxLength={250}
                        onChange={(event) =>
                          update("about", event.target.value)
                        }
                      />
                      <small
                        className={
                          errors.about ? "as-field-error" : "as-counter"
                        }
                      >
                        {draft.about.length}/250
                      </small>
                      {errors.about && (
                        <small id="as-about-error" className="as-field-error">
                          {errors.about}
                        </small>
                      )}
                    </label>
                  </fieldset>
                  {dirty && (
                    <p className="as-unsaved" role="status">
                      Unsaved changes
                    </p>
                  )}
                </SettingsCard>
                <SettingsCard
                  title="Contact Information"
                  note="This information will be used for communication with parents and players."
                >
                  <fieldset
                    disabled={!permitted || busy}
                    className="as-contact-grid"
                  >
                    {field(
                      "Primary Email",
                      "email",
                      "email",
                      <Mail size={16} />,
                    )}
                    {field(
                      "Phone Number (preview)",
                      "phone",
                      "tel",
                      <Phone size={16} />,
                    )}
                    {field(
                      "Website (Optional, preview)",
                      "website",
                      "url",
                      <LinkIcon size={16} />,
                    )}
                  </fieldset>
                </SettingsCard>
                <SettingsCard
                  title="Academy Settings"
                  note="Configure how your academy works."
                >
                  <fieldset
                    disabled={!permitted || busy}
                    className="as-preferences-grid"
                  >
                    <label className="as-field">
                      Default Time Zone
                      <select
                        aria-label="Default Time Zone"
                        name="timezone"
                        aria-invalid={!!errors.timezone}
                        aria-describedby={
                          errors.timezone ? "as-timezone-error" : undefined
                        }
                        value={draft.timezone}
                        onChange={(event) =>
                          update("timezone", event.target.value)
                        }
                      >
                        <option value="Asia/Kolkata">
                          (GMT+5:30) Asia/Kolkata
                        </option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="UTC">UTC</option>
                        {!["Asia/Kolkata", "Europe/London", "UTC"].includes(
                          draft.timezone,
                        ) && (
                          <option value={draft.timezone}>
                            {draft.timezone}
                          </option>
                        )}
                      </select>
                      {errors.timezone && (
                        <small
                          id="as-timezone-error"
                          className="as-field-error"
                        >
                          {errors.timezone}
                        </small>
                      )}
                    </label>
                    <label className="as-field">
                      Week Starts On
                      <select value="Monday" disabled>
                        <option>Monday</option>
                      </select>
                    </label>
                    <label className="as-field">
                      Age Group Format
                      <select value="Recorded categories" disabled>
                        <option>
                          Recorded categories:{" "}
                          {Array.from(
                            new Set(
                              state.players.map((player) => player.category),
                            ),
                          ).join(", ") || "Not recorded"}
                        </option>
                      </select>
                    </label>
                    <label className="as-field">
                      Date Format
                      <select value="DD MMM YYYY" disabled>
                        <option>DD MMM YYYY (e.g. 20 Oct 2026)</option>
                      </select>
                    </label>
                    <label className="as-field">
                      Time Format
                      <select value="12-hour" disabled>
                        <option>12-hour (e.g. 5:00 PM)</option>
                      </select>
                    </label>
                    <label className="as-field">
                      Language
                      <select
                        aria-label="Language"
                        name="language"
                        aria-invalid={!!errors.language}
                        aria-describedby={
                          errors.language ? "as-language-error" : undefined
                        }
                        value={draft.language}
                        onChange={(event) =>
                          update("language", event.target.value)
                        }
                      >
                        <option>English</option>
                        {draft.language !== "English" && (
                          <option value={draft.language}>
                            {draft.language} (saved; unavailable)
                          </option>
                        )}
                      </select>
                      {errors.language && (
                        <small
                          id="as-language-error"
                          className="as-field-error"
                        >
                          {errors.language}
                        </small>
                      )}
                    </label>
                  </fieldset>
                  <p className="as-support-note">
                    Formats are read-only. This preview default does not
                    reschedule existing sessions. English only.
                  </p>
                </SettingsCard>
                <SettingsCard
                  title="Venues / Training Locations"
                  note="Manage your training grounds and facilities."
                  action={
                    <button
                      ref={venueTrigger}
                      type="button"
                      className="as-button"
                      disabled={!permitted}
                      onClick={() => setVenueOpen(true)}
                    >
                      <Plus size={16} />
                      Add Venue
                    </button>
                  }
                >
                  <div
                    className="as-venue-scroll"
                    tabIndex={0}
                    aria-label="Training locations table"
                  >
                    <table>
                      <thead>
                        <tr>
                          {["Name", "Address", "Type", "Status", "Actions"].map(
                            (label) => (
                              <th key={label}>{label}</th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{venue.name}</td>
                          <td>{venue.address}</td>
                          <td>{venue.type}</td>
                          <td>
                            <span className="as-badge">{venue.status}</span>
                          </td>
                          <td>
                            <details className="as-venue-actions">
                              <summary aria-label={`Actions for ${venue.name}`}>
                                <MoreHorizontal size={19} />
                              </summary>
                              <Link href={previewRoute("venue-edit")}>
                                Edit recorded venue
                              </Link>
                              <Link href={previewRoute("venues")}>
                                Open venue list
                              </Link>
                            </details>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="as-support-note">
                    One recorded venue; adding a separate venue is unavailable.
                  </p>
                </SettingsCard>
              </div>
              <div className="as-support-column">
                <SettingsCard
                  title="Academy Logo"
                  note="PNG under 200 KB; JPG unavailable. Recommended: 512 × 512 px."
                >
                  <div className="as-logo-actions">
                    <Logo
                      value={draft.logo}
                      academyId={base.academy.id}
                      initials={fallbackInitials}
                      large
                    />
                    <div>
                      <button
                        type="button"
                        className="as-text-button"
                        disabled={!permitted || logoBusy}
                        onClick={logoTrigger}
                      >
                        <Upload size={17} />
                        {logoBusy ? "Reading logo…" : "Change Logo"}
                      </button>
                      <button
                        type="button"
                        className="as-text-button danger"
                        disabled={!permitted || logoBusy}
                        onClick={() => update("logo", "")}
                      >
                        <Trash2 size={17} />
                        Remove
                      </button>
                    </div>
                  </div>
                  {errors.logo && (
                    <p className="as-field-error" role="alert">
                      {errors.logo}
                    </p>
                  )}
                </SettingsCard>
                <SettingsCard
                  title="Academy Plan"
                  note="Sportozen software plan."
                  action={<span className="as-badge">Preview plan</span>}
                >
                  <p className="as-plan-price">
                    {money(base.academy, base.academy.softwareFee)}
                    <small> / fictional month</small>
                  </p>
                  <ul className="as-plan-features">
                    {[
                      "Training plans & reviewed reports",
                      "Parent communication preview",
                      "Attendance recording",
                      "Academy-owned staff access",
                    ].map((label) => (
                      <li key={label}>
                        <Check size={16} />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="as-button full"
                    disabled
                    title="Subscription management requires a verified billing destination"
                  >
                    Manage Plan
                  </button>
                  <p className="as-support-note">
                    Separate from training fees. Pro entitlements and billing
                    management are unavailable; no charges occur.
                  </p>
                </SettingsCard>
                <SettingsCard
                  title="Danger Zone"
                  note="Academy deletion is not available in this preview."
                  className="as-danger"
                >
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <button
                        type="button"
                        className="as-button danger full"
                        disabled={!permitted}
                      >
                        <Trash2 size={17} />
                        Preview deletion restriction
                      </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="hd-overlay" />
                      <Dialog.Content className="hd-help">
                        <Dialog.Title>No academy will be deleted</Dialog.Title>
                        <Dialog.Description>
                          This is a non-destructive permission preview. No
                          academy deletion workflow or endpoint is implemented.
                          All records remain unchanged.
                        </Dialog.Description>
                        <Dialog.Close
                          className="hd-close"
                          aria-label="Close deletion preview"
                        >
                          <X size={20} />
                        </Dialog.Close>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </SettingsCard>
              </div>
            </div>
          </form>
          <Dialog.Root open={venueOpen} onOpenChange={setVenueOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content
                className="hd-help"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  venueTrigger.current?.focus();
                }}
              >
                <Dialog.Title>Recorded venue workflow</Dialog.Title>
                <Dialog.Description>
                  The existing preview edits one recorded training venue. Adding
                  a separate venue record is unavailable; this action will not
                  overwrite it automatically.
                </Dialog.Description>
                <Link className="as-button" href={previewRoute("venue-edit")}>
                  Open existing venue editor
                </Link>
                <Dialog.Close
                  className="hd-close"
                  aria-label="Close venue preview"
                >
                  <X size={20} />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Dialog.Root open={reviewOpen} onOpenChange={setReviewOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content
                className="hd-help as-review-dialog"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  (reviewTrigger.current ?? saveButton.current)?.focus();
                }}
              >
                <Dialog.Title>Review saved configuration</Dialog.Title>
                <Dialog.Description>
                  The saved academy values are shown below. Your unsaved draft
                  is retained. Continue only after reviewing the current
                  version; Save Changes remains the single action that applies
                  your draft.
                </Dialog.Description>
                <dl>
                  <dt>Academy</dt>
                  <dd>{record.draft.name}</dd>
                  <dt>Contact</dt>
                  <dd>{record.draft.email}</dd>
                  <dt>Location</dt>
                  <dd>{record.draft.location}</dd>
                  <dt>About</dt>
                  <dd>{record.draft.about || "Not recorded"}</dd>
                  <dt>Phone</dt>
                  <dd>{record.draft.phone || "Not recorded"}</dd>
                  <dt>Website</dt>
                  <dd>{record.draft.website || "Not recorded"}</dd>
                  <dt>Time zone</dt>
                  <dd>{record.draft.timezone}</dd>
                  <dt>Language</dt>
                  <dd>{record.draft.language}</dd>
                  <dt>Saved version</dt>
                  <dd>{record.version}</dd>
                </dl>
                <p>Saved logo</p>
                <Logo
                  value={record.draft.logo}
                  academyId={record.academy.id}
                  initials={record.academy.monogram}
                />
                <button
                  type="button"
                  className="as-button"
                  onClick={() => {
                    clearRecovery();
                    setBase(record);
                    setFaultReviewed(true);
                    setError("");
                    setReviewOpen(false);
                  }}
                >
                  Keep draft with reviewed version
                </button>
                <Dialog.Close
                  className="hd-close"
                  aria-label="Close saved configuration review"
                >
                  <X size={20} />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <p id="as-save-scope" className="as-support-note as-tab-note">
            Save Changes covers profile, contact, supported defaults and logo.
            Fields marked preview are local notes; customer persistence is
            unavailable. Venue actions remain separate.
          </p>
        </>
      )}
    </>
  );
}
