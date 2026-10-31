"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AcademyConfiguration } from "@/domain/workspace";
import { academySchema } from "@/domain/academy-configuration-schema";
import { useUnsavedChanges } from "./use-unsaved-changes";
import type { useWorkspace } from "./use-workspace";

type Editor = { base: AcademyConfiguration; draft: AcademyConfiguration };
const drafts = new Map<string, Editor>();
const copy = (value: AcademyConfiguration) => structuredClone(value);
export function useAcademySettings(w: ReturnType<typeof useWorkspace>) {
  const data = w.data!,
    permitted = ["OWNER", "ADMIN"].includes(data.membership.role);
  const scope = JSON.stringify([data.academy.id, data.membership.userId]);
  const [editor, setEditor] = useState<Editor>(() => {
    const prior = permitted ? drafts.get(scope) : undefined;
    return prior
      ? { base: copy(prior.base), draft: copy(prior.draft) }
      : { base: copy(data.academy), draft: copy(data.academy) };
  });
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [readingLogo, setReadingLogo] = useState(false);
  const pending = useRef(false),
    logoRead = useRef(0);
  const dirty = JSON.stringify(editor.base) !== JSON.stringify(editor.draft);
  const discard = useCallback(() => {
    logoRead.current += 1;
    setReadingLogo(false);
    drafts.delete(scope);
    setEditor({ base: copy(data.academy), draft: copy(data.academy) });
    setErrors({});
    setError("");
    setNotice("");
  }, [scope, data.academy]);
  useUnsavedChanges(dirty && permitted, discard);
  useEffect(() => {
    if (dirty && permitted)
      drafts.set(scope, { base: copy(editor.base), draft: copy(editor.draft) });
    else drafts.delete(scope);
  }, [scope, dirty, permitted, editor]);
  function update<K extends keyof AcademyConfiguration>(
    key: K,
    value: AcademyConfiguration[K],
  ) {
    setEditor((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
    }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setError("");
    setNotice("");
  }
  async function save() {
    if (!permitted || pending.current || readingLogo) return false;
    const parsed = academySchema.safeParse(editor.draft),
      fieldErrors: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        fieldErrors[String(issue.path[0])] ??= issue.message;
    try {
      new Intl.DateTimeFormat(editor.draft.dateLocale, {
        timeZone: editor.draft.timezone,
      });
    } catch {
      fieldErrors.timezone = "Choose a valid locale and time zone.";
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      setError("Check the labelled fields before saving.");
      return false;
    }
    pending.current = true;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const value = (await w.configure({
        ...editor.draft,
        expectedVersion: editor.base.configVersion ?? 0,
      })) as AcademyConfiguration | undefined;
      if (
        !value ||
        value.id !== editor.base.id ||
        value.configVersion !== (editor.base.configVersion ?? 0) + 1
      ) {
        setError(
          "No confirmed configuration save was returned. Your entered values remain here.",
        );
        return false;
      }
      drafts.delete(scope);
      setEditor({ base: copy(value), draft: copy(value) });
      setErrors({});
      setNotice("Academy configuration saved.");
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The configuration could not be saved. Your draft is retained.",
      );
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function stageLogo(file?: File) {
    if (!file || !permitted) return;
    const request = ++logoRead.current;
    if (file.type !== "image/png" || file.size > 200000) {
      setReadingLogo(false);
      setErrors((current) => ({
        ...current,
        logoData: "Choose a PNG logo under 200 KB. JPG is not supported.",
      }));
      return;
    }
    setReadingLogo(true);
    try {
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () =>
          reject(new Error("The local logo could not be read."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      if (!academySchema.shape.logoData.safeParse(value).success)
        throw new Error("This file is not a supported PNG logo.");
      if (request === logoRead.current) update("logoData", value);
    } catch (failure) {
      if (request === logoRead.current)
        setErrors((current) => ({
          ...current,
          logoData:
            failure instanceof Error
              ? failure.message
              : "The logo could not be read.",
        }));
    } finally {
      if (request === logoRead.current) setReadingLogo(false);
    }
  }
  function keepDraftWithSavedVersion() {
    if ((data.academy.configVersion ?? 0) < (editor.base.configVersion ?? 0))
      return;
    drafts.delete(scope);
    setEditor((current) => ({ ...current, base: copy(data.academy) }));
    setError("");
    setNotice("");
  }
  return {
    draft: editor.draft,
    base: editor.base,
    dirty,
    permitted,
    errors,
    error: w.error || error,
    notice,
    busy: saving || readingLogo || w.busy,
    newerVersion:
      (data.academy.configVersion ?? 0) > (editor.base.configVersion ?? 0),
    update,
    save,
    stageLogo,
    discard,
    keepDraftWithSavedVersion,
  };
}
