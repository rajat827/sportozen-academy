import { context } from "@/server/workspace-service";
import { financeView } from "@/server/finance-service";
import { generateFinanceDocument } from "@/server/finance-document";
import { WorkspaceError } from "@/server/auth";
import { apiError } from "@/server/workspace-access";
import { audit } from "@/server/database";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ academyId: string; kind: string; recordId: string }> },
) {
  try {
    const { academyId, kind, recordId } = await params;
    const ctx = await context(request.headers, academyId),
      account = financeView(ctx);
    const record =
      kind === "invoice"
        ? account.invoices.find((invoice) => invoice.id === recordId)
        : kind === "receipt"
          ? account.receipts.find((receipt) => receipt.id === recordId)
          : undefined;
    if (!record)
      throw new WorkspaceError(
        404,
        "Finance document unavailable in this academy and player scope.",
      );
    const bytes = await generateFinanceDocument(
      record,
      ctx.academy.dateLocale,
      account.asOfDate,
    );
    financeView(ctx, record.playerId); // Recheck this child's current relationship after asynchronous rendering.
    audit(academyId, ctx.user.id, `Private academy ${kind} exported`, recordId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${kind}-${recordId}.pdf"`,
        "Cache-Control": "no-store, private",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
