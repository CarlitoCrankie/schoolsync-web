"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Institution } from "./data";

export function InstitutionMark({ inst, size = 40, className }: { inst: Institution; size?: number; className?: string }) {
  if (inst.logo) {
    return (
      <span
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line", className)}
        style={{ width: size, height: size }}
      >
        <Image src={inst.logo} alt={`${inst.name} logo`} fill sizes={`${size}px`} className="object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl font-display font-bold text-white", className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${inst.brand.primary}, ${inst.brand.secondary})`, fontSize: size * 0.36 }}
    >
      {inst.initials}
    </span>
  );
}

export function OptionCard({
  icon: Icon,
  iconClass,
  title,
  body,
  onClick,
  trailing,
  leading,
}: {
  icon?: LucideIcon;
  iconClass?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  onClick: () => void;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-[color:var(--brand-fg)] hover:bg-card-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-fg)]/40"
    >
      {leading ??
        (Icon && (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-muted transition-transform group-hover:scale-105", iconClass)}>
            <Icon className="h-5 w-5" />
          </span>
        ))}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-semibold leading-tight text-heading">{title}</span>
        {body && <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{body}</span>}
      </span>
      {trailing}
      <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-[color:var(--brand-fg)]" />
    </motion.button>
  );
}

const tones = {
  rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  slate: "border-line bg-subtle text-body",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
} as const;

export function Banner({ tone, icon: Icon, children }: { tone: keyof typeof tones; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      className="overflow-hidden"
    >
      <div className={cn("mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug", tones[tone])}>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>{children}</div>
      </div>
    </motion.div>
  );
}

export function StepTitle({ title, body, eyebrow }: { title: string; body?: string; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-5">
      {eyebrow}
      <h1 className="font-display text-[22px] font-bold leading-snug tracking-tight text-heading">{title}</h1>
      {body && <p className="mt-1 text-[13.5px] text-muted">{body}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[14px] text-heading placeholder:text-faint outline-none transition focus:border-[color:var(--brand-fg)] focus:ring-2 focus:ring-[color:var(--brand-fg)]/20 disabled:opacity-60";

export function PrimaryButton({ children, loading, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      style={{ background: "var(--brand-strong)" }}
    >
      {loading && (
        <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgb(255_255_255/0.18)_50%,transparent_75%)] bg-[length:200%_100%]" />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}
