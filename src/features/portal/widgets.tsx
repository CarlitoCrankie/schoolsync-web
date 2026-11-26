"use client";

import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Clock, MapPin } from "lucide-react";
import { StatusPill } from "@/components/app/ui";
import type { DayRecord, DayStatus } from "@/features/demo/data";
import { fmtDate, fmtHours, fmtTime, fromKey, toMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const statusColor: Record<DayStatus, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-500",
  left_early: "bg-orange-400",
  absent: "bg-rose-500",
  not_yet: "bg-line-strong",
  no_school: "bg-subtle",
};

export const minutesIn = (r: DayRecord) => (r.in && r.out ? toMinutes(r.out) - toMinutes(r.in) : 0);

/** Check-in / check-out timeline for a single day. */
export function DayTimeline({ rec, live }: { rec: DayRecord; live?: boolean }) {
  const events = [
    rec.in && { icon: ArrowDownLeft, label: "Checked in", time: rec.in, gate: rec.inGate, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400" },
    rec.out && { icon: ArrowUpRight, label: "Checked out", time: rec.out, gate: rec.outGate, tone: "text-sky-600 bg-sky-50 dark:bg-sky-500/15 dark:text-sky-400" },
  ].filter(Boolean) as { icon: typeof Clock; label: string; time: string; gate?: string; tone: string }[];

  if (!events.length) return null;
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-line">
      {events.map((e, i) => (
        <motion.li key={e.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1 }} className="relative flex items-center gap-3">
          <span className={cn("relative z-10 flex h-9 w-9 items-center justify-center rounded-full", e.tone)}>
            <e.icon className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-heading">{e.label}</p>
            {e.gate && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3" /> {e.gate}
              </p>
            )}
          </div>
          <span className="font-mono text-sm font-semibold text-heading">{fmtTime(e.time)}</span>
        </motion.li>
      ))}
      {live && rec.in && !rec.out && (
        <li className="relative flex items-center gap-3">
          <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-line-strong bg-card text-faint">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted">Check-out will show here</p>
        </li>
      )}
    </ol>
  );
}

/** One row in a recent-days list. */
export function DayRow({ rec, showHours, index = 0 }: { rec: DayRecord; showHours?: boolean; index?: number }) {
  const d = fromKey(rec.date);
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center gap-3 px-4 py-3">
      <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-subtle py-1">
        <span className="text-[10px] font-semibold uppercase text-muted">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
        <span className="font-display text-base font-bold leading-none text-heading">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1 font-mono text-xs text-body">
        {rec.in ? (
          <span>
            {fmtTime(rec.in)} <span className="text-faint">→</span> {rec.out ? fmtTime(rec.out) : <span className="text-faint">—</span>}
          </span>
        ) : (
          <span className="text-faint">No check-in</span>
        )}
        {showHours && minutesIn(rec) > 0 && <span className="ml-2 text-muted">· {fmtHours(minutesIn(rec))}</span>}
      </div>
      <StatusPill status={rec.status} extra={rec.status === "late" ? `+${rec.minutesLate}m` : undefined} />
    </motion.li>
  );
}

/** Month-style calendar of a set of records (newest-first input). */
export function AttendanceCalendar({ records }: { records: DayRecord[] }) {
  const byMonth = new Map<string, DayRecord[]>();
  [...records].reverse().forEach((r) => {
    const k = r.date.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), r]);
  });
  return (
    <div className="space-y-6">
      {[...byMonth.entries()].reverse().map(([month, recs]) => {
        const first = fromKey(recs[0].date);
        const lead = (first.getDay() + 6) % 7; // Monday-first grid
        return (
          <div key={month}>
            <p className="mb-2 font-display text-sm font-bold text-heading">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="pb-1 text-[10px] font-semibold text-faint">
                  {d}
                </span>
              ))}
              {Array.from({ length: lead }).map((_, i) => (
                <span key={`l${i}`} />
              ))}
              {recs.map((r, i) => {
                const day = fromKey(r.date).getDate();
                const off = r.status === "no_school";
                return (
                  <motion.div
                    key={r.date}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.012 }}
                    title={`${fmtDate(r.date, { weekday: "long", day: "numeric", month: "short" })}${r.in ? ` · in ${fmtTime(r.in)}` : ""}${r.out ? ` · out ${fmtTime(r.out)}` : ""}`}
                    className={cn("relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold", off ? "text-faint" : "bg-card-muted text-heading ring-1 ring-line")}
                  >
                    {day}
                    {!off && <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", statusColor[r.status])} />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {(
          [
            ["present", "On time"],
            ["late", "Late"],
            ["left_early", "Left early"],
            ["absent", "Absent"],
          ] as const
        ).map(([s, l]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusColor[s])} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small labelled number used in portal summary tiles. */
export function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-card-muted p-3 ring-1 ring-line">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("mt-0.5 font-display text-xl font-bold text-heading", tone)}>{value}</p>
    </div>
  );
}
