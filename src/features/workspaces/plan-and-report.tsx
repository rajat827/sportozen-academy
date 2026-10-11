"use client";
import { useState } from "react";
import { Button, Card, Badge } from "@/components/ui/primitives";
import { operationalSports } from "@/config/sports/workspace-sports";
import type {
  WorkspacePlayer,
  WorkspacePlan,
  WorkspaceReport,
} from "@/domain/workspace";
import { useWorkspace } from "@/hooks/use-workspace";
import { ReportPreview } from "@/features/reports/report-preview";
import { reportFilename } from "@/services/reports/report-view-model";
type Controller = ReturnType<typeof useWorkspace>;
export function SecureReportDownload({
  academyId,
  report,
}: {
  academyId: string;
  report: WorkspaceReport;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <Button
        disabled={busy}
        variant="secondary"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch(
              `/api/workspaces/${academyId}/reports/${report.id}/pdf`,
              { cache: "no-store" },
            );
            if (!r.ok)
              throw new Error((await r.json()).error ?? "PDF unavailable.");
            const url = URL.createObjectURL(await r.blob()),
              a = document.createElement("a");
            a.href = url;
            a.download = reportFilename(report.snapshot!);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Could not generate PDF. Please retry.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Generating PDF…"
          : error
            ? "Retry PDF download"
            : "Download private PDF"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function PlayerPlanEditor({
  workspace: w,
  player,
  sportId,
}: {
  workspace: Controller;
  player: WorkspacePlayer;
  sportId: string;
}) {
  const data = w.data!,
    existing = data.records.plan.find(
      (p) => p.playerId === player.id && p.sportId === sportId,
    ),
    sport = operationalSports[sportId];
  const [plan, setPlan] = useState(
    existing ?? {
      playerId: player.id,
      sportId,
      coachId: player.coachId,
      focus: sport.skills[0],
      reason: "",
      drillIds: [] as string[],
      observe: "",
      homePractice: "",
      reviewDate: "",
      nextStep: "",
      status: "DRAFT" as const,
      privateNote: "",
    },
  );
  const set = (key: keyof WorkspacePlan, value: unknown) =>
    setPlan({ ...plan, [key]: value });
  const drills = data.records.drill.filter((d) => d.sportId === sportId);
  return (
    <Card>
      <h2>Individual development plan</h2>
      <p>
        {player.name} · {sport.name}. Progress is judged against this player’s
        own goal and reviewed evidence.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await w.save("plan", plan, existing?.id);
        }}
      >
        <label>
          Development focus
          <select
            value={plan.focus}
            onChange={(e) => set("focus", e.target.value)}
          >
            {sport.skills.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>
        <label>
          Why this focus
          <textarea
            required
            value={plan.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Assigned drills</legend>
          {drills.length ? (
            drills.map((d) => (
              <label className="check-row" key={d.id}>
                <input
                  type="checkbox"
                  checked={plan.drillIds.includes(d.id)}
                  onChange={(e) =>
                    set(
                      "drillIds",
                      e.target.checked
                        ? [...plan.drillIds, d.id]
                        : plan.drillIds.filter((id) => id !== d.id),
                    )
                  }
                />
                <span>
                  <strong>{d.name}</strong>
                  <small>{d.purpose}</small>
                </span>
              </label>
            ))
          ) : (
            <p>
              Copy an approved shared template or add an academy drill below.
            </p>
          )}
        </fieldset>
        <label>
          Coach will observe
          <textarea
            required
            value={plan.observe}
            onChange={(e) => set("observe", e.target.value)}
          />
        </label>
        <label>
          Optional safe home practice
          <textarea
            value={plan.homePractice}
            onChange={(e) => set("homePractice", e.target.value)}
          />
        </label>
        <label>
          Review date
          <input
            required
            type="date"
            value={plan.reviewDate}
            onChange={(e) => set("reviewDate", e.target.value)}
          />
        </label>
        <label>
          Next development step
          <textarea
            required
            value={plan.nextStep}
            onChange={(e) => set("nextStep", e.target.value)}
          />
        </label>
        <label>
          Plan status
          <select
            value={plan.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {[
              "DRAFT",
              "ACTIVE",
              "NEEDS_REVIEW",
              "CONTINUE",
              "ADAPT",
              "COMPLETED",
              "PAUSED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Private coach working note
          <textarea
            value={plan.privateNote}
            onChange={(e) => set("privateNote", e.target.value)}
          />
        </label>
        <Button disabled={w.busy}>Save individual plan</Button>
      </form>
      <details>
        <summary>Academy-owned drill library</summary>
        {sport.templates.map((template) => (
          <div className="list-row" key={template.id}>
            <div>
              <h3>{template.name}</h3>
              <p>{template.purpose}</p>
              <small>
                Platform shared template · copied into your academy curriculum
              </small>
            </div>
            <Button
              variant="secondary"
              disabled={w.busy}
              onClick={() =>
                w.save("drill", {
                  ...template,
                  sportId,
                  templateId: template.id,
                })
              }
            >
              Copy drill template
            </Button>
          </div>
        ))}
      </details>
      <p className="notice amber">
        AI analysis: unavailable. Sport configuration does not create an AI
        model.
      </p>
    </Card>
  );
}
export function ReportEditor({
  workspace: w,
  player,
  sportId,
}: {
  workspace: Controller;
  player: WorkspacePlayer;
  sportId: string;
}) {
  const data = w.data!,
    plan = data.records.plan.find(
      (p) => p.playerId === player.id && p.sportId === sportId,
    );
  const [period, setPeriod] = useState(""),
    [observation, setObservation] = useState(""),
    [closingNote, setNote] = useState(""),
    [verified, setVerified] = useState(""),
    [editingId, setEditingId] = useState<string | undefined>(),
    [source, setSource] = useState("COACH_OBSERVATION");
  const reports = data.records.report.filter(
    (r) => r.playerId === player.id && r.sportId === sportId,
  );
  return (
    <>
      <Card>
        <h2>Recorded development report</h2>
        {plan ? (
          <>
            <p>
              Source plan: {plan.focus}. Assigned drills: {plan.drillIds.length}
              . Review date: {plan.reviewDate || "To be confirmed"}.
            </p>
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                await w.save(
                  "report",
                  {
                    playerId: player.id,
                    sportId,
                    planId: plan.id,
                    period,
                    observation,
                    evidenceType: source,
                    nextStep: plan.nextStep,
                    closingNote,
                  },
                  editingId,
                );
                setEditingId(undefined);
              }}
            >
              <label>
                Reporting period
                <input
                  type="month"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </label>
              <label>
                Recorded observation
                <textarea
                  required
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </label>
              <label>
                Evidence source
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {[
                    "COACH_OBSERVATION",
                    "RAW_RECORD",
                    "CALCULATED_METRIC",
                    "MISSING_OR_UNCLEAR",
                    "AI_ESTIMATE",
                  ].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              {source === "AI_ESTIMATE" && (
                <p className="notice amber">
                  AI suggestion — coach review required. Automated AI analysis
                  is unavailable.
                </p>
              )}
              <label>
                Recorded closing note
                <textarea
                  value={closingNote}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <Button disabled={w.busy}>Save report draft</Button>
            </form>
          </>
        ) : (
          <p>Create a sport-specific player plan first.</p>
        )}
      </Card>
      {reports.map((report) => (
        <section key={report.id} className="secure-report-section">
          <div className="secure-report-actions">
            <Badge tone={report.status === "Approved" ? "green" : "amber"}>
              {report.status}
            </Badge>
            <Badge>External delivery: NOT_SENT</Badge>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(report.id);
                setPeriod(report.period);
                setObservation(report.observation);
                setSource(report.evidenceType);
                setNote(report.closingNote);
                setVerified("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Edit report draft
            </Button>
            {report.status !== "Approved" ? (
              <>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={verified === report.id}
                    onChange={(e) =>
                      setVerified(e.target.checked ? report.id : "")
                    }
                  />
                  I verified the player, sport plan, recorded observation,
                  drills and dates
                </label>
                <Button
                  disabled={verified !== report.id || w.busy}
                  onClick={() =>
                    w.action(
                      "approveReport",
                      report.id,
                      undefined,
                      verified === report.id,
                    )
                  }
                >
                  Approve recorded report
                </Button>
              </>
            ) : (
              <SecureReportDownload
                academyId={data.academy.id}
                report={report}
              />
            )}
          </div>
          {report.snapshot ? (
            <ReportPreview model={report.snapshot} />
          ) : (
            <Card>
              <h3>{report.period} · Draft source records</h3>
              <p>{report.observation}</p>
              <p>Source: {report.evidenceType}</p>
              <p>Next: {report.nextStep}</p>
              <p>{report.closingNote}</p>
              <p className="muted">
                This unapproved report is visible to assigned staff only.
              </p>
            </Card>
          )}
        </section>
      ))}
    </>
  );
}
export function ParentPlans({
  workspace: w,
  player,
  sportId,
}: {
  workspace: Controller;
  player: WorkspacePlayer;
  sportId: string;
}) {
  const data = w.data!,
    plans = data.records.plan.filter(
      (p) => p.playerId === player.id && p.sportId === sportId,
    ),
    reports = data.records.report.filter(
      (r) => r.playerId === player.id && r.sportId === sportId,
    );
  return (
    <>
      {plans.map((plan) => (
        <Card key={plan.id}>
          <p className="report-kicker">
            {operationalSports[sportId].name} · APPROVED PLAN SNAPSHOT
          </p>
          <h2>{plan.focus}</h2>
          <p>{plan.reason}</p>
          <h3>What the coach will observe</h3>
          <p>{plan.observe}</p>
          <h3>Optional home practice</h3>
          <p>{plan.homePractice || "No home practice recorded"}</p>
          <h3>Next development step</h3>
          <p>{plan.nextStep}</p>
          <p>Review date: {plan.reviewDate || "To be confirmed"}</p>
          <Badge>{plan.status}</Badge>
        </Card>
      ))}
      {!plans.length && (
        <Card>
          <h2>No approved development plan yet</h2>
          <p>
            Your linked player’s reviewed plan will appear after report
            approval.
          </p>
        </Card>
      )}
      {reports.map((report) => (
        <div key={report.id} className="secure-report-section">
          <SecureReportDownload academyId={data.academy.id} report={report} />
          <ReportPreview model={report.snapshot!} />
        </div>
      ))}
    </>
  );
}
