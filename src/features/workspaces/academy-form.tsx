"use client";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import type { AcademyConfiguration } from "@/domain/workspace";
export function AcademyForm({
  initial,
  onSave,
  busy,
}: {
  initial?: AcademyConfiguration;
  onSave: (value: unknown) => Promise<unknown>;
  busy: boolean;
}) {
  const [form, setForm] = useState(
    initial ?? {
      name: "",
      contactEmail: "",
      country: "IN",
      language: "English",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      logoData: "",
      sportIds: ["football"],
      ageGroups: [],
      reviewFrequency: "Coach review after comparable sessions",
      modules: ["development", "reports", "communication"],
      demo: false,
    },
  );
  const field = (key: keyof typeof form, value: unknown) =>
    setForm({ ...form, [key]: value });
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({ ...form, sportIds: ["football"] });
      }}
    >
      <div className="form-grid">
        {[
          { key: "name", label: "Academy name" },
          { key: "contactEmail", label: "Academy contact email" },
          { key: "country", label: "Country code" },
          { key: "language", label: "Default language" },
          { key: "currency", label: "Currency code" },
          { key: "timezone", label: "Default branch time zone" },
          { key: "dateLocale", label: "Date and number locale" },
          { key: "reviewFrequency", label: "Review frequency" },
        ].map(({ key, label }) => (
          <label key={key}>
            {label}
            <input
              required
              type={key === "contactEmail" ? "email" : "text"}
              value={String(form[key as keyof typeof form])}
              onChange={(e) => field(key as keyof typeof form, e.target.value)}
            />
          </label>
        ))}
        <label>
          Measurement units
          <select
            value={form.measurementSystem}
            onChange={(e) => field("measurementSystem", e.target.value)}
          >
            <option value="METRIC">Metric</option>
            <option value="IMPERIAL">Imperial</option>
          </select>
        </label>
        <label>
          Brand accent
          <select
            value={form.brandAccent}
            onChange={(e) => field("brandAccent", e.target.value)}
          >
            <option value="#008463">Sportozen green</option>
            <option value="#2364a1">Blue</option>
            <option value="#6750a4">Purple</option>
          </select>
        </label>
      </div>
      <label>
        Academy PNG logo (maximum 200 KB)
        <input
          type="file"
          accept="image/png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 200000 || file.type !== "image/png") {
              e.target.setCustomValidity("Choose a PNG file under 200 KB.");
              e.target.reportValidity();
              return;
            }
            e.target.setCustomValidity("");
            const reader = new FileReader();
            reader.onload = () => field("logoData", String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <label>
        Age groups
        <input
          value={form.ageGroups.join(", ")}
          onChange={(e) =>
            field(
              "ageGroups",
              e.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
        />
      </label>
      <p>Football academy · Football is configured automatically.</p>
      <fieldset>
        <legend>Academy modules</legend>
        {["development", "reports", "communication", "fees"].map((module) => (
          <label className="check-row" key={module}>
            <input
              type="checkbox"
              checked={form.modules.includes(module)}
              onChange={(e) =>
                field(
                  "modules",
                  e.target.checked
                    ? [...form.modules, module]
                    : form.modules.filter((id) => id !== module),
                )
              }
            />
            {module}
          </label>
        ))}
      </fieldset>
      {!initial && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.demo}
            onChange={(e) => field("demo", e.target.checked)}
          />
          Explicitly label this as a fictional demo academy
        </label>
      )}
      <p className="muted">
        New academies start empty. Currency and time zones are configuration;
        localisation alone does not establish readiness for every country. Staff
        invitations are prepared for manual sharing.
      </p>
      <Button disabled={busy}>
        {busy
          ? "Saving…"
          : initial
            ? "Save academy configuration"
            : "Create empty academy"}
      </Button>
    </form>
  );
}
