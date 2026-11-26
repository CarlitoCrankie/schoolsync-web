"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Clock, Moon, Timer } from "lucide-react";
import { Panel, PanelHeader, StatusPill } from "@/components/app/ui";
import { Bars, Ring } from "@/components/app/charts";
import { usePortal } from "@/features/portal/PortalContext";
import { DayRow, DayTimeline, MiniStat, minutesIn } from "@/features/portal/widgets";
import { historyFor, recordFor, tally } from "@/features/demo/data";
import { addDays, fmtDate, fmtHours, fmtTime, fromKey, nowMinutes, toMinutes } from "@/lib/format";

export default function StaffHome() {
  const { inst, person, rules, now, todayKey, dayKey, isWorkingDay } = usePortal();
  const first = person.name.replace(/^(Mr\.|Mrs\.)\s/, "").split(" ")[0];
  const rec = recordFor(inst, person, dayKey, now);
  const liveMins = rec.in ? (rec.out ? toMinutes(rec.out) : isWorkingDay ? nowMinutes(now) : toMinutes(rec.in)) - toMinutes(rec.in) : 0;
  const month = tally(historyFor(inst, person, todayKey, fromKey(todayKey).getDate()));
  const recent = historyFor(inst, person, todayKey, 14).filter((r) => r.status !== "no_school" && r.date !== dayKey).slice(0, 5);
  const monday = addDays(todayKey, -((fromKey(todayKey).getDay() + 6) % 7));
  const week = Array.from({ length: 5 }, (_, i) => {
    const key = addDays(monday, i);
    const r = key <= todayKey ? recordFor(inst, person, key, now) : null;
    const mins = r ? (key === todayKey ? liveMins : minutesIn(r)) : 0;
    return { label: fmtDate(key, { weekday: "short" }), value: Math.round((mins / 60) * 10) / 10 };
  });
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const state = !isWorkingDay
    ? { icon: Moon, title: "Not a working day", body: `Your last working day was ${fmtDate(dayKey, { weekday: "long", day: "numeric", month: "short" })}.` }
    : rec.status === "not_yet"
      ? { icon: Clock, title: "Not clocked in yet", body: `Your day starts at ${fmtTime(rules.start)}. Clock-ins after ${fmtTime(rules.late)} count as late.` }
      : rec.status === "absent"
        ? { icon: Clock, title: "No clock-in today", body: `Nothing recorded by ${fmtTime(rules.late)}. If you're in, check with the admin that your scan went through.` }
        : rec.out
          ? { icon: CheckCircle2, title: "Clocked out", body: `You worked ${fmtHours(liveMins)} today.` }
          : { icon: Timer, title: "You're clocked in", body: `Since ${fmtTime(rec.in)}. Day ends at ${fmtTime(rules.end)}.` };

  return (
    <div className="space-y-5 pt-1">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted">{greeting},</p>
        <h1 className="font-display text-2xl font-bold text-heading">{first}</h1>
      </motion.div>

      <Panel className="overflow-hidden">
        <div className="flex items-start gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <state.icon className="h-4 w-4 text-[color:var(--brand-fg)]" />
              <p className="font-display text-lg font-bold text-heading">{state.title}</p>
              {isWorkingDay && rec.status !== "not_yet" && <StatusPill status={rec.status} extra={rec.status === "late" ? `+${rec.minutesLate}m` : undefined} />}
            </div>
            <p className="mt-0.5 text-sm text-muted">{state.body}</p>
          </div>
          {rec.in && (
            <div className="text-right">
              <p className="text-[11px] text-muted">{rec.out || !isWorkingDay ? "Hours" : "So far"}</p>
              <p className="font-mono text-2xl font-bold text-heading">{fmtHours(liveMins)}</p>
            </div>
          )}
        </div>
        {rec.in && (
          <div className="px-5 pb-5">
            <DayTimeline rec={rec} live={isWorkingDay} />
          </div>
        )}
        <div className="grid grid-cols-4 border-t border-line bg-card-muted text-center text-[11px]">
          {[
            ["Starts", rules.start],
            ["Late after", rules.late],
            ["Ends", rules.end],
            ["Early before", rules.earlyExit],
          ].map(([l, v]) => (
            <div key={l} className="px-2 py-2.5">
              <p className="text-muted">{l}</p>
              <p className="font-mono font-semibold text-heading">{fmtTime(v)}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={fmtDate(todayKey, { month: "long" }) + " so far"} sub={`${month.days} working days`} />
        <div className="flex items-center gap-5 p-5">
          <Ring value={month.rate} size={84} stroke={8} />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="On time" value={month.present} tone="text-emerald-600 dark:text-emerald-400" />
            <MiniStat label="Late" value={month.late} tone="text-amber-600 dark:text-amber-400" />
            <MiniStat label="Absent" value={month.absent} tone="text-rose-600 dark:text-rose-400" />
            <MiniStat label="Hours" value={fmtHours(month.minutes)} />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Hours this week" sub={fmtHours(week.reduce((a, d) => a + Math.round(d.value * 60), 0))} />
        <div className="p-5">
          <Bars data={week} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Recent days"
          right={
            <Link href="/staff/history" className="flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-fg)]">
              My record <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <ul className="divide-y divide-line">
          {recent.map((r, i) => (
            <DayRow key={r.date} rec={r} showHours index={i} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
