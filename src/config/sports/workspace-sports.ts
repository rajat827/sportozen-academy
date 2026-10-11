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
    skills: [
      ...football.skills,
      "First touch and receiving",
      "Weak-foot passing",
      "Ball protection",
      "Scanning",
      "Positioning",
      "Off-the-ball movement",
      "Recovery movement",
      "Goalkeeping",
    ],
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
};
