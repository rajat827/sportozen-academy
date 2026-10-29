"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Home,
  CalendarDays,
  Users,
  BookOpen,
  MessageSquare,
  WalletCards,
  Menu,
  Video,
  Bell,
  CircleHelp,
  Search,
  ArrowRight,
  ChevronRight,
  Clock3,
  MapPin,
  ClipboardList,
  UserRoundPlus,
  FileText,
  Lightbulb,
  CheckCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewAcademies } from "./fixtures";
import {
  previewRoute,
  previewScenarios,
  type PreviewScenario,
} from "./catalog";
import {
  homeActionPatch,
  selectHomeSession,
  useHomeDashboard,
  type HomeAction,
  type HomeSession,
} from "./home-dashboard-model";
import "./home-dashboard.css";

const assets = "/design-preview/approved-home/";
const roles = {
  OWNER: "owner-home",
  COACH: "coach-today",
  PARENT: "parent-home",
  PLATFORM: "platform-academies",
  ACCESS: "entry",
} as const;
const navigation = [
  ["Home", "coach-today", Home],
  ["Calendar", "sessions", CalendarDays],
  ["Players", "players", Users],
  ["Training", "weekly-plan", BookOpen],
  ["Messages", "parent-questions", MessageSquare],
  ["Reports", "report-queue", ClipboardList],
  ["More", "coach-more", Menu],
] as const;
const actionIcons: Record<string, LucideIcon> = {
  reports: Users,
  "weekly-update": FileText,
  messages: MessageSquare,
  attendance: CheckCircle2,
  "add-session": CalendarDays,
  "add-player": UserRoundPlus,
  "send-message": MessageSquare,
  "generate-report": FileText,
};

function Section({
  title,
  to,
  action = "View all",
  className = "",
  children,
}: {
  title: string;
  to?: string;
  action?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`hd-card ${className}`}>
      <div className="hd-card-heading">
        <h2>{title}</h2>
        {to && <Link href={previewRoute(to)}>{action}</Link>}
      </div>
      {children}
    </section>
  );
}

function Action({
  action,
  className,
  children,
}: {
  action: HomeAction;
  className?: string;
  children?: ReactNode;
}) {
  if (action.disabled)
    return (
      <button
        type="button"
        className={className}
        disabled
        title={action.reason}
        aria-label={action.label}
      >
        {children ?? action.label}
      </button>
    );
  return (
    <Link
      href={previewRoute(action.to)}
      className={className}
      onClick={(event) => {
        const patch = homeActionPatch(previewAdapter.read(), action);
        if (!patch) event.preventDefault();
        else if (Object.keys(patch).length) previewAdapter.save(patch);
      }}
    >
      {children ?? action.label}
    </Link>
  );
}

