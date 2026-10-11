import { loadFictionalExample } from "@/server/workspace-demo";
import { grantSupport } from "@/server/platform-service";
import { z } from "zod";
import {
  context,
  approveReport,
  reviewUpdate,
  reply,
  invite,
  revokeMembership,
} from "@/server/workspace-service";
import { sameOrigin, privateJson, apiError } from "@/server/workspace-access";
import { WorkspaceError } from "@/server/auth";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> },
) {
  try {
    sameOrigin(request);
    const { academyId } = await params;
    const ctx = await context(request.headers, academyId),
      body = z
        .object({
          action: z.string(),
          id: z.string().optional(),
          verified: z.boolean().default(false),
          data: z.unknown().optional(),
        })
        .parse(await request.json());
    if (!["loadDemo", "support", "invite"].includes(body.action) && !body.id)
      throw new WorkspaceError(400, "Select a record for this action.");
    switch (body.action) {
      case "loadDemo":
        return privateJson(loadFictionalExample(ctx));
      case "approveReport":
        return privateJson(approveReport(ctx, body.id!, body.verified));
      case "submitUpdate":
        return privateJson(reviewUpdate(ctx, body.id!, "submit", false));
      case "approveUpdate":
        return privateJson(
          reviewUpdate(ctx, body.id!, "approve", body.verified),
        );
      case "rejectUpdate":
        return privateJson(reviewUpdate(ctx, body.id!, "reject", false));
      case "reply":
        return privateJson(reply(ctx, body.id!, body.data));
      case "support":
        return privateJson(grantSupport(ctx, body.data));
      case "invite":
        return privateJson(invite(ctx, body.data));
      case "revoke":
        revokeMembership(ctx, body.id!);
        return privateJson({ ok: true });
      default:
        throw new WorkspaceError(400, "Unknown action.");
    }
  } catch (e) {
    return apiError(e);
  }
}
