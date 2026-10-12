"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  Badge,
  PageTitle,
  SectionTitle,
  Avatar,
} from "@/components/ui/primitives";
import { useAcademy } from "@/hooks/use-academy";
const GrowthChart = dynamic(
  () => import("@/components/data-display/growth-chart"),
  {
    ssr: false,
    loading: () => (
      <div
        className="chart"
        style={{ height: 230 }}
        aria-label="Loading player growth chart"
      >
        Loading player growth chart…
      </div>
    ),
  },
);
const rupees = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export function Dashboard({ coach = false }: { coach?: boolean }) {
  const { data, update } = useAcademy();
  const featured = data.sessions.find((s) => s.id === "s1");
  const coachSquads = data.squads.filter((s) => s.coachId === "c1");
  const coachPlayers = data.players.filter((p) =>
    coachSquads.some((s) => s.name === p.squad),
  );
  const recordedRates = data.players.flatMap((p) =>
    p.attendance === null ? [] : [p.attendance],
  );
  const historicalRate = recordedRates.length
    ? `${Math.round(recordedRates.reduce((a, b) => a + b, 0) / recordedRates.length)}%`
    : "Not Recorded";
  const pending = data.reports.filter((r) => r.status !== "Approved").length;
  const outstanding =
    data.charges.reduce((a, c) => a + c.amount, 0) -
    data.payments.reduce((a, p) => a + p.amount, 0);
  const stats = coach
    ? [
        {
          title: "Players in my squads",
          value: String(coachPlayers.length),
          detail: `Across ${coachSquads.length} training groups`,
          Icon: Users,
        },
        {
          title: "Sessions today",
          value: "1",
          detail: "U-13 · 4:00 PM",
          Icon: CalendarDays,
        },
        {
          title: "Goals awaiting review",
          value: String(
            data.goals.filter(
              (g) =>
                g.status === "Developing" &&
                coachPlayers.some((p) => p.id === g.playerId),
            ).length,
          ),
          detail: "Next review · 14 Oct",
          Icon: ClipboardCheck,
        },
        {
          title: "Parent drafts",
          value: String(
            data.messages.filter((m) => m.status === "DRAFT").length,
          ),
          detail: "Coach approval required",
          Icon: MessageSquare,
        },
      ]
    : [
        {
          title: "Active players",
          value: String(data.players.length),
          detail: "+2 since last month",
          Icon: Users,
        },
        {
          title: "Sessions today",
          value: "1",
          detail: "1 session to mark",
          Icon: CalendarDays,
        },
        {
          title: "Attendance rate",
          value: historicalRate,
          detail: "Mean · demo recorded history",
          Icon: ClipboardCheck,
        },
        {
          title: "Outstanding fees",
          value: rupees(outstanding),
          detail: `${data.players.filter((p) => p.feeStatus === "Outstanding").length} player accounts`,
          Icon: Wallet,
        },
      ];
  return (
    <>
      <PageTitle
        eyebrow="YOUR ACADEMY, AT A GLANCE"
        title={
          coach ? "Let’s make today count, Rahul." : "Good afternoon, Anil."
        }
        description="Fictional demo reference date: 7 October 2026 · A little progress, every session."
      >
        <Link
          className="button secondary"
          href={coach ? "/coach/players" : "/owner/players"}
        >
          <Users size={16} />
          View players
        </Link>
        <Link
          className="button primary"
          href={coach ? "/coach/sessions/s1/desk" : "/coach/sessions/new"}
        >
          <Plus size={17} />
          {coach ? "Open Session Desk" : "Create session"}
        </Link>
      </PageTitle>
      <div className="hero-strip">
        <div className="hero-copy">
          <Badge tone="green">THE SPORTOZEN WAY</Badge>
          <h2>
            One team.
            <br />
            <span>A different path for every player.</span>
          </h2>
          <p>Connect today’s training to tomorrow’s progress.</p>
          <Link href="/coach/development/p1">
            Explore player development <ArrowRight size={16} />
          </Link>
        </div>
        <div className="pitch-art" aria-hidden="true">
          <div className="pitch-circle" />
          <div className="pitch-line" />
          <span className="pitch-player one" />
          <span className="pitch-player two" />
          <span className="pitch-player three" />
          <span className="pitch-player four" />
          <span className="pitch-ball" />
          <div className="pitch-caption">PLAN → TRAIN → OBSERVE → IMPROVE</div>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map(({ title, value, detail, Icon }, i) => (
          <Card key={title} className="stat-card">
            <div className="stat-top">
              <span>{title}</span>
              <span className={`stat-icon icon-${i}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong>{value}</strong>
            <p>
              <span className={i === 0 ? "positive" : ""}>
                {i === 0 && <ArrowUpRight size={13} />} {detail}
              </span>
            </p>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card>
          <SectionTitle
            title={coach ? "Your next session" : "Today at the academy"}
            subtitle="A clear focus for every training group"
            href={coach ? "/coach/sessions" : "/owner/sessions"}
          />
          <div className="session-feature">
            <div className="date-tile">
              <small>{featured?.date.slice(0, 7)}</small>
              <strong>{featured?.date.slice(8)}</strong>
              <span>DEMO</span>
            </div>
            <div>
              <div className="inline">
                <Badge tone="green">{featured?.squad}</Badge>
                <Badge>{featured?.status}</Badge>
              </div>
              <h3>{featured?.title || "No session selected"}</h3>
              <p>
                <Clock size={14} /> {featured?.date} · {featured?.time}{" "}
                <span>·</span> Coach Rahul
              </p>
              <p>
                <MapPin size={14} /> {featured?.venue}
              </p>
            </div>
          </div>
          <div className="session-focus">
            <span>TEAM FOCUS</span>
            <strong>{featured?.title}</strong>
            <p>
              {data.players.filter((p) => p.squad === featured?.squad).length}{" "}
              players · {featured?.drillIds.length ?? 0} drills · individual
              goals assigned
            </p>
          </div>
          <div className="card-footer">
            <span className="avatar-stack">
              {data.players.slice(0, 4).map((p) => (
                <Avatar key={p.id} name={p.name} />
              ))}
              <small>+2 players</small>
            </span>
            <Link className="button primary" href="/coach/sessions/s1/desk">
              Open Session Desk <ArrowRight size={15} />
            </Link>
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Needs attention"
            subtitle="Small actions that keep the academy moving"
          />
          <Link className="attention-row" href="/coach/reports">
            <span className="attention-icon amber">
              <FileText size={19} />
            </span>
            <div>
              <strong>{pending} reports awaiting review</strong>
              <p>Give parents a clear view of progress</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link
            className="attention-row"
            href={coach ? "/coach/sessions" : "/owner/attendance"}
          >
            <span className="attention-icon blue">
              <ClipboardCheck size={19} />
            </span>
            <div>
              <strong>
                {
                  data.sessions.filter((s) =>
                    data.attendance.some(
                      (a) => a.sessionId === s.id && a.status === "Unmarked",
                    ),
                  ).length
                }{" "}
                unmarked sessions
              </strong>
              <p>Complete the attendance record</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link
            className="attention-row"
            href={coach ? "/coach/messages" : "/owner/communication"}
          >
            <span className="attention-icon purple">
              <MessageSquare size={19} />
            </span>
            <div>
              <strong>
                {data.messages.filter((m) => m.status === "DRAFT").length}{" "}
                parent update to approve
              </strong>
              <p>Draft only · nothing has been sent</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          {!coach && (
            <Link className="text-link attention-link" href="/owner/fees">
              Review outstanding fees <ArrowRight size={15} />
            </Link>
          )}
        </Card>
        <Card>
          <SectionTitle
            title={coach ? "Coach tasks" : "Player growth"}
            subtitle={
              coach
                ? "Your coaching checklist"
                : "Active registrations · fictional demo history"
            }
          />
          {coach ? (
            data.tasks.map((task) => (
              <label className="task-row" key={task.id}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      tasks: s.tasks.map((t) =>
                        t.id === task.id ? { ...t, done: e.target.checked } : t,
                      ),
                    }))
                  }
                />
                <span>{task.title}</span>
              </label>
            ))
          ) : (
            <>
              <div className="chart-summary">
                <strong>24</strong>
                <span>active players</span>
                <Badge tone="green">+9% this month</Badge>
              </div>
              <GrowthChart />
            </>
          )}
        </Card>
        <Card>
          <SectionTitle
            title="Recent activity"
            subtitle="The latest from your academy"
          />
          <div className="activity">
            <span className="activity-dot green">
              <CheckCircle2 size={15} />
            </span>
            <div>
              <strong>Aarav’s September report approved</strong>
              <p>Coach Rahul · Parent preview available</p>
              <small>Coach Reviewed</small>
            </div>
          </div>
          <div className="activity">
            <span className="activity-dot blue">
              <CalendarDays size={15} />
            </span>
            <div>
              <strong>U-13 session published</strong>
              <p>
                {featured?.title} ·{" "}
                {
                  data.players.filter(
                    (p) =>
                      p.squad === featured?.squad && featured?.focuses[p.id],
                  ).length
                }{" "}
                personal objectives
              </p>
              <small>Fictional demo week · {featured?.date}</small>
            </div>
          </div>
          <div className="activity">
            <span className="activity-dot purple">
              <Users size={15} />
            </span>
            <div>
              <strong>October development review scheduled</strong>
              <p>Review evidence, then choose the next goal</p>
              <small>14 October 2026</small>
            </div>
          </div>
        </Card>
      </div>
      <div className="quick-actions">
        <strong>Keep things moving</strong>
        {[
          ["Add a player", coach ? "/coach/players" : "/owner/players"],
          ["Build a session", "/coach/sessions/new"],
          ["Review development", "/coach/development/p1"],
          ["Browse drills", "/coach/drills"],
        ].map(([label, href]) => (
          <Link href={href} key={label}>
            {label}
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </div>
    </>
  );
}
