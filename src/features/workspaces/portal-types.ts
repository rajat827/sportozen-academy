import type { useWorkspace } from "@/hooks/use-workspace";

export type PortalController = ReturnType<typeof useWorkspace>;
export type PortalSection =
  | "home"
  | "players"
  | "calendar"
  | "training"
  | "reports"
  | "fees"
  | "settings"
  | "messages"
  | "development"
  | "practice";
export type PortalContext = {
  player?: string;
  session?: string;
  [key: string]: string | undefined;
};
export type PortalNavigate = (
  section: PortalSection,
  context?: PortalContext,
) => void;
export interface SessionPortalProps {
  workspace: PortalController;
  sessionId: string;
  onNavigate: PortalNavigate;
}
