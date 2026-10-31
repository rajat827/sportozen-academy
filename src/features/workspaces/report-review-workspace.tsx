"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Save,
  Target,
  Users,
} from "lucide-react";
import { ReportPreview } from "@/features/reports/report-preview";
import type { ReportViewModel } from "@/domain/report";
import type {
  WorkspacePayload,
  WorkspacePlayer,
  WorkspaceReport,
} from "@/domain/workspace";
import {
  academyDate,
  playerBatch,
  portalDate,
} from "@/services/portal-records";
import { reportPresentation } from "@/services/reports/report-presentation";
import { reportReviewEligibility } from "@/services/reports/report-review";
import { sessionFocus } from "@/services/session-display";
import {
  confirmUnsavedChanges,
  useUnsavedChanges,
} from "@/hooks/use-unsaved-changes";
import { ReportEditor, SecureReportDownload } from "./plan-and-report";
import type { PortalController, PortalNavigate } from "./portal-types";
import "./report-review-workspace.css";

const monthFor = (report: WorkspaceReport) =>
  report.reportingPeriod?.key ??
  /^(\d{4}-\d{2})/.exec(report.period)?.[1] ??
  "";
const queueStates = [
  "Draft",
  "Needs Review",
  "Ready for Approval",
  "Approved",
] as const;

/** Reuse the frozen monthly source model; editable feedback never creates evidence. */
export function monthlyReviewModel(
  report: WorkspaceReport,
  data: WorkspacePayload,
  player: WorkspacePlayer,
  fields = {
    observation: report.observation,
    nextStep: report.nextStep,
    closingNote: report.closingNote,
  },
): ReportViewModel | undefined {
  if (report.status === "Approved") return report.snapshot;
  const source = report.monthlySources?.model;
  if (!source) return undefined;
  const coach = data.members.find(
    (member) => member.userId === player.coachId,
  )?.name;
  return {
    ...source,
    reportId: report.id,
    playerId: player.id,
    academy: data.academy.name,
    player: player.name,
    ageCategory: player.ageCategory,
    squad: playerBatch(data, player),
    coach,
    period: report.period,
    status: report.status,
    externalDelivery: "Not sent",
    demo: data.academy.demo,
    brandAccent: data.academy.brandAccent,
    logoData: data.academy.logoData,
    nextStep: fields.nextStep,
    note: fields.closingNote,
    ...(source.presentationData
      ? {
          presentationData: {
            ...source.presentationData,
            coachEvaluation: fields.observation.trim()
              ? [fields.observation]
              : [],
          },
        }
      : {}),
    evidence: [
      ...source.evidence,
      ...(fields.observation.trim()
        ? [{ text: fields.observation, source: "Recorded draft commentary" }]
        : []),
    ],
  };
}

