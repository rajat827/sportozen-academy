"use client";
import { useState } from "react";
import { useMessageDrafts } from "@/hooks/use-message-drafts";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import type { MessageDraft } from "@/domain/entities";
import {
  messageTemplates,
  prepareMessage,
  type RelatedType,
} from "@/services/communication/message-drafts";

export function Communication() {
  const { data, ready, create, act, notify } = useMessageDrafts();
  const [selected, setSelected] = useState("m1");
  const [edited, setEdited] = useState<MessageDraft | null>(null);
  const [preview, setPreview] = useState(false);
  const current = data.messages.find((m) => m.id === selected);
  const draft = edited ?? current;
  if (!ready) return <p>Loading communication drafts…</p>;
  function change(patch: Partial<MessageDraft>) {
    if (!draft) return;
    setEdited({ ...draft, ...patch, sourceVerified: false });
    setPreview(false);
  }
  function action(name: Parameters<typeof act>[1]) {
    if (!draft) return;
    const next = act(draft, name);
    if (next) setEdited(null);
  }
  const type = draft?.relatedType ?? "player";
  const options =
    type === "player"
      ? data.players
      : type === "squad"
        ? data.squads
        : data.sessions.map((s) => ({ ...s, name: s.title }));
  const dirty = edited !== null;
  const approved = current?.status === "NOT_SENT" && !!current.approvedAt;
  return (
    <>
      <PageTitle
        title="Manual draft preparation"
        description="Prepare → verify sources → review → approve → NOT_SENT → manual copy."
      >
        <Button
          variant="secondary"
          onClick={() => {
            const d = create();
            setSelected(d.id);
            setEdited(null);
            setPreview(false);
          }}
        >
          New draft
        </Button>
      </PageTitle>
      <p>
        No communication provider is connected. New drafts remain internal after
        approval. Manual copying does not record delivery or publish to
        parent/player views.
      </p>
      <div className="communication-grid">
        <Card>
          <SectionTitle title="Message history" />
          {data.messages.map((m) => (
            <button
              className={`draft-row ${selected === m.id ? "active" : ""}`}
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                setEdited(null);
                setPreview(false);
              }}
            >
              <strong>{m.template}</strong>
              <p>{m.recipient || "Audience not prepared"}</p>
              <Badge>{m.status}</Badge>
              {m.approvedAt && <p>Approved internally · NOT_SENT</p>}
            </button>
          ))}
        </Card>
        {draft && (
          <Card>
            <SectionTitle title="Prepare a draft" />
            <div className="form-stack">
              <label>
                Template
                <select
                  value={draft.template}
                  onChange={(e) =>
                    change({ template: e.target.value, sources: [] })
                  }
                >
                  {messageTemplates.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Related record type
                <select
                  value={type}
                  onChange={(e) => {
                    const t = e.target.value as RelatedType;
                    const id =
                      t === "player"
                        ? data.players[0].id
                        : t === "squad"
                          ? data.squads[0].id
                          : data.sessions[0].id;
                    change({
                      relatedType: t,
                      relatedId: id,
                      playerId: t === "player" ? id : "",
                      sources: [],
                    });
                  }}
                >
                  <option value="player">Player</option>
                  <option value="squad">Squad</option>
                  <option value="session">Session</option>
                </select>
              </label>
              <label>
                Related record
                <select
                  value={draft.relatedId ?? draft.playerId}
                  onChange={(e) =>
                    change({
                      relatedId: e.target.value,
                      playerId: type === "player" ? e.target.value : "",
                      sources: [],
                    })
                  }
                >
                  {options.map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="secondary"
                onClick={() =>
                  change(
                    prepareMessage(
                      data,
                      draft.template,
                      type,
                      draft.relatedId ?? draft.playerId,
                    ),
                  )
                }
              >
                Prepare from Source Records
              </Button>
              <p>
                Audience:{" "}
                {draft.recipient ||
                  "Prepare from source records to select an audience."}
              </p>
              <label>
                Editable message
                <textarea
                  value={draft.body}
                  onChange={(e) => change({ body: e.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!draft.sourceVerified}
                  disabled={!draft.sources?.length}
                  onChange={(e) =>
                    setEdited({ ...draft, sourceVerified: e.target.checked })
                  }
                />{" "}
                I verified the source records and any edited details
              </label>
              <div className="actions">
                <Button variant="secondary" onClick={() => action("save")}>
                  Save Draft
                </Button>
                <Button variant="secondary" onClick={() => setPreview(true)}>
                  Preview
                </Button>
                <Button
                  disabled={
                    !draft.body.trim() ||
                    !draft.sourceVerified ||
                    (!dirty && current?.status === "PENDING_APPROVAL")
                  }
                  onClick={() => action("submit")}
                >
                  Send for Approval
                </Button>
              </div>
              <h3>Internal review</h3>
              <p>
                <Badge>{current?.status}</Badge> · <Badge>NOT_SENT</Badge>
                {dirty && " · Unsaved changes; save or submit before review"}
              </p>
              <div className="actions">
                <Button
                  disabled={dirty || current?.status !== "PENDING_APPROVAL"}
                  onClick={() => action("approve")}
                >
                  Approve Draft
                </Button>
                <Button
                  variant="secondary"
                  disabled={dirty || current?.status !== "PENDING_APPROVAL"}
                  onClick={() => action("reject")}
                >
                  Reject Draft
                </Button>
                <Button
                  variant="secondary"
                  disabled={dirty || !approved}
                  onClick={async () => {
                    if (!current) return;
                    try {
                      await navigator.clipboard.writeText(current.body);
                      action("copy");
                      notify("Approved message copied manually. NOT_SENT.");
                    } catch {
                      notify(
                        "Clipboard unavailable. Select and copy the approved message in Preview manually.",
                      );
                    }
                  }}
                >
                  Copy Message
                </Button>
              </div>
            </div>
          </Card>
        )}
        {draft && (
          <Card>
            <SectionTitle title="Source records & preview" />
            <p className="muted">
              Saved source snapshots used to prepare this draft. Confirm they
              are current before requesting approval.
            </p>
            {draft.sources?.length ? (
              draft.sources.map((s, i) => (
                <div className="list-row" key={`${s.id}-${i}`}>
                  <div>
                    <strong>
                      {s.label} · {s.id}
                    </strong>
                    <p>{s.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No source snapshot. Use Prepare from Source Records.</p>
            )}
            {preview && (
              <section aria-label="Message preview">
                <h3>Message preview · internal only</h3>
                <div
                  className="message-preview"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {draft.body || "No message entered."}
                </div>
                <Badge>NOT_SENT</Badge>
              </section>
            )}
            <h3>Draft activity</h3>
            {current?.history?.length ? (
              <ol>
                {current.history.map((h, i) => (
                  <li key={i}>
                    <strong>{h.status}</strong> · {h.action}
                    <p className="muted">{new Date(h.at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No activity recorded yet.</p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
