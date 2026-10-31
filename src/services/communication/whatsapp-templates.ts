import type { WeeklyContent } from "@/domain/communication";
export const weeklyTemplateBody =
  "{{1}}: Training plan for {{2}}. This week, the squad will practise {{3}}. Personal focus: {{4}}. Activities are intended to support {{5}}. The coach will observe {{6}}. Confirmed schedule and optional practice: {{7}}. Reply STOP to opt out.";
export const monthlyTemplateBody =
  "{{1}}: A coach-reviewed development report for {{2}} is available in your private Sportozen account: {{3}}. Sign in to view and download. Reply STOP to opt out.";
export const announcementTemplateBody =
  "{{1}}: {{2}}. {{3}} Reply STOP to opt out.";
export function announcementParameters(
  academy: string,
  category: string,
  body: string,
) {
  const parameters = [academy, category, body].map((value) =>
    value.trim().replace(/\s+/g, " "),
  );
  if (parameters.some((value) => !value || value.length > 400))
    throw new Error(
      "Announcement template values must be recorded and at most 400 characters.",
    );
  const rendered = announcementTemplateBody.replace(
    /\{\{(\d+)\}\}/g,
    (_, n) => parameters[Number(n) - 1],
  );
  if (rendered.length > 1024)
    throw new Error("Announcement exceeds the supported template body budget.");
  return { parameters, rendered };
}
export function templateParameters(
  type: "WEEKLY" | "MONTHLY",
  academy: string,
  period: string,
  url: string,
  content?: WeeklyContent,
) {
  const parameters =
    type === "MONTHLY"
      ? [academy, period, url]
      : [
          academy,
          `${content?.playerName ?? ""} · ${period}`,
          content?.teamFocus ?? "",
          content?.personalFocus ?? "",
          content?.activities
            .map((a) => `${a.name}: ${a.purpose}`)
            .join("; ") ?? "",
          content?.observe ?? "",
          [
            ...(content?.sessions ?? []).map((session) => {
              const format = new Intl.DateTimeFormat("en-GB", {
                timeZone: session.timezone,
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              });
              return `${format.format(new Date(session.startAt))}–${new Intl.DateTimeFormat("en-GB", { timeZone: session.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(session.endAt))} (${session.timezone}), ${session.location}`;
            }),
            ...(content?.preparation ?? []),
            ...(content?.homePractice ? [content.homePractice] : []),
            url,
          ].join("; "),
        ];
  if (parameters.some((p) => !p.trim() || /[\r\n\t]/.test(p) || p.length > 400))
    throw new Error(
      "Template values must be recorded, single-line and at most 400 characters. Shorten the recorded wording before approval.",
    );
  const rendered = (
    type === "WEEKLY" ? weeklyTemplateBody : monthlyTemplateBody
  ).replace(/\{\{(\d+)\}\}/g, (_, n) => parameters[Number(n) - 1]);
  if (rendered.length > 1024)
    throw new Error(
      "Template exceeds the supported 1024-character body budget.",
    );
  return { parameters, rendered };
}
export const templateDefinitions = [
  {
    name: "sportozen_weekly_training",
    language: "en_GB",
    category: "UTILITY",
    components: [{ type: "BODY", text: weeklyTemplateBody }],
  },
  {
    name: "sportozen_monthly_report",
    language: "en_GB",
    category: "UTILITY",
    components: [{ type: "BODY", text: monthlyTemplateBody }],
  },
  {
    name: "sportozen_operational_announcement",
    language: "en_GB",
    category: "UTILITY",
    components: [{ type: "BODY", text: announcementTemplateBody }],
  },
]; // Local drafts only. Meta determines approval and category.