export function MonthlyReportReviewWorkspace({
  workspace: w,
  playerId,
  reportId = "",
  onNavigate,
  onClose,
}: {
  onClose: () => void;
  workspace: PortalController;
  playerId: string;
  reportId?: string;
  onNavigate: PortalNavigate;
}) {
  const data = w.data!;
  const params = useSearchParams();
  const reports = data.records.report.filter(
    (report) =>
      report.monthlySources &&
      report.academyId === data.academy.id &&
      report.sportId === "football",
  );
  const requested = reports.find(
    (report) =>
      report.id === reportId && (!playerId || report.playerId === playerId),
  );
  const month =
    params.get("reportMonth") && params.get("reportMonth") !== "all"
      ? params.get("reportMonth")!
      : requested
        ? monthFor(requested)
        : (reports.map(monthFor).filter(Boolean).sort().at(-1) ??
          academyDate(data).slice(0, 7));
  const batchValue = params.get("reportBatch") ?? "";
  const batch = data.records.squad.find(
    (squad) => squad.id === batchValue || squad.name === batchValue,
  );
  const [queueFilter, setQueueFilter] = useState("");
  // The selection card is rebuilt whenever the reviewed report changes, so
  // disclosure state and keyboard focus are kept here rather than in the DOM.
  const [queueOpen, setQueueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const restoreFocus = useRef("");
  const query = params.toString();
  useEffect(() => {
    const id = restoreFocus.current;
    restoreFocus.current = "";
    if (id) document.getElementById(id)?.focus();
  }, [query]);
  const [mobileView, setMobileView] = useState("Edit");
  const [notice, setNotice] = useState("");
  // Saving or approving bumps the record version and rebuilds the editor, so
  // its outcome message is kept here for the same report.
  const [editorNotice, setEditorNotice] = useState({ reportId: "", text: "" });
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const reportKey = (item: WorkspaceReport) =>
    `${item.id}-${item.recordVersion ?? 0}`;
  const reportFor = (id: string) =>
    reports.find(
      (report) =>
        report.playerId === id &&
        monthFor(report) === month &&
        report.status !== "Approved",
    ) ??
    reports.find(
      (report) => report.playerId === id && monthFor(report) === month,
    );
  const batchPlayers =
    batchValue && !batch
      ? []
      : data.records.player.filter(
          (player) =>
            !batch ||
            player.squadId === batch.id ||
            batch.playerIds.includes(player.id),
        );
  const rowState = (report?: WorkspaceReport) =>
    report
      ? reportReviewEligibility(report, {
          dirty: false,
          reviewed: reviewedKeys.has(reportKey(report)),
          sourceReview: data.monthlyReportReview?.[report.id],
        }).queueStatus
      : "Draft";
  const rows = batchPlayers.filter(
    (player) => !queueFilter || rowState(reportFor(player.id)) === queueFilter,
  );
  const selectedPlayer = playerId
    ? batchPlayers.find((player) => player.id === playerId)
    : requested
      ? batchPlayers.find((player) => player.id === requested.playerId)
      : rows[0];
  const report = selectedPlayer
    ? reportId
      ? requested &&
        requested.playerId === selectedPlayer.id &&
        monthFor(requested) === month
        ? requested
        : undefined
      : reportFor(selectedPlayer.id)
    : undefined;
  const choose = (context: Record<string, string>) => {
    if (!w.busy && confirmUnsavedChanges()) {
      setNotice("");
      setEditorNotice({ reportId: "", text: "" });
      const active = document.activeElement;
      restoreFocus.current =
        active instanceof HTMLElement && active.id.startsWith("rr-control-")
          ? active.id
          : "";
      onNavigate("reports", {
        prepare: "monthly",
        reportMonth: month,
        ...context,
      });
    }
  };
  const prepare = async (ids: string[]) => {
    if (!ids.length || !confirmUnsavedChanges()) return;
    const result = await w.period<WorkspaceReport[]>({
      requestId: crypto.randomUUID(),
      action: "monthlyPrepare",
      data: { playerIds: ids, month },
    });
    setNotice(
      result
        ? `${result.length} monthly draft${result.length === 1 ? "" : "s"} prepared or reopened. Review each player individually.`
        : "Draft preparation was not confirmed. Existing reports are retained.",
    );
    if (result && selectedPlayer)
      onNavigate("reports", {
        prepare: "monthly",
        reportMonth: month,
        player: selectedPlayer.id,
        report:
          result.find((item) => item.playerId === selectedPlayer.id)?.id ??
          report?.id ??
          "",
      });
  };
  const eligibleBatch = batchPlayers
    .filter(
      (player) =>
        !reports.some(
          (item) =>
            item.playerId === player.id &&
            monthFor(item) === month &&
            item.status === "Approved",
        ),
    )
    .map((player) => player.id);
  const selection = (
    <section className="rr-card rr-selection" aria-labelledby="rr-select-title">
      <h2 id="rr-select-title">
        <span>1</span>Select player and month
      </h2>
      <div className="rr-selection-fields">
        <label>
          Player
          <select
            id="rr-control-player"
            aria-label="Report player"
            value={selectedPlayer?.id ?? ""}
            disabled={w.busy}
            onChange={(event) =>
              choose({ player: event.target.value, report: "" })
            }
          >
            <option value="">Choose an authorised player</option>
            {batchPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
                {player.ageCategory ? ` (${player.ageCategory})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reporting month
          <input
            id="rr-control-month"
            type="month"
            aria-label="Reporting period filter"
            required
            value={month}
            disabled={w.busy}
            onChange={(event) => {
              if (event.target.value)
                choose({ reportMonth: event.target.value, report: "" });
            }}
          />
        </label>
      </div>
      <div className="rr-batch-controls">
        <label>
          Training batch
          <select
            id="rr-control-batch"
            aria-label="Report batch filter"
            value={batch?.id ?? ""}
            disabled={w.busy}
            onChange={(event) =>
              choose({
                reportBatch: event.target.value,
                player: "",
                report: "",
              })
            }
          >
            <option value="">All authorised players</option>
            {data.records.squad.map((squad) => (
              <option key={squad.id} value={squad.id}>
                {squad.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={w.busy || !batch || !eligibleBatch.length}
          onClick={() => prepare(eligibleBatch)}
        >
          <Users size={16} />
          Prepare batch drafts
        </button>
      </div>
      <details
        className="rr-queue"
        open={queueOpen}
        onToggle={(event) => setQueueOpen(event.currentTarget.open)}
      >
        <summary>Batch review queue · {rows.length} players</summary>
        <label>
          Queue status
          <select
            aria-label="Monthly report queue status"
            value={queueFilter}
            onChange={(event) => {
              if (!w.busy && confirmUnsavedChanges())
                setQueueFilter(event.target.value);
            }}
          >
            <option value="">All review states</option>
            {queueStates.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
        <div className="rr-queue-rows">
          {rows.map((player) => (
            <button
              key={player.id}
              id={`rr-control-queue-${player.id}`}
              aria-current={
                selectedPlayer?.id === player.id ? "true" : undefined
              }
              onClick={() => choose({ player: player.id, report: "" })}
            >
              <span>{player.name}</span>
              <small>{rowState(reportFor(player.id))}</small>
            </button>
          ))}
        </div>
        <p>
          Batch preparation never approves reports. Approved reports remain
          unchanged.
        </p>
      </details>
      {selectedPlayer && (
        <details
          className="rr-report-history"
          open={historyOpen}
          onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
        >
          <summary>Report history</summary>
          <div className="rr-queue-rows">
            {reports
              .filter((item) => item.playerId === selectedPlayer.id)
              .toSorted((a, b) => b.period.localeCompare(a.period))
              .map((item) => (
                <button
                  key={item.id}
                  id={`rr-control-history-${item.id}`}
                  onClick={() =>
                    choose({
                      report: item.id,
                      player: item.playerId,
                      reportMonth: monthFor(item),
                    })
                  }
                >
                  <span>
                    {item.reportingPeriod?.key ?? item.period}
                    {item.correctionOf ? " · Reviewed correction" : ""}
                  </span>
                  <small>{item.status}</small>
                </button>
              ))}
          </div>
        </details>
      )}
      {reportId && !report && (
        <p role="alert">
          The requested report is unavailable for this player and reporting
          period. Select a player or month to reopen the correct report.
        </p>
      )}
      {!report && selectedPlayer && !reportId && (
        <button
          className="button primary"
          disabled={w.busy}
          onClick={() => prepare([selectedPlayer.id])}
        >
          Prepare monthly draft
        </button>
      )}
      {report && (
        <p className="rr-draft-state">
          <CheckCircle2 size={17} />
          {report.status === "Approved"
            ? "Approved report · historical snapshot"
            : "Saved draft ready for individual review"}
        </p>
      )}
      {!selectedPlayer && (
        <p>Select an authorised player to review a report.</p>
      )}
    </section>
  );
  const otherReports = selectedPlayer ? (
    <details
      className="rr-other-reports"
      open={!!reportId && !reports.some((item) => item.id === reportId)}
    >
      <summary>Other recorded development reports</summary>
      <ReportEditor
        key={selectedPlayer.id}
        workspace={w}
        player={selectedPlayer}
        sportId="football"
      />
    </details>
  ) : null;
  return (
    <section
      className="report-review-workspace"
      aria-labelledby="monthly-review-heading"
    >
      <header className="rr-heading">
        <div>
          <h1 id="monthly-review-heading">
            Prepare &amp; Review Monthly Report
          </h1>
          <p>
            Use completed sessions, attendance and coaching observations. Review
            and edit the draft before approving.
          </p>
        </div>
        <div className="rr-heading-actions">
          <button className="button secondary" onClick={onClose}>
            <ArrowLeft size={16} />
            Back to Reports
          </button>
          <button
            className="button secondary"
            onClick={() => {
              if (confirmUnsavedChanges())
                onNavigate("players", { player: selectedPlayer?.id ?? "" });
            }}
          >
            Back to Players
          </button>
        </div>
      </header>
      <div
        className="rr-mobile-tabs"
        role="tablist"
        aria-label="Monthly report workspace"
      >
        {["Edit", "Preview"].map((view) => (
          <button
            key={view}
            role="tab"
            id={`rr-tab-${view}`}
            aria-selected={mobileView === view}
            aria-controls={`rr-${view.toLowerCase()}`}
            tabIndex={mobileView === view ? 0 : -1}
            onKeyDown={(event) => {
              const next =
                event.key === "Home"
                  ? "Edit"
                  : event.key === "End"
                    ? "Preview"
                    : event.key === "ArrowLeft" || event.key === "ArrowRight"
                      ? view === "Edit"
                        ? "Preview"
                        : "Edit"
                      : undefined;
              if (next) {
                event.preventDefault();
                setMobileView(next);
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(`#rr-tab-${next}`)
                  ?.focus();
              }
            }}
            onClick={() => setMobileView(view)}
          >
            {view}
          </button>
        ))}
      </div>
      {report && selectedPlayer ? (
        <MonthlyReviewEditor
          key={`${report.id}-${report.recordVersion}`}
          workspace={w}
          report={report}
          player={selectedPlayer}
          onNavigate={onNavigate}
          mobileView={mobileView}
          setMobileView={setMobileView}
          selection={
            <>
              {selection}
              {notice && (
                <p className="rr-notice" role="status">
                  {notice}
                </p>
              )}
            </>
          }
          otherReports={otherReports}
          notice={editorNotice.reportId === report.id ? editorNotice.text : ""}
          setNotice={(text) => setEditorNotice({ reportId: report.id, text })}
          reviewed={reviewedKeys.has(reportKey(report))}
          setReviewed={(value) =>
            setReviewedKeys((previous) => {
              const next = new Set(previous);
              if (value) next.add(reportKey(report));
              else next.delete(reportKey(report));
              return next;
            })
          }
        />
      ) : (
        <div className={`rr-columns rr-mobile-${mobileView.toLowerCase()}`}>
          <div
            id="rr-edit"
            role="tabpanel"
            aria-labelledby="rr-tab-Edit"
            className="rr-edit-column"
          >
            {selection}
            {notice && (
              <p className="rr-notice" role="status">
                {notice}
              </p>
            )}
            <section className="rr-card rr-empty">
              <FileText size={26} />
              <h2>No monthly draft for this selection</h2>
              <p>
                Prepare a draft from actual academy records. Missing
                observations will be shown honestly.
              </p>
            </section>
            {otherReports}
          </div>
          <aside
            id="rr-preview"
            role="tabpanel"
            aria-labelledby="rr-tab-Preview"
            className="rr-preview-column rr-card"
          >
            <h2>Live report preview</h2>
            <p>
              Choose a player and prepare a monthly draft to preview the
              recorded information.
            </p>
          </aside>
        </div>
      )}
      {w.error && !report && (
        <p className="rr-global-error" role="alert">
          {w.error}
        </p>
      )}
    </section>
  );
}