function SessionLink({
  session,
  className,
  children,
  label,
}: {
  session: HomeSession;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  if (!session.canOpen)
    return (
      <button
        className={className}
        disabled
        title={session.reason}
        aria-label={label}
      >
        {children}
      </button>
    );
  return (
    <Link
      href={previewRoute("session-agenda")}
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (!selectHomeSession(session)) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}

export function HomeDashboard({ scenario }: { scenario: PreviewScenario }) {
  const state = usePreviewState(),
    model = useHomeDashboard(),
    router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false),
    [search, setSearch] = useState("");
  const unavailable = scenario === "loading" || scenario === "failed-save";
  const empty = scenario === "empty",
    hasRecords = !unavailable && !empty;
  const primary = hasRecords ? model.primarySession : undefined;
  const coach = model.coach.name.split(/\s+/)[0];
  const reportCounts =
    hasRecords && model.reports.isCurrentPeriod
      ? model.reports
      : { approved: 0, inReview: 0, draft: 0, total: 0 };
  const donut = reportCounts.total
    ? `conic-gradient(var(--hd-green) 0 ${(reportCounts.approved / reportCounts.total) * 100}%, #f9ad29 0 ${((reportCounts.approved + reportCounts.inReview) / reportCounts.total) * 100}%, #8396ae 0)`
    : "#edf1f4";
  const schedule = hasRecords ? model.todaySessions : [];
  const academyIdentity = (
    <>
      {model.academy.id === "riverside" ? (
        <Image
          src={`${assets}riverside-crest.png`}
          width={54}
          height={56}
          alt="Riverside academy crest"
          unoptimized
        />
      ) : (
        <span className="hd-crest">{model.academy.monogram}</span>
      )}
      <span>
        <strong>{model.academy.name}</strong>
        <small>
          {state.profiles[model.academy.id]?.Location || model.academy.country}
        </small>
      </span>
    </>
  );
  const openCalendar = () => {
    if (primary?.canOpen) selectHomeSession(primary);
  };
  return (
    <div
      className="design-preview home-dashboard"
      data-screen="coach-today"
      data-role="COACH"
      style={{ "--hd-green": model.academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to preview content
      </a>
      <aside className="hd-sidebar">
        <Link href={previewRoute("coach-today")} className="hd-brand">
          <Image
            src={`${assets}sportozen-mark.png`}
            width={40}
            height={48}
            alt=""
            unoptimized
          />
          <span>
            Sportozen<small>Academy</small>
          </span>
        </Link>
        <Link href={previewRoute("coach-more")} className="hd-academy">
          {academyIdentity}
        </Link>
        <nav aria-label="Preview workspace navigation">
          {navigation.map(([label, to, Icon]) => (
            <span className="hd-nav-entry" key={label}>
              {label === "More" && (
                <button
                  type="button"
                  disabled
                  title="Finance is an owner workflow in this coach preview"
                >
                  <WalletCards size={22} />
                  Fees
                </button>
              )}
              <Link
                href={previewRoute(to)}
                className={to === "coach-today" ? "active" : ""}
                aria-current={to === "coach-today" ? "page" : undefined}
                onClick={to === "sessions" ? openCalendar : undefined}
              >
                <Icon size={22} />
                {label}
              </Link>
            </span>
          ))}
        </nav>
        <Link href={previewRoute("ai-coming-soon")} className="hd-ai">
          <span className="hd-ai-icon">
            <Video size={22} />
          </span>
          <span>
            <strong>AI Video Analysis</strong>
            <small>Coming soon</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link href={previewRoute("coach-more")} className="hd-account">
          <span className="hd-avatar">{model.coach.initials}</span>
          <span>
            <strong>Coach {coach}</strong>
            <small>Coach</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      </aside>
      <div className="hd-workspace">
        <header className="hd-header">
          <form
            className="hd-search"
            onSubmit={(event) => {
              event.preventDefault();
              const query = search.trim().toLowerCase();
              const match =
                query &&
                state.players.find((player) =>
                  player.name.toLowerCase().includes(query),
                );
              if (match) {
                previewAdapter.save({ playerId: match.id });
                router.push(previewRoute("player-profile"));
              } else
                router.push(
                  previewRoute(
                    /session|calendar/.test(query)
                      ? "sessions"
                      : /message|parent/.test(query)
                        ? "parent-questions"
                        : "players",
                  ),
                );
            }}
          >
            <button aria-label="Open player search" type="submit">
              <Search size={19} />
            </button>
            <input
              aria-label="Search players, sessions, messages"
              placeholder="Search players, sessions, messages…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <Link
            href={previewRoute("parent-questions")}
            className="hd-header-icon"
            aria-label="Parent questions"
          >
            <Bell size={21} />
          </Link>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="hd-header-icon"
                aria-label="Search and dashboard help"
              >
                <CircleHelp size={20} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content className="hd-help">
                <Dialog.Title>Dashboard help</Dialog.Title>
                <Dialog.Description>
                  Search opens matching player names. Session or calendar terms
                  open Calendar; message or parent terms open Messages. Other
                  terms open Players. This is a fictional preview.
                </Dialog.Description>
                <Dialog.Close
                  className="hd-close"
                  aria-label="Close dashboard help"
                >
                  <X size={20} />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Dialog.Root open={toolsOpen} onOpenChange={setToolsOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="hd-tools-trigger"
                aria-label="Preview context & screen gallery"
              >
                <span className="hd-avatar">{model.coach.initials}</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content className="hd-tools">
                <div className="hd-tools-heading">
                  <Dialog.Title>Preview tools</Dialog.Title>
                  <Dialog.Close
                    className="hd-close"
                    aria-label="Close preview tools"
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Description>
                  Fictional fixtures and review settings. No real messages or
                  payments are processed.
                </Dialog.Description>
                <label>
                  Review academy fixture
                  <select
                    aria-label="Review academy fixture"
                    value={model.academy.id}
                    onChange={(event) =>
                      previewAdapter.save({ academyId: event.target.value })
                    }
                  >
                    {previewAcademies.map((academy) => (
                      <option key={academy.id} value={academy.id}>
                        {academy.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Player context
                  <select
                    aria-label="Player context"
                    value={model.selectedPlayer?.id ?? ""}
                    onChange={(event) =>
                      previewAdapter.save({ playerId: event.target.value })
                    }
                  >
                    {!model.selectedPlayer && (
                      <option value="">Choose an available player</option>
                    )}
                    {state.players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Role preview
                  <select
                    aria-label="Role preview"
                    value="COACH"
                    onChange={(event) => {
                      setToolsOpen(false);
                      router.push(
                        previewRoute(
                          roles[event.target.value as keyof typeof roles],
                        ),
                      );
                    }}
                  >
                    {Object.keys(roles).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Design scenario
                  <select
                    aria-label="Design scenario"
                    value={scenario}
                    onChange={(event) => {
                      setToolsOpen(false);
                      router.push(
                        previewRoute(
                          "coach-today",
                          event.target.value as PreviewScenario,
                        ),
                      );
                    }}
                  >
                    {previewScenarios.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Preview date
                  <input
                    aria-label="Preview date"
                    type="date"
                    value={model.date}
                    onChange={(event) =>
                      previewAdapter.save({
                        fields: {
                          ...state.fields,
                          "home-preview-context": {
                            ...state.fields["home-preview-context"],
                            date: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
                <p className="hd-muted">
                  Academy calendar: {model.academy.timezone}. Fixture clock
                  follows the recorded plan; it is not a live schedule.
                </p>
                <Link href="/design-preview">Screen gallery</Link>
                <Link href="/design-preview/prototype">
                  Reference prototype
                </Link>
                <button type="button" onClick={() => previewAdapter.reset()}>
                  Reset fictional preview
                </button>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>
        <div className="hd-mobile-academy">{academyIdentity}</div>
        <main id="preview-content" className="hd-main">
          <div className="hd-greeting">
            <div>
              <h1>
                {model.greeting}, Coach {coach}
              </h1>
              <p>Let’s build better players today.</p>
            </div>
            <time dateTime={model.date}>{model.dateLabel}</time>
          </div>
          {scenario === "loading" && (
            <p className="hd-state-notice" role="status">
              Loading fictional records…
            </p>
          )}
          {scenario === "failed-save" && (
            <div className="hd-state-notice hd-error" role="alert">
              Unable to load dashboard records. Values are unavailable.{" "}
              <Link href={previewRoute("coach-today")}>Retry preview</Link>
            </div>
          )}
          {model.selectedPlayerMissing && (
            <p className="hd-state-notice" role="status">
              Selected player is unavailable. Choose an available player in
              Preview tools.
            </p>
          )}
          {state.notice && (
            <p className="hd-state-notice" role="status">
              {state.notice}
            </p>
          )}
          <div className="hd-primary-row">
            <section className="hd-hero" aria-label="Primary training session">
              <Image
                className="hd-hero-image"
                src={`${assets}football-session.png`}
                width={421}
                height={264}
                alt="Football boots and ball on a grass pitch, supplied reference artwork"
                unoptimized
                priority
              />
              <div className="hd-hero-content">
                <span className="hd-session-tag">Today’s Session</span>
                <h2>
                  {primary
                    ? `${primary.batch.split(" ")[0]} Training Session`
                    : unavailable
                      ? "Session details unavailable"
                      : "No session scheduled"}
                </h2>
                {primary ? (
                  <>
                    <p>
                      <Clock3 size={18} />
                      {primary.time}
                    </p>
                    <p>
                      <MapPin size={18} />
                      {primary.venue}
                    </p>
                    <small className="hd-roster">
                      <Users size={16} />
                      {primary.playerIds.length} players · {primary.batch}
                    </small>
                    <SessionLink
                      session={primary}
                      className="hd-primary-button"
                      label="Start Session"
                    >
                      {primary.status === "In progress"
                        ? "Open Session"
                        : "Start Session"}
                      <ArrowRight size={20} />
                    </SessionLink>
                    {!primary.canOpen && (
                      <small className="hd-session-reason">
                        {primary.reason}
                      </small>
                    )}
                  </>
                ) : (
                  <>
                    <p className="hd-no-session">
                      {unavailable
                        ? "Return when the records are available."
                        : `No accessible session on ${model.dateLabel}.`}
                    </p>
                    {!unavailable && (
                      <Link
                        href={previewRoute("session-builder")}
                        className="hd-primary-button"
                      >
                        Add Session
                        <ArrowRight size={20} />
                      </Link>
                    )}
                  </>
                )}
              </div>
            </section>
            <section className="hd-card hd-schedule">
              <div className="hd-card-heading">
                <h2>Today’s Schedule</h2>
                <Link href={previewRoute("sessions")} onClick={openCalendar}>
                  View Calendar
                </Link>
              </div>
              <div className="hd-schedule-list">
                {schedule.map((session) => (
                  <SessionLink
                    session={session}
                    className="hd-schedule-entry"
                    key={session.id}
                    label={`${session.title}, ${session.date}, ${session.time}`}
                  >
                    <span
                      className={`hd-timeline-dot ${session.status === "Cancelled" || session.status === "Completed" ? "muted" : ""}`}
                    />
                    <time>{session.time.split(" – ")[0]}</time>
                    <span className="hd-schedule-detail">
                      <strong>{session.title}</strong>
                      <small>{session.venue}</small>
                    </span>
                    <span className="hd-status">
                      {session.status === "Scheduled"
                        ? "Today"
                        : session.status}
                    </span>
                  </SessionLink>
                ))}
                {!schedule.length && (
                  <p className="hd-muted hd-schedule-empty">
                    {unavailable
                      ? "Schedule unavailable"
                      : "No accessible sessions today."}
                  </p>
                )}
              </div>
            </section>
          </div>
          <div className="hd-summary">
            {[
              [
                "players",
                "Total Players",
                Users,
                model.summary.totalPlayers,
                "Current academy roster",
                "mint",
              ],
              [
                "batches",
                "Active Batches",
                CalendarDays,
                model.summary.activeBatches,
                model.summary.batchNames
                  .map((batch) => batch.split(" ")[0])
                  .join(", "),
                "blue",
              ],
              [
                "upcoming",
                "Upcoming Sessions",
                ClipboardList,
                model.summary.upcomingSessions,
                "Next 7 days · current plan",
                "blue",
              ],
              [
                "messages",
                "Unread Messages",
                MessageSquare,
                null,
                "Read status not recorded",
                "red",
              ],
            ].map(([id, label, Icon, count, detail, tint]) => {
              const SummaryIcon = Icon as LucideIcon;
              return (
                <div
                  className={`hd-card hd-summary-card hd-${tint}`}
                  data-testid={`home-${id}`}
                  key={String(id)}
                >
                  <span className={`hd-round hd-${tint}`}>
                    <SummaryIcon size={27} />
                  </span>
                  <div>
                    <strong className="hd-number">
                      {count === null || unavailable
                        ? "—"
                        : empty
                          ? 0
                          : (count as number)}
                    </strong>
                    <p>{label as string}</p>
                    <small>{detail as string}</small>
                    {id === "messages" && (
                      <small>
                        {hasRecords
                          ? model.summary.parentQuestions
                          : unavailable
                            ? "—"
                            : 0}{" "}
                        parent questions
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hd-middle-row">
            <Section
              title="Recent Activity"
              to="parent-questions"
              className="hd-activity"
            >
              <div className="hd-list">
                {hasRecords &&
                  model.activity.map((item) => (
                    <Action
                      action={{
                        id: item.id,
                        label: item.label,
                        to: item.to,
                        playerId: item.playerId,
                      }}
                      className="hd-list-row"
                      key={item.id}
                    >
                      <span
                        className={`hd-small-round ${item.kind === "report" ? "hd-blue" : "hd-mint"}`}
                      >
                        {item.kind === "report" ? (
                          <FileText size={19} />
                        ) : item.kind === "message" ? (
                          <MessageSquare size={19} />
                        ) : (
                          <Users size={19} />
                        )}
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </Action>
                  ))}
                {(!hasRecords || !model.activity.length) && (
                  <p className="hd-muted">
                    {unavailable
                      ? "Activity unavailable"
                      : "No recorded activity yet."}
                  </p>
                )}
              </div>
            </Section>
            <Section
              title="Pending Actions"
              to="coach-more"
              className="hd-pending"
            >
              <div className="hd-list">
                {hasRecords &&
                  model.pending.map((action) => {
                    const Icon = actionIcons[action.id] ?? ClipboardList;
                    return (
                      <Action
                        key={action.id}
                        action={action}
                        className="hd-list-row"
                      >
                        <span
                          className={`hd-small-round ${action.id === "reports" ? "hd-red" : action.id === "attendance" ? "hd-mint" : "hd-blue"}`}
                        >
                          <Icon size={19} />
                        </span>
                        <span>
                          <strong>
                            {action.label}
                            {action.count !== undefined && ` (${action.count})`}
                          </strong>
                          <small>{action.description}</small>
                        </span>
                        <ChevronRight size={17} />
                      </Action>
                    );
                  })}
                {(!hasRecords || !model.pending.length) && (
                  <p className="hd-muted">
                    {unavailable
                      ? "Pending actions unavailable"
                      : "No pending actions."}
                  </p>
                )}
              </div>
            </Section>
            <Section title="Quick Actions" className="hd-quick">
              <div className="hd-quick-grid">
                {model.quickActions.map((action, index) => {
                  const Icon = actionIcons[action.id];
                  return (
                    <Action
                      action={
                        unavailable
                          ? {
                              ...action,
                              disabled: true,
                              reason: "Records unavailable",
                            }
                          : action
                      }
                      key={action.id}
                      className={`hd-quick-action hd-${["mint", "blue", "violet", "peach"][index]}`}
                    >
                      <Icon size={24} />
                      <strong>{action.label}</strong>
                    </Action>
                  );
                })}
              </div>
              <p className="hd-permission">Add Player requires owner access.</p>
            </Section>
          </div>
          <div className="hd-bottom-row">
            <Section
              title="Player Development Focus"
              to="players"
              action="View Players"
              className="hd-focus-card"
            >
              {hasRecords && model.focus ? (
                <div className="hd-focus">
                  {model.focus.playerId === "aarav" ? (
                    <Image
                      src={`${assets}player-portrait.png`}
                      width={83}
                      height={98}
                      alt="Illustrative player portrait from the supplied reference"
                      unoptimized
                    />
                  ) : (
                    <span className="hd-focus-initials">
                      {model.selectedPlayer?.initials}
                    </span>
                  )}
                  <div>
                    <small className="hd-focus-context">
                      {model.focus.playerName} · {model.focus.batch}
                    </small>
                    <small className="hd-muted">Current focus this week</small>
                    <strong>{model.focus.cue}</strong>
                    <p>Recorded development goal: {model.focus.text}</p>
                  </div>
                </div>
              ) : (
                <p className="hd-muted">
                  {unavailable
                    ? "Focus unavailable"
                    : "No player focus recorded."}
                </p>
              )}
            </Section>
            <Section
              title="Reports This Month"
              to="report-queue"
              className="hd-reports"
            >
              <div className="hd-report-summary">
                <div
                  className="hd-donut"
                  style={{ background: donut }}
                  role="img"
                  aria-label={
                    unavailable
                      ? "Report counts unavailable"
                      : `${reportCounts.approved} approved, ${reportCounts.inReview} in review, ${reportCounts.draft} draft reports in ${model.reports.currentPeriod}`
                  }
                >
                  <span>
                    {unavailable
                      ? "—"
                      : `${reportCounts.approved} / ${reportCounts.total}`}
                  </span>
                </div>
                <div className="hd-legend">
                  {[
                    ["Approved", reportCounts.approved, "green"],
                    ["In Review", reportCounts.inReview, "amber"],
                    ["Draft", reportCounts.draft, "slate"],
                  ].map(([label, count, color]) => (
                    <p key={label as string}>
                      <i className={`hd-dot-${color}`} />
                      {unavailable ? "—" : count} {label}
                    </p>
                  ))}
                </div>
              </div>
              {!unavailable && !model.reports.isCurrentPeriod && (
                <p className="hd-report-period">
                  No {model.reports.currentPeriod} records. Latest period:{" "}
                  {model.reports.period}
                </p>
              )}
            </Section>
            <div className="hd-next-column">
              <Section title="What’s Next" className="hd-next">
                <Link
                  href={previewRoute("weekly-plan")}
                  className="hd-next-action"
                >
                  <span className="hd-small-round hd-mint">
                    <Lightbulb size={22} />
                  </span>
                  <span>
                    <strong>Create next week’s plan</strong>
                    <small>Plan sessions for {model.nextWeek.label}</small>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              </Section>
              <p className="hd-quote">
                “Better players. Brighter futures.”
                <br />— Sportozen Academy
              </p>
            </div>
          </div>
          <p className="hd-preview-notice">
            Design preview — fictional data; no payments or messages are
            processed.
          </p>
        </main>
      </div>
      <nav className="hd-mobile-nav" aria-label="Mobile preview navigation">
        {navigation
          .filter(([label]) =>
            ["Home", "Players", "Messages", "More"].includes(label),
          )
          .map(([label, to, Icon]) => (
            <Link
              href={previewRoute(to)}
              key={label}
              className={label === "Home" ? "active" : ""}
              aria-current={label === "Home" ? "page" : undefined}
            >
              <Icon size={21} />
              {label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
