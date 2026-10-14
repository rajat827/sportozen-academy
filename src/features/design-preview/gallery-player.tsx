"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Footprints,
  Search,
  Settings2,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import { previewAdapter, usePreviewState } from "./adapter";
import {
  previewAcademies,
  previewDrills,
  reportFixture,
  resolvedAcademy,
  weekPlanContext,
} from "./fixtures";
import { previewRoute } from "./catalog";
import "./gallery-player.css";

function Jump({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={previewRoute(to)} className={className}>
      {children}
    </Link>
  );
}

function ActivityPitch() {
  return (
    <svg viewBox="0 0 84 54" className="gp-pitch" aria-hidden="true">
      <rect width="84" height="54" rx="4" fill="#489d3a" />
      <path d="M21 0v54M63 0v54" stroke="#589f45" strokeWidth="14" />
      <path
        d="M5 5h74v44H5zM42 5v44M5 16h12v22H5M79 16H67v22h12"
        stroke="#b6cc66"
        strokeWidth=".8"
        fill="none"
      />
      <circle cx="42" cy="27" r="9" stroke="#b6cc66" fill="none" />
      <circle cx="42" cy="27" r="1" fill="#d9e196" />
      <path d="M27 20v5m4-5v5m22 8v5m4-5v5" stroke="#ffd47a" />
    </svg>
  );
}

