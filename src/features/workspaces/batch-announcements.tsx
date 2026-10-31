"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { useWorkspace } from "@/hooks/use-workspace";
import type {
  AnnouncementDraft,
  AnnouncementPreview,
  AnnouncementPublic,
} from "@/domain/batch-announcement";
import "./batch-announcements.css";
type Workspace = ReturnType<typeof useWorkspace>;
const kinds = {
  SESSION_CANCELLED: "Session cancelled",
  VENUE_CHANGED: "Venue changed",
  TIME_CHANGED: "Training time changed",
  ACADEMY_HOLIDAY: "Academy holiday",
  SPECIAL_PRACTICE: "Special practice session",
  OPERATIONAL: "Operational update",
} as const;
export function BatchAnnouncements({ workspace }: { workspace: Workspace }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (
    !workspace.data ||
    !["OWNER", "ADMIN", "COACH"].includes(workspace.data.membership.role)
  )
    return null;
  return (
    <>
      <button
        ref={trigger}
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        Batch announcements
      </button>
      {open && (
        <AnnouncementEditor
          workspace={workspace}
          onClose={() => setOpen(false)}
          returnFocus={() => trigger.current?.focus()}
        />
      )}
    </>
  );
}
function AnnouncementEditor({
  workspace: w,
  onClose,
  returnFocus,
}: {
  workspace: Workspace;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const c = useAnnouncements(w.data!.academy.id);
  const [draft, setDraft] = useState<AnnouncementDraft>(() => ({
      kind: "OPERATIONAL",
      urgency: "NORMAL",
      batchIds: [],
      body: "",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    })),
    [record, setRecord] = useState<AnnouncementPublic>(),
    [preview, setPreview] = useState<AnnouncementPreview>(),
    [verified, setVerified] = useState(false),
    [dirty, setDirty] = useState(false),
    [audience, setAudience] = useState("ONE"),
    [notice, setNotice] = useState("");
  useUnsavedChanges(dirty);
  const canApprove = ["OWNER", "ADMIN"].includes(w.data!.membership.role);
  function change(next: Partial<AnnouncementDraft>) {
    setDraft({ ...draft, ...next });
    setPreview(undefined);
    setVerified(false);
    setDirty(true);
    setNotice("");
  }
  function load(next: AnnouncementPublic) {
    setRecord(next);
    setDraft({
      kind: next.kind,
      urgency: next.urgency,
      batchIds: next.batchIds,
      body: next.body,
      expiresAt: next.expiresAt,
    });
    setAudience(next.batchIds.length === 1 ? "ONE" : "MULTIPLE");
    setDirty(false);
    setPreview(undefined);
    setVerified(false);
    setNotice("");
  }
  async function perform(action: string) {
    const next = await c.run<AnnouncementPublic>(
      action,
      action === "save"
        ? draft
        : {
            verified: true,
            genericPrivacyConfirmed: true,
            fingerprint: preview?.fingerprint,
          },
      record?.id,
      record?.version ?? 0,
    );
    if (next) {
      load(next);
      setNotice(
        `Announcement ${next.status.toLowerCase().replaceAll("_", " ")} confirmed in academy records. No delivery is claimed.`,
      );
    }
  }
  function close() {
    if (!dirty || window.confirm("Discard the unsaved announcement draft?"))
      onClose();
  }
  const localExpiry = new Date(
    Date.parse(draft.expiresAt) -
      new Date(draft.expiresAt).getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !c.busy) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="batch-announcement-overlay" />
        <Dialog.Content
          className="batch-announcement-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
          onEscapeKeyDown={(event) => {
            if (c.busy) event.preventDefault();
          }}
        >
          <header>
            <div>
              <Dialog.Title>Batch announcements</Dialog.Title>
              <Dialog.Description>
                Generic operational messages · {w.data!.academy.name}. Approval
                and WhatsApp delivery remain separate.
              </Dialog.Description>
            </div>
            <button
              className="portal-icon-button"
              aria-label="Close batch announcements"
              disabled={c.busy}
              onClick={close}
            >
              <X size={20} />
            </button>
          </header>
          <div className="batch-announcement-scroll">
            {c.error && <p role="alert">{c.error}</p>}
            {notice && <p role="status">{notice}</p>}
            {!c.data ? (
              <p role="status">
                {c.error
                  ? "Authorised batches could not load. Close and reopen to retry."
                  : "Loading authorised batches…"}
              </p>
            ) : (
              <>
                {record && (
                  <Button
                    variant="secondary"
                    disabled={c.busy}
                    onClick={() => {
                      if (
                        dirty &&
                        !window.confirm(
                          "Discard the unsaved announcement draft?",
                        )
                      )
                        return;
                      setRecord(undefined);
                      setDraft({
                        kind: "OPERATIONAL",
                        urgency: "NORMAL",
                        batchIds: [],
                        body: "",
                        expiresAt: new Date(
                          Date.now() + 86400000,
                        ).toISOString(),
                      });
                      setPreview(undefined);
                      setVerified(false);
                      setDirty(false);
                      setNotice("");
                      setAudience("ONE");
                    }}
                  >
                    New announcement
                  </Button>
                )}
                {c.data.announcements.length > 0 && (
                  <label>
                    Saved announcements
                    <select
                      aria-label="Saved announcements"
                      value={record?.id ?? ""}
                      onChange={(event) => {
                        const next = c.data!.announcements.find(
                          (item) => item.id === event.target.value,
                        );
                        if (
                          next &&
                          (!dirty ||
                            window.confirm(
                              "Discard the unsaved announcement draft?",
                            ))
                        )
                          load(next);
                      }}
                    >
                      <option value="">New announcement</option>
                      {c.data.announcements.map((item) => (
                        <option key={item.id} value={item.id}>
                          {kinds[item.kind]} · {item.status}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <form
                  id="batch-announcement-form"
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform("save");
                  }}
                >
                  <p>
                    Use generic batch information only. Do not include any
                    child’s name, personal goal, private report or guardian
                    contact. Urgency does not bypass consent, quiet hours or
                    approved templates.
                  </p>
                  <label>
                    Announcement type
                    <select
                      aria-label="Announcement type"
                      value={draft.kind}
                      onChange={(event) =>
                        change({
                          kind: event.target.value as AnnouncementDraft["kind"],
                        })
                      }
                    >
                      {Object.entries(kinds).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Urgency
                    <select
                      aria-label="Urgency"
                      value={draft.urgency}
                      onChange={(event) =>
                        change({
                          urgency: event.target
                            .value as AnnouncementDraft["urgency"],
                        })
                      }
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent operational update</option>
                    </select>
                  </label>
                  <label>
                    Audience
                    <select
                      aria-label="Announcement audience"
                      value={audience}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAudience(value);
                        change({
                          batchIds:
                            value === "ALL"
                              ? c.data!.batches.map((batch) => batch.id)
                              : [],
                        });
                      }}
                    >
                      <option value="ONE">One Batch</option>
                      <option value="MULTIPLE">Multiple Batches</option>
                      <option value="ALL">All Batches</option>
                    </select>
                  </label>
                  {audience === "ONE" ? (
                    <label>
                      Batch
                      <select
                        aria-label="Announcement batch"
                        required
                        value={draft.batchIds[0] ?? ""}
                        onChange={(event) =>
                          change({ batchIds: [event.target.value] })
                        }
                      >
                        <option value="">Choose an authorised batch</option>
                        {c.data.batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <fieldset>
                      <legend>Authorised batches</legend>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={
                            !!c.data.batches.length &&
                            draft.batchIds.length === c.data.batches.length
                          }
                          onChange={(event) => {
                            setAudience("MULTIPLE");
                            change({
                              batchIds: event.target.checked
                                ? c.data!.batches.map((batch) => batch.id)
                                : [],
                            });
                          }}
                        />
                        Select All
                      </label>
                      {c.data.batches.map((batch) => (
                        <label className="check-row" key={batch.id}>
                          <input
                            type="checkbox"
                            checked={draft.batchIds.includes(batch.id)}
                            onChange={(event) => {
                              setAudience("MULTIPLE");
                              change({
                                batchIds: event.target.checked
                                  ? [...draft.batchIds, batch.id]
                                  : draft.batchIds.filter(
                                      (id) => id !== batch.id,
                                    ),
                              });
                            }}
                          />
                          {batch.name} · {batch.players} players
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <label>
                    Generic announcement
                    <textarea
                      required
                      maxLength={400}
                      rows={4}
                      value={draft.body}
                      onChange={(event) => change({ body: event.target.value })}
                    />
                  </label>
                  <label>
                    Announcement expires
                    <input
                      required
                      type="datetime-local"
                      value={localExpiry}
                      onChange={(event) => {
                        if (event.target.value)
                          change({
                            expiresAt: new Date(
                              event.target.value,
                            ).toISOString(),
                          });
                      }}
                    />
                  </label>
                </form>
                <Button
                  variant="secondary"
                  disabled={
                    c.busy || !draft.batchIds.length || !draft.body.trim()
                  }
                  onClick={async () => {
                    const result = await c.run<AnnouncementPreview>(
                      "preview",
                      draft,
                    );
                    if (result) {
                      setPreview(result);
                      setVerified(false);
                    }
                  }}
                >
                  Preview recipients and message
                </Button>
                {preview && (
                  <section aria-label="Announcement recipient preview">
                    <h3>{preview.eligibleCount} eligible recipients</h3>
                    <p>
                      {preview.deduplicatedCount} duplicate child/contact
                      selections removed.
                    </p>
                    <p className="message-body">{preview.renderedBody}</p>
                    {preview.recipients.map((recipient) => (
                      <p key={recipient.guardianId}>
                        {w.data!.members.find(
                          (member) => member.userId === recipient.guardianId,
                        )?.name ?? "Authorised guardian"}{" "}
                        · contact ending {recipient.contactEnding}
                      </p>
                    ))}
                    {preview.excluded.map((item, index) => (
                      <p key={index}>Excluded: {item.reason}</p>
                    ))}
                    {preview.blockers.map((item) => (
                      <p className="notice amber" key={item}>
                        {item}
                      </p>
                    ))}
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={verified}
                        onChange={(event) => setVerified(event.target.checked)}
                      />
                      I reviewed the final message, generic privacy, eligible
                      recipients and exclusions
                    </label>
                  </section>
                )}
                {record && (
                  <p>
                    Saved status: {record.status}. External delivery is tracked
                    separately for each recipient.
                  </p>
                )}
                {record &&
                  c.data.jobs
                    .filter((job) => job.sourceId === record.id)
                    .map((job) => (
                      <p key={job.id}>
                        {job.state} · {job.reason ?? "Awaiting worker checks"}
                      </p>
                    ))}
              </>
            )}
          </div>
          <footer>
            <Button
              form="batch-announcement-form"
              type="submit"
              disabled={
                c.busy ||
                !c.data ||
                !draft.batchIds.length ||
                (!!record && ["QUEUED", "CANCELLED"].includes(record.status))
              }
            >
              Save announcement draft
            </Button>
            {record?.status === "DRAFT" && (
              <Button
                variant="secondary"
                disabled={c.busy || dirty}
                onClick={() => void perform("submit")}
              >
                Send announcement for approval
              </Button>
            )}
            {record?.status === "PENDING_APPROVAL" && canApprove && (
              <Button
                disabled={c.busy || dirty || !verified || !preview}
                onClick={() => void perform("approve")}
              >
                Approve announcement
              </Button>
            )}
            {record?.status === "APPROVED" && (
              <Button
                disabled={
                  c.busy ||
                  dirty ||
                  !verified ||
                  !preview ||
                  !!preview.blockers.length
                }
                onClick={() => void perform("queue")}
              >
                Queue approved announcement
              </Button>
            )}
            {record && record.status !== "CANCELLED" && (
              <Button
                variant="secondary"
                disabled={c.busy || dirty}
                onClick={() => void perform("cancel")}
              >
                Cancel announcement
              </Button>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
