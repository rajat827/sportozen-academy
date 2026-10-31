"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { previewRoute } from "./catalog";
import { ReportPreview } from "@/features/reports/report-preview";
import { ReportDownload } from "@/features/reports/report-download";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { previewAdapter, usePreviewState, playerReportStatus } from "./adapter";
import { reportFixture, resolvedAcademy } from "./fixtures";
import { Button, Card, Badge, Go, Head, Field, Check } from "./ui";
export function ReportScreen({ screen: s, scenario }: Props) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    p = state.players.find((p) => p.id === state.playerId)!,
    [comment, setComment] = useState(
      state.fields[`report:${p.id}`]?.comment ??
        "The first touch moved into useful space during the paired task. Continue observing this in small-sided play.",
    ),
    [checked, setChecked] = useState(false),
    [saved, setSaved] = useState(true),
    [error, setError] = useState("");
  useUnsavedChanges(!saved);
  const model = reportFixture(
    {
      ...academy,
      name: state.profiles[academy.id]?.["Academy name"] ?? academy.name,
    },
    p.id,
    s.id === "report-long"
      ? "long"
      : s.id === "report-limited"
        ? "limited"
        : "default",
    state.fields[`report:${p.id}`]?.comment,
    p,
  );
  const reportStatus = playerReportStatus(state, p.id);
  model.status = reportStatus;
  const parent = s.role === "PARENT";
  if (parent && reportStatus !== "Approved")
    return (
      <div className="dp-empty">
        <h2>This draft is awaiting coach review</h2>
        <p>Unapproved edits do not appear as an approved parent report.</p>
        <Go to="conversation">Ask the coach</Go>
      </div>
    );
  if (["report-queue", "report-prepare", "report-history"].includes(s.id))
    return (
      <div className="dp-grid">
        <Card>
          <Head
            title={
              s.id === "report-history"
                ? "Approved report history"
                : "September report queue"
            }
            note={`${academy.timezone} · 1 September inclusive to 1 October exclusive`}
          />
          {state.players.slice(0, 2).map((p, i) => (
            <div className="dp-row" key={p.id}>
              <div className="dp-copy">
                <strong>{p.name} · September 2026</strong>
                <p>
                  {i === 0
                    ? "3 completed roster sessions · 2 present · 1 unmarked"
                    : "Limited evidence · no reviewed observation inferred"}
                </p>
              </div>
              <Badge>{playerReportStatus(state, p.id)}</Badge>
              <Button
                variant="secondary"
                onClick={() => previewAdapter.save({ playerId: p.id })}
              >
                Select
              </Button>
              <Link
                className="dp-link"
                href={previewRoute(
                  i === 0 ? "report-sources" : "report-limited",
                )}
                onClick={() => previewAdapter.save({ playerId: p.id })}
              >
                Review
              </Link>
            </div>
          ))}
          <div className="dp-actions">
            <Button
              onClick={() =>
                previewAdapter.save({
                  reportStatus: "Draft",
                  notice:
                    "Monthly draft prepared from fictional September records only.",
                })
              }
            >
              Prepare fictional monthly draft
            </Button>
            <Go to="report-sources">Review recorded sources</Go>
          </div>
        </Card>
        <Card>
          <Head title="Keep the report honest" />
          <p className="dp-note">
            Unmarked attendance is excluded from the marked basis. No
            observations means not recorded. Preparation and PDF downloads never
            notify families.
          </p>
          <Go to="report-long">Continuation-page example</Go>
          <br />
          <Go to="report-limited">Limited-evidence example</Go>
        </Card>
      </div>
    );
  return (
    <div className="dp-stack">
      <Card>
        {parent && p.id === "aarav" && reportStatus === "Approved" && (
          <figure className="dp-reference-photo" style={{ margin: "0 0 18px" }}>
            <Image
              src="/design-preview/ui-gallery/football-week-banner.png"
              alt="Fictional football reference illustration"
              width={900}
              height={240}
              unoptimized
              style={{
                width: "100%",
                height: 150,
                objectFit: "cover",
                borderRadius: 10,
              }}
            />
            <figcaption className="dp-note">
              Reference illustration · not evidence of this player’s performance
            </figcaption>
          </figure>
        )}
        <Head
          title={`${p.name} · September 2026`}
          note="What was practised → What was observed → What comes next"
        >
          <Badge>{reportStatus}</Badge>
        </Head>
        {["report-sources", "report-edit", "report-approval"].includes(
          s.id,
        ) && (
          <>
            <div className="dp-grid equal">
              <div>
                <p className="dp-overline">Recorded source basis</p>
                {model.evidence.map((e, i) => (
                  <div className="dp-bubble" key={i}>
                    <p>{e.text}</p>
                    <p className="dp-note">
                      {e.source} · {e.reference}
                    </p>
                  </div>
                ))}
                <p className="dp-note">
                  Today’s October observation remains in the session record; it
                  does not enter this September report.
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (scenario === "failed-save") {
                    setError(
                      "Simulated save failed. Commentary remains in this editor.",
                    );
                    return;
                  }
                  previewAdapter.save({
                    fields: {
                      ...state.fields,
                      [`report:${p.id}`]: { comment },
                    },
                    reportStatus: "Draft",
                    notice:
                      "Report draft saved; approval cleared until reviewed again.",
                  });
                  setSaved(true);
                  setError("");
                }}
              >
                <Field
                  label="Coach commentary"
                  value={comment}
                  onChange={(v) => {
                    setComment(v);
                    setSaved(false);
                    setChecked(false);
                  }}
                  area
                />
                {error && <p role="alert">{error}</p>}
                <Button type="submit">Save report draft</Button>
                <Check
                  label="I reviewed the player, month, attendance basis, sources and commentary"
                  checked={checked}
                  onChange={setChecked}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!saved || !checked}
                  onClick={() =>
                    previewAdapter.save({
                      reportStatus: "Approved",
                      notice:
                        "Report approved in fictional state. No notification sent.",
                    })
                  }
                >
                  Approve report
                </Button>
                <div className="dp-actions">
                  <Go to="parent-report">Parent preview</Go>
                </div>
              </form>
            </div>
          </>
        )}
        {!parent && (
          <div className="dp-actions">
            <Go to="report-sources">Source review</Go>
            <Go to="report-edit">Edit commentary</Go>
            <Go to="report-approval">Approval step</Go>
          </div>
        )}
        <div className="dp-actions">
          <ReportDownload
            model={model}
            disabled={!saved || model.status !== "Approved"}
          />
          <Go to="report-history">Report history</Go>
        </div>
        <p className="dp-note">
          Fictional approved-data PDF; academy attribution and private-source
          wording remain consistent. Download does not share the report.
        </p>
      </Card>
      <div className="dp-a4">
        <ReportPreview model={model} />
      </div>
    </div>
  );
}
