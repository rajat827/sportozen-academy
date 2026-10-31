import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceError } from "@/server/auth";

/**
 * Server pages that check access before rendering show the denial instead of
 * failing: signed-out visitors sign in, other refusals explain themselves.
 * Unexpected errors still propagate. APIs keep returning their own status.
 */
export function workspacePageDenial(error: unknown) {
  if (!(error instanceof WorkspaceError)) throw error;
  if (error.status === 401) redirect("/sign-in");
  return (
    <main className="secure-page">
      <h1>Sportozen Academy</h1>
      <p role="alert">{error.message}</p>
      <Link className="button secondary" href="/workspace">
        Your academy workspaces
      </Link>
    </main>
  );
}
