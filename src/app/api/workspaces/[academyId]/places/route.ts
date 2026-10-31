import {
  access,
  apiError,
  privateJson,
  sameOrigin,
} from "@/server/workspace-access";
import {
  sessionPlacesAction,
  sessionPlacesStatus,
} from "@/server/session-places-service";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> },
) {
  try {
    const { academyId } = await params;
    return privateJson(
      sessionPlacesStatus(await access(request.headers, academyId)),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> },
) {
  try {
    sameOrigin(request);
    const { academyId } = await params;
    return privateJson(
      await sessionPlacesAction(
        await access(request.headers, academyId),
        await request.json(),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
