import type { DemoState } from "@/domain/entities";
import { seed } from "@/data/demo/seed";
import { migrateMessageDraft } from "@/services/communication/migrate";
const KEY = "sportozen-demo-v1";
export interface StorageAdapter {
  load(): DemoState;
  save(state: DemoState): void;
  reset(): void;
}
export const browserStorage: StorageAdapter = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { version: number; state: DemoState };
        if (
          parsed.version === 1 &&
          Array.isArray(parsed.state?.players) &&
          parsed.state.academy?.id === "stallions"
        )
          return {
            ...parsed.state,
            messages: parsed.state.messages.map(migrateMessageDraft),
          };
      }
    } catch {
      /* Corrupt/unavailable storage falls back to demo seed. */
    }
    return structuredClone(seed);
  },
  save(state) {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, state }));
  },
  reset() {
    window.localStorage.removeItem(KEY);
  },
};
