"use client";
import type { ScreenProps as Props } from "./types";
import { Card, Badge, Go, Head, Pitch, PrototypeForm, Context } from "./ui";
import {
  Access,
  DirectoryScreen,
  DetailScreen,
  PlatformScreen,
} from "./management-screens";
import { HomeScreen, DrillScreen, SessionScreen } from "./coaching-screens";
import { WeeklyScreen } from "./planning-screens";
import { MessageScreen } from "./message-screens";
import { ReportScreen } from "./report-screens";
import { FeeScreen, PaymentScreen } from "./payment-screens";
import { PracticeScreen, PreferencesScreen } from "./parent-screens";
import { usePreviewState } from "./adapter";
import { weekPlanContext } from "./fixtures";
export function ScreenContent({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    player = state.players.find((p) => p.id === state.playerId)!;
  if (
    s.kind === "session" &&
    state.fields["session-context"]?.source === "calendar"
  )
    return <SessionScreen screen={s} scenario={scenario} />;
  if (
    s.role === "PARENT" &&
    player.id === "leo" &&
    weekPlanContext(state.fields, state.players).batch !== player.batch &&
    (["home", "weekly", "practice", "directory"].includes(s.kind) ||
      s.id === "parent-progress")
  )
    return (
      <Card>
        <Head
          title={`${player.name} · ${player.batch}`}
          note={`Recorded age category ${player.category} · linked guardian ${player.guardian}`}
        />
        <div className="dp-focus">
          <p className="dp-overline">Recorded development goal</p>
          <strong>{player.goal}</strong>
        </div>
        <p className="dp-alert">
          No confirmed current-week session, approved weekly activity or
          reviewed update is recorded for this child in the fixture. Nothing is
          inferred from the other child’s records.
        </p>
        <div className="dp-actions">
          <Go to="conversation">Ask the coach</Go>
          {s.kind !== "practice" && (
            <Go to="parent-fees">This child’s fee preview</Go>
          )}
        </div>
      </Card>
    );
  if (
    s.kind === "session" &&
    !weekPlanContext(state.fields, state.players).playerIds.includes(player.id)
  )
    return (
      <Card>
        <Head title="Select a player in this session’s batch" />
        <p>
          The selected player belongs to {player.batch}. This session belongs to{" "}
          {weekPlanContext(state.fields, state.players).batch}; another child is
          not silently selected.
        </p>
        <Go to="weekly-plan">Select the correct batch plan</Go>
      </Card>
    );
  if (scenario === "archived")
    return (
      <Card>
        <Head
          title="Archived record"
          note="Historical design example · read-only"
        />
        <p>
          This record is archived. Its recorded history remains available;
          changes need a separate new draft.
        </p>
        <div className="dp-actions">
          <Go to={s.next ?? "owner-home"}>Open the next workflow</Go>
        </div>
      </Card>
    );
  if (scenario === "loading")
    return (
      <div
        className="dp-stack"
        role="status"
        aria-label="Design loading example"
      >
        <div className="dp-loading" />
        <div className="dp-loading" />
        <p>Loading fictional records…</p>
      </div>
    );
  if (scenario === "empty")
    return (
      <div className="dp-empty">
        <h2>No {s.area.toLowerCase()} records yet</h2>
        <p>
          Nothing is inferred. Record the first fictional item or return to the
          default preview.
        </p>
        <Go to={s.next ?? "coach-today"}>Continue the preview</Go>
      </div>
    );
  if (s.kind === "entry")
    return (
      <div className="dp-entry">
        <p className="dp-overline">Sportozen · Football academy software</p>
        <h1>
          One shared plan.
          <br />
          Every player belongs.
        </h1>
        <p>
          A connected workspace for independent academies, coaches and families.
          Start with the batch; personalise where it helps.
        </p>
        <div className="dp-actions">
          <Go to="create-account">Explore academy setup</Go>
          <Go to="coach-today">Open coaching workspace</Go>
          <Go to="sign-in">Sign-in design</Go>
        </div>
        <Pitch />
        <div className="dp-grid equal">
          <Card>
            <h2>Coach-led development</h2>
            <p className="dp-note">
              Weekly plans, recorded observations and reviewed reports.
            </p>
          </Card>
          <Card>
            <h2>Clear academy operations</h2>
            <p className="dp-note">
              People, training, communication and separate fee records.
            </p>
          </Card>
        </div>
      </div>
    );
  if (s.kind === "access") return <Access {...{ screen: s, scenario }} />;
  if (s.kind === "onboarding")
    return (
      <div className="dp-grid">
        <div>
          <div className="dp-progress" aria-label={s.description}>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className={
                  i <= Number(s.description.match(/Step (\d)/)?.[1] ?? 1) - 1
                    ? "done"
                    : ""
                }
              />
            ))}
          </div>
          <PrototypeForm screen={s} scenario={scenario} />
        </div>
        <Card>
          <Head title="Start with what you know" />
          <p className="dp-note">
            Football only. A recorded age category and a training batch are
            separate. Staff access, guardian linking and real integration checks
            remain future authorised work.
          </p>
          <div className="dp-actions">
            <Go to="onboard-summary">Review setup</Go>
          </div>
        </Card>
      </div>
    );
  if (s.kind === "form")
    return (
      <div className="dp-grid">
        <PrototypeForm screen={s} scenario={scenario} />
        <Card>
          <Head
            title={
              s.id === "placement-review"
                ? "A deliberate review"
                : "Keep the context"
            }
          />
          <Context />
          <p className="dp-note">
            {s.id === "placement-review"
              ? "Any group trial needs academy, governing-rule and guardian checks. A coaching decision cannot override those checks or change the child’s recorded age category."
              : "Changes in this area are fictional UI state only. Existing production records and permissions are not changed."}
          </p>
          <div className="dp-actions">
            <Go
              to={
                s.id === "placement-review"
                  ? "placement-declined"
                  : "owner-home"
              }
            >
              {s.id === "placement-review"
                ? "View declined example"
                : "Back to academy"}
            </Go>
          </div>
        </Card>
      </div>
    );
  const parts = {
    home: HomeScreen,
    directory: DirectoryScreen,
    detail: DetailScreen,
    weekly: WeeklyScreen,
    drills: DrillScreen,
    session: SessionScreen,
    messages: MessageScreen,
    report: ReportScreen,
    fees: FeeScreen,
    payment: PaymentScreen,
    practice: PracticeScreen,
    preferences: PreferencesScreen,
    platform: PlatformScreen,
    states: StatesScreen,
    ai: AiScreen,
  };
  const Part = parts[s.kind as keyof typeof parts];
  return <Part screen={s} scenario={scenario} />;
}

