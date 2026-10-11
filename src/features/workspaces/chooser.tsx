"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { navigatePrivateWorkspace } from "@/lib/private-navigation";
import { useRouter } from "next/navigation";
import { Card, PageTitle, Button, Badge } from "@/components/ui/primitives";
import { AcademyForm } from "./academy-form";
import { workspaceRequest } from "@/hooks/use-workspace";
import type { AcademyConfiguration } from "@/domain/workspace";
import { authClient } from "@/lib/auth-client";
export function WorkspaceChooser() {
  const router = useRouter(),
    [list, setList] = useState<
      { academy: AcademyConfiguration; role: string }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState("");
  useEffect(() => {
    const c = new AbortController();
    workspaceRequest<{ workspaces: typeof list }>(
      "/api/workspaces",
      "GET",
      undefined,
      c.signal,
    )
      .then((r) => setList(r.workspaces))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  return (
    <main className="secure-page">
      <div className="secure-topline">
        <Link className="secure-wordmark" href="/">
          Sportozen <span>ACADEMY</span>
        </Link>
        <Button
          variant="secondary"
          onClick={async () => {
            await authClient.signOut();
            navigatePrivateWorkspace("/sign-in");
          }}
        >
          Sign out
        </Button>
      </div>
      <PageTitle
        title="Your academy workspaces"
        description="Independent customer academies, with membership verified by the server."
      />
      {error && <p role="alert">{error}</p>}
      <div className="workspace-grid">
        {list.map(({ academy, role }) => (
          <Card key={academy.id}>
            <Badge>
              {academy.demo ? "Fictional demo academy" : "Academy workspace"}
            </Badge>
            <h2>{academy.name}</h2>
            <p>
              {academy.sportIds.join(" · ")} · {role}
            </p>
            <Link
              className="button primary"
              prefetch={false}
              href={`/workspace/${academy.id}`}
              onClick={(event) => {
                event.preventDefault();
                navigatePrivateWorkspace(`/workspace/${academy.id}`);
              }}
            >
              Open academy
            </Link>
          </Card>
        ))}
      </div>
      <div className="two-columns">
        <Card>
          <h2>Onboard an academy</h2>
          <p>
            Create academy → configure region and sports → add branches and
            programs → invite staff → add players → explicitly link guardians.
          </p>
          <AcademyForm
            busy={busy}
            onSave={async (value) => {
              setBusy(true);
              setError("");
              try {
                const academy = await workspaceRequest<AcademyConfiguration>(
                  "/api/workspaces",
                  "POST",
                  value,
                );
                router.push(`/workspace/${academy.id}`);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not create academy.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
        <Card>
          <h2>Accept a private invitation</h2>
          <p>
            Sign in with the invited account. Invitations do not automatically
            merge children or records between academies.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const result = await workspaceRequest<{ academyId: string }>(
                  "/api/invitations/accept",
                  "POST",
                  { token },
                );
                router.push(`/workspace/${result.academyId}`);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Invitation unavailable.",
                );
              }
            }}
          >
            <label>
              Invitation token
              <input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
            <Button>Accept academy invitation</Button>
          </form>
          <Link className="text-link" href="/platform">
            Platform administration
          </Link>
          <p className="muted">
            Platform administrators manage customer accounts and entitlements.
            They do not receive routine access to private player records.
          </p>
        </Card>
      </div>
    </main>
  );
}
