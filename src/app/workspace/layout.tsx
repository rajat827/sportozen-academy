import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authentication } from "@/server/auth";
import type { ReactNode } from "react";
export default async function Layout({ children }: { children: ReactNode }) {
  const session = await (
    await authentication()
  ).api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return children;
}
