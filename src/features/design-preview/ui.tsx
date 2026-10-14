"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Card, Badge } from "@/components/ui/primitives";
import {
  previewRoute,
  type ScreenDefinition,
  type PreviewScenario,
} from "./catalog";
import { previewAdapter, usePreviewState } from "./adapter";
import { readableAccent, resolvedAcademy, weekPlanContext } from "./fixtures";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
export { Button, Card, Badge };
export function Go({
  to,
  children,
  primary = false,
}: {
  to: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      className={primary ? "button primary dp-button-link" : "dp-link"}
      href={previewRoute(to)}
    >
      {children}
    </Link>
  );
}
export function Head({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="dp-card-head">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {children}
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  type?: string;
  options?: string[];
}) {
  return (
    <label className="dp-field">
      {label}
      {options ? (
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      ) : area ? (
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="dp-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Context() {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!;
  return (
    <p className="dp-note">
      {p.name} · Recorded age category {p.category} · {p.batch} · Maya Rao ·{" "}
      {weekPlanContext(state.fields, state.players).first.label}·{" "}
      {weekPlanContext(state.fields, state.players).time}
    </p>
  );
}
export function Pitch() {
  return (
    <svg
      className="dp-pitch"
      viewBox="0 0 440 240"
      role="img"
      aria-label="Paired receiving task: pass between two gates, receive into the free space"
    >
      <rect
        x="24"
        y="24"
        width="392"
        height="192"
        rx="4"
        fill="none"
        stroke="#6c9a81"
        strokeWidth="2"
      />
      <path d="M220 24v192" stroke="#abc7b6" />
      <circle cx="220" cy="120" r="28" fill="none" stroke="#abc7b6" />
      <path
        d="M105 75v28m30-28v28m170 34v28m30-28v28"
        stroke="#cc8842"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="120" cy="138" r="13" fill="#09283e" />
      <circle cx="320" cy="105" r="13" fill="#008463" />
      <path
        d="M145 135l145-24m-11-7 11 7-8 10"
        fill="none"
        stroke="#52786a"
        strokeWidth="3"
        strokeDasharray="6 5"
      />
      <text x="40" y="205" fill="#244b3e" fontSize="12">
        Pass → open body → receive toward the free gate
      </text>
    </svg>
  );
}
export function PreviewDrawer({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary">{trigger}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dp-dialog-overlay" />
        <Dialog.Content className="dp-dialog">
          <Dialog.Close asChild>
            <Button variant="secondary">Close panel</Button>
          </Dialog.Close>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>
            Fictional preview · one editing task · changes stay in prototype
            state.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PrototypeForm({
  screen,
  scenario,
}: {
  screen: ScreenDefinition;
  scenario: PreviewScenario;
}) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    saved = state.fields[`${academy.id}:${screen.id}`] ?? {};
  const defaults: Record<string, string> = {
    "Academy name":
      state.profiles[academy.id]?.["Academy name"] ?? academy.name,
    "Contact email": "academy@example.test",
    "Brand accent": academy.accent,
    Country: academy.country,
    Timezone: academy.timezone,
    Currency: academy.currency,
    Language: "English",
    "Branch name": "Riverside north",
    Venue: "North pitch",
    Location: academy.venue,
    "Batch name": "U10 Foundations",
    "Age category": "U10",
    "Training batch": "U10 Foundations",
    "Assigned batch": "U10 Foundations",
    "Player name": "Aarav Shah",
    "Guardian name": "Neha Shah",
    "Staff name": "Maya Rao",
    Email: "maya@example.test",
    Role: "Coach",
    "Session days": "Tuesday and Thursday",
    Capacity: "16",
    Coach: "Maya Rao",
    "Billing period": "October 2026",
    Amount: String(academy.monthlyFee),
    "Due date": "2026-10-10",
    "Fee-plan name": "Monthly football training",
    "Full name": "Maya Rao",
    Password: "Preview-only",
    "Date of birth": "2017-08-15",
    "Guardian email": "neha@example.test",
    Relationship: "Parent",
    "Verification reference": "PREVIEW-RELATIONSHIP-001",
    "Venue name": "North pitch",
    Branch: "North branch",
    "Access note":
      "Use the main entrance; check the confirmed pitch assignment",
    "Review frequency": "Monthly",
    Player: "Aarav Shah",
    "Adjustment type": "Scholarship",
    Reason: "Recorded fictional academy scholarship decision",
    "Authorised by": "Alex Morgan · academy administrator",
    "Drill name": "Receive and turn",
    Skill: "Receiving",
    Purpose: "Practise an open body position and first touch into space",
    Setup: "Pairs, one ball, two gates 5 metres apart",
    Instructions:
      "Pass through a gate, receive toward the free space and swap roles",
    "Coaching cue": "Look, open, receive",
    Adaptations: "Widen the gate or shorten the passing distance",
    "Review date": "2026-10-31",
    "Reason for review":
      "Review whether a wider task area supports useful receiving choices",
    "Coach observations":
      "Use the reviewed September paired-task observation as context",
    "Proposed task adjustment or group trial":
      "Short, supervised task trial; keep the recorded age category unchanged",
    "Academy and governing rules checks":
      "Pending academy review of applicable rules",
    "Guardian agreement": "Pending guardian discussion",
    Decision: "Pending",
  };
  const selectedPlayer = state.players.find((p) => p.id === state.playerId)!;
  if (screen.id === "player-edit" || screen.id === "guardian-link")
    Object.assign(defaults, {
      "Player name": selectedPlayer.name,
      "Age category": selectedPlayer.category,
      "Training batch": selectedPlayer.batch,
      "Guardian name": selectedPlayer.guardian,
    });
  const [values, setValues] = useState<Record<string, string>>({
      ...defaults,
      ...saved,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const fields = screen.fields ?? ["Name", "Description"];
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (
      fields.includes("Brand accent") &&
      !readableAccent(values["Brand accent"] ?? "")
    ) {
      setError(
        "Use a six-digit hex accent with readable white-label contrast (at least 4.5:1).",
      );
      return;
    }
    if (fields.some((f) => !(values[f] ?? "").trim())) {
      setError(
        "Complete the labelled fields before saving this fictional draft.",
      );
      return;
    }
    if (scenario === "failed-save") {
      setError(
        "Design scenario: save failed. Your entered values remain here. Switch to Default and retry.",
      );
      return;
    }
    if (scenario === "conflict") {
      setError(
        "Design scenario: this draft changed elsewhere. Review the current version; your edits remain here.",
      );
      return;
    }
    const profiles =
      screen.id.includes("identity") ||
      screen.id.includes("branding") ||
      screen.id === "academy-profile"
        ? {
            ...state.profiles,
            [academy.id]: { ...state.profiles[academy.id], ...values },
          }
        : state.profiles;
    previewAdapter.save({
      fields: { ...state.fields, [`${academy.id}:${screen.id}`]: values },
      profiles,
      ...(["player-add", "onboard-player", "player-edit"].includes(screen.id)
        ? {
            players:
              screen.id === "player-edit"
                ? state.players.map((p) =>
                    p.id === state.playerId
                      ? {
                          ...p,
                          name: values["Player name"],
                          category: values["Age category"],
                          batch: values["Training batch"],
                        }
                      : p,
                  )
                : [
                    ...state.players,
                    {
                      id: `preview-player-${state.players.length + 1}`,
                      name: values["Player name"],
                      initials: values["Player name"]
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join(""),
                      category: values["Age category"],
                      batch: values["Training batch"],
                      guardian: values["Guardian name"],
                      goal: "Individual goal not yet recorded",
                      focus: "",
                    },
                  ],
            ...(screen.id !== "player-edit"
              ? {
                  playerId: `preview-player-${state.players.length + 1}`,
                  reportStatus: "Draft" as const,
                }
              : {}),
          }
        : {}),
      notice:
        "Fictional draft saved. No invitations, accounts or payments were processed.",
    });
    setDirty(false);
    setError("");
    setNotice("Fictional draft saved.");
  }
  return (
    <Card>
      <Head
        title={
          screen.kind === "onboarding" ? "Your academy setup" : "Record details"
        }
        note="One primary save action. No external submission."
      />
      <form onSubmit={save}>
        <div className="dp-fields">
          {fields.map((f) => (
            <Field
              key={f}
              label={f}
              value={values[f] ?? ""}
              onChange={(v) => {
                setValues({ ...values, [f]: v });
                setDirty(true);
                setNotice("");
              }}
              area={/observations|reason|adjustment|instructions|checks|purpose|setup|adaptations|location|note/i.test(
                f,
              )}
              type={
                f === "Date of birth" || f === "Review date" || f === "Due date"
                  ? "date"
                  : f === "Email" ||
                      f === "Contact email" ||
                      f === "Guardian email"
                    ? "email"
                    : "text"
              }
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="dp-alert error">
            {error}
          </p>
        )}
        {dirty && (
          <p className="dp-note">
            Unsaved changes · keep this editor open until saved.
          </p>
        )}
        {notice && (
          <p role="status" className="dp-alert success">
            {notice}
          </p>
        )}
        <div className="dp-actions">
          <Button type="submit">
            Save {screen.kind === "onboarding" ? "setup step" : "draft"}
          </Button>
          {screen.next && <Go to={screen.next}>Continue</Go>}
        </div>
      </form>
    </Card>
  );
}
