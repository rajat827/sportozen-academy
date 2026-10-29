import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialPreviewState,
  previewAdapter,
} from "@/features/design-preview/adapter";
import {
  readSettings,
  saveSettings,
  validateSettings,
  recoverSettingsDraft,
  retainSettingsDraft,
  clearSettingsDraft,
} from "@/features/design-preview/settings-model";

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  previewAdapter.reset();
});

describe("approved Settings preview boundaries", () => {
  it("recovers unsaved editor values only for the same academy and confirmed version", () => {
    const saved = readSettings(previewAdapter.read())!;
    const draft = { ...saved.draft, name: "Recoverable unsaved name" };
    retainSettingsDraft(
      saved.academy.id,
      saved.version,
      saved.fingerprint,
      draft,
    );
    draft.name = "Outside mutation";
    const restored = recoverSettingsDraft(
      saved.academy.id,
      saved.version,
      saved.fingerprint,
    )!;
    expect(restored.name).toBe("Recoverable unsaved name");
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      saved.draft.name,
    );
    expect(
      recoverSettingsDraft("harbour", saved.version, saved.fingerprint),
    ).toBeUndefined();
    expect(
      recoverSettingsDraft(
        saved.academy.id,
        saved.version + 1,
        saved.fingerprint,
      ),
    ).toBeUndefined();
    expect(
      recoverSettingsDraft(saved.academy.id, saved.version, "different"),
    ).toBeUndefined();
    clearSettingsDraft(saved.academy.id, saved.version, saved.fingerprint);
    expect(
      recoverSettingsDraft(saved.academy.id, saved.version, saved.fingerprint),
    ).toBeUndefined();
    retainSettingsDraft("harbour", saved.version, saved.fingerprint, restored);
    previewAdapter.reset();
    expect(recoverSettingsDraft("harbour", saved.version, saved.fingerprint)).toBeUndefined();
  });
  it("rejects a write that cannot be read back", () => {
    const saved = readSettings(previewAdapter.read())!;
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    const result = saveSettings(
      { ...saved.draft, name: "Unconfirmed write" },
      saved.academy.id,
      saved.version,
      saved.fingerprint,
      "default",
      true,
    );
    expect(result.ok).toBe(false);
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      saved.draft.name,
    );
    expect(readSettings(previewAdapter.read())!.version).toBe(0);
  });
  it("does not silently select another academy", () => {
    expect(
      readSettings({
        ...structuredClone(initialPreviewState),
        academyId: "unavailable",
      }),
    ).toBeUndefined();
  });
  it("saves one scoped configuration while retaining training state", () => {
    const before = previewAdapter.read(),
      saved = readSettings(before)!;
    const result = saveSettings(
      {
        ...saved.draft,
        name: "Riverside Updated",
        email: "updated@example.test",
        location: "Updated fictional ground",
      },
      saved.academy.id,
      saved.version,
      saved.fingerprint,
      "default",
      true,
    );
    expect(result.ok).toBe(true);
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      "Riverside Updated",
    );
    expect(readSettings(previewAdapter.read())!.version).toBe(1);
    expect(previewAdapter.read().players).toEqual(before.players);
    expect(previewAdapter.read().weeklyStatus).toBe(before.weeklyStatus);
    expect(previewAdapter.read().fields["session-context"]).toBeUndefined();
    expect(storage.get("sportozen-design-preview-v1")).toContain(
      "updated@example.test",
    );
  });
  it("retains the confirmed configuration when storage fails", () => {
    const saved = readSettings(previewAdapter.read())!;
    vi.stubGlobal("window", {
      sessionStorage: {
        setItem: () => {
          throw new Error("Quota");
        },
      },
    });
    const result = saveSettings(
      { ...saved.draft, name: "Unsaved draft" },
      saved.academy.id,
      saved.version,
      saved.fingerprint,
      "default",
      true,
    );
    expect(result.ok).toBe(false);
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      saved.draft.name,
    );
    expect(readSettings(previewAdapter.read())!.version).toBe(0);
  });
  it("rejects stale versions and role escalation", () => {
    const saved = readSettings(previewAdapter.read())!;
    expect(
      saveSettings(
        saved.draft,
        saved.academy.id,
        -1,
        saved.fingerprint,
        "default",
        true,
      ).ok,
    ).toBe(false);
    expect(
      saveSettings(
        saved.draft,
        saved.academy.id,
        0,
        saved.fingerprint,
        "default",
        false,
      ).ok,
    ).toBe(false);
    expect(readSettings(previewAdapter.read())!.version).toBe(0);
  });
  it("preserves a failed-save or conflict draft without claiming persistence", () => {
    const saved = readSettings(previewAdapter.read())!;
    for (const scenario of ["failed-save", "conflict"] as const)
      expect(
        saveSettings(
          { ...saved.draft, name: "Retained draft" },
          saved.academy.id,
          saved.version,
          saved.fingerprint,
          scenario,
          true,
        ).ok,
      ).toBe(false);
    expect(readSettings(previewAdapter.read())!.draft).toEqual(saved.draft);
  });
  it("keeps saved settings separate across academy switching", () => {
    const saved = readSettings(previewAdapter.read())!;
    saveSettings(
      { ...saved.draft, name: "Riverside Own Records" },
      saved.academy.id,
      saved.version,
      saved.fingerprint,
      "default",
      true,
    );
    previewAdapter.save({ academyId: "harbour" });
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      "Harbour Football Academy",
    );
    previewAdapter.save({ academyId: "riverside" });
    expect(readSettings(previewAdapter.read())!.draft.name).toBe(
      "Riverside Own Records",
    );
  });
  it("validates contact fields, supported image data and regional values", () => {
    const saved = readSettings(previewAdapter.read())!;
    expect(
      validateSettings({
        ...saved.draft,
        email: "bad",
        website: "javascript:alert(1)",
        logo: "data:image/jpeg;base64,aaa",
        timezone: "Invented/Zone",
        language: "Untranslated",
      }),
    ).toHaveProperty("email");
    const errors = validateSettings({
      ...saved.draft,
      website: "javascript:alert(1)",
      logo: "data:image/jpeg;base64,aaa",
      timezone: "Invented/Zone",
      language: "Untranslated",
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["website", "logo", "timezone", "language"]),
    );
  });
  it("does not remove a logo until confirmed save", () => {
    const saved = readSettings(previewAdapter.read())!;
    const draft = { ...saved.draft, logo: "" };
    expect(readSettings(previewAdapter.read())!.draft.logo).toBeUndefined();
    expect(
      saveSettings(
        draft,
        saved.academy.id,
        0,
        saved.fingerprint,
        "default",
        true,
      ).ok,
    ).toBe(true);
    expect(readSettings(previewAdapter.read())!.draft.logo).toBe("");
  });
});
