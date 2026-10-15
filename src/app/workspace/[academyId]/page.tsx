import { headers } from "next/headers";
import { context } from "@/server/workspace-service";
import { AcademyPortal } from "@/features/workspaces/academy-portal";
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
  await searchParams;
  return <AcademyPortal key={academyId} academyId={academyId} />;
}
