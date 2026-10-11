"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
  Sheet,
} from "@/components/ui/primitives";
import type { ReportCard } from "@/domain/entities";
import {
  reportViewModel,
  saveReport,
} from "@/services/reports/report-view-model";
import { ReportPreview } from "./report-preview";
import { ReportDownload } from "./report-download";
export function Reports({ reportId }: { reportId?: string }) {
  const { data, update, notify } = useAcademy();
  const report = data.reports.find((r) => r.id === reportId);
  const [remarks, setRemarks] = useState(report?.remarks ?? ""),
    [preview, setPreview] = useState(false);
  function status(value: ReportCard["status"]) {
    try {
      update((s) => saveReport(s, reportId!, remarks, value));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save report.");
    }
  }
  if (reportId && !report) return <p>Report not found.</p>;
  if (report) {
    const model = reportViewModel(data, report),
      dirty = remarks !== report.remarks;
    return (
      <>
        <PageTitle
          eyebrow="PRACTICE. EVIDENCE. NEXT STEPS."
          title={`${model.player} · Report card`}
          description="A private development report built from recorded practice and reviewed evidence."
        >
          <ReportDownload model={model} disabled={dirty} />
          <Button
            variant="secondary"
            disabled={report.status !== "Approved" || dirty}
            onClick={() => setPreview(true)}
          >
            Share Preview
          </Button>
        </PageTitle>
        <div className="report-workspace">
          <ReportPreview model={model} />
          <Card className="report-controls">
            <SectionTitle title="Coach remarks & approval" />
            <div className="form-stack">
              <label>
                Coach remarks
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </label>
              {dirty && (
                <p className="notice amber">
                  Unsaved edits require review. Save Draft to clear approval
                  before exporting the revised report.
                </p>
              )}
              <Button variant="secondary" onClick={() => status("Draft")}>
                Save Draft
              </Button>
              <Button disabled={dirty} onClick={() => status("Approved")}>
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => status("Revision Requested")}
              >
                Request Revision
              </Button>
              <p className="muted">
                Approval makes the recorded report available to the linked
                parent. Downloading never sends a message.
              </p>
            </div>
          </Card>
        </div>
        <Sheet
          open={preview}
          onOpenChange={setPreview}
          title="Parent-facing preview"
        >
          <ReportPreview model={model} />
        </Sheet>
      </>
    );
  }
  return (
    <>
      <PageTitle
        title="Report cards"
        description="Coach-reviewed updates that explain practice, evidence, and next steps."
      />
      <Card>
        {data.reports.map((r) => (
          <Link className="list-row" href={`/coach/reports/${r.id}`} key={r.id}>
            <span className="attention-icon blue">
              <FileText size={20} />
            </span>
            <div>
              <h3>{data.players.find((p) => p.id === r.playerId)?.name}</h3>
              <p>{r.period}</p>
            </div>
            <Badge tone={r.status === "Approved" ? "green" : "amber"}>
              {r.status}
            </Badge>
          </Link>
        ))}
      </Card>
    </>
  );
}
