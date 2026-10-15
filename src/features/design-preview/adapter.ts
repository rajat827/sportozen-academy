import { useSyncExternalStore } from "react";
import { previewPlayers, type PreviewPlayer } from "./fixtures";
export interface PreviewState {
  revision: number;
  academyId: string;
  playerId: string;
  players: PreviewPlayer[];
  batchFocus: string;
  drills: string[];
  adjustments: Record<string, string>;
  attendance: Record<string, string>;
  observation: string;
  nextStep: string;
  weeklyStatus: "Draft" | "Approved" | "Review needed";
  weeklyVersion: number;
  published: boolean;
  scheduled: boolean;
  reportStatus: "Draft" | "Approved";
  messages: {
    id: number;
    playerId: string;
    body: string;
    sender: "Parent" | "Coach";
  }[];
  payment:
    | "unpaid"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "partial"
    | "pending-verification";
  manualReference: string;
  profiles: Record<string, Record<string, string>>;
  fields: Record<string, Record<string, string>>;
  placement: "Pending" | "Approved" | "Declined" | "Ended trial";
  notice: string;
}
export const initialPreviewState: PreviewState = {
  revision: 0,
  academyId: "riverside",
  playerId: "aarav",
  players: structuredClone(previewPlayers),
  batchFocus: "Receive into space, then find the next pass",
  drills: ["receive", "pass", "game"],
  adjustments: { aarav: previewPlayers[0].focus, leo: previewPlayers[2].focus },
  attendance: { aarav: "Unmarked", isha: "Unmarked" },
  observation: "",
  nextStep:
    "Repeat the receiving task and observe the first touch before the next pass.",
  weeklyStatus: "Approved",
  weeklyVersion: 0,
  published: true,
  scheduled: false,
  reportStatus: "Approved",
  messages: [
    {
      id: 1,
      playerId: "aarav",
      body: "The first touch moved into useful space in the paired task. We will keep the same conditions next week.",
      sender: "Coach",
    },
  ],
  payment: "unpaid",
  manualReference: "",
  profiles: {},
  fields: {},
  placement: "Pending",
  notice: "",
};
const key = "sportozen-design-preview-v1";
let current: PreviewState | undefined;
const listeners = new Set<() => void>();
function snapshot(): PreviewState {
  if (!current) {
    current = structuredClone(initialPreviewState);
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.version === 1) current = { ...current, ...parsed.state };
        }
      } catch {
        current!.notice =
          "Preview storage unavailable; changes stay in memory.";
      }
    }
  }
  return current!;
}
export function previewTransition(
  state: PreviewState,
  patch: Partial<PreviewState>,
): PreviewState {
  if (patch.academyId && patch.academyId !== state.academyId)
    return {
      ...structuredClone(initialPreviewState),
      profiles: state.profiles,
      fields: {},
      ...patch,
      revision: state.revision + 1,
    };
  const next = { ...state, ...patch, revision: state.revision + 1 };
  if (patch.payment || patch.manualReference !== undefined) {
    const paymentKey = `payment:${state.academyId}:${state.playerId}`;
    next.fields = {
      ...next.fields,
      [paymentKey]: {
        ...next.fields[paymentKey],
        status: patch.payment ?? state.payment,
        reference: patch.manualReference ?? state.manualReference,
      },
    };
  }
  if (patch.playerId && patch.playerId !== state.playerId) {
    const payment =
      state.fields[`payment:${state.academyId}:${patch.playerId}`];
    next.payment = (payment?.status as PreviewState["payment"]) ?? "unpaid";
    next.manualReference = payment?.reference ?? "";
    next.observation =
      state.fields[`session:${patch.playerId}`]?.observation ?? "";
    next.nextStep =
      state.fields[`session:${patch.playerId}`]?.nextStep ??
      initialPreviewState.nextStep;
    next.reportStatus = playerReportStatus(state, patch.playerId);
  }
  if (patch.reportStatus !== undefined)
    next.fields = {
      ...next.fields,
      [`report-status:${next.playerId}`]: { status: patch.reportStatus },
    };
  if (patch.nextStep !== undefined)
    next.fields = {
      ...next.fields,
      [`session:${next.playerId}`]: {
        ...next.fields[`session:${next.playerId}`],
        nextStep: patch.nextStep,
      },
    };
  if (
    (patch.batchFocus !== undefined && patch.batchFocus !== state.batchFocus) ||
    (patch.fields?.["weekly-context"] &&
      JSON.stringify(patch.fields["weekly-context"]) !==
        JSON.stringify(state.fields["weekly-context"])) ||
    patch.drills ||
    patch.adjustments
  ) {
    next.weeklyVersion = state.weeklyVersion + 1;
    next.weeklyStatus =
      state.weeklyStatus === "Approved" ? "Review needed" : "Draft";
    next.published = false;
    next.scheduled = false;
  }
  const approvalKey = `weekly:${state.playerId}`;
  if (patch.weeklyStatus === "Approved")
    next.fields = {
      ...next.fields,
      [approvalKey]: {
        status: "Approved",
        version: String(next.weeklyVersion),
        published: "false",
      },
    };
  if (patch.published === true)
    next.fields = {
      ...next.fields,
      [approvalKey]: {
        ...(next.fields[approvalKey] ?? {
          status: "Approved",
          version: String(next.weeklyVersion),
        }),
        published: "true",
      },
    };
  return next;
}
export function playerWeeklyState(
  state: PreviewState,
  playerId = state.playerId,
) {
  const approval = state.fields[`weekly:${playerId}`];
  if (approval)
    return {
      approved:
        approval.status === "Approved" &&
        Number(approval.version) === state.weeklyVersion,
      published:
        approval.published === "true" &&
        Number(approval.version) === state.weeklyVersion,
    };
  return {
    approved: state.weeklyVersion === 0 && ["aarav", "leo"].includes(playerId),
    published: state.weeklyVersion === 0 && ["aarav", "leo"].includes(playerId),
  };
}
export function playerReportStatus(
  state: PreviewState,
  playerId = state.playerId,
): PreviewState["reportStatus"] {
  return state.fields[`report-status:${playerId}`]?.status === "Approved"
    ? "Approved"
    : state.fields[`report-status:${playerId}`]?.status === "Draft"
      ? "Draft"
      : playerId === "aarav"
        ? "Approved"
        : "Draft";
}
export const previewAdapter = {
  read: snapshot,
  /** Confirmed local persistence for editors that must retain the old saved
   * configuration after a quota/storage failure. Legacy demo saves remain as-is. */
  saveConfirmed(patch: Partial<PreviewState>) {
    const next = previewTransition(snapshot(), patch);
    let previous: string | null = null,
      wrote = false;
    try {
      previous = window.sessionStorage.getItem(key);
      const serialized = JSON.stringify({ version: 1, state: next });
      window.sessionStorage.setItem(key, serialized);
      wrote = true;
      if (window.sessionStorage.getItem(key) !== serialized)
        throw new Error("Preview persistence could not be confirmed");
    } catch {
      if (wrote) {
        try {
          if (previous === null) window.sessionStorage.removeItem(key);
          else window.sessionStorage.setItem(key, previous);
        } catch {
          /* Keep the previous confirmed in-memory configuration. */
        }
      }
      return {
        ok: false as const,
        error:
          "Preview storage unavailable. Your changes remain unsaved in this editor.",
      };
    }
    current = next;
    listeners.forEach((fn) => fn());
    return { ok: true as const };
  },
  save(patch: Partial<PreviewState>) {
    const next = previewTransition(snapshot(), patch);
    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({ version: 1, state: next }),
      );
    } catch {
      next.notice = "Preview storage unavailable; changes stay in memory.";
    }
    current = next;
    listeners.forEach((fn) => fn());
  },
  reset() {
    current = structuredClone(initialPreviewState);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* Preview-only memory reset still works. */
    }
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
export function usePreviewState() {
  return useSyncExternalStore(
    previewAdapter.subscribe,
    previewAdapter.read,
    () => initialPreviewState,
  );
}
