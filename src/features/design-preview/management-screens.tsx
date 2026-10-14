"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import Link from "next/link";
import { previewRoute } from "./catalog";
import { previewAdapter, usePreviewState } from "./adapter";
import {
  previewAcademies,
  money,
  resolvedAcademy,
  reportFixture,
} from "./fixtures";
import { Button, Card, Badge, Go, Head, Field, Pitch } from "./ui";
import { SessionRows } from "./rows";
export function Access({ screen: s, scenario }: Props) {
  const [email, setEmail] = useState("maya@example.test"),
    [name, setName] = useState("Maya Rao"),
    [password, setPassword] = useState("Preview-only"),
    [submitted, setSubmitted] = useState(false),
    [error, setError] = useState("");
  const blocked = [
    "invite-expired",
    "invite-wrong-account",
    "access-denied",
  ].includes(s.id);
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={
            blocked
              ? s.title
              : s.id === "recovery"
                ? "Find your account"
                : "Your preview details"
          }
          note="Design-only access journey. Do not enter real credentials."
        />
        {blocked ? (
          <>
            <p>{s.description}</p>
            <div className="dp-actions">
              <Go to={s.next!}>
                {s.id === "invite-expired"
                  ? "Request a new invitation scenario"
                  : "Return to access"}
              </Go>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.includes("@") || scenario === "validation") {
                setError("Enter a valid fictional email address.");
                return;
              }
              setSubmitted(true);
              setError("");
            }}
          >
            {s.id === "create-account" && (
              <Field label="Full name" value={name} onChange={setName} />
            )}
            <Field
              label={s.id === "invite" ? "Invited email" : "Email"}
              value={email}
              onChange={setEmail}
              type="email"
            />
            {["sign-in", "create-account"].includes(s.id) && (
              <Field
                label="Fictional password"
                value={password}
                onChange={setPassword}
                type="password"
              />
            )}
            {error && (
              <p className="dp-alert error" role="alert">
                {error}
              </p>
            )}
            {submitted ? (
              <div className="dp-alert success" role="status">
                {s.id === "recovery"
                  ? "Recovery-request design shown. No email was sent."
                  : "Access step completed in the prototype. No account or session was created."}
                <div className="dp-actions">
                  <Go to={s.next!}>Continue preview</Go>
                </div>
              </div>
            ) : (
              <Button type="submit">
                {s.id === "recovery"
                  ? "Preview recovery request"
                  : s.id === "create-account"
                    ? "Preview account creation"
                    : s.id === "invite"
                      ? "Preview invitation acceptance"
                      : "Continue in prototype"}
              </Button>
            )}
            <div className="dp-actions">
              <Go to="recovery">Recovery design</Go>
              <Go to="create-account">Create-account design</Go>
              <Go to="invite">Invitation design</Go>
            </div>
          </form>
        )}
      </Card>
      <Card>
        <Head title="Your academy, your role" />
        <p className="dp-note">
          Existing sign-in, recovery and membership rules are preserved. These
          screens demonstrate a proposed access journey without pretending to
          verify identity.
        </p>
        <Pitch />
      </Card>
    </div>
  );
}

