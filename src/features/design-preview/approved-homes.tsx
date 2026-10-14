"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Home,
  CalendarDays,
  ClipboardList,
  Users,
  BookOpen,
  MessageSquare,
  Building2,
  Settings,
  Bell,
  Search,
  ArrowRight,
  MapPin,
  Clock,
  Target,
  Footprints,
  Bot,
  Menu,
  Timer,
  ChevronRight,
  X,
} from "lucide-react";
import {
  previewAdapter,
  usePreviewState,
  playerWeeklyState,
  playerReportStatus,
} from "./adapter";
import {
  previewAcademies,
  previewDrills,
  resolvedAcademy,
  weekPlanContext,
} from "./fixtures";
import {
  previewRoute,
  previewScenarios,
  type PreviewScenario,
} from "./catalog";
import "./approved-homes.css";
const nav = [
  ["Home", "coach-today", Home],
  ["Calendar", "sessions", CalendarDays],
  ["Sessions", "session-agenda", ClipboardList],
  ["Players", "players", Users],
  ["Reports", "report-queue", ClipboardList],
  ["Messages", "parent-questions", MessageSquare],
  ["Academy", "coach-more", Building2],
  ["Settings", "coach-more", Settings],
] as const;
const reviewRoles = {
  OWNER: "owner-home",
  COACH: "coach-today",
  PARENT: "parent-home",
  PLATFORM: "platform-academies",
  ACCESS: "entry",
} as const;
function Jump({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={className} href={previewRoute(to)}>
      {children}
    </Link>
  );
}
export function ApprovedHomes({ parent }: { parent: boolean }) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    p = state.players.find((p) => p.id === state.playerId)!,
    ctx = weekPlanContext(state.fields, state.players),
    router = useRouter();
  const [search, setSearch] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const weekStart = new Date(`${ctx.week}T12:00:00Z`),
    weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const weekLabel = `${dateLabel.format(weekStart)} – ${dateLabel.format(weekEnd)} ${weekEnd.getUTCFullYear()}`;
  const weekly = playerWeeklyState(state),
    confirmed = ctx.playerIds.includes(p.id),
    approved = weekly.published && confirmed;
  const report = playerReportStatus(state),
    roster = state.players.filter((p) => ctx.playerIds.includes(p.id));
  const controls = (
    <Dialog.Root open={toolsOpen} onOpenChange={setToolsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="ar-controls"
          aria-label="Preview context & screen gallery"
          type="button"
        >
          <span className="ar-avatar" aria-hidden="true">
            {parent ? "NS" : "MR"}
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ar-tools-overlay" />
        <Dialog.Content className="ar-tools-drawer">
          <div className="ar-tools-heading">
            <Dialog.Title>Preview tools</Dialog.Title>
            <Dialog.Close aria-label="Close preview tools">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description>
            Fictional fixtures and review settings. No real messages or payments
            are processed.
          </Dialog.Description>
          <Link href="/design-preview/prototype">Reference prototype</Link>
          <label>
            Review academy fixture
            <select
              aria-label="Review academy fixture"
              value={academy.id}
              onChange={(e) =>
                previewAdapter.save({ academyId: e.target.value })
              }
            >
              {previewAcademies.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Review player context
            <select
              aria-label={parent ? "Review player context" : "Player context"}
              value={state.playerId}
              onChange={(e) =>
                previewAdapter.save({ playerId: e.target.value })
              }
            >
              {(parent
                ? state.players.filter((p) => p.guardian === "Neha Shah")
                : state.players
              ).map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role preview
            <select
              aria-label="Role preview"
              value={parent ? "PARENT" : "COACH"}
              onChange={(e) => {
                setToolsOpen(false);
                router.push(
                  previewRoute(
                    reviewRoles[e.target.value as keyof typeof reviewRoles],
                  ),
                );
              }}
            >
              {Object.keys(reviewRoles).map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <label>
            Design scenario
            <select
              aria-label="Design scenario"
              value="default"
              onChange={(e) => {
                setToolsOpen(false);
                router.push(
                  previewRoute(
                    parent ? "parent-home" : "coach-today",
                    e.target.value as PreviewScenario,
                  ),
                );
              }}
            >
              {previewScenarios.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
          <Jump to={parent ? "parent-more" : "coach-more"}>More tools</Jump>
          <Link href="/design-preview">Screen gallery</Link>
          <button onClick={() => previewAdapter.reset()}>
            Reset fictional preview
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  return (
    <div
      className={`design-preview approved-review ${parent ? "ar-parent" : "ar-coach"}`}
      style={{ "--ar-accent": academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to preview content
      </a>
      {!parent && (
        <aside className="ar-sidebar">
          <Jump to="coach-today" className="ar-logo">
            <span className="ar-logo-mark">S</span>
            <span>
              Sportozen<small>Academy</small>
            </span>
          </Jump>
          <nav aria-label="Preview workspace navigation">
            {nav.map(([title, to, Icon]) => (
              <Jump
                to={to}
                key={title}
                className={to === "coach-today" ? "active" : ""}
              >
                <Icon size={20} />
                {title}
              </Jump>
            ))}
          </nav>
          <div className="ar-coach-person">
            <span className="ar-avatar">MR</span>
            <span>
              Coach Maya<small>{academy.name}</small>
            </span>
          </div>
        </aside>
      )}
      <div className="ar-workspace">
        <header className="ar-header">
          {parent ? (
            <>
              <div className="ar-parent-identity">
                <span className="ar-logo-mark">S</span>
                <strong>{academy.name}</strong>
              </div>
              <Jump to="parent-progress" className="ar-icon">
                <Bell size={19} />
                <span className="sr-only">Parent updates</span>
              </Jump>
              {controls}
            </>
          ) : (
            <>
              <form
                className="ar-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const match = state.players.find((player) =>
                    player.name
                      .toLowerCase()
                      .includes(search.trim().toLowerCase()),
                  );
                  if (search.trim() && match) {
                    previewAdapter.save({ playerId: match.id });
                    router.push(previewRoute("player-profile"));
                  } else
                    router.push(
                      previewRoute(
                        /drill/i.test(search)
                          ? "drill-library"
                          : /session|calendar/i.test(search)
                            ? "sessions"
                            : "players",
                      ),
                    );
                }}
              >
                <Search size={17} />
                <input
                  aria-label="Search players, sessions, drills"
                  placeholder="Search players, sessions, drills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button aria-label="Open player search" type="submit">
                  <ArrowRight size={16} />
                </button>
              </form>
              <Jump to="academy-profile" className="ar-academy">
                <Building2 size={15} />
                <span>{academy.name}</span>
              </Jump>
              <Jump to="outstanding-reviews" className="ar-icon">
                <Bell size={22} />
                <span className="sr-only">Pending reviews</span>
              </Jump>
              {controls}
            </>
          )}
        </header>
        <main id="preview-content" className="ar-main">
          {parent ? (
            <>
              <div className="ar-greeting">
                <h1>
                  Hi Neha <span aria-hidden="true">👋</span>
                </h1>
                <p>Here’s {p.name.split(" ")[0]}’s latest update.</p>
                <label className="ar-child">
                  <span className="sr-only">Player context</span>
                  <select
                    aria-label="Player context"
                    value={p.id}
                    onChange={(e) =>
                      previewAdapter.save({ playerId: e.target.value })
                    }
                  >
                    {state.players
                      .filter((p) => p.guardian === "Neha Shah")
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name} · {p.category}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <section className="ar-card ar-week-card">
                <div className="ar-section-line">
                  <span className="ar-symbol green">
                    <CalendarDays size={22} />
                  </span>
                  <div>
                    <h2>This Week’s Focus</h2>
                    <p>{weekLabel}</p>
                  </div>
                </div>
                <Image
                  width={50}
                  height={84}
                  unoptimized
                  src="/design-preview/approved-ui/weekly-football.png"
                  alt="Football activity illustration from the supplied design reference"
                  className="ar-week-image"
                />
                <div className="ar-week-copy">
                  <h3>
                    {approved
                      ? state.batchFocus
                      : "Your plan is awaiting coach review"}
                  </h3>
                  <p>
                    {approved
                      ? state.adjustments[p.id] ||
                        "Following the shared batch plan"
                      : "No current approved plan is inferred for this child."}
                  </p>
                </div>
                <div className="ar-week-footer">
                  <span>
                    <CalendarDays size={18} />
                    {confirmed ? "2 sessions" : "No sessions"}
                    <small>this week</small>
                  </span>
                  <span>
                    <Footprints size={19} />
                    {approved ? "Receiving" : "Awaiting"}
                    <small>{approved ? "& passing" : "coach review"}</small>
                  </span>
                  <Jump to="parent-weekly">
                    View Plan <ArrowRight size={14} />
                  </Jump>
                </div>
              </section>
              <section className="ar-card ar-update">
                <span className="ar-avatar">MR</span>
                <div>
                  <div className="ar-section-line">
                    <h2>Latest Coach Update</h2>
                    <time>
                      {p.id === "aarav" ? "30 Sep 2026" : "Not recorded"}
                    </time>
                  </div>
                  <p>
                    {p.id === "aarav"
                      ? "The paired receiving task used a wider gate. The coach will keep those conditions before extending the task."
                      : "No reviewed update is recorded for this child. Ask the coach for an update."}
                  </p>
                  <Jump to="parent-progress">
                    View Full Update <ArrowRight size={14} />
                  </Jump>
                </div>
              </section>
              <Jump to="parent-schedule" className="ar-card ar-next">
                <span className="ar-symbol violet">
                  <CalendarDays size={24} />
                </span>
                <div>
                  <h2>Next Session</h2>
                  <p>
                    {confirmed
                      ? `${ctx.first.label} · ${ctx.time}`
                      : "No confirmed current-week session"}
                  </p>
                  <p>
                    {confirmed
                      ? academy.venue
                      : "Ask the coach for the schedule"}
                  </p>
                </div>
                <ChevronRight size={20} />
              </Jump>
              <div className="ar-shortcuts">
                <Jump to="parent-report">
                  <ClipboardList size={24} />
                  <span>
                    {report === "Approved" ? "Monthly Report" : "Report Review"}
                  </span>
                </Jump>
                <Jump to="practice">
                  <Timer size={24} />
                  <span>Practise Together</span>
                </Jump>
                <Jump to="conversation">
                  <MessageSquare size={24} />
                  <span>Message Coach</span>
                </Jump>
              </div>
            </>
          ) : (
            <>
              <div className="ar-greeting">
                <div>
                  <h1>Good morning, Coach Maya</h1>
                  <p>Today’s session is ready. Let’s build better players.</p>
                </div>
                <div className="ar-motto">
                  “Better Players. Brighter Futures.”<small>— Sportozen</small>
                </div>
              </div>
              <div className="ar-training-layout">
                <section className="ar-training">
                  <Image
                    width={201}
                    height={290}
                    unoptimized
                    src="/design-preview/approved-ui/football-training.png"
                    alt="Football player practising with a ball, cropped from the supplied approved reference"
                    className="ar-training-photo"
                  />
                  <div className="ar-training-content">
                    <p className="ar-training-label">
                      Today’s Training <span>✦</span>
                    </p>
                    <h2>{ctx.batch} — Technical Session</h2>
                    <div className="ar-session-details">
                      <span>
                        <CalendarDays size={17} />
                        {ctx.first.label}
                      </span>
                      <span>
                        <Clock size={17} />
                        {ctx.time}
                      </span>
                      <span>
                        <MapPin size={17} />
                        {academy.venue.split(" · ")[0]}
                      </span>
                    </div>
                    <div className="ar-focus">
                      <h3>Focus Areas</h3>
                      <div>
                        {state.drills.map((id, i) => {
                          const drill = previewDrills.find((d) => d.id === id);
                          const Icon = [Footprints, Target, Timer][i % 3];
                          return drill ? (
                            <span key={id}>
                              <Icon size={18} />
                              {drill.skill}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <p>{state.batchFocus}</p>
                    </div>
                    <div className="ar-training-actions">
                      <Jump to="session-agenda" className="ar-start">
                        <span className="ar-logo-mark" aria-hidden="true">
                          S
                        </span>
                        Start Session
                      </Jump>
                      <Jump to="weekly-plan" className="ar-plan">
                        View Plan
                      </Jump>
                    </div>
                  </div>
                </section>
                <div className="ar-side-cards">
                  <section className="ar-card ar-schedule">
                    <div className="ar-section-line">
                      <h2>This Week</h2>
                      <Jump to="sessions">View Calendar</Jump>
                    </div>
                    {[ctx.first, ctx.second].map((day) => (
                      <Jump
                        to="session-summary"
                        key={day.label}
                        className="ar-schedule-row"
                      >
                        <CalendarDays size={19} />
                        <span>{day.label}</span>
                        <span>{ctx.batch}</span>
                        <small>{ctx.time.split("–")[0]}</small>
                      </Jump>
                    ))}
                    <p className="ar-schedule-note">
                      Confirmed fixture sessions · {academy.timezone}
                    </p>
                  </section>
                  <section className="ar-card ar-pending">
                    <div className="ar-section-line">
                      <h2>
                        Pending Actions <span className="ar-count">2</span>
                      </h2>
                      <Jump to="outstanding-reviews">View All</Jump>
                    </div>
                    <Jump to="session-review" className="ar-pending-row">
                      <span className="ar-symbol rose">
                        <ClipboardList size={17} />
                      </span>
                      Session observations to review
                    </Jump>
                    <Jump to="weekly-approval" className="ar-pending-row">
                      <span className="ar-symbol rose">
                        <Users size={17} />
                      </span>
                      {weekly.published
                        ? "Review the next weekly plan"
                        : "Weekly plan awaiting review"}
                    </Jump>
                  </section>
                </div>
              </div>
              <div className="ar-summary-grid">
                <Summary
                  title="Players"
                  value={String(roster.length)}
                  note={ctx.batch}
                  to="players"
                  action="View Squad"
                  icon={<Users size={22} />}
                >
                  <div className="ar-roster-avatars">
                    {roster.slice(0, 3).map((p) => (
                      <span className="ar-avatar" key={p.id}>
                        {p.initials}
                      </span>
                    ))}
                  </div>
                </Summary>
                <Summary
                  title="Reports"
                  value={report === "Approved" ? "1" : "0"}
                  note={
                    report === "Approved"
                      ? "Reviewed September report"
                      : "No approved report"
                  }
                  to="report-queue"
                  action="Review Now"
                  icon={<Footprints size={22} />}
                />
                <Summary
                  title="Messages"
                  value={String(
                    state.messages.filter((m) => m.sender === "Parent").length,
                  )}
                  note="Recorded parent questions"
                  to="parent-questions"
                  action="Open Inbox"
                  icon={<MessageSquare size={22} />}
                />
                <section className="ar-card ar-ai">
                  <div className="ar-section-line">
                    <h2>AI Analysis</h2>
                    <Bot size={28} />
                  </div>
                  <Jump to="ai-coming-soon" className="ar-ai-status">
                    <span className="sr-only">AI analysis status: </span>
                    <span className="ar-coming">Coming soon</span>
                  </Jump>
                  <p>
                    Coach-led plans and recorded observations remain available.
                  </p>
                </section>
              </div>
            </>
          )}
          <p className="ar-preview-note">
            Design preview — fictional data; no payments or messages are
            processed.
          </p>
        </main>
      </div>
      {parent && (
        <nav className="ar-bottom-nav" aria-label="Parent navigation">
          {[
            ["Home", "parent-home", Home],
            ["Plan", "parent-weekly", CalendarDays],
            ["Progress", "parent-progress", BookOpen],
            ["Messages", "conversations", MessageSquare],
            ["More", "parent-more", Menu],
          ].map(([title, to, Icon]) => {
            const NavIcon = Icon as typeof Home;
            return (
              <Jump
                key={String(to)}
                to={String(to)}
                className={title === "Home" ? "active" : ""}
              >
                <NavIcon size={21} />
                <span>{String(title)}</span>
              </Jump>
            );
          })}
        </nav>
      )}
    </div>
  );
}
function Summary({
  title,
  value,
  note,
  to,
  action,
  icon,
  children,
}: {
  title: string;
  value: string;
  note: string;
  to: string;
  action: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="ar-card ar-summary">
      <div className="ar-section-line">
        <h2>{title}</h2>
        <span className="ar-symbol">{icon}</span>
      </div>
      <div className="ar-summary-value">
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
      <div className="ar-summary-bottom">
        {children}
        <Jump to={to}>
          {action} <ArrowRight size={14} />
        </Jump>
      </div>
    </section>
  );
}
