"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewRoute } from "./catalog";
import { previewAdapter, usePreviewState, playerWeeklyState } from "./adapter";
import { previewDrills, resolvedAcademy, weekPlanContext } from "./fixtures";
import { Button, Card, Badge, Go, Head, Field, Check, Context } from "./ui";
export function MessageScreen({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!,
    academy = resolvedAcademy(state.academyId, state.profiles),
    [checked, setChecked] = useState(false),
    [text, setText] = useState(
      s.id === "payment-query"
        ? "Could you clarify the October fee invoice?"
        : "",
    ),
    [error, setError] = useState("");
  const conversation = [
    "conversation",
    "conversations",
    "parent-questions",
    "payment-query",
  ].includes(s.id);
  const router = useRouter();
  const statuses = [
    ["Queued", "Design scenario: awaiting the fictional scheduled time"],
    ["Provider accepted", "Not proof of delivery; signed status needed later"],
    ["Delivered", "Simulated outcome only"],
    ["Failed", "Simulated failure; approved content is unchanged"],
    ["Unknown", "Reconciliation required, never blindly resent"],
    ["Opted out", "Consent withdrawn; no notification"],
  ];
  if (conversation)
    return (
      <div className="dp-grid">
        <Card>
          <Head
            title={`${p.name} · Maya Rao`}
            note={
              s.role === "PARENT"
                ? `Private parent thread · ${p.guardian}`
                : "Assigned family question · preserve child context"
            }
          />
          {s.id === "conversations" && (
            <div className="dp-row">
              <div className="dp-copy">
                <strong>Receiving task and practice</strong>
                <p>Latest reviewed update · {p.name}</p>
              </div>
              <Go to="conversation">Open thread</Go>
            </div>
          )}
          <div className="dp-chat">
            {state.messages
              .filter((m) => m.playerId === p.id)
              .map((m) => (
                <article
                  key={m.id}
                  className={`dp-bubble ${m.sender === "Parent" ? "parent" : ""}`}
                >
                  <p className="dp-overline">{m.sender} · In-app prototype</p>
                  <p>{m.body}</p>
                </article>
              ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) {
                setError("Write your fictional message first.");
                return;
              }
              previewAdapter.save({
                messages: [
                  ...state.messages,
                  {
                    id: state.messages.length + 1,
                    playerId: p.id,
                    body: text.trim(),
                    sender: s.role === "PARENT" ? "Parent" : "Coach",
                  },
                ],
                notice:
                  "Private message saved in prototype state; no external send.",
              });
              setText("");
              setError("");
            }}
          >
            <Field
              label="Private message"
              value={text}
              onChange={setText}
              area
            />
            {error && <p role="alert">{error}</p>}
            <Button type="submit">Save prototype message</Button>
          </form>
          <p className="dp-note">
            In-app responses do not automatically become WhatsApp messages.
          </p>
        </Card>
        <Card>
          <Head title="This conversation’s context" />
          <Context />
          <Go to="parent-weekly">Open weekly plan</Go>
          <br />
          <Go to="practice">Practise together</Go>
        </Card>
      </div>
    );
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title="Weekly plan · individual recipient preview"
          note={`${academy.name} · ${p.guardian} · linked child ${p.name}`}
        >
          <Badge>{state.weeklyStatus}</Badge>
        </Head>
        <div className="dp-whatsapp">
          <p className="dp-overline">
            WhatsApp-style design preview · not sent
          </p>
          <article className="dp-bubble">
            <strong>{academy.name}</strong>
            <p>
              Training plan for {p.name} ·{" "}
              {weekPlanContext(state.fields, state.players).batch} · Week of{" "}
              {weekPlanContext(state.fields, state.players).week}.
            </p>
            <p>
              Confirmed:{" "}
              {weekPlanContext(state.fields, state.players).first.label} and{" "}
              {weekPlanContext(state.fields, state.players).second.label},{" "}
              {weekPlanContext(state.fields, state.players).time} ·{" "}
              {academy.venue} · {academy.timezone}.
            </p>
            <p>The batch will practise {state.batchFocus.toLowerCase()}.</p>
            <p>
              {state.adjustments[p.id]
                ? `Personal focus: ${state.adjustments[p.id]}.`
                : "Following batch plan. Individual focus not yet set."}
            </p>
            <p>
              Activities:{" "}
              {state.drills
                .map((id) => previewDrills.find((d) => d.id === id)!.name)
                .join("; ")}
              . Intended purpose: useful receiving and passing choices.
            </p>
            <p>
              Optional preparation: a short, comfortable paired task. Cue: Look,
              open, receive.
            </p>
            <Go to="parent-weekly">View full fictional plan</Go>
            <br />
            <Go to="conversation">Reply in prototype</Go>
          </article>
        </div>
        <Check
          label={`I reviewed ${p.name}'s plan and intended guardian ${p.guardian}`}
          checked={checked}
          onChange={setChecked}
        />
        <div className="dp-actions">
          <Button
            disabled={!checked || scenario === "opted-out"}
            onClick={() =>
              previewAdapter.save({
                weeklyStatus: "Approved",
                notice:
                  "Individual message approved in prototype; not published or sent.",
              })
            }
          >
            Approve wording
          </Button>
          <Button
            variant="secondary"
            disabled={!playerWeeklyState(state).approved}
            onClick={() =>
              previewAdapter.save({
                published: true,
                notice:
                  "Approved plan published in the fictional parent preview only.",
              })
            }
          >
            Publish in parent preview
          </Button>
        </div>
        <div className="dp-actions">
          <Go to={s.next ?? "schedule-preview"}>Continue message review</Go>
          <Go to="weekly-plan">Change the batch plan</Go>
        </div>
      </Card>
      <div className="dp-stack">
        <Card>
          <Head title="Separate states" />
          <dl>
            <div className="dp-list-detail">
              <dt>Content approval</dt>
              <dd>
                {playerWeeklyState(state).approved
                  ? "Approved"
                  : "Needs individual review"}
              </dd>
            </div>
            <div className="dp-list-detail">
              <dt>Parent publication</dt>
              <dd>
                {playerWeeklyState(state).published
                  ? "Published in prototype"
                  : "Unpublished"}
              </dd>
            </div>
            <div className="dp-list-detail">
              <dt>External delivery</dt>
              <dd>Not connected · design scenarios only</dd>
            </div>
          </dl>
          {s.id === "schedule-preview" && (
            <>
              <p>
                {
                  weekPlanContext(state.fields, state.players).notification
                    .label
                }{" "}
                · 18:00 · {academy.timezone}
              </p>
              <p className="dp-note">
                Quiet hours: 21:00–08:00. Guardian consent: fictional
                verified-contact example.
              </p>
              <Button
                disabled={
                  !playerWeeklyState(state).approved ||
                  scenario === "pending-template" ||
                  scenario === "opted-out"
                }
                onClick={() =>
                  previewAdapter.save({
                    scheduled: true,
                    notice:
                      "Schedule preview saved. No provider job or send was created.",
                  })
                }
              >
                Save schedule preview
              </Button>
            </>
          )}
          {state.scheduled && (
            <p className="dp-alert">Scheduled design example only.</p>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push(previewRoute("whatsapp-setup"))}
          >
            View disconnected setup
          </Button>
        </Card>
        {s.id === "delivery-states" && (
          <Card>
            <Head title="Delivery design scenarios" />
            <div className="dp-status-grid">
              {statuses.map(([title, note]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{note}</p>
                </article>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
