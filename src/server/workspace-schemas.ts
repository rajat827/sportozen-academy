import { z } from "zod";
const text = z.string().trim().min(1).max(5000),
  id = z.string().min(1).max(100),
  date = z.iso.date(),
  short = z.string().trim().max(200);
export const academySchema = z.object({
  name: short.min(2),
  contactEmail: z.email(),
  country: z.string().length(2),
  language: short.min(2),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: short.min(1),
  dateLocale: short.min(2),
  measurementSystem: z.enum(["METRIC", "IMPERIAL"]),
  brandAccent: z.enum(["#008463", "#2364a1", "#6750a4"]),
  logoData: z
    .string()
    .max(300000)
    .refine(
      (value) =>
        !value ||
        /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(value),
      "Use a small PNG logo.",
    )
    .optional(),
  sportIds: z.tuple([z.literal("football")]).default(["football"]),
  ageGroups: z.array(short).default([]),
  reviewFrequency: short.default("Coach review after comparable sessions"),
  modules: z
    .array(z.enum(["development", "reports", "communication", "fees"]))
    .default(["development", "reports", "communication"]),
  demo: z.boolean().default(false),
});
export const playerSchema = z.object({
  name: short.min(2),
  sportIds: z.tuple([z.literal("football")]).default(["football"]),
  squad: short,
  coachId: id,
});
export const planSchema = z.object({
  playerId: id,
  sportId: z.literal("football").default("football"),
  coachId: id,
  focus: short.min(1),
  reason: text,
  drillIds: z.array(id),
  observe: text,
  homePractice: z.string().max(1500),
  reviewDate: date,
  nextStep: text,
  status: z.enum([
    "DRAFT",
    "ACTIVE",
    "NEEDS_REVIEW",
    "CONTINUE",
    "ADAPT",
    "COMPLETED",
    "PAUSED",
  ]),
  privateNote: z.string().max(3000),
});
export const reportSchema = z.object({
  playerId: id,
  sportId: z.literal("football").default("football"),
  planId: id,
  period: short.min(1),
  observation: text,
  evidenceType: z.enum([
    "RAW_RECORD",
    "COACH_OBSERVATION",
    "CALCULATED_METRIC",
    "AI_ESTIMATE",
    "MISSING_OR_UNCLEAR",
  ]),
  nextStep: text,
  closingNote: z.string().max(10000),
});
export const drillSchema = z.object({
  sportId: z.literal("football").default("football"),
  name: short.min(1),
  focusArea: short.min(1),
  purpose: text,
  cue: text,
  templateId: id.optional(),
});
export const updateSchema = z.object({
  playerId: id,
  sportId: z.literal("football").default("football"),
  planId: id,
  messageBody: text,
  sourceReportId: id.optional(),
  type: z.enum(["DEVELOPMENT", "NUTRITION_HYDRATION"]),
});
export const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "COACH", "PARENT"]),
  playerIds: z.array(id).default([]),
  guardianVerified: z.boolean().default(false),
});
