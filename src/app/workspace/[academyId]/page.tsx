import { headers } from "next/headers";
import { context } from "@/server/workspace-service";
import { WorkspaceScreen } from "@/features/workspaces/workspace-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ academyId: string }>;
}) {
  const { academyId } = await params;
  await context(await headers(), academyId);
  return <WorkspaceScreen key={academyId} academyId={academyId} />;
}
