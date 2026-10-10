"use client";
import { useState } from "react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  Sheet,
} from "@/components/ui/primitives";
export function Settings() {
  const { reset } = useAcademy();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageTitle
        title="Settings"
        description="A transparent demo workspace with a clean path to real integrations."
      />
      <Card>
        <h2>Integrations</h2>
        {["WhatsApp Business", "Email", "SMS", "Push notifications"].map(
          (name) => (
            <div key={name}>
              <div className="list-row">
                <strong>{name}</strong>
                <Badge tone="amber">NOT CONNECTED</Badge>
              </div>
              <p>
                {name === "WhatsApp Business"
                  ? "WhatsApp Business messaging is not currently connected. Approved messages remain saved as drafts and must be copied or shared manually."
                  : `${name} delivery is not currently connected. Approved drafts remain internal and NOT_SENT.`}
              </p>
              <Button variant="secondary" disabled>
                FUTURE INTEGRATION
              </Button>
            </div>
          ),
        )}
      </Card>
      <Card>
        <h2>Workspace status</h2>
        {[
          "Authentication",
          "Payments",
          "Messaging",
          "Video storage",
          "AI analysis",
        ].map((s) => (
          <div className="list-row" key={s}>
            <strong>{s}</strong>
            <Badge tone="amber">Not Connected</Badge>
          </div>
        ))}
        <h3>Demo storage</h3>
        <p>
          Changes are stored in this browser using a versioned repository
          adapter.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Reset demo data
        </Button>
      </Card>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Reset this demo workspace"
      >
        <p>
          This removes saved demo edits and restores the fictional starting
          records.
        </p>
        <Button
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Restore demo data
        </Button>
      </Sheet>
    </>
  );
}
