"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/primitives";
import type { AcademyConfiguration } from "@/domain/workspace";
import { academySchema } from "@/domain/academy-configuration-schema";
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
      modules: ["development", "reports", "communication", "fees"],
      demo: false,
    },
  );
  const [ageGroups, setAgeGroups] = useState(
      initial?.ageGroups.join(", ") ?? "",
    ),
    [readingLogo, setReadingLogo] = useState(false),
    [logoError, setLogoError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null),
    logoRead = useRef(0),
    logoPending = useRef(false),
    saving = useRef(false);
  useEffect(
    () => () => {
      logoRead.current += 1;
    },
    [],
  );
  const parsedAgeGroups = Array.from(
    new Set(
      ageGroups
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  const field = (key: keyof typeof form, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || saving.current || logoPending.current || logoError) return;
        saving.current = true;
        try {
          await onSave({
            ...form,
            ageGroups: parsedAgeGroups,
            sportIds: ["football"],
          });
        } finally {
          saving.current = false;
        }
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
              disabled={busy}
              type={key === "contactEmail" ? "email" : "text"}
              value={String(form[key as keyof typeof form])}
              onChange={(e) => field(key as keyof typeof form, e.target.value)}
            />
          </label>
        ))}
        <label>
          Measurement units
          <select
            disabled={busy}
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
            disabled={busy}
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
          ref={logoInput}
          type="file"
          accept="image/png"
          disabled={busy}
          aria-describedby={
            logoError ? "academy-logo-error" : "academy-logo-status"
          }
          aria-invalid={!!logoError}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const request = ++logoRead.current;
            setLogoError("");
            if (file.size > 200000 || file.type !== "image/png") {
              logoPending.current = false;
              setReadingLogo(false);
              setLogoError(
                "Choose a PNG file under 200 KB, or remove the staged logo to continue without it.",
              );
              return;
            }
            logoPending.current = true;
            setReadingLogo(true);
            const reader = new FileReader();
            const finish = () => {
              if (request !== logoRead.current) return;
              logoPending.current = false;
              setReadingLogo(false);
            };
            reader.onerror = () => {
              if (request === logoRead.current)
                setLogoError(
                  "The selected logo could not be read. Your previous staged logo remains unchanged.",
                );
              finish();
            };
            reader.onload = () => {
              if (request !== logoRead.current) return;
              const value = String(reader.result);
              if (academySchema.shape.logoData.safeParse(value).success)
                field("logoData", value);
              else
                setLogoError(
                  "This file is not a supported PNG logo. Your previous staged logo remains unchanged.",
                );
              finish();
            };
            try {
              reader.readAsDataURL(file);
            } catch {
              if (request === logoRead.current)
                setLogoError(
                  "The selected logo could not be read. Choose the file again or remove the staged logo.",
                );
              finish();
            }
          }}
        />
      </label>
      {form.logoData && (
        <Image
          src={form.logoData}
          alt="Staged academy logo"
          width={64}
          height={64}
          unoptimized
        />
      )}
      <p id="academy-logo-status" role="status">
        {readingLogo
          ? "Reading your local PNG. Wait before creating the academy…"
          : form.logoData
            ? "PNG logo staged; it will be saved with the academy."
            : "No logo staged."}
      </p>
      {logoError && (
        <p id="academy-logo-error" role="alert">
          {logoError}
        </p>
      )}
      {(form.logoData || logoError || readingLogo) && (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => {
            logoRead.current += 1;
            logoPending.current = false;
            setReadingLogo(false);
            setLogoError("");
            field("logoData", "");
            if (logoInput.current) logoInput.current.value = "";
          }}
        >
          Remove staged logo
        </button>
      )}
      <label>
        Age groups
        <input
          value={ageGroups}
          disabled={busy}
          onChange={(e) => setAgeGroups(e.target.value)}
          aria-describedby="academy-age-group-review"
        />
      </label>
      <p id="academy-age-group-review">
        Categories to configure: {parsedAgeGroups.join(", ") || "None yet"}.
        These labels do not assign training batches or reclassify players.
      </p>
      <p>Football academy · Football is configured automatically.</p>
      <fieldset>
        <legend>Academy modules</legend>
        {["development", "reports", "communication", "fees"].map((module) => (
          <label className="check-row" key={module}>
            <input
              type="checkbox"
              disabled={busy}
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
            disabled={busy}
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
      <Button disabled={busy || readingLogo || !!logoError}>
        {readingLogo
          ? "Reading PNG…"
          : busy
            ? "Saving…"
            : initial
              ? "Save academy configuration"
              : "Create empty academy"}
      </Button>
    </form>
  );
}
