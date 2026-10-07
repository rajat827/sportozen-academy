"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, CalendarDays } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Avatar,
  Badge,
  Card,
  SectionTitle,
  EvidenceBadge,
} from "@/components/ui/primitives";
import { PlayerPath } from "@/features/development/plan";
export function PlayerProfile({
  playerId,
  coach = false,
}: {
  playerId: string;
  coach?: boolean;
}) {
  const { data } = useAcademy();
  const [tab, setTab] = useState("Overview");
  const player = data.players.find((p) => p.id === playerId);
  if (!player) return <p className="empty">Player not found.</p>;
  const guardian = data.guardians.find((g) => g.id === player.guardianId);
  const evidence = data.evidence.filter((e) => e.playerId === playerId);
  const goals = data.goals.filter((g) => g.playerId === playerId);
  return (
    <>
      <Link
        className="back-link"
        href={coach ? "/coach/players" : "/owner/players"}
      >
        <ArrowLeft size={16} />
        Back to players
      </Link>
      <div className="profile-header">
        <Avatar name={player.name} large />
        <div>
          <p className="eyebrow">PLAYER PROFILE</p>
          <h1>{player.name}</h1>
          <p>
            {player.squad} · {player.position} · {player.dominantSide}-sided ·{" "}
            {player.branch}
          </p>
        </div>
        <Badge tone="green">{player.status}</Badge>
        <Link
          className="button primary"
          href={`/coach/development/${playerId}`}
        >
          Development plan <ArrowRight size={16} />
        </Link>
      </div>
      <div className="tabs" role="tablist" aria-label="Player profile sections">
        {[
          "Overview",
          "Development",
          "Sessions",
          "Evidence",
          "Attendance",
          "Reports",
          "Fees",
          "Documents",
          "Communication",
        ].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === "Overview" ? (
          <>
            <div className="profile-stats">
              <Card>
                <span>Current goal</span>
                <h3>{player.goal}</h3>
                <EvidenceBadge type="Coach Observation" />
              </Card>
              <Card>
                <span>Attendance</span>
                <strong className="big-number">
                  {player.attendance === null
                    ? "Not Recorded"
                    : `${player.attendance}%`}
                </strong>
                <Badge tone="blue">Calculated · recorded history</Badge>
              </Card>
              <Card>
                <span>Development stage</span>
                <h3>{goals[0]?.status ?? "Not Recorded"}</h3>
                <p>Next review · 14 October</p>
              </Card>
              <Card>
                <span>Fee account</span>
                <h3>{player.feeStatus}</h3>
                <p>Monthly youth programme</p>
              </Card>
            </div>
            <div className="two-columns">
              <div>
                <Card>
                  <SectionTitle
                    title="A clear next step"
                    href={`/coach/development/${playerId}`}
                    action="View plan"
                  />
                  {goals.map((g) => (
                    <div className="list-row" key={g.id}>
                      <span className="goal-number">✓</span>
                      <div>
                        <strong>{g.title}</strong>
                        <p>{g.criteria}</p>
                        <Badge tone="green">{g.status}</Badge>
                      </div>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle title="Latest coach update" />
                  {data.observations
                    .filter((o) => o.playerId === playerId)
                    .map((o) => (
                      <div key={o.id}>
                        <EvidenceBadge type="Coach Observation" />
                        <p className="coach-note">“{o.note}”</p>
                        <p className="muted">
                          Coach Rahul · training observation
                        </p>
                      </div>
                    ))}
                  {!data.observations.some((o) => o.playerId === playerId) && (
                    <p>Not Recorded</p>
                  )}
                </Card>
              </div>
              <div>
                <Card>
                  <SectionTitle title="Player & guardian" />
                  <dl className="details">
                    <dt>Age</dt>
                    <dd>{player.age} years</dd>
                    <dt>Squad</dt>
                    <dd>{player.squad}</dd>
                    <dt>Guardian</dt>
                    <dd>{guardian?.name ?? "Not Recorded"}</dd>
                    <dt>
                      <Mail size={14} /> Email
                    </dt>
                    <dd>{guardian?.email ?? "Not Recorded"}</dd>
                  </dl>
                </Card>
                <Card>
                  <SectionTitle title="Upcoming training" />
                  {data.sessions
                    .filter((s) => s.squad === player.squad)
                    .map((s) => (
                      <Link
                        className="list-row"
                        key={s.id}
                        href={`/coach/sessions/${s.id}/desk`}
                      >
                        <CalendarDays size={20} />
                        <div>
                          <strong>{s.title}</strong>
                          <p>
                            {s.date} · {s.time}
                          </p>
                        </div>
                        <ArrowRight size={16} />
                      </Link>
                    ))}
                </Card>
              </div>
            </div>
          </>
        ) : tab === "Development" ? (
          <PlayerPath playerId={playerId} />
        ) : tab === "Evidence" ? (
          <Card>
            <SectionTitle title="Evidence library" />
            {evidence.map((e) => (
              <Link
                className="evidence-link"
                key={e.id}
                href={`/coach/evidence/${e.id}`}
              >
                <h3>{e.title}</h3>
                <EvidenceBadge type={e.type} />
                <p>{e.note}</p>
                <Badge>{e.status}</Badge>
              </Link>
            ))}
          </Card>
        ) : tab === "Sessions" ? (
          <Card>
            {data.sessions
              .filter((s) => s.squad === player.squad)
              .map((s) => (
                <Link
                  className="list-row"
                  key={s.id}
                  href={`/coach/sessions/${s.id}/desk`}
                >
                  <CalendarDays size={20} />
                  <div>
                    <h3>{s.title}</h3>
                    <p>
                      {s.date} · {s.focuses[playerId]}
                    </p>
                  </div>
                </Link>
              ))}
          </Card>
        ) : tab === "Attendance" ? (
          <Card>
            <SectionTitle
              title="Attendance history"
              subtitle="Unmarked is separate from Absent"
            />
            {data.attendance
              .filter((a) => a.playerId === playerId)
              .map((a) => (
                <div className="list-row" key={a.id}>
                  <strong>
                    {data.sessions.find((s) => s.id === a.sessionId)?.title}
                  </strong>
                  <Badge tone={a.status === "Present" ? "green" : "amber"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
          </Card>
        ) : tab === "Reports" ? (
          <Card>
            {data.reports
              .filter((r) => r.playerId === playerId)
              .map((r) => (
                <Link
                  className="list-row"
                  href={`/coach/reports/${r.id}`}
                  key={r.id}
                >
                  <h3>{r.period}</h3>
                  <Badge>{r.status}</Badge>
                </Link>
              ))}
          </Card>
        ) : tab === "Fees" ? (
          <Card>
            <SectionTitle title="Demo financial records" />
            {data.charges
              .filter((c) => c.playerId === playerId)
              .map((c) => (
                <div className="list-row" key={c.id}>
                  <strong>{c.label}</strong>
                  <span>₹{c.amount.toLocaleString("en-IN")}</span>
                  <Badge>{player.feeStatus}</Badge>
                </div>
              ))}
            <Link className="text-link" href="/owner/fees">
              View fee ledger
            </Link>
          </Card>
        ) : tab === "Documents" ? (
          <Card>
            <h2>Documents</h2>
            <p className="empty">Document storage is Not Connected.</p>
          </Card>
        ) : (
          <Card>
            <SectionTitle title="Communication drafts" />
            {data.messages
              .filter((m) => m.playerId === playerId)
              .map((m) => (
                <div className="list-row" key={m.id}>
                  <div>
                    <h3>{m.template}</h3>
                    <p>{m.body}</p>
                  </div>
                  <Badge>{m.status} · Not Sent</Badge>
                </div>
              ))}
            <Link className="text-link" href="/owner/communication">
              Open draft centre
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
