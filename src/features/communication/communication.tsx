"use client";
import { useState } from "react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import type { MessageDraft } from "@/domain/entities";
const templates = [
  "Session update",
  "Attendance check",
  "Schedule change",
  "Fee reminder",
  "Weekly progress",
  "Report available",
  "Event announcement",
];
export function Communication() {
  const { data, update } = useAcademy();
  const [selected, setSelected] = useState("m1");
  const draft = data.messages.find((m) => m.id === selected);
  const [body, setBody] = useState(draft?.body ?? "");
  const [template, setTemplate] = useState(draft?.template ?? templates[0]);
  const [channel, setChannel] = useState(draft?.channel ?? "Email preview");
  const [scheduled, setScheduled] = useState(draft?.scheduledAt ?? "");
  const [playerId, setPlayerId] = useState(draft?.playerId ?? "p1");
  const player = data.players.find((p) => p.id === playerId);
  const recipient =
    data.guardians.find((g) => g.id === player?.guardianId)?.name ??
    "Guardian Not Recorded";
  function save(status: MessageDraft["status"]) {
    update((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.id === selected
          ? {
              ...m,
              playerId,
              recipient,
              body,
              template,
              channel,
              scheduledAt: scheduled,
              status,
            }
          : m,
      ),
    }));
  }
  return (
    <>
      <PageTitle
        title="Communication centre"
        description="Clear updates, reviewed by a coach. All messages remain Not Sent."
      >
        <Button
          variant="secondary"
          onClick={() => {
            const id = crypto.randomUUID();
            update((s) => ({
              ...s,
              messages: [
                ...s.messages,
                {
                  id,
                  academyId: s.academy.id,
                  playerId: "p1",
                  recipient: "Neha Sharma",
                  body: "",
                  template: "Session update",
                  channel: "Email preview",
                  scheduledAt: "",
                  status: "Draft",
                },
              ],
            }));
            setSelected(id);
            setBody("");
            setTemplate("Session update");
            setPlayerId("p1");
            setScheduled("");
          }}
        >
          New draft
        </Button>
      </PageTitle>
      <div className="communication-grid">
        <Card>
          <SectionTitle title="Drafts & previews" />
          {data.messages.map((m) => (
            <button
              className={`draft-row ${selected === m.id ? "active" : ""}`}
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                setBody(m.body);
                setTemplate(m.template);
                setChannel(m.channel);
                setScheduled(m.scheduledAt);
                setPlayerId(m.playerId);
              }}
            >
              <strong>{m.template}</strong>
              <p>{m.recipient}</p>
              <Badge tone={m.status === "Approved" ? "green" : "amber"}>
                {m.status}
              </Badge>
            </button>
          ))}
        </Card>
        <Card>
          <SectionTitle title="Compose an update" />
          <div className="form-stack">
            <label>
              Template
              <select
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  setBody(
                    `${player?.name ?? "The player"} · ${e.target.value}. Add a coach-reviewed update from source records.`,
                  );
                }}
              >
                {templates.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Related player
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                {data.players.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Recipient: <strong>{recipient}</strong>
            </p>
            <label>
              Channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option>Email preview</option>
                <option>WhatsApp preview</option>
                <option>In-app preview</option>
              </select>
            </label>
            <label>
              Planned date/time · draft only
              <input
                type="datetime-local"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </label>
            <label>
              Editable preview
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="actions">
              <Button variant="secondary" onClick={() => save("Draft")}>
                Save Draft
              </Button>
              <Button disabled={!body.trim()} onClick={() => save("Approved")}>
                Approve preview
              </Button>
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Parent preview" />
          <Badge tone="amber">{draft?.status ?? "Draft"} · Not Sent</Badge>
          <div className="message-preview">
            <strong>Hi {recipient.split(" ")[0]},</strong>
            <p>{body || "Your draft preview will appear here."}</p>
            <p>
              — Coach Rahul
              <br />
              {data.academy.name}
            </p>
          </div>
          <h3>Source records</h3>
          <p className="muted">Player goal: {player?.goal ?? "Not Recorded"}</p>
          <p className="muted">
            Only include reviewed observations. Delivery integrations are Not
            Connected.
          </p>
          <Button disabled>Send · Not Connected</Button>
        </Card>
      </div>
    </>
  );
}
