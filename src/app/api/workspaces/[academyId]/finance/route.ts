import { context } from "@/server/workspace-service";
import { financeAction, financeView } from "@/server/finance-service";
import { apiError, privateJson, sameOrigin } from "@/server/workspace-access";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ academyId: string }> };
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { academyId } = await params;
    return privateJson(
      financeView(
        await context(request.headers, academyId),
        new URL(request.url).searchParams.get("player") ?? undefined,
      ),
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
      financeAction(
        await context(request.headers, academyId),
        await request.json(),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
