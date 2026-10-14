import { notFound } from "next/navigation";
import { DesignPreview } from "@/features/design-preview/preview";
import { screenById } from "@/features/design-preview/catalog";
import {
  previewScenarios,
  type PreviewScenario,
} from "@/features/design-preview/catalog";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { screen } = await params;
  const { scenario } = await searchParams;
  if (!screenById(screen)) notFound();
  return (
    <DesignPreview
      screenId={screen}
      scenario={
        previewScenarios.includes(scenario as PreviewScenario)
          ? (scenario as PreviewScenario)
          : "default"
      }
    />
  );
}
