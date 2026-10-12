import { DemoPractice } from "@/features/parent-development/demo-practice";
import { notFound } from "next/navigation";
import { Dashboard } from "@/features/analytics/dashboard";
import { PlayerDirectory } from "@/features/players/directory";
import { PlayerProfile } from "@/features/players/profile";
import { DevelopmentPlan } from "@/features/development/plan";
import {
  SessionBuilder,
  SessionPersonaliser,
} from "@/features/sessions/builder";
import { SessionDesk } from "@/features/sessions/desk";
import { Sessions } from "@/features/sessions/list";
import { Attendance } from "@/features/attendance/attendance";
import { Drills } from "@/features/drills/drills";
import { Evidence } from "@/features/evidence/evidence";
import { Reports } from "@/features/reports/reports";
import { AcademySetup, Staff, Squads } from "@/features/academy/setup";
import { Fees } from "@/features/fees/fees";

import { Analytics } from "@/features/analytics/analytics";
import { ParentScreen } from "@/features/parent/parent";
import { Settings } from "@/features/academy/settings";
import { Suspense } from "react";
import { UpdateWizard } from "@/features/parent-development/update-wizard";
import { DevelopmentCentre } from "@/features/parent-development/centre";
import {
  ConversationThread,
  ParentInbox,
} from "@/features/parent-development/conversations";
export function RouteScreen({
  role,
  segments,
}: {
  role: "owner" | "coach" | "parent";
  segments: string[];
}) {
  const [screen, id, action] = segments;
  if (
    role === "coach" &&
    screen === "players" &&
    id &&
    action === "update" &&
    segments.length === 3
  )
    return (
      <Suspense fallback={<p>Loading update…</p>}>
        <UpdateWizard playerId={id} />
      </Suspense>
    );
  if (
    (role === "coach" || role === "parent") &&
    screen === "messages" &&
    id &&
    !action
  )
    return <ConversationThread key={id} conversationId={id} />;
  if (role === "parent" && screen === "messages" && !id) return <ParentInbox />;
  if (role === "parent" && screen === "practice" && segments.length === 1)
    return <DemoPractice />;
  if (role === "parent") {
    if (
      segments.length !== 1 ||
      ![
        "home",
        "schedule",
        "progress",
        "reports",
        "fees",
        "messages",
        "profile",
      ].includes(screen)
    )
      notFound();
    return <ParentScreen screen={screen} />;
  }
  if (segments.length > 3) notFound();
  if (screen === "dashboard" && !id)
    return <Dashboard coach={role === "coach"} />;
  if (screen === "players" && !action)
    return id ? (
      <PlayerProfile playerId={id} coach={role === "coach"} />
    ) : (
      <PlayerDirectory coach={role === "coach"} />
    );
  if (screen === "development" && id && !action && role === "coach")
    return <DevelopmentPlan key={id} playerId={id} />;
  if (screen === "sessions") {
    if (!id) return <Sessions />;
    if (id === "new" && !action && role === "coach") return <SessionBuilder />;
    if (action === "personalise" && role === "coach")
      return (
        <Suspense fallback={<p>Loading session context…</p>}>
          <SessionPersonaliser key={id} sessionId={id} />
        </Suspense>
      );
    if (action === "desk" && role === "coach")
      return <SessionDesk key={id} sessionId={id} />;
  }
  if (screen === "attendance" && !id && role === "owner") return <Attendance />;
  if (screen === "drills" && !action && role === "coach")
    return <Drills drillId={id} />;
  if (screen === "evidence" && !action && role === "coach")
    return <Evidence key={id ?? "library"} evidenceId={id} />;
  if (screen === "reports" && !action && role === "coach")
    return <Reports key={id ?? "library"} reportId={id} />;
  if (
    screen === "academy" &&
    role === "owner" &&
    !action &&
    (!id || ["branches", "programs"].includes(id))
  )
    return <AcademySetup section={id} />;
  if (screen === "fees" && !id && role === "owner") return <Fees />;
  if (
    ((screen === "communication" && role === "owner") ||
      (screen === "messages" && role === "coach")) &&
    !id
  )
    return <DevelopmentCentre />;
  if (screen === "analytics" && !id && role === "owner") return <Analytics />;
  if (screen === "staff" && role === "owner" && !id) return <Staff />;
  if (screen === "squads" && role === "coach" && !id) return <Squads />;
  if (screen === "settings" && !id && role === "owner") return <Settings />;
  notFound();
}
