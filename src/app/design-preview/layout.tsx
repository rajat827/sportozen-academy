import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export default function Layout({ children }: { children: ReactNode }) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SPORTOZEN_GALLERY_QA !== "1"
  )
    notFound();
  return children;
}
