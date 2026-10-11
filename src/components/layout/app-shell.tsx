"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  ChevronsLeft,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { ownerNav, coachNav, parentNav } from "@/config/navigation";
import { Avatar, Badge } from "@/components/ui/primitives";
import { useAcademy } from "@/hooks/use-academy";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data, toast, ready, notify } = useAcademy();
  const role = pathname.startsWith("/coach")
    ? "coach"
    : pathname.startsWith("/parent")
      ? "parent"
      : "owner";
  const nav =
    role === "coach" ? coachNav : role === "parent" ? parentNav : ownerNav;
  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""} ${role === "parent" ? "parent-app" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link
          className="brand"
          href={`/${role}/${role === "parent" ? "home" : "dashboard"}`}
        >
          <span className="brand-mark">S</span>
          <span>
            Sportozen<span className="brand-sub">ACADEMY</span>
          </span>
        </Link>
        <button
          className="mobile-drawer-close button secondary"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          Close navigation
        </button>
        <div className="academy-switch">
          <span className="crest">SFC</span>
          <div>
            <strong>{data.academy.name}</strong>
            <small>Academy workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">
          {role === "parent" ? "YOUR PLAYER" : "WORKSPACE"}
        </p>
        <nav>
          {nav.map(([label, href, Icon]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className={
                pathname === href ||
                (href.includes("/players") && pathname.startsWith(`${href}/`))
                  ? "active"
                  : ""
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Reports" && <span className="nav-count">3</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="small-label">
            <Zap size={16} /> A little better, every day.
          </div>
          <p>
            One team. A different path
            <br />
            for every player.
          </p>
          <button
            className="collapse-control"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle collapsed sidebar"
          >
            <ChevronsLeft size={18} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Dismiss navigation backdrop"
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              {data.academy.name}
              <span>/</span>
              <strong>
                {nav.find(([, href]) => href === pathname)?.[0] ??
                  "Player development"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <Badge tone="green">Demo Data</Badge>
            <label className="role-switch">
              <span className="sr-only">Demo role</span>
              <select
                aria-label="Demo role"
                value={role}
                onChange={(e) =>
                  router.push(
                    e.target.value === "parent"
                      ? "/parent/home"
                      : `/${e.target.value}/dashboard`,
                  )
                }
              >
                <option value="owner">Owner</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
              </select>
            </label>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                notify(data.notifications.map((n) => n.title).join(" · "))
              }
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <Avatar
              name={
                role === "coach"
                  ? "Rahul Kumar"
                  : role === "parent"
                    ? "Neha Sharma"
                    : "Anil Mehta"
              }
            />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {ready ? (
            children
          ) : (
            <div className="loading">Loading your academy workspace…</div>
          )}
        </main>
        <footer className="workspace-footer">
          Sportozen Academy <span>Play. Develop. Belong.</span>
          <Link href="/owner/settings">
            Demo workspace <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {(role === "parent" ? parentNav : nav.slice(0, 4)).map(
          ([label, href, Icon]) => (
            <Link
              key={label}
              href={href}
              className={pathname === href ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ),
        )}
      </nav>
      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
