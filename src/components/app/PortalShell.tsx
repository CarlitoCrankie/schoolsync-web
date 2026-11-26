"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, UserRoundPlus, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstitutionMark } from "@/features/auth/ui";
import type { Institution } from "@/features/auth/data";
import { cn } from "@/lib/utils";

export type PortalTab = { href: string; label: string; icon: LucideIcon };

/**
 * Mobile-first shell for the parent and staff portals: institution-coloured
 * header, identity strip, content, and a bottom tab bar (top tabs on desktop).
 */
export function PortalShell({
  inst,
  portalLabel,
  person,
  tabs,
  onSignOut,
  extraMenu,
  children,
}: {
  inst: Institution;
  portalLabel: string;
  person: { name: string; initials: string; meta: string };
  tabs: PortalTab[];
  onSignOut: () => void;
  extraMenu?: { label: string; onClick: () => void; icon?: LucideIcon };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const active = (href: string) => (href === tabs[0].href ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-10" data-brand style={{ ["--brand" as string]: inst.brand.primary }}>
      {/* Brand header */}
      <header className="relative z-40 text-white" style={{ background: `linear-gradient(135deg, var(--brand-strong), color-mix(in oklab, var(--brand-strong) 70%, ${inst.brand.secondary}))` }}>
        {/* Decorative layers are clipped here, not on the header, so the account menu can drop below it. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-grid-dark absolute inset-0 opacity-60" />
          <motion.div className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: inst.brand.secondary, opacity: 0.35 }} animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 14, repeat: Infinity }} />
        </div>
        <div className="relative mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <InstitutionMark inst={inst} size={36} className="ring-white/30" />
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold leading-tight">{inst.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/75">{portalLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="border-white/25 bg-white/10 text-white hover:text-white" />
            <button type="button" onClick={onSignOut} className="flex h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-bold ring-1 ring-white/30" aria-label="Account menu">
                {person.initials}
              </button>
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-card text-left shadow-xl">
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate text-sm font-semibold text-heading">{person.name}</p>
                        <p className="text-xs text-muted">{person.meta}</p>
                      </div>
                      {extraMenu && (
                        <button type="button" onClick={extraMenu.onClick} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-subtle">
                          {extraMenu.icon ? <extraMenu.icon className="h-4 w-4" /> : <UserRoundPlus className="h-4 w-4" />} {extraMenu.label}
                        </button>
                      )}
                      <button type="button" onClick={onSignOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-subtle">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        {/* Desktop tabs */}
        <nav className="relative mx-auto hidden max-w-3xl gap-1 px-6 pb-2 md:flex" aria-label="Portal">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={cn("relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", active(t.href) ? "text-white" : "text-white/70 hover:text-white")}>
              {active(t.href) && <motion.span layoutId="portal-tab" className="absolute inset-0 rounded-lg bg-white/15" />}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Portal">
        <div className="mx-auto flex max-w-md justify-around px-4 py-1.5">
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("relative flex w-20 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-semibold transition-colors", on ? "text-[color:var(--brand-fg)]" : "text-faint")}>
                {on && <motion.span layoutId="portal-bottom" className="absolute inset-0 rounded-xl bg-[color:var(--brand-fg)]/10" />}
                <t.icon className="relative h-5 w-5" />
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <p className="mt-10 text-center font-mono text-[10.5px] text-faint">Powered by DiamondAttendance</p>
    </div>
  );
}
