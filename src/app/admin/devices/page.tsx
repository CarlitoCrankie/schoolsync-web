"use client";

import { motion } from "motion/react";
import { Activity, Cpu, Fingerprint, LifeBuoy, MapPin, Phone, ScanLine, Wifi, WifiOff } from "lucide-react";
import { PageHeader, Panel, PanelHeader, Pill, StatCard } from "@/components/app/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import { platformSupport } from "@/features/auth/data";
import { devicesLive } from "@/features/demo/data";
import { cn } from "@/lib/utils";

export default function DevicesPage() {
  const { inst, dayKey } = useAdmin();
  const devices = devicesLive(inst, dayKey);
  const online = devices.filter((d) => d.status === "online");
  const offline = devices.filter((d) => d.status !== "online");
  const scans = devices.reduce((a, d) => a + d.scansToday, 0);

  return (
    <div>
      <PageHeader eyebrow="Scanners" title="Scanners" sub="The fingerprint and face terminals at your gates, and the sync agent that sends their scans to Diamond Attendance." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Online" value={`${online.length}/${devices.length}`} icon={Wifi} tone="emerald" />
        <StatCard index={1} label="Offline" value={offline.length} icon={WifiOff} tone={offline.length ? "rose" : "slate"} valueClass={offline.length ? "text-rose-600 dark:text-rose-400" : undefined} />
        <StatCard index={2} label="Scans today" value={scans.toLocaleString()} icon={ScanLine} tone="sky" />
        <StatCard index={3} label="Sync agent" value="Running" icon={Cpu} tone="brand" sub="Last heartbeat under a minute ago" />
      </div>

      {offline.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-start gap-2.5">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{offline.map((d) => d.name).join(", ")}</strong> {offline.length > 1 ? "are" : "is"} offline. The scanner keeps recording and syncs automatically once it&apos;s back. Check its power and network cable, or call support.
            </span>
          </div>
          <a href={`tel:${platformSupport.phone.replace(/\s/g, "")}`} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700">
            <Phone className="h-3.5 w-3.5" /> Call support
          </a>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {devices.map((d, i) => {
          const on = d.status === "online";
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Panel className={cn("relative overflow-hidden p-5", !on && "border-rose-300 dark:border-rose-500/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("relative flex h-12 w-12 items-center justify-center rounded-2xl", on ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400")}>
                      <Fingerprint className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-display text-base font-bold text-heading">{d.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3 w-3" /> {d.location}
                      </p>
                    </div>
                  </div>
                  <Pill tone={on ? "emerald" : "rose"}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", on ? "animate-pulse bg-emerald-500" : "bg-rose-500")} />
                    {on ? "Online" : "Offline"}
                  </Pill>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <Metric label="Last seen" value={on ? "Just now" : `${d.lastSeenMins} min ago`} warn={!on} />
                  <Metric label="Scans today" value={String(d.scansToday)} />
                  <Metric label="Model" value={d.model.replace("ZKTeco ", "")} />
                </div>
                <p className="mt-3 font-mono text-[10.5px] text-faint">Serial {d.serial}</p>
              </Panel>
            </motion.div>
          );
        })}
      </div>

      <Panel className="mt-6">
        <PanelHeader title="How scanners work" sub="Managed for you by Diamond Attendance" />
        <div className="grid gap-4 p-5 text-sm md:grid-cols-3">
          {[
            { icon: Fingerprint, t: "Register at the terminal", b: "Add the person in People first, then register their fingerprint or face on the scanner using their ID." },
            { icon: Activity, t: "Offline is OK", b: "If the internet or power drops, scanners keep recording. The sync agent sends everything when it reconnects." },
            { icon: LifeBuoy, t: "Need a new scanner moved?", b: `Adding, moving or replacing scanners is done by Diamond Attendance. Call ${platformSupport.phone}.` },
          ].map((x) => (
            <div key={x.t} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-[color:var(--brand-fg)]">
                <x.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-heading">{x.t}</p>
                <p className="mt-0.5 text-xs text-muted">{x.b}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-card-muted p-2.5">
      <p className="text-[10.5px] text-muted">{label}</p>
      <p className={cn("mt-0.5 truncate font-mono font-semibold", warn ? "text-rose-600 dark:text-rose-400" : "text-heading")}>{value}</p>
    </div>
  );
}
