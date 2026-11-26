"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayStatus } from "@/features/demo/data";

/* ── Panel ─────────────────────────────────────────────────── */
export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, sub, right, className }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-bold text-heading">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── Page header ───────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: React.ReactNode; title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow && <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-fg)]">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-heading sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Buttons ───────────────────────────────────────────────── */
export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; icon?: LucideIcon }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-[13px]",
        variant === "primary" && "text-white shadow-sm hover:brightness-110",
        variant === "secondary" && "border border-line bg-card text-heading hover:bg-card-muted",
        variant === "ghost" && "text-body hover:bg-subtle",
        variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        className,
      )}
      style={variant === "primary" ? { background: "var(--brand-strong)", ...rest.style } : rest.style}
    >
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

/* ── Stat card ─────────────────────────────────────────────── */
const tones = {
  brand: "bg-[color:var(--brand-fg)]/12 text-[color:var(--brand-fg)]",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  slate: "bg-subtle text-body",
} as const;
export type Tone = keyof typeof tones;

export function StatCard({
  label,
  value,
  suffix,
  sub,
  foot,
  icon: Icon,
  tone = "brand",
  valueClass,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  sub?: React.ReactNode;
  foot?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  valueClass?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group rounded-2xl border border-line bg-card p-5 shadow-card transition-shadow hover:shadow-card-featured"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("font-display text-3xl font-bold tracking-tight text-heading tabular-nums", valueClass)}>{value}</span>
        {suffix}
      </div>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {foot && <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] font-medium">{foot}</div>}
    </motion.div>
  );
}

/* ── Status pill ───────────────────────────────────────────── */
const statusMap: Record<DayStatus, { label: string; cls: string; dot: string }> = {
  present: { label: "On time", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500" },
  late: { label: "Late", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500" },
  absent: { label: "Absent", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", dot: "bg-rose-500" },
  left_early: { label: "Left early", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-transparent dark:text-amber-300 dark:ring-amber-500/40", dot: "bg-amber-500" },
  not_yet: { label: "Not in yet", cls: "bg-subtle text-muted", dot: "bg-faint" },
  no_school: { label: "No school", cls: "bg-subtle text-faint", dot: "bg-faint" },
};

export function StatusPill({ status, extra, className }: { status: DayStatus; extra?: string; className?: string }) {
  const s = statusMap[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold", s.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
      {extra && <span className="font-mono font-medium opacity-80">{extra}</span>}
    </span>
  );
}

export function Pill({ tone = "slate", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold", tones[tone], className)}>{children}</span>;
}

/* ── Avatar ────────────────────────────────────────────────── */
const avatarTones = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
];
export function Avatar({ initials, size = 36, className }: { initials: string; size?: number; className?: string }) {
  const tone = avatarTones[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % avatarTones.length];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", tone, className)} style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials}
    </span>
  );
}

/* ── Segmented control ─────────────────────────────────────── */
export function Segmented<T extends string>({ value, onChange, options, layoutId }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; layoutId: string }) {
  return (
    <div className="inline-flex rounded-xl bg-subtle p-1 text-xs font-semibold">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn("relative rounded-lg px-3.5 py-1.5 transition-colors", value === o.value ? "text-heading" : "text-muted hover:text-heading")}>
          {value === o.value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Empty & skeleton ──────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-faint">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-display text-sm font-semibold text-heading">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-subtle", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, icon: Icon, children, footer, wide }: { open: boolean; onClose: () => void; title: string; icon?: LucideIcon; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn("max-h-[92vh] w-full overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: "var(--brand-strong)" }}>
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <h3 className="font-display text-base font-bold text-heading">{title}</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-faint hover:bg-subtle hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line bg-card-muted px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Toasts ────────────────────────────────────────────────── */
type Toast = { id: number; msg: string; tone: "success" | "info" | "warning" | "error" };
const ToastCtx = createContext<(msg: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  const icons = { success: CheckCircle2, info: Info, warning: TriangleAlert, error: XCircle };
  const colors = { success: "text-emerald-400", info: "text-sky-400", warning: "text-amber-400", error: "text-rose-400" };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[70] flex flex-col items-end gap-2 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const I = icons[t.tone];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-[13px] text-white shadow-xl">
                <I className={cn("h-4 w-4 shrink-0", colors[t.tone])} />
                {t.msg}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Inputs ────────────────────────────────────────────────── */
export const fieldClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13.5px] text-heading placeholder:text-faint outline-none transition focus:border-[color:var(--brand-fg)] focus:ring-2 focus:ring-[color:var(--brand-fg)]/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-body">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}
