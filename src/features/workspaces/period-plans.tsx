"use client";
import { useState } from "react";
import { Button, Card, Badge } from "@/components/ui/primitives";
import { useWorkspace } from "@/hooks/use-workspace";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePrivateSourceAnchor } from "@/hooks/use-private-source-anchor";
import type { WeeklyPlan } from "@/domain/communication";
import type { WorkspaceReport } from "@/domain/workspace";
import { weeklyWording } from "@/services/communication/period-rules";
import { privateSourcePath } from "@/services/communication/private-source-path";
import { portalSourceAvailable } from "@/services/portal-source-selection";
import { templateParameters } from "@/services/communication/whatsapp-templates";
import { ReportPreview } from "@/features/reports/report-preview";
import { SecureReportDownload } from "./plan-and-report";
type Controller = ReturnType<typeof useWorkspace>;
function command(
  w: Controller,
  action: string,
  data: unknown,
  id?: string,
  expectedVersion = 0,
) {
  return w.period({
    requestId: crypto.randomUUID(),
    action,
    data,
    id,
    expectedVersion,
  });
}
export function WeeklyPlans({
  workspace: w,
  playerId,
  sourceId,
}: {
  workspace: Controller;
  playerId?: string;
  sourceId?: string;
}) {
  const d = w.data!,
    parent = d.membership.role === "PARENT",
    support = d.membership.role === "SUPPORT";
  const [squadId, setSquad] = useState(""),
    [week, setWeek] = useState("");
  const sourceAvailable =
    !sourceId || portalSourceAvailable(d, playerId ?? "", sourceId, "WEEKLY");
  usePrivateSourceAnchor(
    sourceId && sourceAvailable ? "weekly-" + sourceId : undefined,
  );
  if (!sourceAvailable)
    return (
      <Card>
        <h2>Weekly plan unavailable</h2>
        <p>
          This source is not available for the selected player in your current
          academy and role.
        </p>
      </Card>
    );
  return (
    <>
      {!parent && !support && !sourceId && (
        <Card>
          <h2>Prepare weekly plan</h2>
          <p>
            Use the recorded squad sessions and each player’s personal focus. No
            report or video is required.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await command(w, "weeklyPrepare", { squadId, week });
            }}
          >
            <label>
              Squad
              <select
                aria-label="Squad"
                required
                value={squadId}
                onChange={(e) => setSquad(e.target.value)}
              >
                <option value="">Choose squad</option>
                {d.records.squad.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Week starting Monday
              <input
                required
                type="date"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
              />
            </label>
            <Button disabled={w.busy}>Prepare player previews</Button>
          </form>
        </Card>
      )}
      {d.records.weekly
        .filter(
          (r) =>
            (!playerId || r.playerId === playerId) &&
            (!sourceId || r.id === sourceId),
        )
        .map((r) => (
          <section
            id={"weekly-" + r.id}
            tabIndex={-1}
            aria-label={
              "Weekly plan for " +
              r.content.playerName +
              " · " +
              r.content.period.key
            }
            key={r.id}
          >
            <WeeklyReview
              key={`${r.id}-${r.recordVersion}`}
              workspace={w}
              plan={r}
              parent={parent || support}
            />
          </section>
        ))}
      <p className="text-muted">AI Video Analysis — Coming soon</p>
    </>
  );
}
function WeeklyReview({
  workspace: w,
  plan: r,
  parent,
}: {
  workspace: Controller;
  plan: WeeklyPlan;
  parent: boolean;
}) {
  const [focus, setFocus] = useState(r.content.personalFocus),
    [observe, setObserve] = useState(r.content.observe),
    [home, setHome] = useState(r.content.homePractice),
    [verified, setVerified] = useState(false);
  const dirty =
    focus !== r.content.personalFocus ||
    observe !== r.content.observe ||
    home !== r.content.homePractice;
  useUnsavedChanges(dirty);
  const c = r.snapshot ?? r.content;
  let preview = "";
  try {
    preview = templateParameters(
      "WEEKLY",
      w.data!.academy.name,
      c.period.key + (r.correctionOf ? " · Reviewed correction" : ""),
      typeof window !== "undefined"
        ? window.location.origin +
            privateSourcePath(w.data!.academy.id, r.playerId, r.id, "WEEKLY")
        : "Private schedule link",
      c,
    ).rendered;
  } catch (e) {
    preview = e instanceof Error ? e.message : "Template cannot render";
  }
  return (
    <Card>
      <h3>
        {c.playerName} · {c.period.key}
      </h3>
      <Badge>{r.status}</Badge>
      {r.correctionOf && <Badge>Reviewed correction</Badge>}
      <p>
        {c.period.startAt} to {c.period.endAt} · {c.period.timezone}
      </p>
      <p>{weeklyWording(c)}</p>
      {c.sessions.map((s) => (
        <p key={s.id}>
          {s.theme && (
            <>
              <strong>{s.theme}</strong> ·{" "}
            </>
          )}
          {new Date(s.startAt).toLocaleString("en-GB", {
            timeZone: s.timezone,
          })}{" "}
          –{" "}
          {new Date(s.endAt).toLocaleTimeString("en-GB", {
            timeZone: s.timezone,
          })}{" "}
          · {s.location} · {s.timezone}
        </p>
      ))}
      {c.activities.map((a) => (
        <p key={a.id}>
          <strong>{a.name}</strong>: intended to support {a.purpose}
        </p>
      ))}
      {c.homePractice && (
        <p>Optional approved home practice: {c.homePractice}</p>
      )}
      {c.missing.map((m) => (
        <p className="notice amber" key={m}>
          {m}
        </p>
      ))}
      {!parent && (
        <>
          <details>
            <summary>WhatsApp template rendering and source versions</summary>
            <p>{preview}</p>
            <p>
              Local template draft. Actual sending requires Meta approval of
              this exact body and language.
            </p>
            <p>
              Plan {c.sourcePlanId ?? "No active plan"} · version{" "}
              {c.sourcePlanVersion ?? "Not recorded"}
            </p>
            {c.sessions.map((s) => (
              <p key={s.id}>
                Session {s.id} · version {s.version}
              </p>
            ))}
          </details>
          {!r.issuedAt ? (
            <>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await command(
                    w,
                    "weeklyEdit",
                    { personalFocus: focus, observe, homePractice: home },
                    r.id,
                    r.recordVersion,
                  );
                }}
              >
                <label>
                  Personal focus
                  <textarea
                    required
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                  />
                </label>
                <label>
                  What the coach will observe
                  <textarea
                    required
                    value={observe}
                    onChange={(e) => setObserve(e.target.value)}
                  />
                </label>
                <label>
                  Optional safe home practice
                  <textarea
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                  />
                </label>
                <Button disabled={w.busy || !dirty}>Save weekly draft</Button>
              </form>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                I reviewed this player’s sources, wording and authorised
                recipients
              </label>
              <Button
                disabled={
                  w.busy ||
                  dirty ||
                  !verified ||
                  !!c.missing.length ||
                  r.status === "APPROVED"
                }
                onClick={() =>
                  command(
                    w,
                    "weeklyApprove",
                    { verified: true },
                    r.id,
                    r.recordVersion,
                  )
                }
              >
                Approve weekly plan
              </Button>
              <Button
                variant="secondary"
                disabled={w.busy || dirty || r.status !== "APPROVED"}
                onClick={() =>
                  command(w, "weeklyPublish", {}, r.id, r.recordVersion)
                }
              >
                Publish in parent app
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              disabled={w.busy}
              onClick={() =>
                command(w, "weeklyCorrection", {
                  squadId: r.squadId,
                  week: c.period.key,
                  correctionOf: r.id,
                })
              }
            >
              Prepare deliberate correction
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
export function MonthlyReports({
  workspace: w,
  playerId,
}: {
  workspace: Controller;
  playerId: string;
}) {
  const [month, setMonth] = useState("");
  const [batch, setBatch] = useState(false);
  const reports = w.data!.records.report.filter(
    (r) => r.playerId === playerId && r.monthlySources,
  );
  return (
    <>
      <Card>
        <h2>Prepare monthly reports</h2>
        <p>
          Drafts use actual completed sessions, attendance and reviewed
          observations in {w.data!.academy.timezone}. Individual review is
          required.
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            await command(w, "monthlyPrepare", {
              playerIds: batch
                ? w.data!.records.player.map((p) => p.id)
                : [playerId],
              month,
            });
          }}
        >
          <label>
            Reporting month
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <Button disabled={w.busy}>Prepare monthly draft</Button>
          <label className="check-row">
            <input
              type="checkbox"
              checked={batch}
              onChange={(e) => setBatch(e.target.checked)}
            />
            Prepare drafts for all authorised players. Review each player
            separately.
          </label>
        </form>
      </Card>
      {reports.map((r) => (
        <MonthlyReview
          key={`${r.id}-${r.recordVersion}`}
          workspace={w}
          report={r}
        />
      ))}
    </>
  );
}
function MonthlyReview({
  workspace: w,
  report: r,
}: {
  workspace: Controller;
  report: WorkspaceReport;
}) {
  const [observation, setObservation] = useState(r.observation),
    [closingNote, setNote] = useState(r.closingNote),
    [nextStep, setNext] = useState(r.nextStep),
    [verified, setVerified] = useState(false),
    [regenerate, setRegenerate] = useState(false);
  const dirty =
    observation !== r.observation ||
    closingNote !== r.closingNote ||
    nextStep !== r.nextStep ||
    regenerate;
  useUnsavedChanges(dirty);
  return (
    <section className="secure-report-section">
      <Card>
        <h3>{r.period}</h3>
        <Badge>{r.status}</Badge>
        {r.status === "Approved" ? (
          <>
            <SecureReportDownload academyId={w.data!.academy.id} report={r} />
            <Button
              variant="secondary"
              disabled={w.busy}
              onClick={() =>
                command(w, "monthlyPrepare", {
                  playerIds: [r.playerId],
                  month: r.reportingPeriod!.key,
                  correctionOf: r.id,
                })
              }
            >
              Prepare reviewed monthly correction
            </Button>
          </>
        ) : (
          <>
            <details open>
              <summary>Recorded sources and attendance basis</summary>
              <p>
                Period: {r.reportingPeriod?.startAt} inclusive –{" "}
                {r.reportingPeriod?.endAt} exclusive
              </p>
              {r.monthlySources?.model.evidence.map((e, i) => (
                <p key={i}>
                  {e.text}{" "}
                  <small>
                    {e.source} · {e.reference}
                  </small>
                </p>
              ))}
              <p>
                Completed-session references:{" "}
                {r.monthlySources?.sessionIds.join(", ") || "None recorded"}
              </p>
            </details>
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                await command(
                  w,
                  "monthlyEdit",
                  { observation, closingNote, nextStep, regenerate },
                  r.id,
                  r.recordVersion,
                );
              }}
            >
              <label>
                Coach commentary
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </label>
              <label>
                Next development priorities
                <textarea
                  required
                  value={nextStep}
                  onChange={(e) => setNext(e.target.value)}
                />
              </label>
              <label>
                Closing note
                <textarea
                  value={closingNote}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={regenerate}
                  onChange={(e) => setRegenerate(e.target.checked)}
                />
                Regenerate source records when saving this draft
              </label>
              <Button disabled={w.busy}>Save monthly draft</Button>
            </form>
            <label className="check-row">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              I reviewed the player, period, attendance basis, sources and
              commentary
            </label>
            <Button
              disabled={w.busy || dirty || !verified}
              onClick={() =>
                w.action(
                  "approveReport",
                  r.id,
                  { expectedVersion: r.recordVersion },
                  true,
                )
              }
            >
              Approve monthly report
            </Button>
          </>
        )}
      </Card>
      {r.snapshot && <ReportPreview model={r.snapshot} />}
    </section>
  );
}
