export function privateSourcePath(
  academyId: string,
  playerId: string,
  sourceId: string,
  type: "WEEKLY" | "MONTHLY",
) {
  const key = type === "WEEKLY" ? "weekly" : "report";
  const section = type === "WEEKLY" ? "development" : "reports";
  return `/workspace/${encodeURIComponent(academyId)}?section=${section}&player=${encodeURIComponent(playerId)}&${key}=${encodeURIComponent(sourceId)}#${key}-${encodeURIComponent(sourceId)}`;
}
