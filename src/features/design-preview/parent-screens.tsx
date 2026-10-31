"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { previewRoute } from "./catalog";
import { previewAdapter, usePreviewState, playerWeeklyState } from "./adapter";
import { previewDrills, weekPlanContext } from "./fixtures";
import { Button, Card, Badge, Go, Head, Field, Check, Pitch } from "./ui";
export function PracticeScreen({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!,
    [feedback, setFeedback] = useState(
      "We need another demonstration of the receiving task.",
    ),
    router = useRouter();
  const weekly = playerWeeklyState(state);
  const inBatch = weekPlanContext(
    state.fields,
    state.players,
  ).playerIds.includes(p.id);
  if (!weekly.approved || !weekly.published || !inBatch)
    return (
      <Card>
        <Head title="Your practice is awaiting coach review" />
        <p>
          An approved activity has not been published for {p.name} in this
          training week. Changed wording and another child’s activity are not
          shown as an approved plan.
        </p>
        <Go to="conversation">Ask the coach for help</Go>
      </Card>
    );
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={`Practise together · ${p.name}`}
          note="Optional, parent-supported activity · no independent child account"
        />
        <figure className="dp-reference-photo" style={{ margin: "0 0 18px" }}>
          <Image
            src="/design-preview/ui-gallery/football-week-banner.png"
            alt="Fictional football reference illustration"
            width={900}
            height={240}
            unoptimized
            style={{
              width: "100%",
              height: 150,
              objectFit: "cover",
              borderRadius: 10,
            }}
          />
          <figcaption className="dp-note">
            Reference illustration · not a recorded player performance
          </figcaption>
        </figure>
        <div className="dp-focus">
          <p className="dp-overline">Assigned approved activity</p>
          <strong>Receive and turn</strong>
          <p>{previewDrills[0].purpose}</p>
        </div>
        <Pitch />
        <h3>One coaching cue</h3>
        <p>Look, open, receive.</p>
        <p className="dp-note">
          Try a few comfortable turns with a soft ball and clear space. Stop if
          the activity is uncomfortable and ask the coach for an adaptation.
        </p>
        <details open>
          <summary>Recorded instructions</summary>
          <p>{previewDrills[0].instructions}</p>
        </details>
        {s.id === "practice-no-media" || scenario === "unavailable-media" ? (
          <p className="dp-alert">
            No recorded demonstration is attached. Use the setup diagram and
            instructions, or ask the coach.
          </p>
        ) : (
          <div className="dp-bubble">
            <p className="dp-overline">Available demonstration</p>
            <p>
              Existing fictional receiving-practice animation. It demonstrates
              ball movement; it is not evidence of any player’s performance.
            </p>
            <video
              controls
              preload="metadata"
              style={{ width: "100%", borderRadius: 8 }}
              aria-label="Fictional receiving-practice demonstration"
            >
              <source src="/demo/receiving-practice.mp4" type="video/mp4" />
              <track
                kind="captions"
                src="/demo/receiving-practice.vtt"
                srcLang="en"
                label="English captions"
                default
              />
              Your browser cannot show the recorded demonstration.
            </video>
            <Go to="practice-no-media">Unavailable-media example</Go>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            previewAdapter.save({
              messages: [
                ...state.messages,
                {
                  id: state.messages.length + 1,
                  playerId: p.id,
                  body: feedback,
                  sender: "Parent",
                },
              ],
              notice:
                "Editable practice feedback saved privately in prototype state. It is not evidence, a score or completion verification.",
            });
            router.push(previewRoute("conversation"));
          }}
        >
          <Field
            label="Private practice feedback"
            value={feedback}
            onChange={setFeedback}
            area
          />
          <Button type="submit">Send prototype feedback to coach</Button>
          <p className="dp-note">
            This prepares a fictional private message. It does not change the
            development plan or report.
          </p>
        </form>
      </Card>
      <Card>
        <Head title="Keep it simple" />
        <p className="dp-note">
          One approved activity, one cue and an easy help path. No fee or
          administration controls in the practice task.
        </p>
        <Go to="conversation">Ask the coach for help</Go>
      </Card>
    </div>
  );
}

export function PreferencesScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    [weekly, setWeekly] = useState(true),
    [monthly, setMonthly] = useState(true),
    [consent, setConsent] = useState(false),
    [start, setStart] = useState("21:00"),
    [end, setEnd] = useState("08:00"),
    [phone, setPhone] = useState("TEST · ending 0101"),
    [provider, setProvider] = useState(
      s.id === "whatsapp-ready" ? "Ready design scenario" : "Disconnected",
    ),
    [saved, setSaved] = useState(false);
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={s.title}
          note="Design-only controls; no contact verification or provider connection occurs"
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            previewAdapter.save({
              fields: {
                ...state.fields,
                [`${state.academyId}:preferences`]: {
                  weekly: String(weekly),
                  monthly: String(monthly),
                  start,
                  end,
                  consent: String(consent),
                  provider,
                },
              },
              notice:
                "Fictional communication preferences saved; no real contact or connection changed.",
            });
            setSaved(true);
          }}
        >
          <Check
            label="Weekly training plan notifications"
            checked={weekly}
            onChange={setWeekly}
          />
          <Check
            label="Monthly reviewed report notifications"
            checked={monthly}
            onChange={setMonthly}
          />
          <div className="dp-fields">
            <Field
              label="Quiet hours start"
              value={start}
              onChange={setStart}
              type="time"
            />
            <Field
              label="Quiet hours end"
              value={end}
              onChange={setEnd}
              type="time"
            />
          </div>
          <Field
            label="Fictional guardian contact"
            value={phone}
            onChange={setPhone}
          />
          <Check
            label="Fictional academy-named opt-in recorded separately from contact verification"
            checked={consent}
            onChange={setConsent}
          />
          {s.role === "OWNER" && (
            <Field
              label="Provider design scenario"
              value={provider}
              onChange={setProvider}
              options={[
                "Disconnected",
                "Setup required",
                "Pending template",
                "Ready design scenario",
              ]}
            />
          )}
          <Button type="submit">Save preference preview</Button>
          {saved && (
            <p role="status">
              Preference preview saved. Real sending remains disconnected.
            </p>
          )}
        </form>
      </Card>
      <Card>
        <Head title="Connection preview" />
        <Badge>{provider}</Badge>
        <p className="dp-note">
          Real setup later needs academy sender identity, approved templates,
          verified contact, opt-in and signed callbacks. Populated fields alone
          are not verification.
        </p>
        <div className="dp-actions">
          <Button variant="secondary" disabled>
            Connect provider — outside design phase
          </Button>
          <Go to="whatsapp-ready">Ready-state design</Go>
          <Go to="delivery-states">Delivery examples</Go>
        </div>
      </Card>
    </div>
  );
}