function MonthlyReviewEditor({
  workspace: w,
  report,
  player,
  onNavigate,
  mobileView,
  setMobileView,
  selection,
  otherReports,
  notice,
  setNotice,
  reviewed,
  setReviewed,
}: {
  notice: string;
  setNotice: (text: string) => void;
  reviewed: boolean;
  setReviewed: (value: boolean) => void;
  selection: ReactNode;
  otherReports: ReactNode;
  workspace: PortalController;
  report: WorkspaceReport;
  player: WorkspacePlayer;
  onNavigate: PortalNavigate;
  mobileView: string;
  setMobileView: (view: string) => void;
}) {
  const data = w.data!;
  const [fields, setFields] = useState({
    observation: report.observation,
    nextStep: report.nextStep,
    closingNote: report.closingNote,
  });
  const dirty =
    fields.observation !== report.observation ||
    fields.nextStep !== report.nextStep ||
    fields.closingNote !== report.closingNote;
  useUnsavedChanges(dirty);
  const approved = report.status === "Approved";
  const model = monthlyReviewModel(report, data, player, fields);
  const p = model ? reportPresentation(model) : undefined;
  const sourceReview = data.monthlyReportReview?.[report.id];
  const eligibility = reportReviewEligibility(report, {
    dirty,
    reviewed,
    busy: w.busy,
    sourceReview,
  });
  const sessions = data.records.session.filter((session) =>
    report.monthlySources?.sessionIds.includes(session.id),
  );
  const evidence = data.records.evidence.filter(
    (entry) =>
      report.monthlySources?.evidenceIds.includes(entry.id) &&
      entry.status === "REVIEWED",
  );
  const recordedFocuses = [
    ...new Set(
      [
        ...(model?.focus.split(/;\s*/) ?? []),
        ...sessions.flatMap((session) => [
          session.objectives.find((item) => item.playerId === player.id)?.goal,
          session.sharedObjective?.goal,
          session.theme,
        ]),
        ...data.records.drill
          .filter((drill) =>
            model?.activities.some((activity) => activity.drillId === drill.id),
          )
          .map((drill) => drill.focusArea),
      ]
        .map((value) => value?.trim())
        .filter(
          (value): value is string =>
            !!value && !/^No training focus recorded/i.test(value),
        ),
    ),
  ];
  const edit = (key: keyof typeof fields, value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
    setReviewed(false);
    setNotice("");
  };
  const save = async (regenerate = false) => {
    const result = await w.period<WorkspaceReport>({
      requestId: crypto.randomUUID(),
      action: "monthlyEdit",
      id: report.id,
      expectedVersion: report.recordVersion,
      data: { ...fields, regenerate },
    });
    setNotice(
      result
        ? "Monthly draft saved."
        : "Draft was not saved. Your changes are retained; review the error and retry.",
    );
    if (result) setReviewed(false);
  };
  const approve = async () => {
    const result = await w.action<WorkspaceReport>(
      "approveReport",
      report.id,
      { expectedVersion: report.recordVersion },
      true,
    );
    setNotice(
      result
        ? "Report approved. Parent publication remains a separate action."
        : "Approval was not confirmed. Review the server message before retrying.",
    );
  };
  const showPreview = () => {
    setMobileView("Preview");
    requestAnimationFrame(() => {
      document.getElementById("rr-tab-Preview")?.focus();
      document
        .getElementById("rr-preview")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  const preview = (
    <aside
      id="rr-preview"
      role="tabpanel"
      aria-labelledby="rr-tab-Preview"
      className="rr-preview-column"
      aria-label="Live report preview"
    >
      <header className="rr-preview-heading">
        <div>
          <h2>Live report preview</h2>
          <p>
            {approved
              ? "The approved report is a preserved historical snapshot."
              : "This preview updates with your draft. Save and review before approval."}
          </p>
        </div>
        <span>
          {approved ? "Approved" : dirty ? "Unsaved preview" : "Saved draft"}
        </span>
      </header>
      {model ? (
        <ReportPreview model={model} variant="document" />
      ) : (
        <p>No saved monthly source model is available.</p>
      )}
    </aside>
  );
  return (
    <div className={`rr-columns rr-mobile-${mobileView.toLowerCase()}`}>
      <div
        id="rr-edit"
        role="tabpanel"
        aria-labelledby="rr-tab-Edit"
        className="rr-edit-column"
      >
        {selection}
        <section
          className="rr-card rr-evidence"
          aria-labelledby="rr-evidence-title"
        >
          <div className="rr-card-heading">
            <h2 id="rr-evidence-title">
              <span>2</span>Review training evidence
            </h2>
            <button
              className="button secondary"
              onClick={() => {
                if (confirmUnsavedChanges())
                  onNavigate("training", { player: player.id });
              }}
            >
              View sessions
            </button>
          </div>
          <p className="rr-evidence-caption">
            {approved ? "Approved snapshot summary" : "Saved draft summary"}
          </p>
          <div className="rr-evidence-stats">
            <div>
              <CalendarDays size={23} />
              <strong>{p?.attendance?.total ?? sessions.length}</strong>
              <span>Completed sessions</span>
            </div>
            <div>
              <CheckCircle2 size={23} />
              <strong>{p?.attendance?.present ?? "—"}</strong>
              <span>Attended</span>
            </div>
            <div>
              <Target size={23} />
              <strong>{model?.activities.length ?? 0}</strong>
              <span>Recorded activities</span>
            </div>
            <div>
              <ClipboardCheck size={23} />
              <strong>{report.monthlySources?.evidenceIds.length ?? 0}</strong>
              <span>Reviewed observations</span>
            </div>
          </div>
          {!sessions.length && (
            <p className="rr-evidence-warning">
              No completed sessions are recorded for this period. No attendance
              or improvement is inferred.
            </p>
          )}
          {!report.monthlySources?.evidenceIds.length && (
            <p className="rr-evidence-warning">
              Insufficient reviewed evidence to describe improvement. Keep the
              feedback specific to recorded facts.
            </p>
          )}
          {sourceReview?.sourcesCurrent === false && !approved && (
            <p className="rr-evidence-warning">
              {sourceReview.reason ||
                "Recorded sources changed. Refresh the draft sources under Advanced, then review again."}{" "}
              Session table shows current records; refresh to update the saved
              report.
            </p>
          )}
          {!!sessions.length && (
            <div className="rr-session-table">
              <table>
                <caption>
                  Current recorded sessions in this reporting period
                </caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Session focus</th>
                    <th>Attendance</th>
                    <th>Reviewed coach observations</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const attendance = data.records.attendance.find(
                      (entry) =>
                        entry.sessionId === session.id &&
                        entry.playerId === player.id,
                    );
                    const notes = evidence.filter(
                      (entry) =>
                        entry.sessionId === session.id &&
                        entry.playerId === player.id,
                    );
                    return (
                      <tr key={session.id}>
                        <td>{portalDate(session.startAt, data)}</td>
                        <td>
                          {session.objectives.find(
                            (entry) => entry.playerId === player.id,
                          )?.goal || sessionFocus(session)}
                        </td>
                        <td>
                          {attendance?.status.toLowerCase() ?? "Unmarked"}
                        </td>
                        <td>
                          {notes.map((entry) => entry.observation).join(" ") ||
                            "No reviewed observation recorded"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <details className="rr-source-details">
            <summary>Evidence Details</summary>
            <p>
              Staff only. Saved source references support this draft; technical
              details are omitted from the family report.
            </p>
            <p>
              Period: {report.reportingPeriod?.startAt} inclusive to{" "}
              {report.reportingPeriod?.endAt} exclusive ·{" "}
              {report.reportingPeriod?.timezone}
            </p>
            {report.monthlySources?.model.evidence.map((entry, index) => (
              <article key={index}>
                <p>{entry.text}</p>
                <small>
                  {entry.source}
                  {entry.reference ? ` · ${entry.reference}` : ""}
                </small>
              </article>
            ))}
            <p>
              Completed-session references:{" "}
              {report.monthlySources?.sessionIds.join(", ") || "None recorded"}
            </p>
            <p>
              Reviewed evidence references:{" "}
              {report.monthlySources?.evidenceIds.join(", ") || "None recorded"}
            </p>
          </details>
        </section>
        {approved ? (
          <section className="rr-card rr-approved">
            <h2>Approved monthly report</h2>
            <p>
              Approved content cannot be edited in place. Prepare an explicit
              reviewed correction to change this historical report.
            </p>
            <div className="rr-actions">
              <SecureReportDownload
                academyId={data.academy.id}
                report={report}
              />
              <button
                className="button secondary"
                disabled={w.busy}
                onClick={async () => {
                  const result = await w.period<WorkspaceReport[]>({
                    requestId: crypto.randomUUID(),
                    action: "monthlyPrepare",
                    data: {
                      playerIds: [player.id],
                      month: report.reportingPeriod!.key,
                      correctionOf: report.id,
                    },
                  });
                  if (result?.[0])
                    onNavigate("reports", {
                      prepare: "monthly",
                      report: result[0].id,
                      player: player.id,
                      reportMonth: report.reportingPeriod!.key,
                    });
                }}
              >
                Prepare reviewed monthly correction
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  onNavigate("messages", {
                    player: player.id,
                    sourceReport: report.id,
                  })
                }
              >
                Prepare parent update
              </button>
            </div>
          </section>
        ) : (
          <>
            <section
              className="rr-card rr-feedback"
              aria-labelledby="rr-feedback-title"
            >
              <h2 id="rr-feedback-title">
                <span>3</span>Coach feedback
              </h2>
              <div className="rr-feedback-fields">
                <label>
                  Coach’s observation
                  <textarea
                    aria-label="Coach commentary"
                    disabled={w.busy}
                    value={fields.observation}
                    rows={3}
                    maxLength={5000}
                    onChange={(event) =>
                      edit("observation", event.target.value)
                    }
                    placeholder="Describe only what the reviewed records show."
                  />
                </label>
                <div>
                  <label>
                    Next development focus
                    <select
                      aria-label="Next development focus"
                      disabled={w.busy}
                      value={
                        recordedFocuses.includes(fields.nextStep)
                          ? fields.nextStep
                          : "__custom__"
                      }
                      onChange={(event) => {
                        if (event.target.value !== "__custom__")
                          edit("nextStep", event.target.value);
                      }}
                    >
                      <option value="__custom__">
                        Custom wording / saved priorities
                      </option>
                      {recordedFocuses.map((focus) => (
                        <option key={focus}>{focus}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Next development priorities
                    <textarea
                      aria-label="Next development priorities"
                      disabled={w.busy}
                      value={fields.nextStep}
                      rows={3}
                      maxLength={5000}
                      onChange={(event) => edit("nextStep", event.target.value)}
                      placeholder="Choose a football focus or record your own next step."
                    />
                  </label>
                </div>
              </div>
              <label>
                Closing note (optional)
                <textarea
                  aria-label="Closing note"
                  disabled={w.busy}
                  value={fields.closingNote}
                  rows={2}
                  maxLength={10000}
                  onChange={(event) => edit("closingNote", event.target.value)}
                />
              </label>
            </section>
            <section
              className="rr-card rr-approval"
              aria-labelledby="rr-approval-title"
            >
              <h2 id="rr-approval-title">
                <span>4</span>Review and approve
              </h2>
              <label className="rr-review-check">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={dirty || w.busy}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                I reviewed the player, period, attendance, recorded sessions,
                sources and coaching feedback.
              </label>
              <p
                id="rr-approval-reason"
                className="rr-next-action"
                role="status"
              >
                {eligibility.reason}
              </p>
              <div className="rr-actions rr-desktop-approval-actions">
                <button
                  className="button secondary"
                  disabled={w.busy}
                  onClick={() => save()}
                >
                  <Save size={16} />
                  Save draft
                </button>
                <button
                  className="button secondary rr-preview-action"
                  onClick={showPreview}
                >
                  <FileText size={16} />
                  Preview report
                </button>
                <button
                  className="button primary"
                  disabled={!eligibility.canApprove}
                  aria-describedby="rr-approval-reason"
                  onClick={approve}
                >
                  Approve report
                </button>
              </div>
              <p className="rr-publication-note">
                Approval preserves the report. Publishing to parents and
                external delivery are separate actions.
              </p>
              <details className="rr-advanced">
                <summary>Advanced</summary>
                <p>
                  Refresh this draft’s saved source snapshot from current
                  academy records. Review all evidence again afterwards. Your
                  coach feedback is retained.
                </p>
                <button
                  className="button secondary"
                  disabled={w.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Replace this draft’s saved source snapshot with current academy records? Your coach feedback is retained, and you must review the refreshed evidence before approval.",
                      )
                    )
                      save(true);
                  }}
                >
                  Refresh draft source snapshot
                </button>
              </details>
            </section>
          </>
        )}
        {notice && (
          <p className="rr-notice" role="status">
            {notice}
          </p>
        )}
        {w.error && (
          <p className="rr-global-error" role="alert">
            {w.error}
          </p>
        )}
        {!approved && (
          <div
            className="rr-mobile-primary-actions"
            aria-label="Monthly report actions"
          >
            <p>{eligibility.reason}</p>
            <div>
              <button
                className="button secondary"
                disabled={w.busy}
                onClick={() => save()}
              >
                Save draft
              </button>
              <button className="button secondary" onClick={showPreview}>
                Preview report
              </button>
              <button
                className="button primary"
                disabled={!eligibility.canApprove}
                aria-describedby="rr-approval-reason"
                onClick={approve}
              >
                Approve report
              </button>
            </div>
          </div>
        )}
        {otherReports}
      </div>
      {preview}
    </div>
  );
}
