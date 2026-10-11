import type { WorkspaceKind } from "@/domain/workspace";
import { context, kinds, saveRecord } from "@/server/workspace-service";
import {
  sameOrigin,
  privateJson,
  apiError,
  visibleRecord,
} from "@/server/workspace-access";
import { WorkspaceError } from "@/server/auth";
export const runtime = "nodejs";
type RouteContext = {
  params: Promise<{ academyId: string; kind: string; recordId: string }>;
};
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { academyId, kind, recordId } = await params;
    if (!kinds.includes(kind as WorkspaceKind))
      throw new WorkspaceError(404, "Unknown resource.");
    return privateJson(
      visibleRecord(
        await context(request.headers, academyId),
        kind as WorkspaceKind,
        recordId,
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    sameOrigin(request);
    const { academyId, kind, recordId } = await params;
    if (!kinds.includes(kind as WorkspaceKind))
      throw new WorkspaceError(404, "Unknown resource.");
    if (kind === "conversation")
      throw new WorkspaceError(
        405,
        "Use conversation actions to preserve private notes and thread history.",
      );
    const ctx = await context(request.headers, academyId);
    visibleRecord(ctx, kind as WorkspaceKind, recordId);
    return privateJson(
      saveRecord(ctx, kind as WorkspaceKind, await request.json(), recordId),
    );
  } catch (e) {
    return apiError(e);
  }
}
