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
import {
  reportPresentation,
  activityIllustration,
  formatRecordedDate,
} from "@/services/reports/report-presentation";
const families = new Map<string, string>();
function registerFonts(base: string) {
  let family = families.get(base);
  if (!family) {
    family = base === "/fonts" ? "Noto Sans" : "Server Noto Sans";
    Font.register({
      family,
      fonts: [
        { src: base + "/NotoSans-Regular.ttf" },
        { src: base + "/NotoSans-Bold.ttf", fontWeight: 700 },
      ],
    });
    families.set(base, family);
  }
  return family;
}
Font.registerHyphenationCallback((word) => [word]);
const navy = "#0c2942",
  muted = "#52677d",
  green = "#009b71";
const styles = (family: string, accent = green) =>
  StyleSheet.create({
    page: {
      paddingTop: 82,
      paddingBottom: 53,
      paddingHorizontal: 30,
      fontFamily: family,
      fontSize: 9.5,
      lineHeight: 1.4,
      color: navy,
    },
    identity: { flexDirection: "row", gap: 14, marginBottom: 8 },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: "#e8f5ef",
      justifyContent: "center",
      alignItems: "center",
    },
    initials: { fontSize: 23, fontWeight: 700, color: accent },
    identityText: { flex: 1, paddingTop: 1 },
    name: { fontSize: 21, fontWeight: 700, lineHeight: 1.15, marginBottom: 5 },
    meta: { fontSize: 9.5, color: muted, marginBottom: 3 },
    status: { color: accent, fontSize: 9, fontWeight: 700, marginTop: 3 },
    aside: {
      width: 118,
      borderLeftWidth: 1,
      borderColor: "#e4eaf0",
      paddingLeft: 12,
    },
    asideLabel: { fontSize: 8, color: muted, marginBottom: 2 },
    asideValue: { fontSize: 10, fontWeight: 700, marginBottom: 7 },
    focus: {
      backgroundColor: "#eaf8f1",
      borderRadius: 7,
      borderLeftWidth: 3,
      borderColor: accent,
      padding: 9,
      marginBottom: 9,
    },
    title: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
    focusText: {
      fontSize: 17,
      lineHeight: 1.2,
      fontWeight: 700,
      marginBottom: 3,
    },
    section: { marginBottom: 9 },
    small: { fontSize: 8, color: muted, lineHeight: 1.4 },
    attendance: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f7faff",
      borderRadius: 6,
      padding: 6,
      marginBottom: 9,
      gap: 12,
    },
    attended: { fontSize: 16, fontWeight: 700, color: accent },
    breakdown: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 5,
    },
    count: { fontSize: 10, fontWeight: 700, marginTop: 2 },
    cards: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
    card: { width: "23.7%", marginBottom: 4 },
    illustration: {
      width: "100%",
      height: 65,
      objectFit: "contain",
      borderRadius: 5,
      marginBottom: 5,
    },
    activityName: {
      fontSize: 9,
      fontWeight: 700,
      lineHeight: 1.25,
      marginBottom: 3,
    },
    purpose: { fontSize: 8.5, color: muted, lineHeight: 1.35 },
    chart: {
      borderWidth: 1,
      borderColor: "#e3eaf1",
      borderRadius: 6,
      padding: 8,
      marginTop: 3,
    },
    plot: {
      height: 58,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
      borderBottomWidth: 1,
      borderColor: "#ccdbe3",
      paddingHorizontal: 10,
    },
    column: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
    value: { fontSize: 9, fontWeight: 700, marginBottom: 3 },
    bar: {
      width: "60%",
      backgroundColor: accent,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      minHeight: 0,
    },
    dates: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 10,
      marginTop: 4,
    },
    date: { flex: 1, fontSize: 8, color: muted, textAlign: "center" },
    paragraph: { marginBottom: 5 },
    noteRow: { flexDirection: "row", gap: 10, marginTop: 1 },
    next: {
      width: "60%",
      backgroundColor: "#f0f7fc",
      borderRadius: 6,
      padding: 10,
    },
    closing: {
      flex: 1,
      backgroundColor: "#f6f8fc",
      borderRadius: 6,
      padding: 10,
    },
    stacked: {
      width: "100%",
      backgroundColor: "#f0f7fc",
      borderRadius: 6,
      padding: 10,
      marginBottom: 9,
    },
    review: { fontSize: 8.5, fontWeight: 700, marginTop: 5 },
    fixedHeader: {
      position: "absolute",
      top: 25,
      left: 30,
      right: 30,
      borderBottomWidth: 1,
      borderColor: "#e3eaf1",
      paddingBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    fixedFooter: {
      position: "absolute",
      bottom: 23,
      left: 30,
      right: 30,
      fontSize: 7.5,
      color: muted,
      borderTopWidth: 1,
      borderColor: "#dce8e4",
      paddingTop: 6,
    },
  });
