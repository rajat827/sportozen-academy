"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { PortalShell } from "./portal-shell";
import { PortalHome } from "./portal-home";
import { PortalPlayers } from "./portal-players";
import { PortalCalendar } from "./portal-calendar";
import { PortalTraining } from "./portal-training";
import { PortalReports } from "./portal-reports";
import { PortalFees } from "./portal-fees";
import { PortalSettings } from "./portal-settings";
import { PortalParentHome, PortalParentSchedule } from "./portal-parent-home";
import { ParentPlans, PlayerPlanEditor } from "./plan-and-report";
import { WeeklyPlans } from "./period-plans";
import { WorkspaceMessages } from "./messages";
import { DeliveryPanel } from "./communication-controls";
import { BatchAnnouncements } from "./batch-announcements";
import { ParentPractice } from "./practice";
import { PortalTrialParentSummary } from "./portal-trials";
import type { PortalSection, PortalNavigate } from "./portal-types";
import { portalSourceAvailable } from "@/services/portal-source-selection";
import "./portal.css";
import "./portal-home.css";
import "./portal-players.css";
import "./portal-reports.css";
import "./portal-parent-home.css";

const sections: PortalSection[] = [
  "home",
  "players",
  "calendar",
  "training",
  "reports",
  "fees",
  "settings",
  "messages",
  "development",
  "practice",
];
export function AcademyPortal({ academyId }: { academyId: string }) {
  const w = useWorkspace(academyId),
    router = useRouter(),
    params = useSearchParams();
  const [practiceFeedback, setPracticeFeedback] = useState<{
    academyId: string;
    userId: string;
    playerId: string;
    body: string;
  } | null>(null);
  const onNavigate: PortalNavigate = (section, context = {}) => {
    const next = new URLSearchParams(params.toString());
    next.set("section", section);
    if (section !== "reports") {
      next.delete("report");
      next.delete("prepare");
    }
    if (section !== "development") next.delete("weekly");
    if (section !== "settings") next.delete("tab");
    if (section !== "messages") next.delete("sourceReport");
    if (section !== "players" && section !== "training") next.delete("create");
    for (const [key, value] of Object.entries(context))
      if (value) next.set(key, value);
      else next.delete(key);
    router.push(
      `/workspace/${encodeURIComponent(academyId)}?${next.toString()}`,
      { scroll: false },
    );
  };
  const d = w.data;
  if (!d)
    return (
      <main className="secure-page">
        <h1>Sportozen Academy</h1>
        {w.error ? (
          <div role="alert">
            <p>{w.error}</p>
            <button
              className="button secondary"
              onClick={() => w.reload().catch(() => {})}
            >
              Retry workspace
            </button>
          </div>
        ) : (
          <p role="status">Loading your academy…</p>
        )}
      </main>
    );
  const parent = d.membership.role === "PARENT",
    support = d.membership.role === "SUPPORT";
  const sectionParam = params.get("section"),
    section: PortalSection = sections.includes(sectionParam as PortalSection)
      ? (sectionParam as PortalSection)
      : params.has("report")
        ? "reports"
        : params.has("weekly")
          ? "development"
          : params.has("session")
            ? "training"
            : support
              ? "reports"
              : "home";
  const selected = params.get("player") ?? "",
    player = selected
      ? d.records.player.find((p) => p.id === selected)
      : parent || d.records.player.length === 1
        ? d.records.player[0]
        : undefined;
  const sessionId = params.get("session") ?? "";
  const feedback =
    parent &&
    player &&
    practiceFeedback?.academyId === academyId &&
    practiceFeedback.userId === d.membership.userId &&
    practiceFeedback.playerId === player.id
      ? practiceFeedback.body
      : "";
  const reportId = section === "reports" ? (params.get("report") ?? "") : "",
    weeklyId = section === "development" ? (params.get("weekly") ?? "") : "",
    messageReportId =
      section === "messages" ? (params.get("sourceReport") ?? "") : "";
  const sourceUnavailable =
    (reportId && !portalSourceAvailable(d, selected, reportId, "MONTHLY")) ||
    (weeklyId && !portalSourceAvailable(d, selected, weeklyId, "WEEKLY")) ||
    (messageReportId &&
      !portalSourceAvailable(d, selected, messageReportId, "MONTHLY")) ||
    (messageReportId &&
      !d.records.report.some(
        (report) =>
          report.id === messageReportId &&
          report.status === "Approved" &&
          report.snapshot,
      ));
  const canFinance =
    ["OWNER", "ADMIN", "PARENT"].includes(d.membership.role) &&
    d.academy.modules.includes("fees");
  const allowed = support
    ? ["reports", "players", "development", "settings"].includes(section)
    : parent
      ? !["players", "training"].includes(section)
      : section !== "practice";
  const playerSelect = (
    <label className="portal-context-selector">
      {parent ? "Your linked child" : "Player"}
      <select
        aria-label={parent ? "Your linked child" : "Player"}
        value={player?.id ?? ""}
        onChange={(e) => {
          if (confirmUnsavedChanges())
            onNavigate(section, {
              player: e.target.value,
              report: "",
              weekly: "",
              sourceReport: "",
            });
        }}
      >
        <option value="">Choose an authorised player</option>
        {d.records.player.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.squad}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <PortalShell data={d} section={section} onNavigate={onNavigate}>
      {w.error && (
        <div className="notice amber" role="alert">
          {w.error}
        </div>
      )}
      {!allowed ? (
        <div className="portal-empty">
          <h1>This section is unavailable for your role</h1>
          <p>
            Your academy membership controls access to private records and
            actions.
          </p>
          <button
            className="button primary"
            onClick={() => onNavigate(support ? "reports" : "home")}
          >
            Return to workspace
          </button>
        </div>
      ) : sourceUnavailable ? (
        <div className="portal-empty" role="alert">
          <h1>{weeklyId ? "Weekly plan unavailable" : "Report unavailable"}</h1>
          <p>
            This source is not available for the selected player in your current
            academy and role. No other source has been selected.
          </p>
          <button
            className="button secondary"
            onClick={() =>
              onNavigate(messageReportId ? "reports" : section, {
                report: "",
                weekly: "",
                sourceReport: "",
              })
            }
          >
            Return to {weeklyId ? "development plans" : "reports"}
          </button>
        </div>
      ) : (
        <>
          {section === "home" &&
            (parent ? (
              <PortalParentHome
                workspace={w}
                player={player}
                onNavigate={onNavigate}
              />
            ) : (
              <PortalHome workspace={w} onNavigate={onNavigate} />
            ))}
          {section === "players" && (
            <PortalPlayers
              key={`${params.get("q") ?? ""}:${params.get("create") ?? ""}`}
              workspace={w}
              playerId={selected}
              onNavigate={onNavigate}
              query={params.get("q") ?? ""}
              create={params.get("create") === "player"}
            />
          )}
          {section === "calendar" &&
            (parent ? (
              <PortalParentSchedule
                workspace={w}
                player={player}
                onNavigate={onNavigate}
              />
            ) : (
              <PortalCalendar
                key={academyId}
                workspace={w}
                sessionId={sessionId}
                onNavigate={onNavigate}
              />
            ))}
          {section === "training" && !parent && !support && (
            <PortalTraining
              key={`${academyId}:${params.get("create") ?? ""}`}
              workspace={w}
              sessionId={sessionId}
              onNavigate={onNavigate}
            />
          )}
          {section === "reports" &&
            (parent ? (
              <>
                <div className="portal-page-heading">
                  <div>
                    <h1>Progress & Reports</h1>
                    <p>Coach-approved reports for your linked child.</p>
                  </div>
                </div>
                {playerSelect}
                {player ? (
                  <div className="portal-workflow">
                    <ParentPlans
                      key={player.id}
                      workspace={w}
                      player={player}
                      sportId="football"
                      reportsOnly
                      reportId={reportId}
                    />
                  </div>
                ) : (
                  <p>
                    Select your linked child to view their private approved
                    reports.
                  </p>
                )}
              </>
            ) : (
              <PortalReports
                workspace={w}
                playerId={selected}
                reportId={reportId}
                onNavigate={onNavigate}
                prepare={params.get("prepare") === "monthly"}
              />
            ))}
          {section === "fees" &&
            (canFinance ? (
              <PortalFees
                workspace={w}
                playerId={selected || player?.id}
                onPlayer={(id) => onNavigate("fees", { player: id })}
                onMessageParent={(id) => onNavigate("messages", { player: id })}
                onViewPlayer={(id) => onNavigate("players", { player: id })}
              />
            ) : (
              <div className="portal-empty">
                <h1>Fees access unavailable</h1>
                <p>
                  The fees module and an authorised finance role are required.
                  Ask your academy owner for help.
                </p>
              </div>
            ))}
          {section === "settings" && (
            <>
              {parent && (
                <section className="portal-card portal-parent-more">
                  <h1>More</h1>
                  {playerSelect}
                  <div className="portal-parent-more-links">
                    <button
                      className="button secondary"
                      data-leave-editor
                      onClick={() =>
                        onNavigate("calendar", { player: player?.id })
                      }
                    >
                      Training Schedule
                    </button>
                    <button
                      className="button secondary"
                      data-leave-editor
                      onClick={() =>
                        onNavigate("development", { player: player?.id })
                      }
                    >
                      Development Plan
                    </button>
                    {canFinance && (
                      <button
                        className="button secondary"
                        data-leave-editor
                        onClick={() =>
                          onNavigate("fees", { player: player?.id })
                        }
                      >
                        Fees & Receipts
                      </button>
                    )}
                    <button
                      className="button secondary"
                      data-leave-editor
                      onClick={() =>
                        onNavigate("practice", { player: player?.id })
                      }
                    >
                      Practise Together
                    </button>
                  </div>
                </section>
              )}
              <PortalSettings
                key={`${academyId}:${params.get("tab") ?? ""}`}
                workspace={w}
                playerId={player?.id}
              />
            </>
          )}
          {section === "development" && (
            <>
              <div className="portal-page-heading">
                <div>
                  <h1>{parent ? "Development Plan" : "Player Development"}</h1>
                  <p>Shared batch training with optional individual focus.</p>
                </div>
              </div>
              {playerSelect}
              {parent && player && (
                <PortalTrialParentSummary
                  key={player.id}
                  workspace={w}
                  player={player}
                />
              )}
              {player ? (
                <div className="portal-workflow">
                  {weeklyId ? (
                    <WeeklyPlans
                      workspace={w}
                      playerId={player.id}
                      sourceId={weeklyId}
                    />
                  ) : parent || support ? (
                    <>
                      <ParentPlans
                        key={player.id}
                        workspace={w}
                        player={player}
                        sportId="football"
                      />
                      <WeeklyPlans workspace={w} playerId={player.id} />
                    </>
                  ) : (
                    <PlayerPlanEditor
                      key={player.id}
                      workspace={w}
                      player={player}
                      sportId="football"
                    />
                  )}
                </div>
              ) : (
                <p>
                  Choose an authorised player. No other child has been selected.
                </p>
              )}
            </>
          )}
          {section === "messages" && !support && (
            <>
              <div className="portal-page-heading">
                <div>
                  <h1>{parent ? "Message Coach" : "Messages"}</h1>
                  <p>Private conversations within {d.academy.name}.</p>
                </div>
                {!parent && <BatchAnnouncements workspace={w} />}
              </div>
              {playerSelect}
              {player ? (
                <div className="portal-workflow">
                  <WorkspaceMessages
                    key={`${player.id}:${messageReportId}`}
                    workspace={w}
                    player={player}
                    sportId="football"
                    initialReportId={messageReportId}
                    initialFeedback={feedback}
                    onFeedbackSent={() =>
                      setPracticeFeedback((current) =>
                        current?.academyId === academyId &&
                        current.userId === d.membership.userId &&
                        current.playerId === player.id &&
                        current.body === feedback
                          ? null
                          : current,
                      )
                    }
                  />
                  {!parent && (
                    <details>
                      <summary>Delivery and approval details</summary>
                      <DeliveryPanel workspace={w} playerId={player.id} />
                    </details>
                  )}
                </div>
              ) : (
                <div className="portal-empty">
                  <h2>Choose a player to open their private conversation</h2>
                  <p>
                    Messages are scoped to the player and verified guardian
                    relationship.
                  </p>
                </div>
              )}
            </>
          )}
          {section === "practice" && parent && (
            <>
              <div className="portal-page-heading">
                <div>
                  <h1>Practise Together</h1>
                  <p>Optional parent-supported practice.</p>
                </div>
              </div>
              {playerSelect}
              {player && (
                <ParentPractice
                  key={player.id}
                  workspace={w}
                  player={player}
                  onHelp={(body) => {
                    setPracticeFeedback({
                      academyId,
                      userId: d.membership.userId,
                      playerId: player.id,
                      body,
                    });
                    onNavigate("messages", { player: player.id });
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}
