"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Fingerprint, Plus, Users, WifiOff } from "lucide-react";
import { Bars } from "@/components/app/charts";
import { Button, Panel, PanelHeader, Pill, StatCard } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { useConsole } from "@/features/console/ConsoleContext";
import { instStats } from "@/features/console/stats";
import { fmtTime, toMinutes, fromMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ConsoleOverview() {
  const { institutions, now, session } = useConsole();
  const stats = useMemo(() => institutions.map((i) => instStats(i, now)), [institutions, now]);
  const active = stats.filter((s) => s.inst.active);
  const people = active.reduce((a, s) => a + s.people, 0);
  const checkedIn = active.reduce((a, s) => a + s.summary.in, 0);
  const devices = active.flatMap((s) => s.devices.map((d) => ({ ...d, inst: s.inst })));
  const offline = devices.filter((d) => d.status !== "online");

  // Network arrival curve: check-ins per 15 minutes, 6:00 → 10:00.
  const curve = useMemo(() => {
    const buckets = Array.from({ length: 16 }, (_, i) => ({ start: 360 + i * 15, n: 0 }));
    active.forEach((s) =>
      s.rows.forEach(({ rec }) => {
        if (!rec.in) return;
        const b = Math.floor((toMinutes(rec.in) - 360) / 15);
        if (b >= 0 && b < buckets.length) buckets[b].n++;
      }),
    );
    return buckets.map((b, i) => ({ label: i % 2 === 0 ? fmtTime(fromMinutes(b.start)).replace(":00", "") : "", value: b.n }));
  }, [active]);

  // Latest scans across the network (no names: owners see activity, not people).
  const feed = useMemo(
    () =>
      active
        .flatMap((s) =>
          s.rows.flatMap(({ person, rec }) => [
            ...(rec.in ? [{ k: person.id + "i", inst: s.inst, t: rec.in, kind: "Check-in", gate: rec.inGate, type: person.type }] : []),
            ...(rec.out ? [{ k: person.id + "o", inst: s.inst, t: rec.out, kind: "Check-out", gate: rec.outGate, type: person.type }] : []),
          ]),
        )
        .sort((a, b) => b.t.localeCompare(a.t))
        .slice(0, 7),
    [active],
  );

  const alerts = [
    ...offline.map((d) => ({ tone: "rose" as const, icon: WifiOff, text: `${d.inst.name}: ${d.name} offline for ${d.lastSeenMins} min` })),
    ...stats.filter((s) => !s.inst.active).map((s) => ({ tone: "slate" as const, icon: Building2, text: `${s.inst.name} is deactivated` })),
    ...active.filter((s) => s.rate < 85 && s.live && s.summary.in > 0).map((s) => ({ tone: "amber" as const, icon: AlertTriangle, text: `${s.inst.name}: attendance at ${s.rate}% today` })),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-fg)]">Network overview</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-heading sm:text-3xl">Welcome back, {session.name.charAt(0).toUpperCase() + session.name.slice(1)}</h1>
          <p className="mt-1 text-sm text-muted">Every institution on Diamond Attendance, live.</p>
        </div>
        <Link href="/institutions?new=1">
          <Button icon={Plus}>Onboard institution</Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Institutions" value={active.length} suffix={`/ ${stats.length}`} icon={Building2} tone="brand" sub={`${stats.filter((s) => s.inst.type === "school").length} schools · ${stats.filter((s) => s.inst.type !== "school").length} organisations`} />
        <StatCard index={1} label="People enrolled" value={people.toLocaleString()} icon={Users} tone="sky" sub={`${active.reduce((a, s) => a + s.students, 0)} students · ${active.reduce((a, s) => a + s.staff, 0)} staff`} />
        <StatCard index={2} label="Checked in" value={checkedIn.toLocaleString()} icon={CheckCircle2} tone="emerald" sub={`${people ? Math.round((checkedIn / people) * 100) : 0}% of everyone`} />
        <StatCard index={3} label="Scanners online" value={`${devices.length - offline.length}/${devices.length}`} icon={Fingerprint} tone={offline.length ? "rose" : "emerald"} sub={offline.length ? `${offline.length} need attention` : "All healthy"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader
            title="Institutions"
            sub="Today, or their last working day"
            right={
              <Link href="/institutions" className="flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-fg)]">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-semibold">Institution</th>
                  <th className="px-3 py-2.5 font-semibold">People</th>
                  <th className="px-3 py-2.5 font-semibold">Attendance</th>
                  <th className="px-3 py-2.5 font-semibold">Scanners</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.map((s, i) => (
                  <motion.tr key={s.inst.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-subtle/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <InstitutionMark inst={s.inst} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-heading">{s.inst.name}</p>
                          <p className="text-xs text-muted">
                            {s.inst.type === "school" ? "School" : "Organisation"} · {s.inst.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-body">{s.people || "—"}</td>
                    <td className="px-3 py-3">
                      {s.inst.active ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
                            <motion.div className={cn("h-full rounded-full", s.rate >= 90 ? "bg-emerald-500" : s.rate >= 80 ? "bg-amber-500" : "bg-rose-500")} initial={{ width: 0 }} animate={{ width: `${s.rate}%` }} transition={{ duration: 0.8 }} />
                          </div>
                          <span className="font-mono text-xs font-semibold text-heading">{s.rate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      <span className={s.online < s.devices.length ? "text-rose-600 dark:text-rose-400" : "text-body"}>
                        {s.online}/{s.devices.length}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!s.inst.active ? <Pill tone="slate">Deactivated</Pill> : s.live ? <Pill tone="emerald">Live</Pill> : <Pill tone="slate">Closed today</Pill>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="lg:col-span-4">
          <PanelHeader title="Needs attention" sub={alerts.length ? `${alerts.length} item${alerts.length > 1 ? "s" : ""}` : "Nothing right now"} />
          <div className="space-y-2 p-4">
            {alerts.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> All institutions healthy
              </p>
            )}
            {alerts.map((a) => (
              <div key={a.text} className={cn("flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs", a.tone === "rose" ? "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200" : a.tone === "amber" ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" : "bg-subtle text-body")}>
                <a.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {a.text}
              </div>
            ))}
            {offline.length > 0 && (
              <Link href="/devices?status=offline" className="flex items-center justify-end gap-1 pt-1 text-xs font-semibold text-[color:var(--brand-fg)]">
                View scanners <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader title="Arrival curve" sub="Check-ins per 15 minutes across the network" />
          <div className="p-5">
            <Bars data={curve} unit="" />
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" /> Latest scans
              </span>
            }
            sub="Across all institutions"
          />
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {feed.map((e) => (
                <motion.li key={e.k} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 px-5 py-2.5">
                  <InstitutionMark inst={e.inst} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-heading">{e.inst.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {e.kind} · {e.type} · {e.gate}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-heading">{fmtTime(e.t)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
