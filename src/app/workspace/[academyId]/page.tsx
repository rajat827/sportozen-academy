import { headers } from "next/headers";
import { context } from "@/server/workspace-service";
import { WorkspaceScreen } from "@/features/workspaces/workspace-screen";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ academyId: string }>;
  searchParams: Promise<{
    player?: string | string[];
    session?: string | string[];
  }>;
}) {
  const { academyId } = await params;
  await context(await headers(), academyId);
  const selection = await searchParams;
  return (
    <WorkspaceScreen
      key={academyId}
      academyId={academyId}
      initialPlayer={
        typeof selection.player === "string" ? selection.player : ""
      }
      initialSession={
        typeof selection.session === "string" ? selection.session : ""
      }
    />
  );
}
