"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Moon, Phone, Sparkles } from "lucide-react";
import { Avatar, Panel, PanelHeader, StatusPill } from "@/components/app/ui";
import { Ring } from "@/components/app/charts";
import { usePortal } from "@/features/portal/PortalContext";
import { DayRow, DayTimeline, MiniStat } from "@/features/portal/widgets";
import { historyFor, recordFor, tally } from "@/features/demo/data";
import { fmtDate, fmtTime, toMinutes, nowMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ParentHome() {
  const { inst, person, rules, now, todayKey, dayKey, isWorkingDay } = usePortal();
  const first = person.name.split(" ")[0];
  const rec = recordFor(inst, person, dayKey, now);
  const recent = historyFor(inst, person, todayKey, 21).filter((r) => r.status !== "no_school" && r.date !== dayKey).slice(0, 5);
  const term = tally(historyFor(inst, person, todayKey, 84));
  const beforeLate = isWorkingDay && nowMinutes(now) < toMinutes(rules.late);

  const hero = (() => {
    if (!isWorkingDay)
      return { tone: "slate", icon: Moon, title: "No school today", body: `Here's ${first}'s last school day, ${fmtDate(dayKey, { weekday: "long", day: "numeric", month: "short" })}.` };
    switch (rec.status) {
      case "not_yet":
        return beforeLate
          ? { tone: "slate", icon: Clock, title: `${first} hasn't checked in yet`, body: `School starts at ${fmtTime(rules.start)}. Arrivals after ${fmtTime(rules.late)} are marked late.` }
          : { tone: "amber", icon: Clock, title: `${first} hasn't checked in yet`, body: `It's past ${fmtTime(rules.late)}. If you weren't expecting this, please contact the school.` };
      case "absent":
        return { tone: "rose", icon: AlertTriangle, title: `${first} hasn't checked in today`, body: `No check-in by the ${fmtTime(rules.late)} cut-off. If ${first} is unwell or away, please let the school know.` };
      case "late":
        return { tone: "amber", icon: Clock, title: `${first} arrived late`, body: `Checked in at ${fmtTime(rec.in)}, ${rec.minutesLate} min after ${fmtTime(rules.late)}.` };
      case "left_early":
        return { tone: "amber", icon: Clock, title: `${first} left early`, body: `Checked out at ${fmtTime(rec.out)}, before the ${fmtTime(rules.earlyExit)} early-exit time.` };
      default:
        return rec.out
          ? { tone: "emerald", icon: CheckCircle2, title: `${first} has left school`, body: `In at ${fmtTime(rec.in)}, out at ${fmtTime(rec.out)}.` }
          : { tone: "emerald", icon: CheckCircle2, title: `${first} is in school`, body: `Checked in on time at ${fmtTime(rec.in)}.` };
    }
  })();

  const toneCls: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    slate: "bg-subtle text-muted",
  };

  return (
    <div className="space-y-5">
      {/* Child identity */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 pt-1">
        <Avatar initials={person.initials} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-heading">{person.name}</p>
          <p className="font-mono text-xs text-muted">
            {person.group} · {person.code}
          </p>
        </div>
        <span className="rounded-full bg-subtle px-2.5 py-1 font-mono text-[11px] text-body">{fmtDate(todayKey, { weekday: "short", day: "numeric", month: "short" })}</span>
      </motion.div>

      {/* Today */}
      <Panel className="overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", toneCls[hero.tone])}>
              <hero.icon className="h-5 w-5" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg font-bold text-heading">{hero.title}</p>
                {isWorkingDay && rec.status !== "not_yet" && <StatusPill status={rec.status} />}
              </div>
              <p className="mt-0.5 text-sm text-muted">{hero.body}</p>
            </div>
          </div>
          {rec.in && (
            <div className="mt-5">
              <DayTimeline rec={rec} live={isWorkingDay} />
            </div>
          )}
          {(rec.status === "absent" || (rec.status === "not_yet" && !beforeLate)) && (
            <a href={`tel:${inst.contact.phone.replace(/\s/g, "")}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--brand-strong)" }}>
              <Phone className="h-4 w-4" /> Call the school
            </a>
          )}
        </div>
        {person.guardian?.phone && (
          <p className="border-t border-line bg-card-muted px-5 py-2.5 text-xs text-muted">
            SMS alerts go to <span className="font-mono text-body">{person.guardian.phone}</span>
          </p>
        )}
      </Panel>

      {/* Term */}
      <Panel>
        <PanelHeader title="Last 12 weeks" sub={`${term.days} school days`} />
        <div className="flex items-center gap-5 p-5">
          <Ring value={term.rate} size={88} stroke={8} />
          <div className="grid flex-1 grid-cols-3 gap-2">
            <MiniStat label="On time" value={term.present} tone="text-emerald-600 dark:text-emerald-400" />
            <MiniStat label="Late" value={term.late} tone="text-amber-600 dark:text-amber-400" />
            <MiniStat label="Absent" value={term.absent} tone="text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        {term.rate >= 97 && (
          <p className="mx-5 mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Excellent attendance. Well done, {first}!
          </p>
        )}
      </Panel>

      {/* Recent */}
      <Panel>
        <PanelHeader
          title="Recent days"
          right={
            <Link href="/parent/history" className="flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-fg)]">
              Full history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <ul className="divide-y divide-line">
          {recent.map((r, i) => (
            <DayRow key={r.date} rec={r} index={i} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
