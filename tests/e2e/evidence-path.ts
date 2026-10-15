import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
/** Keep a full rerun from overwriting an operator's existing evidence. */
export function evidencePath(original: string) {
  const root = process.env.SPORTOZEN_E2E_EVIDENCE_ROOT;
  const target = root
    ? join(root, original.replace(/^docs\/screenshots\/?/, ""))
    : original;
  mkdirSync(dirname(target), { recursive: true });
  return target;
}
