"use client";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { playerBatch } from "@/services/portal-records";
import { reportMatchesPeriod } from "@/services/report-period-filter";
import {
  reportPresentation,
  formatRecordedDate,
} from "@/services/reports/report-presentation";
import type {
  WorkspacePayload,
  WorkspacePlayer,
  WorkspaceReport,
} from "@/domain/workspace";
import type { ReportViewModel } from "@/domain/report";
import { MonthlyReports } from "./period-plans";
import { ReportEditor, SecureReportDownload } from "./plan-and-report";
import { ReportPreview } from "@/features/reports/report-preview";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { PortalController, PortalNavigate } from "./portal-types";

const pageSize = 10;
const monthKey = (report: WorkspaceReport) =>
  report.reportingPeriod?.key ??
  /^(\d{4}-(?:0[1-9]|1[0-2]))(?:\s|$)/.exec(report.period)?.[1] ??
  "";
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

export function PortalReports({
  workspace: w,
  playerId,
  reportId = "",
  onNavigate,
  prepare = false,
}: {
  workspace: PortalController;
  playerId: string;
  reportId?: string;
  onNavigate: PortalNavigate;
  prepare?: boolean;
}) {
  const d = w.data!,
    params = useSearchParams(),
    parent = ["PARENT", "SUPPORT"].includes(d.membership.role);
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(
      () =>
        Math.floor(
          Math.max(
            0,
            d.records.player.findIndex((player) => player.id === playerId),
          ) / pageSize,
        ) + 1,
    ),
    [editor, setEditor] = useState(false);
  const returnFocus = useRef<HTMLButtonElement | null>(null),
    createButton = useRef<HTMLButtonElement | null>(null);
  const authorisedReports = d.records.report
    .filter(
      (report) =>
        report.academyId === d.academy.id &&
        report.sportId === "football" &&
        (!parent || (report.status === "Approved" && !!report.snapshot)),
    )
    .sort((a, b) => b.period.localeCompare(a.period));
  const requestedReport = reportId
    ? authorisedReports.find(
        (report) => report.id === reportId && report.playerId === playerId,
      )
    : undefined;
  const periodParameter = params.get("reportMonth");
  const period =
    periodParameter === "all"
      ? ""
      : (periodParameter ??
        (requestedReport
          ? monthKey(requestedReport)
          : (authorisedReports.map(monthKey).filter(Boolean).sort().at(-1) ??
            "")));
  const batch = params.get("reportBatch") ?? "",
    status = params.get("reportStatus") ?? "";
  const inPeriod = authorisedReports.filter((report) =>
    reportMatchesPeriod(report, period),
  );
  const reportFor = (id: string) =>
    inPeriod.find(
      (report) =>
        report.playerId === id && (!status || report.status === status),
    );
  const rows = d.records.player.filter(
    (player) =>
      (!search ||
        player.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())) &&
      (!batch || playerBatch(d, player) === batch) &&
      (!status ||
        (status === "none"
          ? !inPeriod.some((report) => report.playerId === player.id)
          : !!reportFor(player.id))),
  );
  const player = playerId
    ? rows.find((player) => player.id === playerId)
    : !reportId
      ? rows[0]
      : undefined;
  const selectedReport = player
    ? reportId
      ? inPeriod.find(
          (report) =>
            report.id === reportId &&
            report.playerId === player.id &&
            (!status || report.status === status),
        )
      : reportFor(player.id)
    : undefined;
  const model =
    selectedReport &&
    (selectedReport.status === "Approved"
      ? selectedReport.snapshot
      : !parent
        ? draftModel(selectedReport, d, player)
        : undefined);
  const allowedTabs = parent
    ? ["Report", "Activity", "History"]
    : ["Report", "Evidence", "Activity", "History"];
  const requestedTab = params.get("reportTab") ?? "Report",
    activeTab = allowedTabs.includes(requestedTab) ? requestedTab : "Report";
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize)),
    currentPage = Math.min(page, totalPages),
    listed = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const historical = player
    ? authorisedReports.filter((report) => report.playerId === player.id)
    : [];
  const approved =
    selectedReport?.status === "Approved" && !!selectedReport.snapshot;
  const changeFilter = (context: Record<string, string>) => {
    if (!confirmUnsavedChanges()) return;
    setPage(1);
    onNavigate("reports", { ...context, report: "", reportTab: "Report" });
  };
  const selectReport = (report: WorkspaceReport) => {
    onNavigate("reports", {
      player: report.playerId,
      report: report.id,
      reportMonth: monthKey(report) || "all",
      reportStatus: "",
      reportTab: "Report",
    });
  };
  const openEditor = (event: MouseEvent<HTMLButtonElement>) => {
    returnFocus.current = event.currentTarget;
    setEditor(true);
  };
  const closeEditor = () => {
    if (confirmUnsavedChanges()) {
      setEditor(false);
      if (prepare) onNavigate("reports", { prepare: "" });
    }
  };
  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>, name: string) => {
    const index = allowedTabs.indexOf(name);
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % allowedTabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + allowedTabs.length) % allowedTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? allowedTabs.length - 1
              : -1;
    if (target < 0) return;
    event.preventDefault();
    onNavigate("reports", { reportTab: allowedTabs[target] });
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [target]?.focus();
  };
  return (
    <>
      <section
        className="reports-workspace portal-reports-layout"
        aria-labelledby="player-reports-title"
      >
        <header className="reports-heading">
          <div>
            <h1 id="player-reports-title">
              {parent ? "Progress & Reports" : "Player Reports"}
            </h1>
            <p>
              {parent
                ? "Your child’s approved development reports."
                : "Create, review and share monthly development reports."}
            </p>
          </div>
          {!parent && (
            <button
              className="button primary reports-create"
              ref={createButton}
              onClick={openEditor}
            >
              <Plus size={18} />
              Create Report
            </button>
          )}
        </header>
        <div className="reports-filters">
          <label className="reports-month">
            <CalendarDays size={17} aria-hidden="true" />
            <input
              type="month"
              aria-label="Reporting period filter"
              value={period}
              onChange={(event) =>
                changeFilter({ reportMonth: event.target.value || "all" })
              }
            />
          </label>
          <select
            aria-label="Report batch filter"
            value={batch}
            onChange={(event) =>
              changeFilter({ reportBatch: event.target.value })
            }
          >
            <option value="">All Batches</option>
            {[
              ...new Set(
                d.records.player.map((player) => playerBatch(d, player)),
              ),
            ]
              .filter(Boolean)
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
          <select
            aria-label="Report status filter"
            value={status}
            onChange={(event) =>
              changeFilter({ reportStatus: event.target.value })
            }
          >
            <option value="">All Report Status</option>
            <option>Approved</option>
            {!parent && (
              <>
                <option>Draft</option>
                <option>Revision Requested</option>
                <option value="none">No report</option>
              </>
            )}
          </select>
          {!parent && (
            <details className="reports-tools">
              <summary>More report tools</summary>
              <div>
                <button onClick={openEditor}>Prepare monthly reports</button>
                <button onClick={openEditor}>
                  Other recorded development reports
                </button>
                <details>
                  <summary>Batch report summary</summary>
                  {d.records.squad.map((squad) => (
                    <div className="reports-batch-summary" key={squad.id}>
                      <strong>{squad.name}</strong>
                      <span>
                        {squad.playerIds.length} roster players ·{" "}
                        {
                          inPeriod.filter((report) =>
                            squad.playerIds.includes(report.playerId),
                          ).length
                        }{" "}
                        reports in this period
                      </span>
                      <button
                        onClick={() =>
                          changeFilter({ reportBatch: squad.name })
                        }
                      >
                        View batch reports
                      </button>
                    </div>
                  ))}
                </details>
              </div>
            </details>
          )}
        </div>
        {w.error && (
          <p className="reports-feedback" role="alert">
            {w.error}
          </p>
        )}
        <div className="reports-workspace-layout">
          <aside className="reports-player-list" aria-label="Report players">
            <header>
              <h2>Players ({rows.length})</h2>
              <label>
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Search report players"
                  placeholder="Search players…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </header>
            <div className="reports-player-rows">
              {listed.map((item) => {
                const report = reportFor(item.id);
                return (
                  <button
                    className={`reports-player-row ${item.id === player?.id ? "selected" : ""}`}
                    key={item.id}
                    aria-current={item.id === player?.id ? "true" : undefined}
                    onClick={() =>
                      onNavigate("reports", {
                        player: item.id,
                        report: report?.id ?? "",
                        reportTab: "Report",
                        reportMonth: period || "all",
                      })
                    }
                  >
                    <span className="reports-player-avatar" aria-hidden="true">
                      {initials(item.name)}
                    </span>
                    <span className="reports-player-row-copy">
                      <strong>{item.name}</strong>
                      <span>{item.ageCategory || playerBatch(d, item)}</span>
                    </span>
                    <span
                      className={`reports-player-status ${report?.status === "Approved" ? "approved" : "draft"}`}
                    >
                      {report?.status ?? "No report"}
                    </span>
                  </button>
                );
              })}
              {!rows.length && (
                <div className="reports-empty">
                  <h3>No players match this filter</h3>
                  <p>Choose another batch, status or search.</p>
                </div>
              )}
            </div>
            <footer className="reports-player-pagination">
              <button
                aria-label="Previous report page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <span aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>
              <button
                aria-label="Next report page"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={17} />
              </button>
              <small>
                {rows.length ? (currentPage - 1) * pageSize + 1 : 0}–
                {Math.min(currentPage * pageSize, rows.length)} of {rows.length}{" "}
                players
              </small>
            </footer>
          </aside>
          <section
            className="reports-selected-panel"
            aria-label="Selected player report"
          >
            <div
              className="reports-detail-tabs"
              role="tablist"
              aria-label="Selected report views"
            >
              {allowedTabs.map((name) => (
                <button
                  key={name}
                  id={`reports-tab-${name.toLowerCase()}`}
                  role="tab"
                  aria-selected={activeTab === name}
                  aria-controls={`reports-panel-${name.toLowerCase()}`}
                  tabIndex={activeTab === name ? 0 : -1}
                  onKeyDown={(event) => tabKeys(event, name)}
                  onClick={() => onNavigate("reports", { reportTab: name })}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="reports-report-actions">
              {!parent && (
                <button
                  className="button secondary"
                  disabled={!player}
                  onClick={openEditor}
                >
                  <Pencil size={14} />
                  Edit / Review
                </button>
              )}
              {approved && (
                <SecureReportDownload
                  academyId={d.academy.id}
                  report={selectedReport!}
                />
              )}
              {!parent && (
                <button
                  className="button secondary"
                  disabled={!approved}
                  onClick={() =>
                    approved &&
                    onNavigate("messages", {
                      player: player!.id,
                      sourceReport: selectedReport!.id,
                    })
                  }
                >
                  <Send size={14} />
                  Send to Parent
                </button>
              )}
            </div>
            {allowedTabs.map((name) => (
              <div
                key={name}
                id={`reports-panel-${name.toLowerCase()}`}
                role="tabpanel"
                aria-labelledby={`reports-tab-${name.toLowerCase()}`}
                hidden={name !== activeTab}
                tabIndex={0}
                className="reports-tab-panel"
              >
                {name === activeTab &&
                  (activeTab === "History" && player ? (
                    <section className="reports-history">
                      <h2>Report history · {player.name}</h2>
                      {historical.map((report) => (
                        <div key={report.id}>
                          <div>
                            <strong>
                              {report.snapshot
                                ? reportPresentation(report.snapshot)
                                    .periodLabel
                                : report.period}
                            </strong>
                            <span>
                              {report.status}
                              {report.correctionOf
                                ? " · Reviewed correction"
                                : ""}
                            </span>
                          </div>
                          <button onClick={() => selectReport(report)}>
                            Open report
                          </button>
                        </div>
                      ))}
                      {!historical.length && (
                        <p>No reports recorded for this player.</p>
                      )}
                    </section>
                  ) : !selectedReport ? (
                    <div className="reports-empty">
                      <FileText size={35} />
                      <h2>
                        {reportId
                          ? "Report unavailable in this selection"
                          : "No report for this selection"}
                      </h2>
                      <p>
                        {player
                          ? "Choose another reporting period or prepare a draft from actual records."
                          : "Select an authorised player from the current filter."}
                      </p>
                      {!parent && player && (
                        <button className="button primary" onClick={openEditor}>
                          Prepare Monthly Report
                        </button>
                      )}
                    </div>
                  ) : activeTab === "Evidence" && !parent ? (
                    <ReportEvidence report={selectedReport} />
                  ) : activeTab === "Activity" ? (
                    <ReportActivity model={model} />
                  ) : model ? (
                    <ReportPreview model={model} variant="inline" />
                  ) : (
                    <section className="reports-recorded-draft">
                      <h2>
                        {selectedReport.status === "Approved"
                          ? "Approved snapshot unavailable"
                          : "Recorded draft · coach review required"}
                      </h2>
                      <h3>Recorded observation</h3>
                      <p>
                        {selectedReport.observation ||
                          "No observation recorded."}
                      </p>
                      <h3>Next development step</h3>
                      <p>
                        {selectedReport.nextStep || "No next step recorded."}
                      </p>
                      <h3>Coach’s note</h3>
                      <p>{selectedReport.closingNote || "No note recorded."}</p>
                    </section>
                  ))}
              </div>
            ))}
          </section>
        </div>
      </section>
      <Dialog.Root
        open={!parent && (editor || prepare)}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="portal-overlay" />
          <Dialog.Content
            className="portal-dialog portal-report-workflow"
            onPointerDownOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              closeEditor();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              (returnFocus.current ?? createButton.current)?.focus();
            }}
          >
            <Dialog.Title>Prepare & Review Reports</Dialog.Title>
            <Dialog.Description>
              Use actual attendance and reviewed training evidence. Approval and
              private publication remain separate.
            </Dialog.Description>
            <button
              className="portal-icon close"
              aria-label="Close report workflow"
              onClick={closeEditor}
            >
              <X />
            </button>
            <label>
              Report player
              <select
                aria-label="Report player"
                value={player?.id ?? ""}
                onChange={(event) => {
                  if (confirmUnsavedChanges()) {
                    setSearch("");
                    setPage(
                      Math.floor(
                        Math.max(
                          0,
                          d.records.player.findIndex(
                            (player) => player.id === event.target.value,
                          ),
                        ) / pageSize,
                      ) + 1,
                    );
                    onNavigate("reports", {
                      player: event.target.value,
                      report: "",
                      reportBatch: "",
                      reportStatus: "",
                    });
                  }
                }}
              >
                <option value="">Choose an authorised player</option>
                {d.records.player.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {player && (
              <div className="portal-workflow">
                <MonthlyReports
                  key={`monthly-${player.id}`}
                  workspace={w}
                  playerId={player.id}
                />
                <details>
                  <summary>Other recorded development reports</summary>
                  <ReportEditor
                    key={`recorded-${player.id}`}
                    workspace={w}
                    player={player}
                    sportId="football"
                  />
                </details>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function draftModel(
  report: WorkspaceReport,
  workspace: WorkspacePayload,
  player?: WorkspacePlayer,
): ReportViewModel | undefined {
  const saved = report.monthlySources?.model;
  return saved && player
    ? {
        ...saved,
        reportId: report.id,
        playerId: player.id,
        academy: workspace.academy.name,
        player: player.name,
        ageCategory: player.ageCategory,
        squad: playerBatch(workspace, player),
        period: report.period,
        status: report.status,
        externalDelivery: "Not sent",
        demo: workspace.academy.demo,
        brandAccent: workspace.academy.brandAccent,
        logoData: workspace.academy.logoData,
        note: report.closingNote,
        nextStep: report.nextStep,
        ...(saved.presentationData
          ? {
              presentationData: {
                ...saved.presentationData,
                coachEvaluation: report.observation ? [report.observation] : [],
              },
            }
          : {}),
        evidence: [
          ...saved.evidence,
          ...(report.observation
            ? [
                {
                  text: report.observation,
                  source: "Recorded draft commentary",
                },
              ]
            : []),
        ],
      }
    : undefined;
}
function ReportEvidence({ report }: { report: WorkspaceReport }) {
  const model = report.snapshot ?? report.monthlySources?.model;
  return (
    <section className="reports-evidence">
      <h2>Evidence details</h2>
      <p>
        Staff view of the saved report sources. These records are not shown in
        the parent report.
      </p>
      {model?.evidence.map((entry, index) => (
        <article key={index}>
          <h3>{entry.label || entry.source}</h3>
          {entry.headline && <strong>{entry.headline}</strong>}
          <p>{entry.text}</p>
          <dl>
            <div>
              <dt>{report.snapshot?.labels?.source ?? "Source"}</dt>
              <dd>{entry.source}</dd>
            </div>
            {entry.reference && (
              <div>
                <dt>Reference</dt>
                <dd>{entry.reference}</dd>
              </div>
            )}
          </dl>
        </article>
      ))}
      {!!report.monthlySources && (
        <details>
          <summary>Stored source record IDs</summary>
          <p>
            Sessions:{" "}
            {report.monthlySources.sessionIds.join(", ") || "None recorded"}
          </p>
          <p>
            Evidence:{" "}
            {report.monthlySources.evidenceIds.join(", ") || "None recorded"}
          </p>
        </details>
      )}
      {!!report.sourceEvidenceIds?.length && !report.monthlySources && (
        <details>
          <summary>Stored source record IDs</summary>
          <p>Evidence: {report.sourceEvidenceIds.join(", ")}</p>
        </details>
      )}
      {!model?.evidence.length && (
        <p>No saved source evidence is available for this report.</p>
      )}
    </section>
  );
}
function ReportActivity({ model }: { model?: ReportViewModel }) {
  return (
    <section className="reports-activity">
      <h2>Recorded practice activities</h2>
      {model?.activities.length ? (
        model.activities.map((activity, index) => (
          <article key={index}>
            <span>{index + 1}</span>
            <div>
              <h3>{activity.name}</h3>
              <p>{activity.purpose}</p>
              {activity.activity && <p>{activity.activity}</p>}
              {activity.cue && <p>Coaching cue: {activity.cue}</p>}
            </div>
          </article>
        ))
      ) : (
        <p>No activity details were recorded in this report.</p>
      )}
      {model?.reviewDate && (
        <p>Review date: {formatRecordedDate(model.reviewDate)}</p>
      )}
    </section>
  );
}
