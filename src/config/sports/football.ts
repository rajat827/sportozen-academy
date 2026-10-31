import type { SportConfiguration } from "@/domain/entities";
export const football: SportConfiguration = {
  id: "football",
  name: "Football",
  focusAreas: [
    "Ball control",
    "Passing",
    "Dribbling",
    "Shooting",
    "Scanning",
    "Positioning",
    "Recovery movement",
    "Decision-making",
    "Agility",
    "Balance",
    "Coordination",
    "Endurance",
  ].map((name) => ({ id: name.toLowerCase().replaceAll(" ", "-"), name })),
  planTemplates: [
    {
      id: "close-control",
      name: "Close control and finishing",
      focusIds: ["dribbling", "shooting"],
    },
  ],
  positions: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  skills: ["Receiving", "Passing", "Dribbling", "Finishing", "Defending"],
  stages: [
    "Introduced",
    "Developing",
    "Consistent",
    "Applied Under Pressure",
    "Coach Verified",
  ],
  reportCategories: ["Technical practice", "Game understanding", "Teamwork"],
  sessionTerm: "Training session",
};
