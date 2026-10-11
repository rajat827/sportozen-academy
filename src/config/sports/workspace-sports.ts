import { football } from "./football";
export interface OperationalSport {
  id: string;
  name: string;
  skills: string[];
  roles: string[];
  drillCategories: string[];
  stages: string[];
  sessionTerm: string;
  assessments: { id: string; label: string; unit: string }[];
  reportSections: string[];
  aiAvailable: false;
  templates: {
    id: string;
    name: string;
    focusArea: string;
    purpose: string;
    cue: string;
  }[];
}
export const operationalSports: Record<string, OperationalSport> = {
  football: {
    id: "football",
    name: "Football",
    skills: football.skills,
    roles: football.positions,
    drillCategories: ["Ball control", "Passing", "Finishing"],
    stages: football.stages,
    sessionTerm: "Training session",
    assessments: [
      {
        id: "controlled-attempts",
        label: "Coach-recorded controlled attempts",
        unit: "attempts",
      },
    ],
    reportSections: [
      "Practice",
      "Coach-reviewed observation",
      "Next development step",
    ],
    aiAvailable: false,
    templates: [
      {
        id: "football-close-control",
        name: "Close-control practice",
        focusArea: "Dribbling",
        purpose: "Intended to support close control during direction changes",
        cue: "Comfortable touches; coach records comparable attempts",
      },
    ],
  },
  cricket: {
    id: "cricket",
    name: "Cricket",
    skills: ["Batting", "Bowling", "Fielding", "Wicketkeeping"],
    roles: ["Batter", "Bowler", "Wicketkeeper", "All-rounder"],
    drillCategories: [
      "Batting technique",
      "Bowling rhythm",
      "Fielding movement",
    ],
    stages: ["Introduced", "Developing", "Consistent"],
    sessionTerm: "Practice session",
    assessments: [
      {
        id: "contact-attempts",
        label: "Recorded contact attempts",
        unit: "balls",
      },
    ],
    reportSections: [
      "Practice",
      "Coach-reviewed observation",
      "Next development step",
    ],
    aiAvailable: false,
    templates: [
      {
        id: "cricket-batting-contact",
        name: "Controlled batting contact",
        focusArea: "Batting",
        purpose:
          "Intended to support a comfortable setup and controlled contact",
        cue: "Coach observes setup and contact in comparable practice",
      },
    ],
  },
  badminton: {
    id: "badminton",
    name: "Badminton",
    skills: ["Serving", "Court movement", "Net play", "Racket control"],
    roles: ["Singles", "Doubles"],
    drillCategories: ["Serving", "Footwork", "Net play"],
    stages: ["Introduced", "Developing", "Consistent"],
    sessionTerm: "Court session",
    assessments: [
      {
        id: "serve-attempts",
        label: "Recorded serve attempts",
        unit: "shuttles",
      },
    ],
    reportSections: [
      "Practice",
      "Coach-reviewed observation",
      "Next development step",
    ],
    aiAvailable: false,
    templates: [
      {
        id: "badminton-serve",
        name: "Comfortable serve practice",
        focusArea: "Serving",
        purpose: "Intended to support repeatable serve setup",
        cue: "Coach observes a comfortable setup and shuttle contact",
      },
    ],
  },
};
