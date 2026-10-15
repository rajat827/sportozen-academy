"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  confirmUnsavedChanges,
  useUnsavedChanges,
} from "@/hooks/use-unsaved-changes";
import { previewAdapter, usePreviewState } from "./adapter";
import {
  calendarCoaches,
  calendarResources,
  rescheduleSessionPatch,
  saveSessionDraftPatch,
  type PreviewScheduledSession,
} from "./preview-session-records";

export function CalendarSessionEditor({
  record,
  failedSave,
  onClose,
  onSaved,
}: {
  record: PreviewScheduledSession;
  failedSave: boolean;
  onClose: () => void;
  onSaved: (record: PreviewScheduledSession) => void;
}) {
  const state = usePreviewState(),
    [draft, setDraft] = useState(record),
    [errors, setErrors] = useState<string[]>([]),
    [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(record) !== JSON.stringify(draft);
  useUnsavedChanges(dirty);
  function close() {
    if (confirmUnsavedChanges()) onClose();
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const live = previewAdapter.read();
    const confirmedDraft = { ...draft, dateConfirmed: true };
    const result =
      record.status === "Draft"
        ? saveSessionDraftPatch(live, confirmedDraft, record.version)
        : rescheduleSessionPatch(
            live,
            record.id,
            confirmedDraft,
            record.version,
          );
    if (!result.ok || !result.patch || !result.record) {
      setErrors(result.errors);
      setSaving(false);
      return;
    }
    if (failedSave) {
      setErrors([
        "Preview save failed. Your entered draft is retained; return to the default scenario to retry.",
      ]);
      setSaving(false);
      return;
    }
    const saved = previewAdapter.saveConfirmed(result.patch);
    if (!saved.ok) {
      setErrors([saved.error]);
      setSaving(false);
      return;
    }
    onSaved(result.record);
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="hd-overlay" />
        <Dialog.Content className="cal-dialog">
          <Dialog.Title>
            {record.copiedFrom
              ? "Copy planned session"
              : record.status === "Draft"
                ? "Edit session draft"
                : "Change session schedule"}
          </Dialog.Title>
          <Dialog.Description>
            Fictional preview only. Confirm the date, time and configured
            resources. Attendance, observations, approvals and messages are not
            copied or sent.
          </Dialog.Description>
          <form onSubmit={save}>
            <label>
              Session title
              <input
                aria-label="Session title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
            </label>
            <label>
              Session date
              <input
                aria-label="Session date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                required
              />
            </label>
            {!draft.allDay && (
              <div className="cal-editor-row">
                <label>
                  Start time
                  <input
                    aria-label="Start time"
                    type="time"
                    value={draft.start}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  End time
                  <input
                    aria-label="End time"
                    type="time"
                    value={draft.end}
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                    required
                  />
                </label>
              </div>
            )}
            <label>
              Assigned coach
              <select
                aria-label="Assigned coach"
                value={draft.coachIds[0] ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, coachIds: [e.target.value] })
                }
              >
                <option value="">Choose a coach</option>
                {calendarCoaches(state).map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Configured space
              <select
                aria-label="Configured space"
                value={draft.resourceId}
                onChange={(e) =>
                  setDraft({ ...draft, resourceId: e.target.value })
                }
              >
                {calendarResources(state)
                  .filter((resource) => resource.id !== "academy")
                  .map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="cal-fixture-note">
              {draft.timezone}. Changing this event does not notify parents.
              Resource checks here are preview validation; production booking
              protection is not implemented.
            </p>
            {errors.length > 0 && (
              <div className="cal-notice error" role="alert">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
            <button
              className="cal-button cal-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving preview…"
                : record.status === "Draft"
                  ? "Save session draft"
                  : "Save schedule change"}
            </button>
            <button type="button" className="cal-button" onClick={close}>
              Keep original and close
            </button>
          </form>
          <button
            type="button"
            className="cal-close"
            onClick={close}
            aria-label="Close session editor"
          >
            <X size={20} />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
