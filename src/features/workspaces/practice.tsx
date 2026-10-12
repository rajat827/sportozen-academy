"use client";
import type { useWorkspace } from "@/hooks/use-workspace";
import type { WorkspacePlayer } from "@/domain/workspace";
import { PracticeView } from "@/features/parent-development/practice";
export function ParentPractice({
  workspace: w,
  player,
  onHelp,
}: {
  workspace: ReturnType<typeof useWorkspace>;
  player: WorkspacePlayer;
  onHelp: (body: string) => void;
}) {
  // Parent payload contains only server-authorised approved plan snapshots.
  const plan = w.data!.records.plan.find((p) => p.playerId === player.id);
  const report = [...w.data!.records.report]
    .reverse()
    .find((r) => r.playerId === player.id && r.approvedPlan?.id === plan?.id);
  if (!plan || !report?.snapshot)
    return <p>No approved practice plan is available for your linked child.</p>;
  const activities = report.snapshot.activities
    .filter((a) => !a.drillId || plan.drillIds.includes(a.drillId))
    .map((a, i) => ({
      id: String(i),
      name: a.name,
      instructions: a.activity,
      // An observation criterion is not an instruction; never invent a cue.
      cue: a.cue || "",
    }));
  return (
    <PracticeView
      player={player.name}
      focus={plan.focus}
      activities={activities}
      homePractice={plan.homePractice}
      nextStep={plan.nextStep}
      reviewDate={plan.reviewDate}
      onHelp={onHelp}
    />
  );
}
