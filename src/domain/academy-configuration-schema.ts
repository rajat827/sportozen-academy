import { z } from "zod";
const short = z.string().trim().max(200);
export const academySchema = z.object({
  name: short.min(2),
  contactEmail: z.email(),
  location: short.optional(),
  about: z.string().trim().max(250).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) =>
        !value ||
        (/^[+\d()\s-]{5,30}$/.test(value) &&
          (value.match(/\d/g)?.length ?? 0) >= 5),
      "Enter a readable phone number, or leave it blank.",
    )
    .optional(),
  website: short
    .refine((value) => {
      if (!value) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Use an http or https website address, or leave it blank.")
    .optional(),
  country: z.string().length(2),
  language: short.min(2),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: short.min(1),
  dateLocale: short.min(2),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  dateFormat: z.enum(["DD_MMM_YYYY", "MM_DD_YYYY", "YYYY_MM_DD"]).optional(),
  timeFormat: z.enum(["12_HOUR", "24_HOUR"]).optional(),
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
    .default(["development", "reports", "communication", "fees"]),
  demo: z.boolean().default(false),
});
export const academyUpdateSchema = academySchema.extend({
  expectedVersion: z.number().int().nonnegative(),
});
