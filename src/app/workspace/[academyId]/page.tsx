import { headers } from "next/headers";
import { context } from "@/server/workspace-service";
import { AcademyPortal } from "@/features/workspaces/academy-portal";
import { workspacePageDenial } from "@/features/workspaces/workspace-unavailable";
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
  try {
    await context(await headers(), academyId);
  } catch (error) {
    return workspacePageDenial(error);
  }
  await searchParams;
  return <AcademyPortal key={academyId} academyId={academyId} />;
}
