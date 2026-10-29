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
  searchParams: Promise<{ scenario?: string; role?: string }>;
}) {
  const { screen } = await params;
  const { scenario, role } = await searchParams;
  if (!screenById(screen)) notFound();
  return (
    <DesignPreview
      screenId={screen}
      settingsRole={
        screen !== "academy-settings" || !role || role === "OWNER"
          ? "OWNER"
          : role === "PARENT"
            ? "PARENT"
            : "COACH"
      }
      scenario={
        previewScenarios.includes(scenario as PreviewScenario)
          ? (scenario as PreviewScenario)
          : "default"
      }
    />
  );
}
