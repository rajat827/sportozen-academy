"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Check, FileText } from "lucide-react";
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
function downloadPdf(report: ReportCard, player: string) {
  const lines = [
    "Sportozen Academy - Demo report (not sent)",
    player,
    report.period,
    `Status: ${report.status}`,
    ...report.sections.flatMap((s) => [s.question, s.answer]),
    report.remarks,
  ].flatMap((s) => s.match(/.{1,85}(?:\s|$)/g) ?? [s]);
  const escape = (s: string) =>
    s
      .replace(/[^\x20-\x7E]/g, "")
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
  const content = `BT /F1 11 Tf 50 780 Td 16 TL ${lines.map((l, i) => `${i ? "T* " : ""}(${escape(l)}) Tj`).join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.id}-demo-report.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Reports({ reportId }: { reportId?: string }) {
  const { data, update, notify } = useAcademy();
  const report = data.reports.find((r) => r.id === reportId);
  const [remarks, setRemarks] = useState(report?.remarks ?? "");
  const [preview, setPreview] = useState(false);
  const player = data.players.find((p) => p.id === report?.playerId);
  function status(value: ReportCard["status"]) {
    if (
      value === "Approved" &&
      !data.evidence.some(
        (e) => e.playerId === report?.playerId && e.status === "Coach Reviewed",
      )
    ) {
      notify("Review supporting evidence before approving this report.");
      return;
    }
    update((s) => ({
      ...s,
      reports: s.reports.map((r) =>
        r.id === reportId ? { ...r, status: value, remarks } : r,
      ),
    }));
  }
  if (reportId && !report) return <p>Report not found.</p>;
  if (report && player)
    return (
      <>
        <PageTitle
          eyebrow="PRACTICE. EVIDENCE. NEXT STEPS."
          title={`${player.name} · Report card`}
          description={`${report.period} · Coach Rahul · ${report.status}`}
        >
          <Button
            variant="secondary"
            onClick={() => {
              downloadPdf({ ...report, remarks }, player.name);
              notify("Demo PDF downloaded locally. Not Sent.");
            }}
          >
            <Download size={16} />
            Download Demo PDF
          </Button>
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Share Preview
          </Button>
        </PageTitle>
        <div className="two-columns">
          <Card className="report-paper">
            <div className="report-brand">
              Sportozen <span>PLAYER PROGRESS</span>
            </div>
            <h2>{player.name}</h2>
            <p>
              {player.squad} · {report.period}
            </p>
            <div className="inline">
              <Badge tone="green">{report.status}</Badge>
              <Badge tone="blue">
                {player.attendance}% recorded attendance
              </Badge>
            </div>
            <p className="muted">
              Training exposure: receiving and passing practice · demo
              historical summary
            </p>
            {report.sections.map((s) => (
              <section className="report-section" key={s.question}>
                <h3>{s.question}</h3>
                <p>{s.answer}</p>
              </section>
            ))}
            <h3>Strengths</h3>
            <p>
              Engages with specific coaching feedback and repeats the practice
              focus.
            </p>
            <h3>Areas to improve</h3>
            <p>{player.goal} under changing practice conditions.</p>
            <h3>Supporting evidence</h3>
            {data.evidence
              .filter(
                (e) =>
                  e.playerId === player.id && e.status === "Coach Reviewed",
              )
              .map((e) => (
                <Link
                  className="text-link"
                  href={`/coach/evidence/${e.id}`}
                  key={e.id}
                >
                  {e.title} · Coach Reviewed
                </Link>
              ))}
          </Card>
          <div>
            <Card>
              <SectionTitle title="Coach remarks & approval" />
              <div className="form-stack">
                <label>
                  Coach remarks
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </label>
                <Button variant="secondary" onClick={() => status("Draft")}>
                  Save Draft
                </Button>
                <Button onClick={() => status("Approved")}>
                  <Check size={16} />
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => status("Revision Requested")}
                >
                  Request Revision
                </Button>
                <p className="muted">
                  Approval makes this report available in the linked parent
                  preview. No message is sent.
                </p>
              </div>
            </Card>
          </div>
        </div>
        <Sheet
          open={preview}
          onOpenChange={setPreview}
          title="Parent-facing preview"
        >
          <Badge>Not Sent</Badge>
          {report.sections.map((s) => (
            <div className="report-section" key={s.question}>
              <h3>{s.question}</h3>
              <p>{s.answer}</p>
            </div>
          ))}
          <p>{remarks}</p>
        </Sheet>
      </>
    );
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
              <p>{r.period} · Coach Rahul</p>
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
