import type { WorkspaceKind } from "@/domain/workspace";
import { context, kinds, saveRecord } from "@/server/workspace-service";
import {
  sameOrigin,
  privateJson,
  apiError,
  visibleRecords,
} from "@/server/workspace-access";
import { WorkspaceError } from "@/server/auth";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ academyId: string; kind: string }> };
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { academyId, kind } = await params;
    if (!kinds.includes(kind as WorkspaceKind))
      throw new WorkspaceError(404, "Unknown resource.");
    return privateJson(
      visibleRecords(
        await context(request.headers, academyId),
        kind as WorkspaceKind,
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request, { params }: RouteContext) {
  try {
    sameOrigin(request);
    const { academyId, kind } = await params;
    if (!kinds.includes(kind as WorkspaceKind))
      throw new WorkspaceError(404, "Unknown resource.");
    return privateJson(
      saveRecord(
        await context(request.headers, academyId),
        kind as WorkspaceKind,
        await request.json(),
      ),
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
