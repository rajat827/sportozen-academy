"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FileText,
  Share2,
  Users,
  ClipboardCheck,
  Target,
  TrendingUp,
  UserRound,
  X,
  Pencil,
  Send,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { currentPlayerPlan, playerBatch } from "@/services/portal-records";
import { reportMatchesPeriod } from "@/services/report-period-filter";
import {
  REPORT_PAGE_SIZE,
  reportListPage,
  reportPreviewExcerpt,
} from "@/services/report-list-preview";
import { MonthlyReports } from "./period-plans";
import { ReportEditor, SecureReportDownload } from "./plan-and-report";
import { ReportPreview } from "@/features/reports/report-preview";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePrivateSourceAnchor } from "@/hooks/use-private-source-anchor";
import type { PortalController, PortalNavigate } from "./portal-types";

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
    parent = ["PARENT", "SUPPORT"].includes(d.membership.role);
  const [tab, setTab] = useState("Player Reports"),
    [search, setSearch] = useState(""),
    [period, setPeriod] = useState(""),
    [batch, setBatch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(
      () =>
        Math.floor(
          Math.max(
            0,
            d.records.player.findIndex((p) => p.id === playerId),
          ) / REPORT_PAGE_SIZE,
        ) + 1,
    ),
    [editor, setEditor] = useState(false),
    [preview, setPreview] = useState(false);
  const player = playerId
    ? d.records.player.find((p) => p.id === playerId)
    : d.records.player[0];
  const reports = d.records.report
    .filter(
      (r) =>
        reportMatchesPeriod(r, period) &&
        (!status || r.status === status) &&
        (tab !== "Parent Reports" || r.status === "Approved"),
    )
    .sort((a, b) => b.period.localeCompare(a.period));
  const selectedReport = reportId
    ? d.records.report.find(
        (r) => r.id === reportId && r.playerId === player?.id,
      )
    : reports.find((r) => r.playerId === player?.id);
  const rows = d.records.player.filter(
    (p) =>
      (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
      (!batch || playerBatch(d, p) === batch),
  );
  const listing = reportListPage(rows, page),
    listedPlayers = new Set(rows.map((p) => p.id)),
    matchingCount = reports.filter((report) =>
      listedPlayers.has(report.playerId),
    ).length;
  const plan = player && currentPlayerPlan(d, player.id),
    snapshot = selectedReport?.snapshot;
  usePrivateSourceAnchor(
    reportId && selectedReport ? "report-" + reportId : undefined,
  );
  const closeEditor = () => {
    if (confirmUnsavedChanges()) {
      setEditor(false);
      if (prepare) onNavigate("reports", { prepare: "" });
    }
  };
  return (
    <>
      <div className="portal-detail-grid portal-reports-layout">
        <div>
          <div className="portal-page-heading">
            <div>
              <h1>{parent ? "Progress & Reports" : "Reports"}</h1>
              <p>Recorded practice, reviewed evidence and clear next steps.</p>
            </div>
            {!parent && (
              <div className="portal-actions">
                <button
                  className="button secondary"
                  onClick={() => setEditor(true)}
                >
                  <FileText size={16} /> Generate Report
                </button>
                <button
                  className="button primary"
                  disabled={
                    !selectedReport?.snapshot ||
                    selectedReport.status !== "Approved"
                  }
                  onClick={() =>
                    onNavigate("messages", {
                      player: player?.id,
                      sourceReport: selectedReport?.id,
                    })
                  }
                >
                  <Share2 size={16} /> Share with Parents
                </button>
              </div>
            )}
          </div>
          {!parent && (
            <nav className="portal-tabs" aria-label="Report views">
              {[
                "Player Reports",
                "Batch Reports",
                "Progress Overview",
                "Parent Reports",
              ].map((t) => (
                <button
                  className={tab === t ? "active" : ""}
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setPage(1);
                  }}
                >
                  {t}
                </button>
              ))}
            </nav>
          )}
          <div className="portal-stat-grid">
            {[
              {
                Icon: TrendingUp,
                n: d.records.player.filter((p) => p.status !== "INACTIVE")
                  .length,
                label: "Active Players",
                tone: "",
              },
              {
                Icon: ClipboardCheck,
                n: d.records.report.length,
                label: "Reports Recorded",
                tone: "purple",
              },
              {
                Icon: Users,
                n: d.records.report.filter((r) => r.status === "Approved")
                  .length,
                label: "Approved Reports",
                tone: "amber",
              },
              {
                Icon: FileText,
                n: d.records.report.filter((r) => r.status !== "Approved")
                  .length,
                label: "Awaiting Review",
                tone: "red",
              },
            ].map(({ Icon, n, label, tone }) => (
              <div className="portal-card portal-stat" key={label}>
                <span className={`portal-round ${tone}`}>
                  <Icon size={24} />
                </span>
                <span>
                  <strong>{n}</strong>
                  <p>{label}</p>
                </span>
              </div>
            ))}
          </div>
          <div className="portal-filters">
            <select
              aria-label="Report batch filter"
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Batches</option>
              {[...new Set(d.records.player.map((p) => playerBatch(d, p)))].map(
                (b) => (
                  <option value={b} key={b}>
                    {b}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Report status filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Report States</option>
              <option>Approved</option>
              <option>Draft</option>
              <option>Revision Requested</option>
            </select>
            <label className="portal-report-period">
              <CalendarDays size={16} />
              <input
                type="month"
                aria-label="Reporting period filter"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <input
              aria-label="Search report players"
              placeholder="Search players…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {tab === "Batch Reports" ? (
            <div className="portal-workflow">
              {d.records.squad
                .filter((s) => !batch || s.name === batch)
                .map((s) => (
                  <section className="portal-card" key={s.id}>
                    <h2>{s.name}</h2>
                    <p>
                      {s.playerIds.length} roster players ·{" "}
                      {
                        reports.filter((r) => s.playerIds.includes(r.playerId))
                          .length
                      }{" "}
                      reports in this filter
                    </p>
                    <button
                      className="portal-link"
                      onClick={() => {
                        setBatch(s.name);
                        setTab("Player Reports");
                        setPage(1);
                      }}
                    >
                      View batch player reports
                    </button>
                  </section>
                ))}
              {!d.records.squad.length && (
                <div className="portal-empty">
                  <h2>No football batches recorded</h2>
                  <p>
                    Create batches in Settings before planning shared training.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => onNavigate("settings", { tab: "sessions" })}
                  >
                    Academy setup
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="portal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Batch</th>
                    <th>Last Report</th>
                    <th>
                      {tab === "Progress Overview"
                        ? "Reviewed Evidence"
                        : "Period"}
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.items.map((p) => {
                    const report = reports.find((r) => r.playerId === p.id),
                      observations = d.records.evidence.filter(
                        (e) => e.playerId === p.id && e.status === "REVIEWED",
                      ).length;
                    return (
                      <tr
                        key={p.id}
                        className={p.id === player?.id ? "selected" : ""}
                      >
                        <td>
                          <button
                            className="portal-player-name"
                            onClick={() =>
                              onNavigate("reports", {
                                player: p.id,
                                report: report?.id ?? "",
                              })
                            }
                          >
                            <span className="portal-initials">
                              <UserRound size={21} />
                            </span>
                            <strong>{p.name}</strong>
                          </button>
                        </td>
                        <td>{p.ageCategory || playerBatch(d, p)}</td>
                        <td>
                          {report?.snapshot?.reviewDate ??
                            report?.period ??
                            "Not recorded"}
                        </td>
                        <td>
                          {tab === "Progress Overview"
                            ? `${observations} reviewed observations`
                            : (report?.period ?? "—")}
                        </td>
                        <td>
                          <span
                            className={`portal-status ${report?.status === "Approved" ? "" : "muted"}`}
                          >
                            {report?.status ?? "No report"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="portal-link"
                            onClick={() => {
                              onNavigate("reports", {
                                player: p.id,
                                report: report?.id ?? "",
                              });
                              if (!report && !parent) setEditor(true);
                            }}
                          >
                            {report ? "View" : "Prepare"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && (
                <div className="portal-empty">
                  <h2>No authorised players match this filter</h2>
                  <p>
                    Reports use actual completed sessions and coach-reviewed
                    observations. Missing evidence remains missing.
                  </p>
                </div>
              )}
              <div className="portal-table-footer portal-report-pagination">
                <span className="portal-report-counts">
                  <span>
                    {listing.first}–{listing.last} of {rows.length} players
                  </span>
                  <small>
                    {rows.length} authorised players · {matchingCount} matching
                    reports
                  </small>
                </span>
                <nav className="portal-actions" aria-label="Report pages">
                  <button
                    className="portal-icon"
                    type="button"
                    aria-label="Previous report page"
                    disabled={listing.page === 1}
                    onClick={() => setPage(listing.page - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span aria-live="polite">
                    Page {listing.page} of {listing.totalPages}
                  </span>
                  <button
                    className="portal-icon"
                    type="button"
                    aria-label="Next report page"
                    disabled={listing.page === listing.totalPages}
                    onClick={() => setPage(listing.page + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>
        <aside
          className="portal-detail-panel portal-report-detail"
          id={selectedReport ? "report-" + selectedReport.id : undefined}
          tabIndex={-1}
        >
          {player ? (
            <>
              <div className="portal-detail-title">
                <span className="portal-initials">
                  <UserRound size={28} />
                </span>
                <div>
                  <h2>{player.name}</h2>
                  <p>
                    {player.ageCategory || playerBatch(d, player)} ·{" "}
                    {player.position || "Football"}
                  </p>
                </div>
                <button
                  className="portal-icon"
                  aria-label="View player profile"
                  onClick={() =>
                    onNavigate(parent ? "home" : "players", {
                      player: player.id,
                    })
                  }
                >
                  <UserRound size={18} />
                </button>
              </div>
              <div className="portal-tabs">
                <button className="active" onClick={() => setPreview(true)}>
                  Latest Report
                </button>
                <button
                  onClick={() => {
                    setTab("Progress Overview");
                    setPage(1);
                  }}
                >
                  Progress
                </button>
                <button
                  onClick={() => {
                    setStatus("");
                    setPeriod("");
                    setPage(1);
                  }}
                >
                  All Reports
                </button>
              </div>
              {selectedReport ? (
                <>
                  <div className="portal-report-state">
                    <FileText size={28} />
                    <div>
                      <strong>{selectedReport.period}</strong>
                      <small>
                        {snapshot
                          ? "Approved snapshot"
                          : "Draft · coach review required"}
                      </small>
                    </div>
                    <span
                      className={`portal-status ${selectedReport.status === "Approved" ? "" : "muted"}`}
                    >
                      {selectedReport.status}
                    </span>
                  </div>
                  <p className="portal-report-excerpt-label">
                    Preview excerpts · open the full report below for complete
                    wording.
                  </p>
                  <div className="portal-report-answers">
                    <section>
                      <span className="portal-round">
                        <Target size={24} />
                      </span>
                      <div>
                        <h3>What was practised?</h3>
                        <p className="portal-report-excerpt">
                          {reportPreviewExcerpt(
                            snapshot?.practised ??
                              selectedReport.monthlySources?.model.practised ??
                              plan?.focus ??
                              "Recorded practice has not been assembled for this report.",
                          )}
                        </p>
                      </div>
                    </section>
                    <section>
                      <span className="portal-round purple">
                        <TrendingUp size={24} />
                      </span>
                      <div>
                        <h3>What does reviewed evidence show?</h3>
                        <p className="portal-report-excerpt">
                          {reportPreviewExcerpt(
                            snapshot
                              ? snapshot.evidence
                                  .map((e) => e.text)
                                  .join(" ") ||
                                  "Further coach review is needed."
                              : selectedReport.observation ||
                                  "Further coach review is needed. No individual observation has been recorded.",
                          )}
                        </p>
                      </div>
                    </section>
                    <section>
                      <span className="portal-round amber">
                        <Target size={24} />
                      </span>
                      <div>
                        <h3>What comes next?</h3>
                        <p className="portal-report-excerpt">
                          {reportPreviewExcerpt(
                            (snapshot?.nextStep ?? selectedReport.nextStep) ||
                              "Coach to record a specific next step.",
                          )}
                        </p>
                      </div>
                    </section>
                  </div>
                  <section className="portal-report-skills">
                    <h3>Skills Focus</h3>
                    <div>
                      {(snapshot?.activities ?? []).length ? (
                        snapshot!.activities
                          .slice(0, 3)
                          .map((a) => (
                            <span key={a.name}>
                              {reportPreviewExcerpt(a.name, 60)}
                            </span>
                          ))
                      ) : (
                        <span>
                          {reportPreviewExcerpt(
                            snapshot?.focus ??
                              plan?.focus ??
                              "Shared batch focus",
                            80,
                          )}
                        </span>
                      )}
                    </div>
                    {(snapshot?.activities.length ?? 0) > 3 && (
                      <small>
                        {snapshot!.activities.length - 3} more activities in the
                        full report.
                      </small>
                    )}
                  </section>
                  <section className="portal-report-comments">
                    <h3>Coach Comments</h3>
                    <p className="portal-report-excerpt">
                      {reportPreviewExcerpt(
                        (snapshot?.note ?? selectedReport.closingNote) ||
                          "No closing comment recorded.",
                      )}
                    </p>
                  </section>
                  <div className="portal-actions">
                    {snapshot ? (
                      <SecureReportDownload
                        academyId={d.academy.id}
                        report={selectedReport}
                      />
                    ) : (
                      !parent && (
                        <button
                          className="button secondary"
                          onClick={() => setEditor(true)}
                        >
                          <Pencil size={16} /> Review Report
                        </button>
                      )
                    )}
                    {!parent && (
                      <button
                        className="button secondary"
                        disabled={
                          selectedReport.status !== "Approved" ||
                          !selectedReport.snapshot
                        }
                        onClick={() =>
                          onNavigate("messages", {
                            player: player.id,
                            sourceReport: selectedReport.id,
                          })
                        }
                      >
                        <Send size={16} /> Send to Parent
                      </button>
                    )}
                  </div>
                  <button
                    className="portal-link"
                    onClick={() => setPreview(true)}
                  >
                    Open full report preview
                  </button>
                </>
              ) : (
                <div className="portal-empty">
                  <FileText size={32} />
                  <h2>No report for this selection</h2>
                  <p>
                    Prepare a draft from actual training records, then review it
                    before approval.
                  </p>
                  {!parent && (
                    <button
                      className="button primary"
                      onClick={() => setEditor(true)}
                    >
                      Prepare Monthly Report
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="portal-empty">
              <FileText size={34} />
              <p>Select an authorised player to review their report.</p>
            </div>
          )}
        </aside>
      </div>
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
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              closeEditor();
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
                value={player?.id ?? ""}
                onChange={(e) => {
                  if (confirmUnsavedChanges())
                    onNavigate("reports", { player: e.target.value });
                }}
              >
                <option value="">Choose an authorised player</option>
                {d.records.player.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
      <Dialog.Root open={preview} onOpenChange={setPreview}>
        <Dialog.Portal>
          <Dialog.Overlay className="portal-overlay" />
          <Dialog.Content className="portal-dialog portal-report-workflow">
            <Dialog.Title>Private Report Preview</Dialog.Title>
            <Dialog.Description>
              {player?.name ?? "Select a player"} ·{" "}
              {selectedReport?.period ?? "No report selected"}
            </Dialog.Description>
            <Dialog.Close
              className="portal-icon close"
              aria-label="Close report preview"
            >
              <X />
            </Dialog.Close>
            {snapshot ? (
              <ReportPreview model={snapshot} />
            ) : (
              <>
                <p>
                  The report is not approved. Review the draft before exporting
                  an approved snapshot.
                </p>
                {selectedReport && (
                  <div className="portal-workflow">
                    <section>
                      <h3>Recorded practice</h3>
                      <p>
                        {selectedReport.monthlySources?.model.practised ??
                          plan?.focus ??
                          "Recorded practice has not been assembled for this report."}
                      </p>
                    </section>
                    <section>
                      <h3>Recorded observation</h3>
                      <p>
                        {selectedReport.observation ||
                          "No individual observation recorded."}
                      </p>
                    </section>
                    <section>
                      <h3>Recorded next step</h3>
                      <p>
                        {selectedReport.nextStep || "No next step recorded."}
                      </p>
                    </section>
                    <section>
                      <h3>Recorded coach comment</h3>
                      <p>
                        {selectedReport.closingNote ||
                          "No closing comment recorded."}
                      </p>
                    </section>
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
