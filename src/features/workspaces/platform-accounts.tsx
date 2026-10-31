"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui/primitives";
import { workspaceRequest } from "@/hooks/use-workspace";
type Account = {
  id: string;
  name: string;
  country: string;
  onboardingStatus: string;
  demo: boolean;
  tier: string;
  modules: string[];
  status: string;
};
export function PlatformAccounts({ accounts }: { accounts: Account[] }) {
  const [error, setError] = useState("");
  return (
    <main className="secure-workspace">
      <h1>Platform customer administration</h1>
      <p>
        Customer metadata and entitlements only. Academy membership and an
        explicit audited support grant are required for private player access.
        No billing provider is connected.
      </p>
      <Link href="/workspace">Your academy memberships</Link>
      {error && <p role="alert">{error}</p>}
      {accounts.map((a) => (
        <Card key={a.id}>
          <h2>{a.name}</h2>
          <p>
            {a.country} · {a.onboardingStatus} · {a.tier} · {a.status}
          </p>
          <p>Modules: {a.modules.join(", ")}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              const pausing = a.status === "ACTIVE";
              if (
                pausing &&
                !window.confirm(
                  `Pause ${a.name}? Every owner, coach and parent in this academy loses access until the entitlement is activated again.`,
                )
              )
                return;
              try {
                await workspaceRequest("/api/platform/accounts", "PATCH", {
                  academyId: a.id,
                  tier: a.tier,
                  modules: a.modules,
                  status: pausing ? "PAUSED" : "ACTIVE",
                });
                location.reload();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not update entitlement.",
                );
              }
            }}
          >
            {a.status === "ACTIVE"
              ? "Pause entitlement"
              : "Activate entitlement"}
          </Button>
        </Card>
      ))}
    </main>
  );
}
