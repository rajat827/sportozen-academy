"use client";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Lightbulb,
  MapPin,
  MessageSquare,
  UserRoundPlus,
  Users,
  Target,
  BookOpen,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  portalDate,
  portalSessionSummary,
  academyDate,
  currentPlayerPlan,
} from "@/services/portal-records";
import { sessionHeading } from "@/services/session-display";
import type { PortalController, PortalNavigate } from "./portal-types";
import { useFinance } from "@/hooks/use-finance";

function OwnerFinanceAction({
  workspace: w,
  onNavigate,
}: {
  workspace: PortalController;
  onNavigate: PortalNavigate;
}) {
  const f = useFinance(w);
  const outstanding = f.data?.invoices.filter(
    (i) => i.outstandingMinor > 0,
  ).length;
  const pending = f.data?.payments.filter((p) => p.status === "PENDING").length;
  return (
    <button className="portal-home-activity" onClick={() => onNavigate("fees")}>
      <span className="portal-round amber">
        <WalletCards size={19} />
      </span>
      <span>
        <strong>
          {f.data
            ? `${outstanding} outstanding invoices`
            : f.error
              ? "Fee accounts unavailable"
              : "Loading fee accounts…"}
        </strong>
        {f.data && (
          <small>{pending} payment references awaiting verification</small>
        )}
      </span>
      <ArrowRight size={16} />
    </button>
  );
}

