import type { AcademyConfiguration } from "@/domain/workspace";
export const footballSessionThemes = [
  "Ball control and first touch",
  "Passing and receiving",
  "Dribbling and turning",
  "Shooting and finishing",
  "Attacking play",
  "Defending",
  "Positioning",
  "Decision-making",
  "Possession",
  "Small-sided games",
  "Coordination and movement",
  "Goalkeeping",
] as const;
export function sessionThemes(
  academy: Pick<AcademyConfiguration, "sessionThemes">,
): readonly string[] {
  return academy.sessionThemes ?? footballSessionThemes;
}
