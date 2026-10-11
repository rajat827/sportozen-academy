"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { useWorkspace } from "@/hooks/use-workspace";
export function AcademyStructure({
  workspace: w,
  sportId,
}: {
  workspace: ReturnType<typeof useWorkspace>;
  sportId: string;
}) {
  const d = w.data!,
    [branch, setBranch] = useState(""),
    [zone, setZone] = useState(d.academy.timezone),
    [program, setProgram] = useState(""),
    [branchId, setBranchId] = useState(d.records.branch[0]?.id ?? ""),
    [support, setSupport] = useState(""),
    [reason, setReason] = useState(""),
    [playerId, setPlayerId] = useState("");
  return (
    <Card>
      <h2>Branches and programmes</h2>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await w.save("branch", { name: branch, timezone: zone });
        }}
      >
        <label>
          Branch name
          <input
            required
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </label>
        <label>
          Branch IANA time zone
          <input
            required
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
        </label>
        <Button disabled={w.busy}>Add branch</Button>
      </form>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await w.save("program", { name: program, sportId, branchId });
        }}
      >
        <label>
          Programme name
          <input
            required
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
        </label>
        <label>
          Programme branch
          <select
            required
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Choose branch</option>
            {d.records.branch.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.timezone}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={w.busy}>Add sport programme</Button>
      </form>
      {d.records.program.map((p) => (
        <p key={p.id}>
          {p.name} · {p.sportId}
        </p>
      ))}
      {d.membership.role === "OWNER" && (
        <details>
          <summary>Authorise a one-hour platform support review</summary>
          <p>
            Only a registered platform administrator can be selected. Access is
            limited to the selected player’s approved reports and plan
            snapshots; messages, dietary notes and private coach notes remain
            hidden. The grant and reads are audited.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await w.action("support", undefined, {
                userId: support,
                playerIds: [playerId],
                reason,
              });
            }}
          >
            <label>
              Registered platform support account ID
              <input
                required
                value={support}
                onChange={(e) => setSupport(e.target.value)}
              />
            </label>
            <label>
              Specific player
              <select
                required
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                <option value="">Choose player</option>
                {d.records.player.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason for access
              <textarea
                minLength={10}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button disabled={w.busy}>Grant scoped support review</Button>
          </form>
        </details>
      )}
    </Card>
  );
}
