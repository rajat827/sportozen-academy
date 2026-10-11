import { describe, it, expect } from "vitest";
import {
  academySchema,
  playerSchema,
  planSchema,
  drillSchema,
  reportSchema,
  updateSchema,
} from "@/server/workspace-schemas";
import { operationalSports } from "@/config/sports/workspace-sports";

const academy = {
  name: "Fictional FC",
  contactEmail: "fictional@example.test",
  country: "IN",
  language: "English",
  currency: "INR",
  timezone: "Asia/Kolkata",
  dateLocale: "en-IN",
  measurementSystem: "METRIC",
  brandAccent: "#008463",
};
const plan = {
  playerId: "child",
  coachId: "coach",
  focus: "Dribbling",
  reason: "Reviewed own attempts",
  drillIds: [],
  observe: "Close control",
  homePractice: "",
  reviewDate: "2026-10-25",
  nextStep: "Review comparable sessions",
  status: "ACTIVE",
  privateNote: "",
};
describe("Football-only release boundary", () => {
  it("automatically assigns football without a customer sport selector", () => {
    expect(academySchema.parse(academy).sportIds).toEqual(["football"]);
    expect(
      playerSchema.parse({
        name: "Fictional Player",
        squad: "U13",
        coachId: "coach",
      }).sportIds,
    ).toEqual(["football"]);
    expect(planSchema.parse(plan).sportId).toBe("football");
    expect(Object.keys(operationalSports)).toEqual(["football"]);
  });
  it.each(["cricket", "badminton", "hockey"])(
    "rejects %s activation, enrolment and record creation",
    (sportId) => {
      expect(
        academySchema.safeParse({ ...academy, sportIds: ["football", sportId] })
          .success,
      ).toBe(false);
      expect(
        playerSchema.safeParse({
          name: "Fictional",
          squad: "Junior",
          coachId: "coach",
          sportIds: [sportId],
        }).success,
      ).toBe(false);
      expect(planSchema.safeParse({ ...plan, sportId }).success).toBe(false);
      expect(
        drillSchema.safeParse({
          sportId,
          name: "Practice",
          focusArea: "Dribbling",
          purpose: "Close control",
          cue: "Both feet",
        }).success,
      ).toBe(false);
      expect(
        reportSchema.safeParse({
          sportId,
          playerId: "child",
          planId: "plan",
          period: "2026-10",
          observation: "Reviewed",
          evidenceType: "COACH_OBSERVATION",
          nextStep: "Review",
          closingNote: "",
        }).success,
      ).toBe(false);
      expect(
        updateSchema.safeParse({
          sportId,
          playerId: "child",
          planId: "plan",
          messageBody: "Reviewed",
          type: "DEVELOPMENT",
        }).success,
      ).toBe(false);
    },
  );
  it("keeps existing football vocabulary alongside additional focus choices without inventing drills", () => {
    expect(operationalSports.football.skills).toEqual(
      expect.arrayContaining([
        "Receiving",
        "Dribbling",
        "Goalkeeping",
        "Scanning",
        "Weak-foot passing",
      ]),
    );
    expect(operationalSports.football.templates).toHaveLength(1);
  });
});
