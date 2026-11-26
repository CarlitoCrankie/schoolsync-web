"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Cpu, Fingerprint, Search, Wifi, WifiOff } from "lucide-react";
import { EmptyState, PageHeader, Panel, PanelHeader, Pill, Segmented, StatCard, fieldClass } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { useConsole } from "@/features/console/ConsoleContext";
import { instStats } from "@/features/console/stats";
import { useQueryParam } from "@/lib/useQuery";
import { cn } from "@/lib/utils";

export default function ConsoleDevices() {
  const { institutions, now } = useConsole();
  const initial = useQueryParam("status");
  const [status, setStatus] = useState<"all" | "online" | "offline">("all");
  const [instId, setInstId] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (initial === "offline" || initial === "online") setStatus(initial);
  }, [initial]);

  const stats = useMemo(() => institutions.filter((i) => i.active).map((i) => instStats(i, now)), [institutions, now]);
  const all = stats.flatMap((s) => s.devices.map((d) => ({ ...d, inst: s.inst })));
  const shown = all.filter((d) => (status === "all" || d.status === status) && (instId === "all" || d.inst.id === instId) && `${d.name} ${d.serial} ${d.inst.name} ${d.location}`.toLowerCase().includes(q.toLowerCase()));
  const offline = all.filter((d) => d.status !== "online").length;

  return (
    <div>
      <PageHeader eyebrow="Infrastructure" title="Scanners & agents" sub="Every ZKTeco terminal and on-site sync agent across the network." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Scanners" value={all.length} icon={Fingerprint} tone="brand" />
        <StatCard index={1} label="Online" value={all.length - offline} icon={Wifi} tone="emerald" />
        <StatCard index={2} label="Offline" value={offline} icon={WifiOff} tone={offline ? "rose" : "slate"} valueClass={offline ? "text-rose-600 dark:text-rose-400" : undefined} />
        <StatCard index={3} label="Sync agents" value={`${stats.length}/${stats.length}`} icon={Cpu} tone="sky" sub="All reporting" />
      </div>

      <Panel className="mb-6">
        <PanelHeader title="Sync agents" sub="One per site. Pulls scans from the terminals and sends them up." />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div key={s.inst.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-xl border border-line bg-card-muted p-3">
              <InstitutionMark inst={s.inst} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">{s.inst.name}</p>
                <p className="font-mono text-[11px] text-muted">
                  v{s.agent.version} · heartbeat {s.agent.lastBeatSecs}s ago
                </p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </motion.div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, serial, location…" className={cn(fieldClass, "py-2 pl-9")} />
          </div>
          <select value={instId} onChange={(e) => setInstId(e.target.value)} className={cn(fieldClass, "w-auto py-2")}>
            <option value="all">All institutions</option>
            {stats.map((s) => (
              <option key={s.inst.id} value={s.inst.id}>
                {s.inst.name}
              </option>
            ))}
          </select>
          <Segmented
            layoutId="dev-status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "online", label: "Online" },
              { value: "offline", label: `Offline${offline ? ` (${offline})` : ""}` },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={Fingerprint} title="No scanners match" body="Try clearing a filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-semibold">Scanner</th>
                  <th className="px-3 py-2.5 font-semibold">Institution</th>
                  <th className="px-3 py-2.5 font-semibold">Model</th>
                  <th className="px-3 py-2.5 font-semibold">Serial</th>
                  <th className="px-3 py-2.5 font-semibold">Scans today</th>
                  <th className="px-3 py-2.5 font-semibold">Last seen</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((d) => {
                  const on = d.status === "online";
                  return (
                    <tr key={d.id} className={cn("hover:bg-subtle/60", !on && "bg-rose-50/50 dark:bg-rose-500/5")}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-heading">{d.name}</p>
                        <p className="text-xs text-muted">{d.location}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <InstitutionMark inst={d.inst} size={24} />
                          <span className="truncate text-xs text-body">{d.inst.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-body">{d.model}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted">{d.serial}</td>
                      <td className="px-3 py-3 font-mono text-xs text-heading">{d.scansToday}</td>
                      <td className={cn("px-3 py-3 font-mono text-xs", on ? "text-body" : "font-semibold text-rose-600 dark:text-rose-400")}>{on ? "Just now" : `${d.lastSeenMins} min ago`}</td>
                      <td className="px-5 py-3 text-right">
                        <Pill tone={on ? "emerald" : "rose"}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", on ? "animate-pulse bg-emerald-500" : "bg-rose-500")} />
                          {on ? "Online" : "Offline"}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
