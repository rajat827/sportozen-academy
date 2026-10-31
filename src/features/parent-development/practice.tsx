"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
export const practiceFeedback = [
  "We understood the activity.",
  "We need another demonstration.",
  "This felt difficult.",
];
export function PracticeView({
  player,
  focus,
  activities,
  homePractice,
  nextStep,
  reviewDate,
  onHelp,
}: {
  player: string;
  focus: string;
  activities: {
    id: string;
    name: string;
    cue: string;
    instructions?: string;
  }[];
  homePractice: string;
  nextStep: string;
  reviewDate: string;
  onHelp: (message: string) => void;
}) {
  const [selected, setSelected] = useState(activities[0]?.id ?? "");
  const activity = activities.find((a) => a.id === selected);
  return (
    <Card>
      <h2>Practise together</h2>
      <p>
        Parent-supported practice for {player}. A parent helps read the activity
        and contact the coach; a child does not need an account or phone.
      </p>
      <h3>What we are working on</h3>
      <p>{focus}</p>
      <h3>The activity to practise</h3>
      {activities.map((a) => (
        <Button
          key={a.id}
          variant={a.id === selected ? "primary" : "secondary"}
          onClick={() => setSelected(a.id)}
        >
          {a.name}
        </Button>
      ))}
      {activity ? (
        <>
          <p>{activity.name}</p>
          <h3>One coaching cue</h3>
          <p>
            {activity.cue ||
              "No coaching cue recorded. Ask the coach for guidance."}
          </p>
          {activity.instructions && <p>{activity.instructions}</p>}
        </>
      ) : (
        <p>No approved activity is assigned yet.</p>
      )}
      <p>
        No approved demonstration is attached to this plan. Ask the coach if you
        need one.
      </p>
      <h3>Optional home practice</h3>
      <p>
        {homePractice ||
          "No home practice is assigned. Ask the coach before practising these training activities at home."}
      </p>
      <h3>Next step</h3>
      <p>{nextStep || "No next step recorded."}</p>
      <p>Next review: {reviewDate || "To be confirmed"}</p>
      <h3>Ask the coach for help</h3>
      <p>
        Prepare an editable private message. Nothing is posted until you submit
        it. Parent-submitted practice feedback is not reviewed performance
        evidence.
      </p>
      {practiceFeedback.map((feedback) => (
        <Button
          key={feedback}
          variant="secondary"
          onClick={() =>
            onHelp(
              `Parent-submitted practice feedback\n${player}${activity ? ` — ${activity.name}` : ""}\n${feedback}`,
            )
          }
        >
          {feedback}
        </Button>
      ))}
      <Button
        onClick={() =>
          onHelp(
            `Parent-submitted practice feedback\nPlease help us understand ${player}'s assigned activity${activity ? `: ${activity.name}` : "."}`,
          )
        }
      >
        Ask the coach for help
      </Button>
    </Card>
  );
}
