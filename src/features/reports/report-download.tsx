"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import {
  reportFilename,
  type ReportViewModel,
} from "@/services/reports/report-view-model";
export function ReportDownload({
  model,
  disabled = false,
}: {
  model: ReportViewModel;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const { generateReportPdf } = await import("./report-pdf");
      const blob = await generateReportPdf(model);
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = reportFilename(model);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setError(
        "The PDF could not be generated. Your report is unchanged. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="report-download">
      <Button
        variant="secondary"
        disabled={busy || disabled}
        onClick={download}
      >
        <Download size={16} />
        {busy
          ? "Generating PDF…"
          : error
            ? "Retry PDF download"
            : "Download PDF"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {busy && <span role="status">Preparing your private report</span>}
    </div>
  );
}
