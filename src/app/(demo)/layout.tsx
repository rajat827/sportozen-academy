import type { ReactNode } from "react";
import { AcademyProvider } from "@/hooks/use-academy";
import { AppShell } from "@/components/layout/app-shell";
import { notFound } from "next/navigation";
export default function DemoLayout({ children }: { children: ReactNode }) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SPORTOZEN_GALLERY_QA !== "1"
  )
    notFound();
  return (
    <AcademyProvider>
      <AppShell>{children}</AppShell>
    </AcademyProvider>
  );
}