function HomeCard({
  title,
  action,
  onAction,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`portal-card ${className}`}>
      <div className="portal-card-heading">
        <h2>{title}</h2>
        {onAction && (
          <button className="portal-link" onClick={onAction}>
            {action ?? "View all"}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
export function PortalHome({
  workspace: w,
  onNavigate,
}: {
  workspace: PortalController;
  onNavigate: PortalNavigate;
}) {
  const d = w.data!,
    summary = portalSessionSummary(d),
    session = summary.next;
  const batchName = (squadId: string) =>
    d.records.squad.find((s) => s.id === squadId)?.name;
  const name =
      d.members
        .find((m) => m.userId === d.membership.userId)
        ?.name?.split(" ")[0] ?? "there",
    coach = d.membership.role === "COACH";
  const reviews = d.records.evidence.filter((e) =>
    ["DRAFT", "AWAITING_REVIEW"].includes(e.status),
  );
  const drafts = d.records.report.filter((r) => r.status !== "Approved"),
    approved = d.records.report.filter((r) => r.status === "Approved");
  const open = d.records.conversation.filter((c) => c.status === "OPEN");
  const unmarked = d.records.attendance.filter(
    (a) =>
      summary.todaySessions.some((s) => s.id === a.sessionId) &&
      a.status === "UNMARKED",
  );
  const focusPlayer = d.records.player.find((p) => currentPlayerPlan(d, p.id)),
    plan = focusPlayer && currentPlayerPlan(d, focusPlayer.id);
  const month = summary.today.slice(0, 7),
    monthReports = d.records.report.filter((r) => r.period === month),
    monthApproved = monthReports.filter((r) => r.status === "Approved").length;
  const recent = [
    ...d.records.evidence
      .filter((e) => e.status === "REVIEWED")
      .map((e) => ({
        id: e.id,
        title: `Reviewed observation · ${d.records.player.find((p) => p.id === e.playerId)?.name ?? "Authorised player"}`,
        date: e.reviewedAt ?? e.recordedAt,
        go: () =>
          onNavigate("training", { session: e.sessionId, player: e.playerId }),
      })),
    ...d.records.conversation.flatMap((c) =>
      c.messages
        .filter((m) => !m.internal)
        .slice(-1)
        .map((m) => ({
          id: m.id,
          title: `${c.subject} · ${d.records.player.find((p) => p.id === c.playerId)?.name ?? "Player"}`,
          date: m.at,
          go: () => onNavigate("messages", { player: c.playerId }),
        })),
    ),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  return (
    <div className="portal-home-page">
      <div className="portal-page-heading">
        <div>
          <h1>
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
            {coach ? "Coach " : ""}
            {name}
          </h1>
          <p>
            {coach
              ? "Let’s build better players today."
              : "Your academy’s sessions, reviews and next steps."}
          </p>
        </div>
        <time>{portalDate(new Date().toISOString(), d)}</time>
      </div>
      <div className="portal-home-top">
        <section className="portal-home-hero">
          <Image
            src="/portal/football-session.png"
            fill
            alt="Football and boots on a training pitch"
            sizes="(max-width: 767px) 100vw, 55vw"
            unoptimized
            priority
          />
          <div className="portal-home-hero-content">
            <span>
              {session &&
              academyDate(d, new Date(session.startAt)) === summary.today
                ? "Today’s Session"
                : "Next Training Session"}
            </span>
            <h2>
              {session
                ? sessionHeading(session, batchName(session.squadId))
                : "Your next session starts here"}
            </h2>
            {session ? (
              <>
                <p>
                  <Clock3 size={17} />
                  {portalDate(session.startAt, d, true)} –{" "}
                  {portalDate(session.endAt, d, true)}
                  {academyDate(d, new Date(session.startAt)) !==
                    summary.today && ` · ${portalDate(session.startAt, d)}`}
                </p>
                <p>
                  <MapPin size={17} />
                  {session.location}
                </p>
                <small>
                  <Users size={15} />
                  {session.roster.length} players ·{" "}
                  {d.records.squad.find((s) => s.id === session.squadId)?.name}
                </small>
                <button
                  className="button primary"
                  onClick={() =>
                    onNavigate("training", { session: session.id })
                  }
                >
                  {session.status === "IN_PROGRESS"
                    ? "Continue Session"
                    : "Open Session"}
                  <ArrowRight size={19} />
                </button>
              </>
            ) : (
              <>
                <p>Create a dated session for an academy batch.</p>
                <button
                  className="button primary"
                  onClick={() => onNavigate("training", { create: "session" })}
                >
                  Create Session <ArrowRight size={19} />
                </button>
              </>
            )}
          </div>
        </section>
        <HomeCard
          title="Today’s Schedule"
          action="View Calendar"
          onAction={() => onNavigate("calendar")}
          className="portal-home-schedule"
        >
          {summary.todaySessions.length ? (
            summary.todaySessions.slice(0, 3).map((s) => (
              <button
                className="portal-schedule-row"
                key={s.id}
                onClick={() => onNavigate("calendar", { session: s.id })}
              >
                <span className="portal-schedule-dot" />
                <time>{portalDate(s.startAt, d, true)}</time>
                <span>
                  <strong>{sessionHeading(s, batchName(s.squadId))}</strong>
                  <small>{s.location}</small>
                </span>
                <span className="portal-status muted">
                  {s.status === "COMPLETED" ? "Completed" : "Today"}
                </span>
              </button>
            ))
          ) : (
            <div className="portal-home-no-schedule">
              <CalendarDays size={30} />
              <strong>No sessions scheduled today</strong>
              <p>
                {summary.upcoming.length
                  ? `${summary.upcoming.length} upcoming confirmed sessions`
                  : "Your calendar is ready when you are."}
              </p>
              <button
                className="portal-link"
                onClick={() => onNavigate("calendar")}
              >
                Open Calendar <ArrowRight size={14} />
              </button>
            </div>
          )}
        </HomeCard>
      </div>
      <div className="portal-stat-grid">
        {[
          {
            Icon: Users,
            value: d.records.player.filter((p) => p.status !== "INACTIVE")
              .length,
            label: "Active Players",
            note: coach ? "Your assigned players" : "Academy football players",
            tone: "",
            go: () => onNavigate("players"),
          },
          {
            Icon: CalendarDays,
            value: d.records.squad.length,
            label: "Active Batches",
            note: "Recorded football batches",
            tone: "blue",
            go: () => onNavigate("training"),
          },
          {
            Icon: ClipboardList,
            value: summary.upcoming.length,
            label: "Upcoming Sessions",
            note: "Confirmed dated sessions",
            tone: "blue",
            go: () => onNavigate("calendar"),
          },
          {
            Icon: MessageSquare,
            value: open.length,
            label: "Open Conversations",
            note: "Private parent communication",
            tone: "red",
            go: () => onNavigate("messages"),
          },
        ].map(({ Icon, value, label, note, tone, go }) => (
          <button
            className="portal-card portal-stat portal-stat-button"
            key={label}
            onClick={go}
          >
            <span className={`portal-round ${tone}`}>
              <Icon size={25} />
            </span>
            <span>
              <strong>{value}</strong>
              <p>{label}</p>
              <small>{note}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="portal-home-middle">
        <HomeCard
          title="Recent Activity"
          onAction={() => onNavigate("messages")}
        >
          {recent.length ? (
            recent.map((r) => (
              <button
                className="portal-home-activity"
                key={r.id}
                onClick={r.go}
              >
                <span className="portal-round">
                  <FileText size={19} />
                </span>
                <span>
                  {r.title}
                  <small>{portalDate(r.date, d)}</small>
                </span>
              </button>
            ))
          ) : (
            <p className="portal-subtle">
              Activity appears here when a coach reviews an observation or a
              private conversation receives a message.
            </p>
          )}
        </HomeCard>
        <HomeCard
          title="Pending Actions"
          onAction={() => onNavigate("training")}
        >
          {["OWNER", "ADMIN"].includes(d.membership.role) &&
            d.academy.modules.includes("fees") && (
              <OwnerFinanceAction workspace={w} onNavigate={onNavigate} />
            )}
          {[
            {
              n: reviews.length,
              label: "observations to review",
              Icon: Users,
              tone: "red",
              go: () =>
                onNavigate("training", { session: reviews[0]?.sessionId }),
            },
            {
              n: drafts.length,
              label: "report drafts",
              Icon: FileText,
              tone: "blue",
              go: () => onNavigate("reports"),
            },
            {
              n: unmarked.length,
              label: "attendance records unmarked today",
              Icon: CheckCircle2,
              tone: "",
              go: () =>
                onNavigate("training", { session: unmarked[0]?.sessionId }),
            },
          ].map(({ n, label, Icon, tone, go }) => (
            <button className="portal-home-activity" key={label} onClick={go}>
              <span className={`portal-round ${tone}`}>
                <Icon size={19} />
              </span>
              <span>
                <strong>
                  {n} {label}
                </strong>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </HomeCard>
        <HomeCard title="Quick Actions">
          <div className="portal-home-quick">
            {[
              {
                label: "Add Session",
                Icon: CalendarDays,
                tone: "",
                go: () => onNavigate("training", { create: "session" }),
              },
              {
                label: "Add Player",
                Icon: UserRoundPlus,
                tone: "blue",
                go: () => onNavigate("players", { create: "player" }),
              },
              {
                label: "Message Parent",
                Icon: MessageSquare,
                tone: "purple",
                go: () => onNavigate("messages"),
              },
              {
                label: "Prepare Report",
                Icon: FileText,
                tone: "amber",
                go: () => onNavigate("reports", { prepare: "monthly" }),
              },
            ].map(({ label, Icon, tone, go }) => (
              <button
                key={label}
                className={`portal-quick-action ${tone}`}
                onClick={go}
              >
                <Icon size={25} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </HomeCard>
      </div>
      <div className="portal-home-bottom">
        <HomeCard
          title="Player Development Focus"
          action="View Players"
          onAction={() => onNavigate("players")}
        >
          <div className="portal-focus">
            <span className="portal-round">
              <Target size={24} />
            </span>
            <div>
              <small>{focusPlayer?.name ?? "Shared batch development"}</small>
              <h3>
                {plan?.focus ||
                  session?.sharedObjective?.goal ||
                  "Set a focus in your next batch plan"}
              </h3>
              <p>
                {plan?.observe ||
                  session?.sharedObjective?.observe ||
                  "Players follow the batch plan unless you choose an optional adjustment."}
              </p>
            </div>
          </div>
        </HomeCard>
        <HomeCard
          title="Reports This Month"
          onAction={() => onNavigate("reports")}
        >
          <div className="portal-home-report-count">
            <div
              className="portal-report-ring"
              style={{
                background: `conic-gradient(var(--portal-green) ${monthReports.length ? (360 * monthApproved) / monthReports.length : 0}deg,#e6edf3 0)`,
              }}
            >
              <strong>
                {monthApproved}/{monthReports.length}
              </strong>
            </div>
            <div>
              <p>
                <i className="portal-dot" />
                {monthApproved} Approved
              </p>
              <p>
                <i className="portal-dot amber" />
                {monthReports.length - monthApproved} Awaiting review
              </p>
              <small>Report status · {month}</small>
            </div>
          </div>
          <span className="portal-subtle">
            {approved.length} approved reports in recorded history
          </span>
        </HomeCard>
        <HomeCard title="What’s Next">
          <button
            className="portal-home-next"
            onClick={() => onNavigate("training", { view: "weekly" })}
          >
            <span className="portal-round">
              <Lightbulb size={23} />
            </span>
            <span>
              <strong>Prepare next week’s plan</strong>
              <small>Shared batch plan, optional player adjustments</small>
            </span>
            <ArrowRight size={17} />
          </button>
          {!d.records.branch.length && (
            <button
              className="portal-link"
              onClick={() => onNavigate("settings", { tab: "sessions" })}
            >
              <BookOpen size={15} /> Complete academy setup
            </button>
          )}
        </HomeCard>
      </div>
    </div>
  );
}