export function GalleryPlayerProfile() {
  const state = usePreviewState();
  const academy = resolvedAcademy(state.academyId, state.profiles);
  const player = state.players.find((p) => p.id === state.playerId);
  const context = weekPlanContext(state.fields, state.players);
  const [query, setQuery] = useState("");
  if (!player) {
    return (
      <div className="design-preview gallery-player">
        <main className="gp-missing">
          <h1>Player context unavailable</h1>
          <p>Select a recorded player before viewing their development.</p>
          <Jump to="players">Open players</Jump>
        </main>
      </div>
    );
  }
  const roster = state.players.filter((p) =>
    `${p.name} ${p.batch}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const inCurrentBatch = context.playerIds.includes(player.id);
  const drills = inCurrentBatch
    ? previewDrills.filter((drill) => state.drills.includes(drill.id))
    : [];
  const sourceReport = reportFixture(
    academy,
    player.id,
    "default",
    undefined,
    player,
  );
  const session = state.fields[`session:${player.id}`];
  const latestObservation =
    session?.observation ||
    (player.id === "aarav" ? sourceReport.evidence[1]?.text : undefined);
  const observationDate = session?.observation
    ? "Date not recorded"
    : player.id === "aarav"
      ? "30 Sep 2026 · reviewed"
      : "Not recorded";
  const nextStep =
    session?.nextStep ||
    (player.id === "aarav" ? sourceReport.nextStep : "Not recorded");
  const adjustment = state.adjustments[player.id];

  return (
    <div
      className="design-preview gallery-player"
      style={{ "--gp-accent": academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to player profile
      </a>
      <header className="gp-topbar">
        <Jump to="players" className="gp-back">
          <ArrowLeft size={20} />
          <span className="sr-only">Back to players</span>
        </Jump>
        <strong>Player Profile</strong>
        <details className="gp-review">
          <summary aria-label="Prototype context and gallery">
            <Settings2 size={19} />
            <span className="sr-only">Prototype context and gallery</span>
          </summary>
          <div className="gp-review-panel">
            <label>
              Academy fixture
              <select
                aria-label="Academy fixture"
                value={academy.id}
                onChange={(e) =>
                  previewAdapter.save({ academyId: e.target.value })
                }
              >
                {previewAcademies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Player context
              <select
                aria-label="Player context"
                value={player.id}
                onChange={(e) =>
                  previewAdapter.save({ playerId: e.target.value })
                }
              >
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/design-preview/prototype">Prototype gallery</Link>
            <Jump to="coach-today">Coach Today</Jump>
            <Jump to="parent-home">Parent Home</Jump>
            <Jump to="coach-more">More coach tools</Jump>
            <button onClick={() => previewAdapter.reset()}>
              Reset fictional preview
            </button>
          </div>
        </details>
      </header>

      <div className="gp-layout">
        <aside className="gp-roster">
          <h2>Academy Squad</h2>
          <label className="gp-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search players…"
              aria-label="Search players"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <nav aria-label="Player roster">
            {roster.map((p) => (
              <button
                key={p.id}
                className={p.id === player.id ? "active" : ""}
                aria-pressed={p.id === player.id}
                onClick={() => previewAdapter.save({ playerId: p.id })}
              >
                <span className="gp-avatar" aria-hidden="true">
                  {p.initials}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.batch}</small>
                </span>
              </button>
            ))}
            {roster.length === 0 ? (
              <p className="gp-no-results" role="status">
                No matching players. Try another name or batch.
              </p>
            ) : null}
          </nav>
        </aside>

        <main className="gp-profile" id="preview-content">
          <div className="gp-overview">
            <figure className="gp-portrait">
              {player.id === "aarav" ? (
                <Image
                  src="/design-preview/ui-gallery/player-portrait.png"
                  width={139}
                  height={141}
                  unoptimized
                  alt="Fictional football player illustration from the supplied UI gallery"
                />
              ) : (
                <div className="gp-portrait-initials" aria-hidden="true">
                  {player.initials}
                </div>
              )}
              <figcaption>
                {player.id === "aarav"
                  ? "Reference illustration"
                  : "Player photo not recorded"}
              </figcaption>
            </figure>
            <div className="gp-identity">
              <div className="gp-heading">
                <div>
                  <h1>{player.name}</h1>
                  <p>
                    {player.category} · {player.batch} · {academy.name}
                  </p>
                </div>
                <p className="gp-motto">
                  “Discipline today.
                  <br />A stronger tomorrow.”
                </p>
              </div>
              <nav className="gp-tabs" aria-label="Player development sections">
                <a href="#preview-content" aria-current="page">
                  Overview
                </a>
                <Jump to="current-plan">Training Plan</Jump>
                <Jump to="development-history">Progress</Jump>
                <Jump to="report-detail">Reports</Jump>
                <Jump to="parent-questions">Messages</Jump>
              </nav>
              <dl className="gp-facts">
                <div>
                  <dt>Age</dt>
                  <dd>Not recorded</dd>
                </div>
                <div>
                  <dt>Preferred Foot</dt>
                  <dd>Not recorded</dd>
                </div>
                <div>
                  <dt>
                    <Footprints size={13} /> Position
                  </dt>
                  <dd>Not recorded</dd>
                </div>
                <div>
                  <dt>
                    <UsersRound size={13} /> Squad
                  </dt>
                  <dd>{player.category}</dd>
                </div>
                <div>
                  <dt>
                    <UserRound size={13} /> Coach
                  </dt>
                  <dd>Maya Rao</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="gp-development">
            <div className="gp-cards">
              <section className="gp-card gp-focus">
                <h2>Current Focus</h2>
                <div className="gp-icon-copy">
                  <span className="gp-symbol green">
                    <Target size={28} />
                  </span>
                  <div>
                    <h3>{player.goal}</h3>
                    <p>
                      {adjustment ||
                        (inCurrentBatch
                          ? state.batchFocus
                          : "Current batch plan not recorded for this player")}
                    </p>
                    <small>
                      {adjustment
                        ? "Optional player adjustment · shared plan retained"
                        : "Following the shared batch plan"}
                    </small>
                  </div>
                </div>
              </section>

              <section className="gp-card gp-practice">
                <div className="gp-card-heading">
                  <h2>This Week’s Practice</h2>
                  <Jump to="current-plan">View Full Plan</Jump>
                </div>
                {drills.length ? (
                  drills.slice(0, 2).map((drill) => (
                    <Dialog.Root key={drill.id}>
                      <Dialog.Trigger asChild>
                        <button className="gp-drill">
                          <ActivityPitch />
                          <span>
                            <strong>{drill.name}</strong>
                            <small>
                              {drill.cue} · {drill.minutes} min
                            </small>
                          </span>
                          <ArrowRight size={15} />
                        </button>
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="gp-drill-overlay" />
                        <Dialog.Content className="gp-drill-dialog">
                          <Dialog.Title>{drill.name}</Dialog.Title>
                          <Dialog.Description>
                            {drill.purpose}
                          </Dialog.Description>
                          <h3>One coaching cue</h3>
                          <p>{drill.cue}</p>
                          <h3>Setup</h3>
                          <p>{drill.setup}</p>
                          <h3>Instructions</h3>
                          <p>{drill.instructions}</p>
                          <h3>Adaptations</h3>
                          <p>{drill.adaptation}</p>
                          <Dialog.Close className="gp-drill-close">
                            Close activity
                          </Dialog.Close>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  ))
                ) : (
                  <p className="gp-empty-practice">
                    No current-week activities recorded for this player.
                  </p>
                )}
              </section>

              <section className="gp-card gp-observation">
                <div className="gp-card-heading">
                  <h2>Latest Coach Observation</h2>
                  <Jump to="development-history">View All</Jump>
                </div>
                <div className="gp-icon-copy">
                  <span className="gp-avatar" aria-hidden="true">
                    MR
                  </span>
                  <div>
                    <small>{observationDate}</small>
                    <p>
                      {latestObservation || "Not recorded for this player."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="gp-card gp-next">
                <div className="gp-icon-copy">
                  <span className="gp-symbol amber">
                    <Footprints size={27} />
                  </span>
                  <div>
                    <h2>Next Step</h2>
                    <p>{nextStep}</p>
                    <Jump to="session-next-step">
                      Review next step <ArrowRight size={14} />
                    </Jump>
                  </div>
                </div>
              </section>
            </div>

            <aside className="gp-timeline" aria-labelledby="gp-timeline-title">
              <h2 id="gp-timeline-title">Development Timeline</h2>
              <ol>
                <li className="current">
                  <small>
                    {inCurrentBatch
                      ? `${context.first.label} ${context.week.slice(0, 4)}`
                      : "Not recorded"}
                  </small>
                  <p>
                    {inCurrentBatch
                      ? adjustment || state.batchFocus
                      : "No current-week plan confirmed for this player."}
                  </p>
                  {inCurrentBatch ? <span>(Current shared plan)</span> : null}
                </li>
                {player.id === "aarav" ? (
                  <li>
                    <small>30 Sep 2026</small>
                    <p>Coach-reviewed receiving task with a widened gate.</p>
                  </li>
                ) : null}
                <li>
                  <small>Earlier history</small>
                  <p>Not recorded. No trend is inferred.</p>
                </li>
              </ol>
              <Jump to="development-history" className="gp-history">
                View Full History
              </Jump>
            </aside>
          </div>

          <p className="gp-preview-note">
            Fictional prototype · supplied portrait is an illustration · age,
            playing position and preferred foot remain not recorded.
          </p>
          <p className="gp-preview-note">
            Design preview — fictional data; no payments or messages are
            processed.
          </p>
        </main>
      </div>
    </div>
  );
}
