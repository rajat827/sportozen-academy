import { z } from "zod";
import { acceptInvitation } from "@/server/workspace-service";
import { sameOrigin, privateJson, apiError } from "@/server/workspace-access";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { token } = z
      .object({ token: z.string().length(64) })
      .parse(await request.json());
    return privateJson(await acceptInvitation(request.headers, token));
  } catch (e) {
    return apiError(e);
  }
}
