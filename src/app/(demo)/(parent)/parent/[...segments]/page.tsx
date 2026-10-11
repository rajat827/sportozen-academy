import { RouteScreen } from "@/lib/route-screen";
export default async function ParentPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return <RouteScreen role="parent" segments={segments} />;
}
