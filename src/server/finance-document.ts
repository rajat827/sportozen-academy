import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FinanceInvoiceView, FinanceReceipt } from "@/domain/finance";
import { formatFinanceMoney } from "@/services/finance-rules";
import { wrapFinanceDocumentText } from "@/services/finance-document-lines";

export async function generateFinanceDocument(
  record: FinanceInvoiceView | FinanceReceipt,
  locale: string,
  asOfDate: string,
) {
  const [{ PDFDocument, rgb }, { default: fontkit }, regularBytes, boldBytes] =
    await Promise.all([
      import("pdf-lib"),
      import("@pdf-lib/fontkit"),
      readFile(join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")),
      readFile(join(process.cwd(), "public/fonts/NotoSans-Bold.ttf")),
    ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
  ]);
  const receipt = "paymentId" in record;
  let page = pdf.addPage([595, 842]),
    y = 785;
  const navy = rgb(0.04, 0.17, 0.25),
    muted = rgb(0.32, 0.42, 0.52);
  const footer = () =>
    page.drawText(
      "Powered by Sportozen · Private academy training-fee record",
      { x: 48, y: 30, size: 8, font: regular, color: muted },
    );
  function line(text: string, heading = false, maxWidth = 495) {
    const font = heading ? bold : regular,
      size = heading ? 15 : 10;
    const lines = wrapFinanceDocumentText(text, maxWidth, (value) =>
      font.widthOfTextAtSize(value, size),
    );
    for (const value of lines) {
      if (y < 70) {
        footer();
        page = pdf.addPage([595, 842]);
        y = 785;
      }
      page.drawText(value, {
        x: 48,
        y,
        size,
        font,
        color: heading ? navy : muted,
      });
      y -= heading ? 25 : 17;
    }
  }
  const snapshot = record.snapshot;
  if (snapshot.logoData) {
    const logo = await pdf.embedPng(snapshot.logoData);
    const dimensions = logo.scale(Math.min(58 / logo.width, 58 / logo.height));
    page.drawImage(logo, { x: 490, y: 750, ...dimensions });
  }
  const headerWidth = snapshot.logoData ? 420 : 495;
  line(snapshot.academyName, true, headerWidth);
  line(snapshot.contactEmail, false, headerWidth);
  y -= 14;
  line(
    receipt
      ? "Verified academy payment receipt"
      : "Academy training-fee invoice",
    true,
  );
  line(record.number);
  line(`Player: ${snapshot.playerName}`);
  line(`Currency: ${record.currency}`);
  if (receipt) {
    line(`Invoice: ${record.snapshot.invoiceNumber}`);
    line(record.snapshot.invoiceLabel);
    line(
      `Billing period: ${record.snapshot.periodStart} to ${record.snapshot.periodEnd}`,
    );
    y -= 12;
    line(
      `Verified amount: ${formatFinanceMoney(record.amountMinor, record.currency, locale)}`,
      true,
    );
    line(`Manual payment reference: ${record.reference}`);
    line(`Recorded method: ${record.method.replaceAll("_", " ")}`);
    line(`Payment date: ${record.paidOn}`);
    line(`Academy verification: ${record.verifiedAt}`);
    y -= 12;
    line(
      "This receipt records a manually verified academy payment. It does not claim an online gateway transaction.",
    );
  } else {
    line(record.label);
    line(`Billing period: ${record.periodStart} to ${record.periodEnd}`);
    line(`Due date: ${record.dueDate}`);
    y -= 12;
    for (const [label, value] of [
      ["Original charge", record.chargeMinor],
      ["Approved adjustments", record.adjustmentMinor],
      ["Billed amount", record.billedMinor],
      ["Verified payments", record.paidMinor],
      ["Outstanding balance", record.outstandingMinor],
    ] as const)
      line(`${label}: ${formatFinanceMoney(value, record.currency, locale)}`);
    line(
      `Status as of ${asOfDate}: ${record.status}${record.overdue && record.status === "PARTIAL" ? " / OVERDUE" : ""}`,
    );
    y -= 12;
    line(
      "Pending references are not verified payments and do not create a paid receipt. Online collection is not connected.",
    );
  }
  y -= 16;
  line(
    "Academy training fees are separate from the academy's Sportozen software subscription.",
  );
  footer();
  return pdf.save();
}
