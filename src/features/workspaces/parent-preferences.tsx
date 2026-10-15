"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { useWorkspace } from "@/hooks/use-workspace";
export function ParentPreferences({
  workspace: w,
  playerId,
}: {
  workspace: ReturnType<typeof useWorkspace>;
  playerId?: string;
}) {
  const d = w.data!,
    saved = d.records.preference[0];
  const [value, setValue] = useState(
      saved ?? {
        nutrition: false,
        development: true,
        inApp: true,
        language: d.academy.language,
        quietStart: "21:00",
        quietEnd: "07:00",
      },
    ),
    [note, setNote] = useState(
      d.records.dietary.find((n) => n.playerId === playerId)?.note ?? "",
    );
  return (
    <Card>
      <h2>Notification preferences</h2>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await w.save("preference", value);
        }}
      >
        {[
          { key: "development", label: "Development plan updates" },
          { key: "inApp", label: "In-app notifications" },
          {
            key: "nutrition",
            label: "Optional nutrition and hydration guidance",
          },
        ].map(({ key, label }) => (
          <label className="check-row" key={key}>
            <input
              type="checkbox"
              checked={Boolean(value[key as keyof typeof value])}
              onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <label>
          Preferred language
          <input
            required
            value={value.language}
            onChange={(e) => setValue({ ...value, language: e.target.value })}
          />
        </label>
        <label>
          Quiet hours start
          <input
            type="time"
            value={value.quietStart}
            onChange={(e) => setValue({ ...value, quietStart: e.target.value })}
          />
        </label>
        <label>
          Quiet hours end
          <input
            type="time"
            value={value.quietEnd}
            onChange={(e) => setValue({ ...value, quietEnd: e.target.value })}
          />
        </label>
        <p>
          Quiet hours apply to configured WhatsApp dispatch. Manage verified
          contact, consent and delivery categories in Settings → Integrations.
        </p>
        <Button disabled={w.busy}>Save preferences</Button>
      </form>
      {playerId && (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            await w.save("dietary", { playerId, note });
          }}
        >
          <p>
            Private note for{" "}
            {d.records.player.find((player) => player.id === playerId)?.name ??
              "your selected child"}
            .
          </p>
          <label>
            Private dietary restriction or allergy note
            <textarea
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <p>
            Visible to you and authorised academy staff. No clinical
            recommendations are generated.
          </p>
          <Button disabled={w.busy}>Save private note</Button>
        </form>
      )}
    </Card>
  );
}