export function DirectoryScreen({ screen: s }: Props) {
  const state = usePreviewState();
  const branchDraft = state.fields[`${state.academyId}:branch-edit`];
  const venueDraft = state.fields[`${state.academyId}:venue-edit`];
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [calendar, setCalendar] = useState(false);
  const players = ["players", "batch-roster"].includes(s.id);
  const rows = players
    ? state.players.map((p) => ({
        title: p.name,
        note: `${p.category} age category · ${p.batch} · ${p.guardian}`,
        status: "Active",
        to: "player-profile",
        id: p.id,
      }))
    : s.id === "staff"
      ? [
          {
            title: "Maya Rao",
            note: "Coach · U10 Foundations · North branch",
            status: "Assigned",
            to: "staff-assignments",
            id: "maya",
          },
          {
            title: "Alex Morgan",
            note: "Academy administrator · Operations",
            status: "Admin",
            to: "permissions",
            id: "alex",
          },
        ]
      : s.id === "branches"
        ? [
            {
              title: branchDraft?.["Branch name"] ?? "North branch",
              note:
                branchDraft?.Location ??
                "Main academy operations · 2 football batches",
              status: "Active",
              to: "branch-edit",
              id: "north",
            },
          ]
        : s.id === "venues"
          ? [
              {
                title: venueDraft?.["Venue name"] ?? "North pitch",
                note:
                  venueDraft?.Location ??
                  "Riverside ground · Confirmed training location",
                status: "Available",
                to: "venue-edit",
                id: "north",
              },
            ]
          : s.id === "batches"
            ? [
                {
                  title: "U10 Foundations",
                  note: "Recorded age category U10 · Shared receiving plan",
                  status: "2 players",
                  to: "batch-roster",
                  id: "u10",
                },
                {
                  title: "U12 Development",
                  note: "Recorded age category U12 · Shared passing plan",
                  status: "1 player",
                  to: "batch-roster",
                  id: "u12",
                },
              ]
            : s.id === "outstanding-reviews"
              ? [
                  {
                    title: "September · Aarav Shah",
                    note: "2 marked attendance records, 1 unmarked; reviewed receiving observation",
                    status: "Review",
                    to: "report-sources",
                    id: "report",
                  },
                  {
                    title: "Weekly parent plan",
                    note: "Per-child wording and guardian preview",
                    status: "Draft",
                    to: "weekly-approval",
                    id: "weekly",
                  },
                ]
              : [];
  return (
    <Card>
      <Head
        title={players ? "Your players" : s.title}
        note={
          players
            ? "Search names and keep the selected player across the training workflow."
            : "Fictional records, using the same academy context."
        }
      >
        {players && <Go to="player-add">Add player</Go>}
      </Head>
      <div className="dp-fields">
        <Field label="Search records" value={search} onChange={setSearch} />
        <Field
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={players ? ["All", "U10", "U12"] : ["All", "Active"]}
        />
      </div>
      {s.id === "sessions" || s.id === "parent-schedule" ? (
        <>
          <div className="dp-actions">
            <Button variant="secondary" onClick={() => setCalendar(!calendar)}>
              {calendar ? "Show list" : "Show calendar"}
            </Button>
          </div>
          {calendar && (
            <div className="dp-status-grid" aria-label="October week calendar">
              {[
                "Mon 19 · No session",
                "Tue 20 · 17:30 U10",
                "Wed 21 · No session",
                "Thu 22 · 17:30 U10",
              ].map((t) => (
                <article key={t}>{t}</article>
              ))}
            </div>
          )}
          <SessionRows />
        </>
      ) : (
        rows
          .filter(
            (r) =>
              `${r.title} ${r.note}`
                .toLowerCase()
                .includes(search.toLowerCase()) &&
              (filter === "All" ||
                r.note.includes(filter) ||
                r.status === filter),
          )
          .map((r) => (
            <div className="dp-row" key={r.id}>
              <span className="dp-avatar">
                {r.title
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="dp-copy">
                <strong>{r.title}</strong>
                <p>{r.note}</p>
              </div>
              <Badge>{r.status}</Badge>
              {players ? (
                <Link
                  className="dp-link"
                  href={previewRoute(r.to)}
                  onClick={() =>
                    previewAdapter.save({
                      playerId: r.id,
                      notice: `Opened ${r.title}`,
                    })
                  }
                >
                  Open
                </Link>
              ) : (
                <Go to={r.to}>Open</Go>
              )}
              {players && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    previewAdapter.save({
                      playerId: r.id,
                      notice: `Selected ${r.title}`,
                    })
                  }
                >
                  Select
                </Button>
              )}
            </div>
          ))
      )}
      {s.next && (
        <div className="dp-actions">
          <Go to={s.next}>Continue workflow</Go>
        </div>
      )}
    </Card>
  );
}

