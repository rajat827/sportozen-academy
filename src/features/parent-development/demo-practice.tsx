"use client";
import { useRouter } from "next/navigation";
import { useDevelopmentWorkspace } from "@/hooks/use-development-workspace";
import { parentProjection } from "@/services/communication/conversations";
import { PracticeView } from "./practice";
export function DemoPractice() {
  const { data, actor, ready, setPracticeDraft } = useDevelopmentWorkspace();
  const router = useRouter();
  if (!ready) return <p>Loading approved practice…</p>;
  const records = parentProjection(data, actor.id);
  const update = [...records.updates]
    .reverse()
    .find((u) => u.approvalSnapshot?.plan);
  const plan = update?.approvalSnapshot?.plan;
  const player = records.players.find((p) => p.id === plan?.playerId);
  if (!plan || !player)
    return <p>No approved plan is available for your linked child.</p>;
  return (
    <div className="parent-content">
      <PracticeView
        player={player.name}
        focus={plan.parentSummary}
        activities={plan.assignments.map((a) => ({
          id: a.drillId,
          name:
            data.drills.find((d) => d.id === a.drillId)?.name ||
            "Assigned activity",
          cue: a.cue.split(";")[0],
        }))}
        homePractice={plan.homePractice}
        nextStep={plan.nextGoal}
        reviewDate={plan.reviewDate}
        onHelp={(message) => {
          const conversation = records.conversations.find(
            (c) => c.playerId === player.id && c.status === "OPEN",
          );
          setPracticeDraft(message);
          router.push(
            `/parent/messages${conversation ? `/${conversation.id}` : ""}`,
          );
        }}
      />
    </div>
  );
}
