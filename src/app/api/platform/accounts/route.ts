import { platformAccounts, configureAccount } from "@/server/platform-service";
import { sameOrigin, privateJson, apiError } from "@/server/workspace-access";
export async function GET(request: Request) {
  try {
    return privateJson(await platformAccounts(request.headers));
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    return privateJson(
      await configureAccount(request.headers, await request.json()),
    );
  } catch (e) {
    return apiError(e);
  }
}
