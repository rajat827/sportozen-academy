import { describe, expect, it } from "vitest";
import {
  initialPreviewState,
  previewTransition,
  type PreviewState,
} from "@/features/design-preview/adapter";
import {
  deriveHomeDashboard,
  homeActionPatch,
  homeSessionPatch,
} from "@/features/design-preview/home-dashboard-model";
import { sessionViewContext } from "@/features/design-preview/fixtures";

function fixture(): PreviewState {
  return structuredClone(initialPreviewState);
}

describe("approved Home dashboard data boundaries", () => {
  it("uses actual roster/session counts and labels the recorded report period", () => {
    const state = fixture();
    const model = deriveHomeDashboard(state);
    expect(model.date).toBe("2026-10-20");
    expect(model.coach.name).toBe("Maya Rao");
    expect(model.summary).toEqual({
      totalPlayers: 3,
      activeBatches: 2,
      batchNames: ["U10 Foundations", "U12 Development"],
      upcomingSessions: 2,
      unreadMessages: null,
      parentQuestions: 0,
    });
    expect(model.reports).toMatchObject({
      period: "September 2026",
      currentPeriod: "October 2026",
      isCurrentPeriod: false,
      approved: 1,
      draft: 1,
      inReview: 0,
      total: 2,
    });
    expect(state).toEqual(initialPreviewState);
  });

  it("opens the chosen session date without duplicating or mutating training", () => {
    const state = fixture();
    const model = deriveHomeDashboard(state);
    const second = model.sessions[1];
    const patch = homeSessionPatch(state, second);
    expect(patch).toEqual({
      fields: {
        "session-context": {
          id: "riverside:U10 Foundations:2026-10-22",
          academyId: "riverside",
          batch: "U10 Foundations",
          date: "2026-10-22",
          slot: "second",
          start: "17:30",
          end: "18:30",
          time: "5:30 PM – 6:30 PM",
          source: "calendar",
        },
      },
    });
    const navigated = previewTransition(state, patch!);
    expect(navigated.playerId).toBe("aarav");
    expect(navigated.drills).toEqual(state.drills);
    expect(navigated.attendance).toEqual(state.attendance);
    expect(navigated.weeklyStatus).toBe(state.weeklyStatus);
    expect(navigated.published).toBe(state.published);
    expect(deriveHomeDashboard(navigated).sessions).toHaveLength(2);
    expect(
      sessionViewContext(
        navigated.fields,
        navigated.players,
        navigated.academyId,
        navigated.playerId,
      ),
    ).toMatchObject({
      selected: true,
      stale: false,
      slot: "second",
      date: "2026-10-22",
      label: "22 October",
      time: "17:30–18:30",
    });
  });

  it("keeps the default session view unchanged until an explicit valid selection exists", () => {
    const state = fixture();
    expect(
      sessionViewContext(
        state.fields,
        state.players,
        state.academyId,
        state.playerId,
      ),
    ).toMatchObject({
      selected: false,
      stale: false,
      slot: "first",
      date: "2026-10-20",
      label: "20 October",
      time: "17:30–18:30",
    });
  });

  it("replaces a prior Thursday selection when the Tuesday calendar entry opens", () => {
    const state = fixture();
    const sessions = deriveHomeDashboard(state).sessions;
    const thursday = previewTransition(
      state,
      homeSessionPatch(state, sessions[1])!,
    );
    const tuesday = previewTransition(
      thursday,
      homeSessionPatch(thursday, sessions[0])!,
    );
    expect(
      sessionViewContext(
        tuesday.fields,
        tuesday.players,
        tuesday.academyId,
        tuesday.playerId,
      ),
    ).toMatchObject({
      selected: true,
      slot: "first",
      date: "2026-10-20",
      label: "20 October",
    });
    expect(tuesday.playerId).toBe(state.playerId);
    expect(tuesday.attendance).toEqual(state.attendance);
    expect(tuesday.weeklyStatus).toBe(state.weeklyStatus);
    expect(tuesday.published).toBe(state.published);
  });

  it("rejects altered or stale session navigation metadata against the current recorded plan", () => {
    const source = fixture();
    const second = deriveHomeDashboard(source).sessions[1];
    const saved = previewTransition(source, homeSessionPatch(source, second)!);
    const corruptions = [
      { id: "unrecorded-session" },
      { academyId: "harbour" },
      { batch: "U12 Development" },
      { date: "2026-10-20" },
      { slot: "first" },
      { start: "08:00" },
      { end: "09:00" },
    ];
    for (const change of corruptions) {
      const fields = structuredClone(saved.fields);
      Object.assign(fields["session-context"], change);
      expect(
        sessionViewContext(
          fields,
          saved.players,
          saved.academyId,
          saved.playerId,
        ).stale,
      ).toBe(true);
    }
    for (const state of [
      { ...saved, playerId: "leo" },
      { ...saved, players: [] },
      {
        ...saved,
        fields: {
          ...saved.fields,
          "weekly-context": { batch: "U10 Foundations", week: "2026-10-26" },
        },
      },
      {
        ...saved,
        fields: {
          ...saved.fields,
          [`home-session:${second.id}`]: { status: "Cancelled" },
        },
      },
    ]) {
      expect(
        sessionViewContext(
          state.fields,
          state.players,
          state.academyId,
          state.playerId,
        ).stale,
      ).toBe(true);
    }
    const fields = structuredClone(saved.fields);
    fields["session-context"].time = "An unrelated display string";
    expect(
      sessionViewContext(fields, saved.players, saved.academyId, saved.playerId)
        .time,
    ).toBe("17:30–18:30");
  });

  it("rejects an inaccessible, changed or cancelled session rather than replacing the player", () => {
    const state = fixture();
    const session = deriveHomeDashboard(state).sessions[0];
    const wrongBatch = previewTransition(state, { playerId: "leo" });
    expect(homeSessionPatch(wrongBatch, session)).toBeNull();
    expect(deriveHomeDashboard(wrongBatch).primarySession?.reason).toContain(
      "Leo Shah belongs to U12 Development",
    );
    const otherAcademy = previewTransition(state, { academyId: "harbour" });
    expect(homeSessionPatch(otherAcademy, session)).toBeNull();
    const cancelled = previewTransition(state, {
      fields: { [`home-session:${session.id}`]: { status: "Cancelled" } },
    });
    expect(homeSessionPatch(cancelled, session)).toBeNull();
    expect(deriveHomeDashboard(cancelled).primarySession).toBeUndefined();
    expect(deriveHomeDashboard(cancelled).summary.upcomingSessions).toBe(1);
  });

  it("follows a configured batch/date and does not label tomorrow's session as today's", () => {
    const state = fixture();
    state.playerId = "leo";
    state.fields = {
      "weekly-context": { batch: "U12 Development", week: "2026-12-28" },
      "home-preview-context": { date: "2026-12-30", hour: "18" },
    };
    const model = deriveHomeDashboard(state);
    expect(model.primarySession).toBeUndefined();
    expect(model.todaySessions).toHaveLength(0);
    expect(model.sessions[1]).toMatchObject({
      date: "2026-12-31",
      playerIds: ["leo"],
      time: "6:45 PM – 7:45 PM",
    });
    expect(model.summary.upcomingSessions).toBe(1);
    expect(model.greeting).toBe("Good evening");
    expect(model.nextWeek).toEqual({
      start: "2027-01-04",
      end: "2027-01-10",
      label: "4 Jan – 10 Jan",
    });
    state.fields["home-preview-context"].date = "2026-02-31";
    expect(deriveHomeDashboard(state).date).toBe("2026-12-29");
  });

  it("retains per-player reporting, focus and family context without auto-sending", () => {
    let state = fixture();
    state = previewTransition(state, {
      playerId: "isha",
      reportStatus: "Approved",
    });
    state.messages.push({
      id: 2,
      playerId: "isha",
      sender: "Parent",
      body: "Could we clarify the next task?",
    });
    const model = deriveHomeDashboard(state);
    expect(model.reports.approved).toBe(2);
    expect(model.reports.total).toBe(2);
    expect(model.focus).toMatchObject({
      playerId: "isha",
      personalised: false,
      cue: state.batchFocus,
    });
    expect(model.summary.unreadMessages).toBeNull();
    expect(model.summary.parentQuestions).toBe(1);
    const action = model.pending.find((item) => item.id === "messages")!;
    expect(homeActionPatch(state, action)).toEqual({ playerId: "isha" });
    expect(state.messages).toHaveLength(2);
    expect(
      model.activity.some((item) => item.label.includes("Isha Kapoor")),
    ).toBe(true);
  });

  it("uses the next academy-local planning week even when the selected plan is older", () => {
    const state = fixture();
    state.fields["home-preview-context"] = { date: "2026-11-12" };
    expect(deriveHomeDashboard(state).nextWeek.start).toBe("2026-11-16");
    state.playerId = "leo";
    delete state.adjustments.leo;
    expect(deriveHomeDashboard(state).focus?.cue).toBe(
      "No shared batch plan recorded for this player",
    );
  });

  it("does not invent current-month reports, payments, relative times or completed attendance", () => {
    const state = fixture();
    const model = deriveHomeDashboard(state);
    expect(model.activity).toHaveLength(2);
    expect(model.activity.map((item) => item.kind)).toEqual([
      "message",
      "report",
    ]);
    expect(
      model.activity.some((item) =>
        /payment|attended|hours? ago/i.test(`${item.label} ${item.detail}`),
      ),
    ).toBe(false);
    expect(model.pending.find((item) => item.id === "attendance")?.count).toBe(
      2,
    );
    expect(
      model.quickActions.find((item) => item.id === "add-player"),
    ).toMatchObject({ disabled: true, to: "player-add" });
    expect(homeActionPatch(state, model.quickActions[1])).toBeNull();
    expect(model.pending.some((item) => item.to === "fee-overview")).toBe(
      false,
    );
  });

  it("keeps missing-player and empty-roster states honest", () => {
    const state = fixture();
    state.playerId = "unavailable";
    let model = deriveHomeDashboard(state);
    expect(model.selectedPlayerMissing).toBe(true);
    expect(model.focus).toBeNull();
    expect(model.primarySession?.canOpen).toBe(false);
    expect(
      model.quickActions.find((item) => item.id === "send-message")?.disabled,
    ).toBe(true);
    state.players = [];
    model = deriveHomeDashboard(state);
    expect(model.summary.totalPlayers).toBe(0);
    expect(model.summary.activeBatches).toBe(0);
    expect(model.summary.upcomingSessions).toBe(0);
    expect(model.sessions).toHaveLength(0);
    expect(model.activity).toHaveLength(0);
    expect(model.reports.total).toBe(0);
  });
});
