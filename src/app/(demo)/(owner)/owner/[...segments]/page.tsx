import { RouteScreen } from "@/lib/route-screen";
export default async function OwnerPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return <RouteScreen role="owner" segments={segments} />;
}
