"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { fmtDate } from "@/lib/format";

/** Animated area chart of a rate (%) over dates, with hover read-out. */
export function AreaChart({ points, height = 150, min = 80 }: { points: { date: string; rate: number }[]; height?: number; min?: number }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 400;
  const H = height;
  const pad = 8;
  const lo = Math.min(min, ...points.map((p) => p.rate)) - 2;
  const hi = 100;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.rate).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H} L${x(0)} ${H} Z`;
  const h = hover ?? points.length - 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-fg)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand-fg)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--line)" strokeDasharray="3 4" />
        ))}
        <motion.path d={area} fill={`url(#g${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path d={line} fill="none" stroke="var(--brand-fg)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
        <line x1={x(h)} x2={x(h)} y1={0} y2={H} stroke="var(--line-strong)" strokeDasharray="2 3" />
        <circle cx={x(h)} cy={y(points[h]?.rate ?? 0)} r={5} fill="var(--brand-fg)" stroke="var(--card)" strokeWidth={2.5} />
        {points.map((_, i) => (
          <rect key={i} x={x(i) - W / points.length / 2} y={0} width={W / points.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {points[h] && (
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted">
          <span>{fmtDate(points[0].date, { day: "numeric", month: "short" })}</span>
          <span className="rounded-md bg-subtle px-2 py-0.5 font-semibold text-heading">
            {fmtDate(points[h].date)} · {points[h].rate}%
          </span>
          <span>{fmtDate(points[points.length - 1].date, { day: "numeric", month: "short" })}</span>
        </div>
      )}
    </div>
  );
}

/** Simple animated vertical bars with labels. */
export function Bars({ data, unit = "h", highlightLast }: { data: { label: string; value: number }[]; unit?: string; highlightLast?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => {
        const last = highlightLast && i === data.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className={`font-mono text-[10px] ${last ? "font-bold text-[color:var(--brand-fg)]" : "text-muted"}`}>
              {d.value ? `${d.value}${unit}` : "—"}
            </span>
            <motion.div
              className="w-full rounded-t-md"
              style={{ background: last ? "var(--brand-fg)" : "color-mix(in oklab, var(--brand-fg) 55%, transparent)" }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 90}px` }}
              transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="font-mono text-[10px] text-faint">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Ring progress for a percentage. */
export function Ring({ value, size = 64, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--subtle)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--brand-fg)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-heading">{label ?? `${Math.round(value)}%`}</span>
    </div>
  );
}
