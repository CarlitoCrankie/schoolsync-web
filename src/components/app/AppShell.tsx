"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string | number; badgeTone?: "rose" | "slate" };

/**
 * Desktop-first dashboard shell: fixed sidebar (drawer on small screens),
 * sticky top bar, branded via the `--brand` CSS variable on the root.
 */
export function AppShell({
  brand,
  brandColor,
  nav,
  user,
  topLeft,
  sidebarFoot,
  footer,
  onSignOut,
  notifications = 0,
  poweredBy = true,
  children,
}: {
  brand: { mark: React.ReactNode; name: string; sub: string };
  brandColor: string;
  nav: NavItem[];
  user: { name: string; role: string; initials: string };
  topLeft?: React.ReactNode;
  sidebarFoot?: React.ReactNode;
  footer?: React.ReactNode;
  onSignOut: () => void;
  notifications?: number;
  poweredBy?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const norm = (p: string) => p.replace(/^\/console(?=\/|$)/, "") || "/";
  const isActive = (href: string) => {
    const a = norm(pathname);
    const b = norm(href);
    const root = nav[0] && norm(nav[0].href);
    return b === root ? a === b : a === b || a.startsWith(b + "/");
  };

  const sidebar = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          {brand.mark}
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold leading-tight text-heading">{brand.name}</p>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">{brand.sub}</p>
          </div>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-3" aria-label="Main">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors", active ? "text-white" : "text-body hover:bg-subtle hover:text-heading")}
              >
                {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl shadow-sm" style={{ background: "var(--brand-strong)" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <item.icon className="relative h-[18px] w-[18px]" />
                <span className="relative flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn("relative rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold", active ? "bg-white/20 text-white" : item.badgeTone === "rose" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" : "bg-subtle text-muted")}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-2 border-t border-line p-4">
        {sidebarFoot}
        {poweredBy && <p className="text-center font-mono text-[10.5px] text-faint">Powered by DiamondAttendance</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface" data-brand style={{ ["--brand" as string]: brandColor }}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-card lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-card lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}>
              <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-card/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-line p-2 text-body lg:hidden" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">{topLeft}</div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-muted hover:text-heading" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {notifications > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />}
            </button>
            <UserMenu user={user} onSignOut={onSignOut} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        {footer && <footer className="border-t border-line bg-card px-4 py-3.5 text-[11.5px] text-muted sm:px-8">{footer}</footer>}
      </div>
    </div>
  );
}

function UserMenu({ user, onSignOut }: { user: { name: string; role: string; initials: string }; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-subtle">
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--brand-strong)" }}>
          {user.initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate font-display text-xs font-semibold text-heading">{user.name}</span>
          <span className="block text-[10.5px] text-muted">{user.role}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-faint sm:block" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-card shadow-xl">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-semibold text-heading">{user.name}</p>
                <p className="text-xs text-muted">{user.role}</p>
              </div>
              <button type="button" onClick={onSignOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-body hover:bg-subtle">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
