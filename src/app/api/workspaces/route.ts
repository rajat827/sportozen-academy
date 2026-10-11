import { authenticatedUser } from "@/server/auth";
import { createAcademy, workspaces } from "@/server/workspace-service";
import { sameOrigin, privateJson, apiError } from "@/server/workspace-access";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request.headers);
    return privateJson({
      user: { id: user.id, name: user.name },
      workspaces: workspaces(user.id),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    return privateJson(
      await createAcademy(request.headers, await request.json()),
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
