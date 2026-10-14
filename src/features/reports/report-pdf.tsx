import { reportLabels } from "@/domain/report";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Image as PdfImage,
} from "@react-pdf/renderer";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ReportViewModel } from "@/services/reports/report-view-model";
const fontFamilies = new Map<string, string>();
function registerFonts(base: string) {
  let family = fontFamilies.get(base);
  if (!family) {
    family = base === "/fonts" ? "Noto Sans" : "Server Noto Sans";
    Font.register({
      family,
      fonts: [
        { src: base + "/NotoSans-Regular.ttf" },
        { src: base + "/NotoSans-Bold.ttf", fontWeight: 700 },
      ],
    });
    fontFamilies.set(base, family);
  }
  return family;
}
Font.registerHyphenationCallback((word) => [word]);
const navy = "#102f45",
  muted = "#586975";
const styles = (family: string, green = "#008463") =>
  StyleSheet.create({
    page: {
      paddingTop: 100,
      paddingBottom: 78,
      paddingHorizontal: 43,
      fontFamily: family,
      fontSize: 11,
      lineHeight: 1.45,
      color: navy,
    },
    header: {
      position: "absolute",
      top: 42,
      left: 43,
      right: 43,
      borderBottomWidth: 1,
      borderColor: "#dce5e9",
      paddingBottom: 13,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    academy: { fontFamily: family, fontWeight: 700, fontSize: 15 },
    attribution: { fontSize: 9, color: muted, marginTop: 3 },
    period: { fontSize: 11, textAlign: "right" },
    kicker: { fontSize: 9, letterSpacing: 1.3, color: green, marginBottom: 6 },
    name: {
      fontSize: 27,
      fontFamily: family,
      fontWeight: 700,
      lineHeight: 1.2,
      marginBottom: 7,
    },
    meta: { fontSize: 11, color: muted, marginBottom: 7 },
    statuses: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 15,
      fontSize: 10,
      color: muted,
      marginBottom: 14,
    },
    focus: {
      backgroundColor: "#f1f6f7",
      borderLeftWidth: 3,
      borderColor: green,
      padding: 12,
      marginBottom: 14,
    },
    title: {
      fontFamily: family,
      fontWeight: 700,
      fontSize: 11,
      marginBottom: 7,
    },
    focusText: {
      fontSize: 18,
      fontFamily: family,
      fontWeight: 700,
      lineHeight: 1.35,
    },
    section: { marginBottom: 14 },
    evidence: { backgroundColor: "#f6f8f9", padding: 12, marginTop: 8 },
    count: {
      fontSize: 29,
      lineHeight: 1.2,
      fontFamily: family,
      fontWeight: 700,
      color: green,
    },
    small: { fontSize: 9, lineHeight: 1.4, color: muted, marginTop: 5 },
    label: {
      fontFamily: family,
      fontWeight: 700,
      fontSize: 12,
      marginTop: 7,
      marginBottom: 7,
    },
    next: {
      borderTopWidth: 2,
      borderColor: green,
      padding: 12,
      backgroundColor: "#ecf7f2",
      marginBottom: 14,
    },
    nextText: {
      fontSize: 16,
      fontFamily: family,
      fontWeight: 700,
      lineHeight: 1.35,
      marginBottom: 10,
    },
    closing: {
      borderLeftWidth: 2,
      borderColor: "#cad8df",
      paddingLeft: 14,
      marginBottom: 10,
    },
    footer: {
      position: "absolute",
      bottom: 42,
      left: 43,
      right: 43,
      borderTopWidth: 1,
      borderColor: "#dce5e9",
      paddingTop: 9,
      fontSize: 8,
      lineHeight: 1.4,
      height: 34,
      color: muted,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    drill: { borderBottomWidth: 1, borderColor: "#dce5e9", paddingVertical: 8 },
  });
function ReportBranding({
  model: m,
  fontBase,
}: {
  model: ReportViewModel;
  fontBase: string;
}) {
  const s = styles(registerFonts(fontBase), m.brandAccent),
    labels = { ...reportLabels, ...m.labels };
  return (
    <>
      <View style={s.header} fixed>
        <View style={{ width: "58%" }}>
          {m.logoData && (
            <PdfImage
              src={m.logoData}
              style={{
                width: 80,
                height: 22,
                objectFit: "contain",
                marginBottom: 3,
              }}
            />
          )}
          <Text style={s.academy}>{m.academy}</Text>
          <Text style={s.attribution}>Powered by Sportozen</Text>
        </View>
        <View style={{ width: "40%" }}>
          <Text style={s.period}>{m.period}</Text>
          <Text style={{ ...s.attribution, textAlign: "right" }}>
            {m.demo ? "Fictional demo report" : "Private report"}
          </Text>
        </View>
      </View>
      <View fixed style={s.footer}>
        <Text style={{ paddingRight: 30 }}>
          {m.player} | {m.period}
        </Text>
        <Text>
          {labels.privacy} | {m.demo ? "Demo data | " : ""}External delivery:{" "}
          {m.externalDelivery}
        </Text>
      </View>
    </>
  );
}
export function ReportPdf({
  model: m,
  fontBase = "/fonts",
  branding = true,
}: {
  model: ReportViewModel;
  fontBase?: string;
  branding?: boolean;
}) {
  const s = styles(registerFonts(fontBase), m.brandAccent);
  const labels = { ...reportLabels, ...m.labels };
  return (
    <Document
      title={`${m.player} - Player Development Report`}
      author={m.academy}
      subject="Private player development report"
    >
      <Page size="A4" style={s.page} wrap>
        {branding && <ReportBranding model={m} fontBase={fontBase} />}
        <Text style={s.kicker}>{labels.title.toLocaleUpperCase()}</Text>
        <Text style={s.name}>{m.player}</Text>
        <Text style={s.meta}>
          {[m.sport, m.squad, m.coach].filter(Boolean).join(" | ")}
        </Text>
        <View style={s.statuses}>
          <Text>Report status: {m.status}</Text>
          <Text>External delivery: {m.externalDelivery}</Text>
        </View>
        <View style={s.focus}>
          <Text style={s.title} minPresenceAhead={35}>
            {labels.focus.toLocaleUpperCase()}
          </Text>
          <Text style={s.focusText}>{m.focus}</Text>
          {m.reviewedReason && <Text>{m.reviewedReason}</Text>}
        </View>
        <View style={s.section}>
          <Text style={s.title} minPresenceAhead={25}>
            {labels.practised.toLocaleUpperCase()}
          </Text>
          <Text>{m.practised}</Text>
          {m.activities.map((a, i) => (
            <View key={i} style={s.drill}>
              <Text style={s.label} minPresenceAhead={25}>
                {a.name}
              </Text>
              <Text>{a.purpose}</Text>
              {a.activity && <Text style={s.small}>{a.activity}</Text>}
            </View>
          ))}
        </View>
        <View style={s.section}>
          <Text style={s.title} minPresenceAhead={50}>
            {labels.observed.toLocaleUpperCase()}
          </Text>
          {m.evidence.length ? (
            m.evidence.map((e, i) => (
              <View key={i} style={s.evidence} wrap={e.text.length > 900}>
                {e.headline && (
                  <>
                    <Text style={s.count}>{e.headline}</Text>
                    <Text style={s.small}>introductory attempts</Text>
                  </>
                )}
                {e.label && <Text style={s.label}>{e.label}</Text>}
                <Text>{e.text}</Text>
                <Text style={s.small}>
                  {labels.source}: {e.source}
                  {e.reference ? ` | Reference: ${e.reference}` : ""}
                </Text>
              </View>
            ))
          ) : (
            <Text>Reviewed evidence is awaiting confirmation.</Text>
          )}
        </View>
        <View
          style={[s.next, ...(!m.note ? [{ marginBottom: 0 }] : [])]}
          wrap={
            m.nextStep.length + (m.observationCriteria?.length ?? 0) > 900 ||
            ((m.nextStep + (m.observationCriteria ?? "")).match(/\n/g)
              ?.length ?? 0) > 8
          }
        >
          <Text style={s.title} minPresenceAhead={35}>
            {labels.next.toLocaleUpperCase()}
          </Text>
          <Text style={s.nextText}>{m.nextStep}</Text>
          {m.nextDrill && <Text>Assigned next drill: {m.nextDrill}</Text>}
          {m.observationCriteria && (
            <Text>Coach will observe: {m.observationCriteria}</Text>
          )}
          <Text>
            {m.reviewDate
              ? `Review date: ${m.reviewDate}`
              : labels.reviewPending}
          </Text>
        </View>
        {m.note && (
          <View style={s.closing}>
            <Text style={s.title} minPresenceAhead={25}>
              COACH’S CLOSING NOTE
            </Text>
            <Text>{m.note}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
export async function generateReportPdf(
  model: ReportViewModel,
  fontBase = "/fonts",
  brandingFonts?: [Uint8Array, Uint8Array],
) {
  const rendered = await pdf(
    <ReportPdf model={model} fontBase={fontBase} branding={false} />,
  ).toBlob();
  // Flow the original report body, then draw branding with independently
  // embedded Noto fonts. React-PDF's fixed text can clip on continuation pages.
  const fontBytes =
    brandingFonts ??
    (await Promise.all(
      ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
        const response = await fetch(`${fontBase}/${name}`);
        if (!response.ok) throw new Error("Report branding font unavailable.");
        return new Uint8Array(await response.arrayBuffer());
      }),
    ));
  const body = await PDFDocument.load(await rendered.arrayBuffer());
  const document = await PDFDocument.create();
  document.setTitle(`${model.player} - Player Development Report`);
  document.setAuthor(model.academy);
  document.setSubject("Private player development report");
  document.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all(
    fontBytes.map((bytes) => document.embedFont(bytes, { subset: true })),
  );
  const logo = model.logoData
    ? await (/^data:image\/png/i.test(model.logoData)
        ? document.embedPng(model.logoData)
        : document.embedJpg(model.logoData))
    : undefined;
  const bodyPages = await document.embedPdf(body, body.getPageIndices());
  const pages = bodyPages.map((p) => document.addPage([p.width, p.height]));
  const labels = { ...reportLabels, ...model.labels };
  const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ");
  const fit = (text: string, font: PDFFont, size: number, width: number) =>
    Math.min(size, width / font.widthOfTextAtSize(text, 1));
  pages.forEach((page, i) => {
    page.drawPage(bodyPages[i], {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
    const right = page.getWidth() - 43,
      top = page.getHeight(),
      ink = rgb(0.063, 0.184, 0.271),
      secondary = rgb(0.345, 0.412, 0.459),
      line = rgb(0.863, 0.898, 0.914);
    if (logo) {
      const scale = Math.min(80 / logo.width, 20 / logo.height);
      page.drawImage(logo, {
        x: 43,
        y: top - 46,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    }
    const academy = singleLine(model.academy),
      period = singleLine(model.period),
      academySize = fit(academy, bold, 15, 290),
      periodSize = fit(period, regular, 11, 204);
    page.drawText(academy, {
      x: 43,
      y: top - (logo ? 64 : 57),
      font: bold,
      size: academySize,
      color: ink,
    });
    page.drawText("Powered by Sportozen", {
      x: 43,
      y: top - (logo ? 79 : 71),
      font: regular,
      size: 9,
      color: secondary,
    });
    page.drawText(period, {
      x: right - regular.widthOfTextAtSize(period, periodSize),
      y: top - 54,
      font: regular,
      size: periodSize,
      color: ink,
    });
    const privacy = model.demo ? "Fictional demo report" : "Private report";
    page.drawText(privacy, {
      x: right - regular.widthOfTextAtSize(privacy, 9),
      y: top - 71,
      font: regular,
      size: 9,
      color: secondary,
    });
    page.drawLine({
      start: { x: 43, y: top - 90 },
      end: { x: right, y: top - 90 },
      thickness: 1,
      color: line,
    });
    page.drawLine({
      start: { x: 43, y: 76 },
      end: { x: right, y: 76 },
      thickness: 1,
      color: line,
    });
    const identity = singleLine(`${model.player} | ${model.period}`),
      footer = singleLine(
        `${labels.privacy} | ${model.demo ? "Demo data | " : ""}External delivery: ${model.externalDelivery}`,
      );
    page.drawText(identity, {
      x: 43,
      y: 61,
      font: regular,
      size: fit(identity, regular, 8, right - 43 - 35),
      color: secondary,
    });
    page.drawText(footer, {
      x: 43,
      y: 50,
      font: regular,
      size: fit(footer, regular, 8, right - 43),
      color: secondary,
    });
    const text = `${i + 1} / ${pages.length}`;
    page.drawText(text, {
      x: right - regular.widthOfTextAtSize(text, 8),
      y: 61,
      size: 8,
      font: regular,
      color: rgb(0.345, 0.412, 0.459),
    });
  });
  const bytes = await document.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
