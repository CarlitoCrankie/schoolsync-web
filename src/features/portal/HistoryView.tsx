"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Download, List, PartyPopper } from "lucide-react";
import { Button, EmptyState, Panel, PanelHeader, Segmented, StatusPill } from "@/components/app/ui";
import { Bars } from "@/components/app/charts";
import { usePortal } from "@/features/portal/PortalContext";
import { AttendanceCalendar, DayRow, MiniStat, minutesIn } from "@/features/portal/widgets";
import { historyFor, tally, type DayStatus } from "@/features/demo/data";
import { downloadCsv } from "@/lib/useQuery";
import { addDays, fmtDate, fmtHours, fmtTime, fromKey } from "@/lib/format";

type Range = "week" | "month" | "term";
const RANGE_DAYS: Record<Range, number> = { week: 7, month: 31, term: 84 };

export function HistoryView({ mode }: { mode: "parent" | "staff" }) {
  const { inst, person, now, todayKey } = usePortal();
  const staff = mode === "staff";
  const [range, setRange] = useState<Range>("month");
  const [view, setView] = useState<"calendar" | "list">(staff ? "list" : "calendar");
  const [filter, setFilter] = useState<"all" | DayStatus>("all");
  const first = person.name.replace(/^(Mr\.|Mrs\.)\s/, "").split(" ")[0];

  const all = useMemo(() => historyFor(inst, person, todayKey, RANGE_DAYS[range]), [inst, person, todayKey, range]);
  const t = tally(all);
  const days = all.filter((r) => r.status !== "no_school" && r.status !== "not_yet");
  const shown = filter === "all" ? days : days.filter((r) => r.status === filter);

  // Hours by weekday this week (Mon → today) for staff.
  const week = useMemo(() => {
    const d = fromKey(todayKey);
    const monday = addDays(todayKey, -((d.getDay() + 6) % 7));
    return Array.from({ length: 5 }, (_, i) => {
      const key = addDays(monday, i);
      const rec = historyFor(inst, person, todayKey, 7).find((r) => r.date === key);
      return { label: fmtDate(key, { weekday: "short" }), value: rec ? Math.round((minutesIn(rec) / 60) * 10) / 10 : 0 };
    });
  }, [inst, person, todayKey]);

  const perfect = t.days > 0 && t.absent === 0 && t.late === 0 && t.leftEarly === 0;
  const rangeLabel = staff ? { week: "Week", month: "Month", term: "3 months" } : { week: "Week", month: "Month", term: "Term" };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-heading">{staff ? "My record" : `${first}'s history`}</h1>
          <p className="text-xs text-muted">
            {fmtDate(addDays(todayKey, -(RANGE_DAYS[range] - 1)), { day: "numeric", month: "short" })} – {fmtDate(todayKey, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <Segmented layoutId="hist-range" value={range} onChange={setRange} options={(["week", "month", "term"] as const).map((v) => ({ value: v, label: rangeLabel[v] }))} />
      </div>

      <AnimatePresence>
        {perfect && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, var(--brand-strong), #059669)" }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span key={i} aria-hidden className="absolute h-1.5 w-1.5 rounded-sm bg-white/70" style={{ left: `${(i * 37) % 100}%`, top: -6 }} animate={{ y: [0, 90], rotate: [0, 180], opacity: [1, 0] }} transition={{ duration: 2.2, delay: i * 0.12, repeat: Infinity, repeatDelay: 1.5 }} />
            ))}
            <div className="relative flex items-center gap-3">
              <PartyPopper className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-display font-bold">Perfect attendance this {rangeLabel[range].toLowerCase()}!</p>
                <p className="text-xs text-white/85">{staff ? "On time every working day." : `${first} was on time every school day.`}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={staff ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-2 gap-2 sm:grid-cols-4"}>
        <MiniStat label="Attendance" value={`${t.rate}%`} />
        <MiniStat label="On time" value={t.present} tone="text-emerald-600 dark:text-emerald-400" />
        <MiniStat label="Late" value={t.late} tone="text-amber-600 dark:text-amber-400" />
        {staff ? <MiniStat label="Hours" value={fmtHours(t.minutes)} /> : <MiniStat label="Absent" value={t.absent} tone="text-rose-600 dark:text-rose-400" />}
      </div>

      {staff && (
        <Panel>
          <PanelHeader title="Hours this week" sub={`${fmtHours(week.reduce((a, d) => a + Math.round(d.value * 60), 0))} so far`} />
          <div className="p-5">
            <Bars data={week} highlightLast={false} />
          </div>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-body">
            <option value="all">All days ({days.length})</option>
            <option value="present">On time ({t.present})</option>
            <option value="late">Late ({t.late})</option>
            <option value="left_early">Left early ({t.leftEarly})</option>
            <option value="absent">Absent ({t.absent})</option>
          </select>
          <div className="flex items-center gap-2">
            {staff && (
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() =>
                  downloadCsv(`my-attendance-${todayKey}.csv`, [
                    ["Date", "Check in", "Check out", "Hours", "Status"],
                    ...days.map((r) => [r.date, r.in ?? "", r.out ?? "", minutesIn(r) ? (minutesIn(r) / 60).toFixed(2) : "", r.status]),
                  ])
                }
              >
                CSV
              </Button>
            )}
            {!staff && (
              <Segmented
                layoutId="hist-view"
                value={view}
                onChange={setView}
                options={[
                  { value: "calendar", label: <CalendarDays className="h-3.5 w-3.5" /> },
                  { value: "list", label: <List className="h-3.5 w-3.5" /> },
                ]}
              />
            )}
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No days match" body="Try another filter or a longer range." />
        ) : view === "calendar" && !staff ? (
          <div className="p-4">
            <AttendanceCalendar records={filter === "all" ? all.filter((r) => r.status !== "not_yet") : all.map((r) => (r.status === filter ? r : { ...r, status: "no_school" as const }))} />
          </div>
        ) : staff ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">In</th>
                  <th className="px-3 py-2.5 font-semibold">Out</th>
                  <th className="px-3 py-2.5 font-semibold">Hours</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={r.date} className="hover:bg-subtle/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-heading">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-body">{r.in ? fmtTime(r.in) : "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-body">{r.out ? fmtTime(r.out) : "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-body">{minutesIn(r) ? fmtHours(minutesIn(r)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusPill status={r.status} extra={r.status === "late" ? `+${r.minutesLate}m` : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-card-muted text-xs font-semibold text-heading">
                  <td className="px-4 py-2.5">{shown.length} days</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2.5 font-mono">{fmtHours(shown.reduce((a, r) => a + minutesIn(r), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((r, i) => (
              <DayRow key={r.date} rec={r} index={i} />
            ))}
          </ul>
        )}
      </Panel>
      <p className="text-center text-[11px] text-faint">Updated {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Something look wrong? Contact {inst.name}.</p>
    </div>
  );
}