export function StatesScreen() {
  return (
    <Card>
      <Head title="Shared states, with clear recovery" />
      <div className="dp-status-grid">
        {[
          ["Empty", "No records; offer the next useful action"],
          ["Loading", "Named loading state without invented data"],
          ["Validation", "Keep labels and entered values visible"],
          ["Failed save", "Retain drafts and offer retry"],
          ["Unsaved changes", "Warn before leaving an editor"],
          [
            "Stale version",
            "Review current sources; do not silently overwrite",
          ],
          [
            "Archived record",
            "Keep history read-only; create a new draft separately",
          ],
          [
            "Unavailable media",
            "Show recorded instructions and ask-for-help action",
          ],
        ].map(([title, note]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <p className="dp-note">
        Use the scenario selector above to inspect each reusable state on actual
        screen layouts.
      </p>
      <div className="dp-actions">
        <Go to="academy-profile">Try a form</Go>
        <Go to="practice-no-media">Unavailable-media example</Go>
      </div>
    </Card>
  );
}

export function AiScreen() {
  return (
    <Card>
      <Head title="AI Video Analysis">
        <Badge>Coming soon</Badge>
      </Head>
      <p className="dp-note">
        No release date, fabricated analysis, performance scores or working
        upload-to-AI control. Coach-led plans and recorded observations remain
        the first release.
      </p>
      <div className="dp-actions">
        <Go to="coach-today">Return to coach-led training</Go>
      </div>
    </Card>
  );
}
