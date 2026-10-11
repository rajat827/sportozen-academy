import { context, workspace, updateAcademy } from "@/server/workspace-service";
import { sameOrigin, privateJson, apiError } from "@/server/workspace-access";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ academyId: string }> };
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { academyId } = await params;
    return privateJson(workspace(await context(request.headers, academyId)));
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    sameOrigin(request);
    const { academyId } = await params;
    return privateJson(
      updateAcademy(
        await context(request.headers, academyId),
        await request.json(),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
