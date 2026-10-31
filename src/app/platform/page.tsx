import { headers } from "next/headers";
import { platformAccounts } from "@/server/platform-service";
import { PlatformAccounts } from "@/features/workspaces/platform-accounts";
import { workspacePageDenial } from "@/features/workspaces/workspace-unavailable";
export default async function Page() {
  let accounts: Awaited<ReturnType<typeof platformAccounts>>;
  try {
    accounts = await platformAccounts(await headers());
  } catch (error) {
    return workspacePageDenial(error);
  }
  return <PlatformAccounts accounts={accounts} />;
}
