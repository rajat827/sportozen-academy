import {
  access,
  sameOrigin,
  privateJson,
  apiError,
} from "@/server/workspace-access";
import { trainingAction, trainingHistory } from "@/server/training-service";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> },
) {
  try {
    const { academyId } = await params,
      url = new URL(request.url),
      kind = z
        .enum(["squad", "venue", "session", "attendance", "evidence"])
        .parse(url.searchParams.get("kind")),
      id = z.string().min(1).parse(url.searchParams.get("id"));
    return privateJson(
      trainingHistory(await access(request.headers, academyId), kind, id),
    );
  } catch (e) {
    return apiError(e);
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
      trainingAction(
        await access(request.headers, academyId),
        await request.json(),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
