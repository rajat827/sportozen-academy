import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { context } from "@/server/workspace-service";
import { visibleRecord, apiError } from "@/server/workspace-access";
import { WorkspaceError } from "@/server/auth";
import { audit } from "@/server/database";
import { reportFilename } from "@/services/reports/report-view-model";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ academyId: string; reportId: string }> },
) {
  try {
    const { academyId, reportId } = await params,
      ctx = await context(request.headers, academyId),
      report = visibleRecord(ctx, "report", reportId);
    if (report.status !== "Approved" || !report.snapshot)
      throw new WorkspaceError(409, "Approve the report before exporting.");
    const { generateReportPdf } = await import("@/features/reports/report-pdf");
    const blob = await generateReportPdf(
      report.snapshot,
      join(process.cwd(), "public/fonts"),
      await Promise.all([
        readFile(join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")),
        readFile(join(process.cwd(), "public/fonts/NotoSans-Bold.ttf")),
      ]),
    );
    audit(
      academyId,
      ctx.user.id,
      "Private approved PDF exported; external delivery NOT_SENT",
      reportId,
    );
    return new Response(await blob.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(reportFilename(report.snapshot))}`,
        "Cache-Control": "no-store, private",
        Vary: "Cookie",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
