"use client";
import Link from "next/link";
import {
  CalendarDays,
  ArrowRight,
  Compass,
  CheckCircle2,
  MapPin,
  FileText,
} from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import { parentRecords } from "@/data/repositories/demo-repository";
import {
  Avatar,
  Badge,
  Card,
  PageTitle,
  SectionTitle,
  EvidenceBadge,
} from "@/components/ui/primitives";
export function ParentScreen({ screen }: { screen: string }) {
  const { data } = useAcademy();
  const records = parentRecords(data, "g1");
  const player = records.players[0];
  const sessions = data.sessions.filter(
    (s) => s.squad === player.squad && s.status === "Published",
  );
  const title: Record<string, string> = {
    home: "A little better, every day.",
    schedule: "Your training schedule",
    progress: "Aarav’s progress",
    reports: "Coach-reviewed reports",
    fees: "Your fee records",
    messages: "Academy updates",
    profile: "Your academy connection",
  };
  return (
    <div className="parent-content">
      <PageTitle
        eyebrow="STALLIONS FC ACADEMY"
        title={title[screen] ?? title.home}
        description={
          screen === "home"
            ? "Hi Neha. Here’s what Aarav is working on."
            : "A clear view of practice, progress and next steps."
        }
      />
      <div className="parent-player">
        <Avatar name={player.name} />
        <div>
          <strong>{player.name}</strong>
          <p>
            {player.squad} · {player.position}
          </p>
        </div>
        <Badge tone="green">{player.status}</Badge>
      </div>
      {screen === "home" ? (
        <>
          <div className="parent-goal">
            <Compass size={26} />
            <span>THIS WEEK’S FOCUS</span>
            <h2>{player.goal}</h2>
            <p>Look before the ball arrives. Receive with purpose.</p>
            <Link href="/parent/progress">
              See Aarav’s progress <ArrowRight size={16} />
            </Link>
          </div>
          <Card>
            <SectionTitle
              title="Next training"
              href="/parent/schedule"
              action="Schedule"
            />
            {sessions.slice(0, 1).map((s) => (
              <div key={s.id}>
                <div className="inline">
                  <CalendarDays size={21} />
                  <strong>Wednesday, 7 October · 4:00 PM</strong>
                </div>
                <h3>{s.title}</h3>
                <p className="inline muted">
                  <MapPin size={15} />
                  {s.venue}
                </p>
                <Badge tone="green">Personal focus assigned</Badge>
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle title="Latest coach update" />
            {records.observations.map((o) => (
              <div key={o.id}>
                <EvidenceBadge type="Coach Observation" />
                <p className="coach-note">{o.note}</p>
                <p className="muted">
                  Coach Rahul · reviewed practice observation
                </p>
              </div>
            ))}
            <Link className="text-link" href="/parent/reports">
              Read the progress report <ArrowRight size={16} />
            </Link>
          </Card>
          <div className="parent-mini-grid">
            <Card>
              <CheckCircle2 size={22} />
              <h2>{player.attendance}%</h2>
              <p>Recorded attendance</p>
            </Card>
            <Card>
              <Compass size={22} />
              <h2>Developing</h2>
              <p>Receiving on the move</p>
            </Card>
          </div>
        </>
      ) : screen === "progress" ? (
        <>
          <Card>
            <SectionTitle title="What Aarav is working on" />
            {records.goals.map((g) => (
              <div className="goal-card" key={g.id}>
                <h3>{g.title}</h3>
                <Badge tone="green">{g.status}</Badge>
                <p>{g.criteria}</p>
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle
              title="Player Path"
              subtitle="Receiving · progress through practice"
            />
            <div className="pathway">
              {records.paths[0]?.stages.map((s, i) => (
                <div
                  className={`path-stage stage-${s.status.replaceAll(" ", "-")}`}
                  key={s.title}
                >
                  <span className="stage-number">
                    {s.status === "Completed" ? "✓" : i + 1}
                  </span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle title="What the evidence shows" />
            {records.evidence.map((e) => (
              <div className="goal-card" key={e.id}>
                <EvidenceBadge type={e.type} />
                <h3>{e.title}</h3>
                <p>{e.note}</p>
                <Badge tone="green">Coach Reviewed</Badge>
              </div>
            ))}
            <h3>What comes next?</h3>
            <p>
              Apply scanning in a smaller space with light pressure. Coach Rahul
              will review progress on 14 October.
            </p>
          </Card>
        </>
      ) : screen === "schedule" ? (
        sessions.map((s) => (
          <Card key={s.id}>
            <Badge tone="green">{s.squad}</Badge>
            <h2>{s.title}</h2>
            <p>
              {s.date} · {s.time}
            </p>
            <p>{s.venue}</p>
            <div className="notice green">
              <strong>Aarav’s objective</strong>
              <p>{s.focuses[player.id] ?? player.goal}</p>
            </div>
          </Card>
        ))
      ) : screen === "reports" ? (
        records.reports.map((r) => (
          <Card key={r.id}>
            <SectionTitle title={r.period} />
            <Badge tone="green">Coach Approved</Badge>
            {r.sections.map((s) => (
              <div className="report-section" key={s.question}>
                <h3>{s.question}</h3>
                <p>{s.answer}</p>
              </div>
            ))}
            <p className="muted">Coach Rahul · {r.remarks}</p>
          </Card>
        ))
      ) : screen === "fees" ? (
        <Card>
          <SectionTitle title="Demo fee account" />
          {records.charges.map((c) => (
            <div className="list-row" key={c.id}>
              <div>
                <h3>{c.label}</h3>
                <p>Due {c.dueDate}</p>
              </div>
              <strong>₹{c.amount.toLocaleString("en-IN")}</strong>
            </div>
          ))}
          {records.payments.map((p) => (
            <div className="list-row" key={p.id}>
              <div>
                <h3>Recorded payment</h3>
                <p>{p.reference}</p>
              </div>
              <Badge tone="green">₹{p.amount.toLocaleString("en-IN")}</Badge>
            </div>
          ))}
          <p className="notice amber">
            Demo records only. Online payment and receipts are Not Connected.
          </p>
        </Card>
      ) : screen === "messages" ? (
        <>
          <Badge tone="amber">Approved previews · Not Sent</Badge>
          {records.messages.length ? (
            records.messages.map((m) => (
              <Card key={m.id}>
                <h3>{m.template}</h3>
                <p>{m.body}</p>
                <Badge tone="green">Approved preview</Badge>
              </Card>
            ))
          ) : (
            <Card>
              <h3>No approved updates yet</h3>
              <p>
                Coach drafts appear here after approval. No messages are sent by
                this demo.
              </p>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <SectionTitle title="More" />
            {[
              ["Reports", "/parent/reports", FileText],
              ["Fees", "/parent/fees", CheckCircle2],
              ["Schedule", "/parent/schedule", CalendarDays],
            ].map(([label, href, Icon]) => {
              const C = Icon as typeof FileText;
              return (
                <Link
                  className="list-row"
                  href={href as string}
                  key={label as string}
                >
                  <C size={22} />
                  <strong>{label as string}</strong>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </Card>
          <Card>
            <h3>Neha Sharma</h3>
            <p>Linked player · Aarav Sharma</p>
            <p className="muted">
              This is a demo parent preview. Authentication and account
              management are Not Connected.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
