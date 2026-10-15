"use client";
import { useState, type ReactNode, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Home,
  CalendarDays,
  Users,
  BookOpen,
  MessageSquare,
  ClipboardList,
  WalletCards,
  Menu,
  Video,
  Search,
  Bell,
  CircleHelp,
  ChevronRight,
  X,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { authClient } from "@/lib/auth-client";
import { navigatePrivateWorkspace } from "@/lib/private-navigation";
import type { WorkspacePayload } from "@/domain/workspace";
import type { PortalSection, PortalNavigate } from "./portal-types";

const sections = [
  ["home", "Home", Home],
  ["calendar", "Calendar", CalendarDays],
  ["players", "Players", Users],
  ["training", "Training", BookOpen],
  ["messages", "Messages", MessageSquare],
  ["reports", "Reports", ClipboardList],
  ["fees", "Fees", WalletCards],
  ["settings", "More", Menu],
] as const;

export function PortalShell({
  data: d,
  section,
  onNavigate,
  children,
}: {
  data: WorkspacePayload;
  section: PortalSection;
  onNavigate: PortalNavigate;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false),
    [help, setHelp] = useState(false),
    [search, setSearch] = useState("");
  const parent = d.membership.role === "PARENT",
    support = d.membership.role === "SUPPORT";
  const name =
    d.viewer?.name ??
    d.members.find((m) => m.userId === d.membership.userId)?.name ??
    d.membership.role.toLowerCase();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const canFinance =
    ["OWNER", "ADMIN", "PARENT"].includes(d.membership.role) &&
    d.academy.modules.includes("fees");
  const nav = parent
    ? [sections[0], sections[5], sections[4], sections[7]]
    : sections.filter(([key]) =>
        support ? ["players", "reports", "settings"].includes(key) : true,
      );
  const identity = (
    <>
      <span className="portal-academy-logo">
        {d.academy.logoData ? (
          <Image
            src={d.academy.logoData}
            alt={`${d.academy.name} logo`}
            width={54}
            height={56}
            unoptimized
          />
        ) : (
          <ShieldCheck size={35} aria-label="Academy logo not yet uploaded" />
        )}
      </span>
      <span>
        <strong>{d.academy.name}</strong>
        <small>{d.academy.location || d.academy.country}</small>
      </span>
    </>
  );
  const navigation = (
    <nav aria-label={parent ? "Parent navigation" : "Academy navigation"}>
      {nav.map(([key, label, Icon]) => (
        <button
          key={key}
          data-leave-editor
          type="button"
          className={
            section === key ||
            (key === "players" && section === "development") ||
            (key === "settings" && section === "practice")
              ? "active"
              : ""
          }
          aria-current={section === key ? "page" : undefined}
          disabled={key === "fees" && !canFinance}
          title={
            key === "fees" && !canFinance
              ? "Fees require academy finance access"
              : undefined
          }
          onClick={() => {
            setMobileOpen(false);
            onNavigate(key);
          }}
        >
          <Icon size={22} />
          <span>{parent && key === "reports" ? "Progress" : label}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <div
      className={`academy-portal ${parent ? "portal-parent" : ""}`}
      style={{ "--portal-green": d.academy.brandAccent } as CSSProperties}
    >
      <a className="skip-link" href="#portal-content">
        Skip to content
      </a>
      {!parent && (
        <aside className="portal-sidebar">
          <button
            data-leave-editor
            className="portal-brand"
            onClick={() => onNavigate("home")}
          >
            <Image
              src="/portal/sportozen-mark.png"
              alt=""
              width={40}
              height={48}
              unoptimized
            />
            <span>
              Sportozen<small>Academy</small>
            </span>
          </button>
          <button
            data-leave-editor
            className="portal-academy"
            onClick={() => onNavigate("settings")}
          >
            {identity}
          </button>
          {navigation}
          <div className="portal-ai">
            <span>
              <Video size={22} />
            </span>
            <p>
              <strong>AI Video Analysis</strong>
              <small>Coming soon</small>
            </p>
          </div>
          <button
            data-leave-editor
            className="portal-account"
            onClick={() => onNavigate("settings", { tab: "account" })}
          >
            <span className="portal-avatar">{initials}</span>
            <span>
              <strong>{name}</strong>
              <small>{d.membership.role}</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </aside>
      )}
      <div className="portal-workspace">
        <header className="portal-header">
          {parent ? (
            <button
              data-leave-editor
              className="portal-parent-identity"
              onClick={() => onNavigate("home")}
            >
              {identity}
            </button>
          ) : (
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger
                className="portal-mobile-menu"
                aria-label="Open academy navigation"
              >
                <Menu size={23} />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="portal-overlay" />
                <Dialog.Content className="portal-menu-dialog">
                  <Dialog.Title>Academy navigation</Dialog.Title>
                  <Dialog.Description>{d.academy.name}</Dialog.Description>
                  <Dialog.Close
                    className="portal-icon close"
                    aria-label="Close navigation"
                  >
                    <X />
                  </Dialog.Close>
                  {navigation}
                  <Link href="/workspace" prefetch={false}>
                    Your academies
                  </Link>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          {!parent && (
            <form
              className="portal-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirmUnsavedChanges()) return;
                onNavigate("players", { q: search });
              }}
            >
              <button aria-label="Search academy players">
                <Search size={19} />
              </button>
              <input
                aria-label="Search academy players"
                placeholder="Search academy players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          )}
          <button
            className="portal-icon"
            data-leave-editor
            aria-label="Messages requiring attention"
            onClick={() => onNavigate("messages")}
          >
            <Bell size={21} />
          </button>
          <button
            className="portal-icon portal-help"
            aria-label="Help and academy access"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={21} />
          </button>
          <button
            className="portal-avatar"
            data-leave-editor
            aria-label="Account settings"
            onClick={() => onNavigate("settings", { tab: "account" })}
          >
            {initials}
          </button>
        </header>
        <main className="portal-content" id="portal-content">
          {children}
        </main>
        {parent && <footer className="portal-parent-nav">{navigation}</footer>}
      </div>
      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay className="portal-overlay" />
          <Dialog.Content className="portal-dialog">
            <Dialog.Title>Your academy workspace</Dialog.Title>
            <Dialog.Description>
              Private football training, reports and communication for{" "}
              {d.academy.name}.
            </Dialog.Description>
            <Dialog.Close className="portal-icon close" aria-label="Close help">
              <X />
            </Dialog.Close>
            <p>
              Your access is checked using your current academy membership.
              Contact the academy owner for changes to assignments or access.
            </p>
            <Link
              className="button secondary"
              href="/workspace"
              prefetch={false}
            >
              Your academies
            </Link>
            <button
              className="button secondary"
              onClick={async () => {
                await authClient.signOut();
                navigatePrivateWorkspace("/sign-in");
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