export function DetailScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    p = state.players.find((p) => p.id === state.playerId)!,
    academy = resolvedAcademy(state.academyId, state.profiles);
  const reviewedObservation = reportFixture(
    academy,
    p.id,
    "default",
    undefined,
    p,
  ).evidence.find(
    (e) => e.reference === "OBS-SEPT-08 · paired receiving task · widened gate",
  );
  const placement = s.id.startsWith("placement-");
  if (s.id.endsWith("-more")) {
    const destinations =
      s.role === "PARENT"
        ? [
            ["Confirmed schedule", "parent-schedule"],
            ["Reviewed reports", "parent-report"],
            ["Academy fees", "parent-fees"],
            ["Practise together", "practice"],
            ["Notification preferences", "channel-settings"],
          ]
        : s.role === "COACH"
          ? [
              ["Weekly plans", "weekly-plan"],
              ["Sessions and calendar", "sessions"],
              ["Drill library", "drill-library"],
              ["Monthly review queue", "report-queue"],
              ["Player development", "players"],
            ]
          : s.role === "PLATFORM"
            ? [
                ["Customer metadata", "platform-academies"],
                ["Software subscription", "platform-subscription"],
                ["Subscription status", "subscription-status"],
                ["Scoped support request", "support-access"],
              ]
            : [
                ["Staff and assignments", "staff"],
                ["Branches and venues", "branches"],
                ["Roles and permissions", "permissions"],
                ["Report reviews", "report-queue"],
                ["Academy settings", "academy-settings"],
                ["Communication setup", "whatsapp-setup"],
              ];
    return (
      <Card>
        <Head
          title={s.title}
          note="Role-specific destinations; the primary navigation stays simple."
        />
        {destinations.map(([label, id]) => (
          <div className="dp-row" key={id}>
            <div className="dp-copy">
              <strong>{label}</strong>
            </div>
            <Go to={id}>Open</Go>
          </div>
        ))}
      </Card>
    );
  }
  const rows =
    s.id === "permissions"
      ? [
          [
            "Academy owner/admin",
            "Manage own academy operations and deliberate staff assignments",
          ],
          [
            "Coach",
            "Assigned football players, training, review and private parent replies",
          ],
          [
            "Parent",
            "Guardian-linked child’s approved plan, reports, fees and conversations",
          ],
          [
            "Sportozen admin",
            "Customer metadata and subscription; child access requires an approved support grant",
          ],
        ]
      : s.id === "onboard-summary"
        ? [
            [
              "Academy",
              state.profiles[academy.id]?.["Academy name"] ?? academy.name,
            ],
            [
              "Region",
              `${academy.country} · ${academy.timezone} · ${academy.currency}`,
            ],
            ["Branch", "North branch · North pitch"],
            ["First batch", "U10 Foundations · Age category U10"],
            ["Staff", "Maya Rao · Coach · Invitation is a design scenario"],
            ["Player", "Aarav Shah · Guardian link pending verification"],
          ]
        : s.id === "session-summary"
          ? [
              ["Session", "Tuesday, 20 October · 17:30–18:30"],
              ["Batch", "U10 Foundations"],
              ["Venue", academy.venue],
              ["Reporting timezone", academy.timezone],
              ["Coach", "Maya Rao"],
              ["Status", "Confirmed; roster attendance unmarked"],
            ]
          : placement
            ? [
                ["Recorded age category", p.category],
                ["Current training batch", p.batch],
                [
                  "Reason",
                  "Review a wider task area for the receiving activity",
                ],
                [
                  "Proposed trial",
                  "A short, supervised task adjustment; no automatic category change",
                ],
                [
                  "Required checks",
                  "Applicable rules, academy decision and guardian discussion recorded in this fictional example",
                ],
                ["Decision", s.state],
                ["Review date", "31 October 2026"],
              ]
            : [
                ["Recorded age category", p.category],
                ["Training batch", p.batch],
                ["Long-term development goal", p.goal],
                [
                  "Current session focus",
                  state.adjustments[p.id] ?? state.batchFocus,
                ],
                [
                  "Plan status",
                  state.adjustments[p.id]
                    ? "Personalised adjustment"
                    : "Following batch plan · Individual focus not yet set",
                ],
                ["Coach", "Maya Rao"],
                [
                  "Latest reviewed observation",
                  reviewedObservation?.text ?? "Not recorded for this player",
                ],
              ];
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={s.id === "player-profile" ? p.name : s.title}
          note="Recorded facts, deliberate decisions"
        />
        <dl>
          {rows.map(([term, value]) => (
            <div className="dp-list-detail" key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {s.id === "development-history" && (
          <div className="dp-row">
            <div className="dp-copy">
              <strong>
                {reviewedObservation
                  ? "30 September · Coach review"
                  : "No reviewed history recorded"}
              </strong>
              <p>
                {reviewedObservation
                  ? "Retain a widened receiving gate before increasing task complexity. Same observation conditions must be considered before comparison."
                  : "Another player’s observation is not used as this player’s history. Ask the assigned coach to record and review the next session."}
              </p>
            </div>
          </div>
        )}
        <div className="dp-actions">
          {s.next && <Go to={s.next}>Continue</Go>}
          {!placement && s.role !== "OWNER" && (
            <Go to="placement-review">Review training placement</Go>
          )}
        </div>
      </Card>
      <Card>
        <Head title="A clear development path" />
        <div className="dp-focus">
          <p className="dp-overline">Coach-led focus</p>
          <strong>{p.goal}</strong>
          <p className="dp-note">
            Session objectives are task adaptations; this goal remains context.
          </p>
        </div>
        <div className="dp-stack" style={{ marginTop: 20 }}>
          <Go to="current-plan">Current plan</Go>
          <Go to="development-history">Reviewed history</Go>
          <Go to="guardian-link">Guardian-link design</Go>
          <Go to="player-edit">Edit-player design</Go>
        </div>
      </Card>
    </div>
  );
}

export function PlatformScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    [scope, setScope] = useState(
      "Investigate the reported access issue; customer metadata only",
    ),
    [expiry, setExpiry] = useState("2026-10-15"),
    [subscription, setSubscription] = useState("Active"),
    [requested, setRequested] = useState(false);
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={s.title}
          note="Sportozen platform administration · customer metadata, separate from academy records"
        />
        {s.id === "platform-academies" ? (
          previewAcademies.map((a) => (
            <div className="dp-row" key={a.id}>
              <span className="dp-avatar">{a.monogram}</span>
              <div className="dp-copy">
                <strong>{a.name}</strong>
                <p>{a.country} · academy@example.test · Football</p>
              </div>
              <Badge>Fictional active</Badge>
              <Go to="platform-customer">Metadata</Go>
            </div>
          ))
        ) : (
          <dl>
            {[
              ["Customer academy", academy.name],
              ["Contact", "academy@example.test"],
              ["Country", academy.country],
              ["Software subscription", "Fictional monthly software plan"],
              ["Software invoice", "SW-OCT-001 · October 2026"],
              ["Software amount", money(academy, academy.softwareFee)],
              [
                "Account state",
                "Active design example · no commercial verification",
              ],
            ].map(([term, value]) => (
              <div className="dp-list-detail" key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {s.id === "subscription-status" && (
          <>
            <Field
              label="Software subscription scenario"
              value={subscription}
              onChange={setSubscription}
              options={["Active", "Past due", "Suspended"]}
            />
            <p role="status" className="dp-alert">
              {subscription === "Active"
                ? "Fictional software subscription is active."
                : subscription === "Past due"
                  ? "Fictional software invoice is past due. Contact the academy billing administrator to review it."
                  : "Fictional software account is suspended. Contact Sportozen support to review restoration."}
            </p>
            <p className="dp-note">
              This changes only the design scenario; no customer access or
              billing records change.
            </p>
          </>
        )}
        {s.id === "support-access" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRequested(true);
            }}
          >
            <Field
              label="Support purpose and proposed scope"
              value={scope}
              onChange={setScope}
              area
            />
            <Field
              label="Requested expiry"
              value={expiry}
              onChange={setExpiry}
              type="date"
            />
            <Button type="submit">Preview scoped access request</Button>
            {requested && (
              <p role="status" className="dp-alert">
                Request design recorded. Academy approval is required; no access
                was granted.
              </p>
            )}
          </form>
        )}
        <div className="dp-actions">
          {s.next && <Go to={s.next}>Continue platform workflow</Go>}
          <Go to="support-access">Support-access request</Go>
        </div>
      </Card>
      <Card>
        <Head title="Protect the academy boundary" />
        <p className="dp-note">
          Platform administration does not automatically expose private player
          reports or family conversations. A later support grant needs academy
          authority, purpose, scope, expiry and audit.
        </p>
        <p className="dp-note">
          Academy-to-Sportozen software billing uses a separate invoice and
          balance from parent-to-academy training fees.
        </p>
      </Card>
    </div>
  );
}
