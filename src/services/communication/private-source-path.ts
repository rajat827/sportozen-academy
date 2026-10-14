export function privateSourcePath(
  academyId: string,
  playerId: string,
  sourceId: string,
  type: "WEEKLY" | "MONTHLY",
) {
  const key = type === "WEEKLY" ? "weekly" : "report";
  return `/workspace/${encodeURIComponent(academyId)}?player=${encodeURIComponent(playerId)}&${key}=${encodeURIComponent(sourceId)}`;
}