export function ReportPdf({
  model,
  fontBase = "/fonts",
  branding = true,
  headerSpace = 82,
  activityPosters,
}: {
  model: ReportViewModel;
  fontBase?: string;
  branding?: boolean;
  headerSpace?: number;
  activityPosters?: Record<string, string>;
}) {
  const m = reportPresentation(model),
    labels = { ...reportLabels, ...model.labels };
  const s = styles(
    registerFonts(fontBase),
    /^#[\da-f]{6}$/i.test(m.brandAccent ?? "") ? m.brandAccent : green,
  );
  const artwork =
    fontBase.replace(/[\\/]fonts\/?$/, "") + "/report-activities/";
  const longNext =
    m.nextStep.length +
      (m.observationCriteria?.length ?? 0) +
      (m.note?.length ?? 0) >
    700;
  const next = (
    <>
      <Text style={s.title} minPresenceAhead={24}>
        {labels.next}
      </Text>
      <Text>{m.nextStep}</Text>
      {m.nextDrill && (
        <Text style={s.small}>Assigned next drill: {m.nextDrill}</Text>
      )}
      {m.observationCriteria && (
        <Text style={s.small}>Coach will observe: {m.observationCriteria}</Text>
      )}
      <Text style={s.review}>
        {m.reviewDate
          ? `Review date: ${formatRecordedDate(m.reviewDate)}`
          : labels.reviewPending}
      </Text>
    </>
  );
  const closing = (
    <>
      <Text style={s.title} minPresenceAhead={24}>
        {m.labels?.closing ?? "Coach's note"}
      </Text>
      <Text>{m.note}</Text>
    </>
  );
  return (
    <Document
      title={`${m.player} - Player Development Report`}
      author={m.academy}
      subject="Private player development report"
    >
      <Page size="A4" style={{ ...s.page, paddingTop: headerSpace }} wrap>
        {branding && (
          <>
            <View fixed style={s.fixedHeader}>
              <View style={{ maxWidth: "65%" }}>
                <Text style={{ fontSize: 14, fontWeight: 700 }}>
                  {m.academy}
                </Text>
                <Text style={s.small}>Powered by Sportozen</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: 700 }}>
                  {m.periodLabel}
                </Text>
                <Text style={s.small}>{labels.title}</Text>
              </View>
            </View>
            <View fixed style={s.fixedFooter}>
              <Text>
                {labels.privacy} | {m.demo ? "Fictional QA data | " : ""}
                External delivery: {m.externalDelivery}
              </Text>
            </View>
          </>
        )}
        <View style={s.identity} wrap={m.player.length > 120}>
          {m.playerPhoto &&
          /^data:image\/(png|jpeg);base64,/.test(m.playerPhoto) ? (
            <PdfImage
              src={m.playerPhoto}
              style={{ ...s.avatar, objectFit: "cover" }}
            />
          ) : (
            <View style={s.avatar}>
              <Text style={s.initials}>{m.playerInitials}</Text>
            </View>
          )}
          <View style={s.identityText}>
            <Text style={s.name}>{m.player}</Text>
            <Text style={s.meta}>
              {[m.ageCategory, m.squad, m.sport].filter(Boolean).join(" | ")}
            </Text>
            <Text style={s.meta}>
              {m.coach ? `Coach: ${m.coach}` : "Coach not recorded"}
            </Text>
            <Text style={s.status}>Report status: {m.status}</Text>
          </View>
          <View style={s.aside}>
            <Text style={s.asideLabel}>Reporting period</Text>
            <Text style={s.asideValue}>{m.periodLabel}</Text>
            {m.attendance && (
              <>
                <Text style={s.asideLabel}>Sessions attended</Text>
                <Text style={s.asideValue}>
                  {m.attendance.present} / {m.attendance.total}
                </Text>
              </>
            )}
          </View>
        </View>
        <View
          style={s.focus}
          wrap={m.focus.length + (m.reviewedReason?.length ?? 0) > 600}
        >
          <Text style={s.title} minPresenceAhead={24}>
            Development focus
          </Text>
          <Text style={s.focusText}>{m.focus}</Text>
          {m.reviewedReason && <Text style={s.small}>{m.reviewedReason}</Text>}
        </View>
        {m.attendance && (
          <View style={s.attendance} wrap={false}>
            <View style={s.breakdown}>
              {(
                [
                  ["Present", m.attendance.present],
                  ["Absent", m.attendance.absent],
                  ["Excused", m.attendance.excused],
                  ["Unmarked", m.attendance.unmarked],
                ] as const
              ).map(([label, count]) => (
                <View key={label}>
                  <Text style={{ fontSize: 9, lineHeight: 1.3 }}>
                    <Text style={{ fontWeight: 700 }}>{count} </Text>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={s.section}>
          <Text style={s.title} minPresenceAhead={110}>
            {labels.practised}
          </Text>
          {m.activityCards.length ? (
            <>
              <View style={s.cards}>
                {m.activityCards.map((a, i) => (
                  <View
                    key={i}
                    style={s.card}
                    wrap={a.name.length + a.purpose.length > 700}
                  >
                    <PdfImage
                      src={
                        activityPosters?.[activityIllustration(a.name)] ??
                        `${artwork}${activityIllustration(a.name)}.png`
                      }
                      style={s.illustration}
                    />
                    <Text style={s.activityName}>{a.name}</Text>
                    <Text style={s.purpose}>{a.purpose}</Text>
                    {a.activity && <Text style={s.purpose}>{a.activity}</Text>}
                  </View>
                ))}
              </View>
              <Text style={s.small}>
                Generic activity illustrations - demonstrations, not recordings
                of the player.
              </Text>
            </>
          ) : (
            <Text>{m.practised || "No completed activities recorded."}</Text>
          )}
        </View>
        <View style={s.section}>
          <Text style={s.title} minPresenceAhead={95}>
            {m.labels?.observed ?? "Reviewed development observations"}
          </Text>
          {m.measurementSeries.map((series, index) => {
            const maximum = Math.max(
              1,
              ...series.points.map((p) => p.total ?? p.value),
            );
            return (
              <View key={index} style={s.chart} wrap={false}>
                <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 5 }}>
                  {series.label}
                </Text>
                <View style={s.plot}>
                  {series.points.map((p, i) => (
                    <View key={i} style={s.column}>
                      <Text style={s.value}>
                        {p.total !== undefined
                          ? `${p.value}/${p.total}`
                          : `${p.value}${series.unit === "SECONDS" ? " s" : ""}`}
                      </Text>
                      <View
                        style={{ ...s.bar, height: (40 * p.value) / maximum }}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.dates}>
                  {series.points.map((p, i) => (
                    <Text key={i} style={s.date}>
                      {p.dateLabel}
                    </Text>
                  ))}
                </View>
                <Text style={{ ...s.small, marginTop: 5 }}>
                  {series.comparable
                    ? "Comparable recorded observations; further sessions are needed to confirm sustained progress."
                    : "Separate recorded observations; no comparable progress trend is inferred."}
                  {series.points.every((p) => p.dateKind === "REVIEWED")
                    ? " Dates identify reviewed observations."
                    : series.points.every((p) => p.dateKind === "SESSION")
                      ? " Dates identify recorded sessions."
                      : " Dates are shown only where recorded; other observation dates are unknown."}
                </Text>
              </View>
            );
          })}
          {!m.measurementSeries.length && (
            <Text style={s.small}>
              No comparable measurements recorded. No numerical result is
              inferred.
            </Text>
          )}
          {m.observations.map((text, index) => (
            <Text key={index} style={{ ...s.paragraph, marginTop: 5 }}>
              {text}
            </Text>
          ))}
        </View>
        {m.coachEvaluation.length > 0 && (
          <View style={s.section}>
            <Text style={s.title} minPresenceAhead={30}>
              Coach&apos;s evaluation
            </Text>
            {m.coachEvaluation.map((text, index) => (
              <Text key={index} style={s.paragraph}>
                {text}
              </Text>
            ))}
          </View>
        )}
        {longNext ? (
          <>
            <View style={s.stacked}>{next}</View>
            {m.note && <View style={s.stacked}>{closing}</View>}
          </>
        ) : (
          <View style={s.noteRow} wrap={false}>
            <View style={m.note ? s.next : { ...s.next, width: "100%" }}>
              {next}
            </View>
            {m.note && <View style={s.closing}>{closing}</View>}
          </View>
        )}
      </Page>
    </Document>
  );
}

function textLines(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.replace(/[\r\n]+/g, " ").split(/\s+/)) {
    const candidate = line ? line + " " + word : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = "";
    }
    if (font.widthOfTextAtSize(word, size) > width) {
      for (const letter of word) {
        if (font.widthOfTextAtSize(line + letter, size) > width) {
          lines.push(line);
          line = "";
        }
        line += letter;
      }
    } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}
// Preserve the proven continuation-page branding path and selectable Noto text.
export async function generateReportPdf(
  model: ReportViewModel,
  fontBase = "/fonts",
  brandingFonts?: [Uint8Array, Uint8Array],
  activityPosters?: Record<string, string>,
) {
  const m = reportPresentation(model),
    document = await PDFDocument.create();
  document.setTitle(`${m.player} - Player Development Report`);
  document.setAuthor(m.academy);
  document.setSubject("Private player development report");
  document.registerFontkit(fontkit);
  const fontBytes =
    brandingFonts ??
    (await Promise.all(
      ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
        const response = await fetch(`${fontBase}/${name}`);
        if (!response.ok) throw new Error("Report branding font unavailable.");
        return new Uint8Array(await response.arrayBuffer());
      }),
    ));
  const [regular, bold] = await Promise.all(
    fontBytes.map((bytes) => document.embedFont(bytes, { subset: true })),
  );
  const logo = m.logoData
    ? await (/^data:image\/png/i.test(m.logoData)
        ? document.embedPng(m.logoData)
        : document.embedJpg(m.logoData))
    : undefined;
  const identityX = logo ? 69 : 30,
    academyLines = textLines(m.academy, bold, 13, 315 - (identityX - 30));
  const headerRule = Math.max(70, 35 + academyLines.length * 15 + 12),
    headerSpace = headerRule + 12;
  const rendered = await pdf(
    <ReportPdf
      model={model}
      fontBase={fontBase}
      branding={false}
      headerSpace={headerSpace}
      activityPosters={activityPosters}
    />,
  ).toBlob();
  const body = await PDFDocument.load(await rendered.arrayBuffer());
  const embedded = await document.embedPdf(body, body.getPageIndices()),
    pages = embedded.map((p) => document.addPage([p.width, p.height]));
  const labels = { ...reportLabels, ...model.labels };
  pages.forEach((page, index) => {
    const right = page.getWidth() - 30,
      top = page.getHeight(),
      ink = rgb(0.047, 0.16, 0.259),
      secondary = rgb(0.32, 0.4, 0.49),
      rule = rgb(0.87, 0.92, 0.91);
    page.drawPage(embedded[index], {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
    if (logo) {
      const scale = Math.min(31 / logo.width, 31 / logo.height);
      page.drawImage(logo, {
        x: 30,
        y: top - 57,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    }
    academyLines.forEach((text, i) =>
      page.drawText(text, {
        x: identityX,
        y: top - 35 - i * 15,
        font: bold,
        size: 13,
        color: ink,
      }),
    );
    page.drawText("Powered by Sportozen", {
      x: identityX,
      y: top - (35 + academyLines.length * 15),
      font: regular,
      size: 7.5,
      color: secondary,
    });
    const periodLines = textLines(m.periodLabel, bold, 9.5, 175);
    periodLines.forEach((text, i) =>
      page.drawText(text, {
        x: right - bold.widthOfTextAtSize(text, 9.5),
        y: top - 35 - i * 12,
        font: bold,
        size: 9.5,
        color: ink,
      }),
    );
    page.drawText("Player Development Report", {
      x: right - regular.widthOfTextAtSize("Player Development Report", 8),
      y: top - 50 - Math.max(0, periodLines.length - 1) * 12,
      font: regular,
      size: 8,
      color: secondary,
    });
    page.drawLine({
      start: { x: 30, y: top - headerRule },
      end: { x: right, y: top - headerRule },
      color: rule,
      thickness: 1,
    });
    page.drawLine({
      start: { x: 30, y: 42 },
      end: { x: right, y: 42 },
      color: rule,
      thickness: 1,
    });
    page.drawText(
      `${labels.privacy} | ${m.demo ? "Fictional QA data | " : ""}External delivery: ${m.externalDelivery}`,
      { x: 30, y: 28, font: regular, size: 7, color: secondary },
    );
    const number = `${index + 1} / ${pages.length}`;
    page.drawText(number, {
      x: right - regular.widthOfTextAtSize(number, 8),
      y: 28,
      font: regular,
      size: 8,
      color: secondary,
    });
  });
  return new Blob([new Uint8Array(await document.save())], {
    type: "application/pdf",
  });
}
