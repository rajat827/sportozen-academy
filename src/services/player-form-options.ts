export const FOOTBALL_PLAYER_POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Winger",
  "Forward / Striker",
  "Multiple positions / Exploring",
] as const;

export const STANDARD_PLAYER_AGE_CATEGORIES = [
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
] as const;

export const UNDECIDED_PLAYER_POSITION = "Not decided yet";
export const UNASSIGNED_PLAYER_BATCH = "Not assigned yet";

export function playerPositionLabel(position: string | undefined) {
  return position?.trim() ? position : UNDECIDED_PLAYER_POSITION;
}

export function isKnownPlayerPosition(position: string) {
  return (FOOTBALL_PLAYER_POSITIONS as readonly string[]).includes(position);
}
