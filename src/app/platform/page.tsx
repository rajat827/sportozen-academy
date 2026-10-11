import { headers } from "next/headers";
import { platformAccounts } from "@/server/platform-service";
import { PlatformAccounts } from "@/features/workspaces/platform-accounts";
export default async function Page() {
  const accounts = await platformAccounts(await headers());
  return <PlatformAccounts accounts={accounts} />;
}
