import "server-only";
import {
  requireRole,
  requireSport,
  type WorkspaceAccess,
} from "./workspace-access";
import { workspaceRepository } from "./workspace-repository";
import { saveRecord } from "./workspace-service";
import { operationalSports } from "@/config/sports/workspace-sports";
import { WorkspaceError } from "./auth";
import type { WorkspacePlayer, WorkspaceDrill } from "@/domain/workspace";
// Explicit opt-in fixtures, never a default new customer workspace.
export function loadFictionalExample(ctx: WorkspaceAccess) {
  requireRole(ctx, ["OWNER"]);
  requireSport(ctx, "football");
  if (!ctx.academy.demo)
    throw new WorkspaceError(
      400,
      "Fictional records require an explicitly labelled demo academy.",
    );
  if (workspaceRepository.list(ctx.academy.id, "player").length)
    throw new WorkspaceError(
      409,
      "Example data is available only in an empty demo academy.",
    );
  const player = saveRecord(ctx, "player", {
    name: "Fictional Sample Player",
    sportIds: ["football"],
    squad: "Fictional development group",
    coachId: ctx.user.id,
  }) as WorkspacePlayer;
  for (const sportId of ["football"]) {
    const template = operationalSports[sportId].templates[0],
      drill = saveRecord(ctx, "drill", {
        sportId,
        ...template,
        templateId: template.id,
      }) as WorkspaceDrill;
    saveRecord(ctx, "plan", {
      playerId: player.id,
      sportId,
      coachId: ctx.user.id,
      focus: template.focusArea,
      reason:
        "This fictional plan introduces a specific practice focus for coach review.",
      drillIds: [drill.id],
      observe:
        "Record comparable introductory attempts and note the practice conditions.",
      homePractice:
        "Optional comfortable practice in a safe space with appropriate supervision.",
      reviewDate: "2026-10-21",
      nextStep:
        "Collect more comparable observations before adapting the goal.",
      status: "DRAFT",
      privateNote: "Fictional private working note; never parent-visible.",
    });
  }
  return { playerId: player.id };
}
