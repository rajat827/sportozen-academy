import { z } from "zod";
const text = z.string().trim().min(1).max(5000),
  id = z.string().min(1).max(100),
  date = z.iso.date(),
  short = z.string().trim().max(200);
export {
  academySchema,
  academyUpdateSchema,
} from "@/domain/academy-configuration-schema";
export const playerSchema = z.object({
  expectedVersion: z.number().int().nonnegative().optional(),
  placementReviewed: z.boolean().optional(),
  name: short.min(2),
  sportIds: z.tuple([z.literal("football")]).default(["football"]),
  squad: short.optional(),
  squadId: id.or(z.literal("")).optional(),
  ageCategory: z.string().trim().max(30).optional(),
  birthDate: date
    .or(z.literal(""))
    .refine(
      (value) => !value || value <= new Date().toISOString().slice(0, 10),
      "Birth date cannot be in the future.",
    )
    .optional(),
  position: short.optional(),
  status: z.enum(["ACTIVE", "TRIAL", "INACTIVE"]).optional(),
  coachId: id,
});
export const planSchema = z.object({
  expectedVersion: z.number().int().nonnegative().optional(),
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
  expectedVersion: z.number().int().nonnegative().optional(),
  sourceEvidenceIds: z.array(id).optional(),
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
  planId: id.or(z.literal("")),
  messageBody: text,
  sourceReportId: id.optional(),
  sourceWeeklyPlanId: id.optional(),
  type: z.enum([
    "DEVELOPMENT",
    "NUTRITION_HYDRATION",
    "UPCOMING_TRAINING",
    "REVIEWED_SESSION",
  ]),
});
export const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "COACH", "PARENT"]),
  playerIds: z.array(id).default([]),
  guardianVerified: z.boolean().default(false),
});
