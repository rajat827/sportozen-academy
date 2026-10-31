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
import { ReportPreview } from "@/features/reports/report-preview";
import { ReportDownload } from "@/features/reports/report-download";
import { parentReportModels } from "@/services/reports/report-view-model";
import { ParentPlan } from "@/features/parent-development/parent-plan";
import { ParentPreferences } from "@/features/parent-development/preferences";
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
          <ParentPlan compact />
          <Card>
            <SectionTitle
              title="Training in the fictional demo week"
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
              <p>See approved plan</p>
            </Card>
          </div>
        </>
      ) : screen === "progress" ? (
        <>
          <ParentPlan />
          <Card>
            <SectionTitle title="Approved evidence" />
            {records.evidence.map((e) => (
              <div className="goal-card" key={e.id}>
                <EvidenceBadge type={e.type} />
                <h3>{e.title}</h3>
                <p>{e.note}</p>
                <Badge>Coach Reviewed</Badge>
              </div>
            ))}
            {!records.evidence.length && (
              <p>NEEDS_MORE_EVIDENCE: no approved evidence available.</p>
            )}
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
        parentReportModels(data, "g1").map((model) => (
          <div key={model.reportId}>
            <div className="parent-report-actions">
              <ReportDownload model={model} />
            </div>
            <ReportPreview model={model} />
          </div>
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
          <Badge tone="amber">Fictional demo records only · NOT_SENT</Badge>
          <p>
            These records illustrate the experience. No provider delivery has
            occurred. New coach drafts remain internal.
          </p>
          {records.messages.length ? (
            records.messages.map((m) => (
              <Card key={m.id}>
                <h3>{m.template}</h3>
                <p>{m.body}</p>
                <Badge>Fictional demo record · NOT_SENT</Badge>
              </Card>
            ))
          ) : (
            <Card>
              <h3>No fictional demo messages</h3>
              <p>
                Coach drafts remain internal even after approval. No messages
                are delivered in this demo.
              </p>
            </Card>
          )}
        </>
      ) : (
        <>
          <ParentPreferences />
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
