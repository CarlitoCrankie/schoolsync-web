"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, LogIn, Menu, MessageCircle, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { contact, nav } from "@/content/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-line/80 bg-card/80 shadow-sm backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" aria-label="Diamond Attendance home">
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm font-medium text-body lg:flex">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="relative transition-colors hover:text-heading">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <a
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20 md:inline-flex"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            WhatsApp
          </a>
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2 text-xs font-semibold text-heading transition-colors hover:bg-card-muted sm:inline-flex"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            <CalendarCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Book a site survey</span>
            <span className="sm:hidden">Survey</span>
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-line bg-card p-2 text-body lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-card lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-body hover:bg-card-muted"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-accent hover:bg-card-muted">
                Sign in
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
