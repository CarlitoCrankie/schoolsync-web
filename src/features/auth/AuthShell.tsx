"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BellRing, CheckCircle2, Fingerprint, Wifi } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Institution } from "./data";
import { InstitutionMark } from "./ui";

/**
 * Split-screen sign-in layout. The left panel is decorative and takes on the
 * chosen institution's colours; on phones only the form is shown.
 */
export function AuthShell({ institution, children }: { institution?: Institution; children: React.ReactNode }) {
  const primary = institution?.brand.primary ?? "#0a2259";
  const secondary = institution?.brand.secondary ?? "#06b6d4";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Left: animated brand panel ─────────────────────────── */}
      <motion.aside
        className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
        animate={{ backgroundColor: primary }}
        transition={{ duration: 0.8 }}
      >
        <div aria-hidden className="bg-grid-dark mask-radial absolute inset-0" />
        <motion.div
          aria-hidden
          className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full blur-3xl"
          animate={{ backgroundColor: secondary, x: [0, 60, 0], y: [0, 40, 0], opacity: 0.35 }}
          transition={{ backgroundColor: { duration: 0.8 }, x: { duration: 18, repeat: Infinity }, y: { duration: 18, repeat: Infinity } }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-32 -right-16 h-[460px] w-[460px] rounded-full bg-blue-400/30 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity }}
        />

        <div className="relative">
          <Link href="/" aria-label="Diamond Attendance home">
            <Logo dark />
          </Link>
        </div>

        <div className="relative max-w-md">
          <AnimatePresence mode="wait">
            {institution ? (
              <motion.div key={institution.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <InstitutionMark inst={institution} size={72} className="mb-6 shadow-xl ring-white/20" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Signing in to</p>
                <h2 className="mt-2 font-display text-4xl font-extrabold leading-tight">{institution.name}</h2>
                <p className="mt-3 text-sm text-white/70">{institution.location}</p>
              </motion.div>
            ) : (
              <motion.div key="default" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h2 className="font-display text-4xl font-extrabold leading-tight">
                  One sign-in for every <span className="text-cyan-300">school</span> and <span className="text-cyan-300">workplace</span>.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Parents, staff and administrators each get their own view of attendance, branded for their institution.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 space-y-3">
            <FloatingChip icon={Fingerprint} delay={0} text="Kwesi checked in · 07:42" />
            <FloatingChip icon={BellRing} delay={0.6} text="SMS delivered to parent" />
            <FloatingChip icon={Wifi} delay={1.2} text="Main Gate scanner online" />
          </div>
        </div>

        <p className="relative text-[11px] text-white/50">© {new Date().getFullYear()} Diamond Attendance · Accra, Ghana</p>
      </motion.aside>

      {/* ── Right: form column ─────────────────────────────────── */}
      <main className="relative flex flex-col bg-surface">
        <div aria-hidden className="bg-grid mask-radial pointer-events-none absolute inset-0 opacity-60 lg:hidden" />
        <div className="relative flex items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-heading">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <ThemeToggle />
        </div>
        <div className="relative flex flex-1 items-start justify-center px-4 pb-10 sm:items-center sm:px-8">{children}</div>
      </main>
    </div>
  );
}

function FloatingChip({ icon: Icon, text, delay }: { icon: typeof Fingerprint; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
      transition={{ opacity: { delay, duration: 0.5 }, x: { delay, duration: 0.5 }, y: { delay, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
      className="flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm backdrop-blur-md"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
        <Icon className="h-4 w-4 text-cyan-200" />
      </span>
      {text}
      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
    </motion.div>
  );
}
