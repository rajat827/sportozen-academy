"use client";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function EvidenceBadge({ type }: { type: string }) {
  const tones: Record<string, string> = {
    "Coach Observation": "green",
    "Calculated Metric": "blue",
    "AI Estimate": "purple",
    "Missing / Unclear": "amber",
  };
  return <Badge tone={tones[type] ?? "neutral"}>{type}</Badge>;
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function SectionTitle({
  title,
  subtitle,
  href,
  action = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {action}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`} aria-hidden="true">
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="sheet">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="muted">
            Fictional academy record · changes stay in this browser.
          </Dialog.Description>
          <Dialog.Close className="icon-button close" aria-label="Close panel">
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
