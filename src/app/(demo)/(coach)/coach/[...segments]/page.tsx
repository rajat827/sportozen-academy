import { RouteScreen } from "@/lib/route-screen";
export default async function CoachPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return <RouteScreen role="coach" segments={segments} />;
}
