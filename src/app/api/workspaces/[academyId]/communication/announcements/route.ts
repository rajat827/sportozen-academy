import {
  access,
  sameOrigin,
  privateJson,
  apiError,
} from "@/server/workspace-access";
import {
  announcementAction,
  announcementView,
} from "@/server/batch-announcement-service";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ academyId: string }> };
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { academyId } = await params;
    return privateJson(
      announcementView(await access(request.headers, academyId)),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, { params }: RouteContext) {
  try {
    sameOrigin(request);
    const { academyId } = await params;
    return privateJson(
      announcementAction(
        await access(request.headers, academyId),
        await request.json(),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
