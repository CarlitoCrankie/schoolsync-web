"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Fingerprint, MessageSquareText } from "lucide-react";
import { liveFeed } from "@/content/site";
import { cn } from "@/lib/utils";

type Entry = (typeof liveFeed)[number] & { key: number };

const statusClass: Record<string, string> = {
  "On time": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Late: "bg-amber-50 text-amber-700 ring-amber-200",
  Staff: "bg-blue-50 text-brand-blue ring-blue-200",
};

/** Illustrative live gate feed for the hero: a new scan arrives every few seconds. */
export function LiveScanCard() {
  const [tick, setTick] = useState(3);
  const [count, setCount] = useState(1742);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setCount((c) => c + 1);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const entries: Entry[] = Array.from({ length: 4 }, (_, i) => {
    const k = tick - i;
    return { ...liveFeed[((k % liveFeed.length) + liveFeed.length) % liveFeed.length], key: k };
  });
  const latest = entries[0];

  return (
    <div className="relative">
      {/* glow behind card */}
      <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-400/25 via-cyan-300/20 to-transparent blur-2xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_30px_60px_-20px_rgb(10_34_89/0.35)] backdrop-blur-xl">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Diamond School</p>
            <p className="font-display text-sm font-bold text-brand-navy">Main Gate · Live</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            ONLINE
          </span>
        </div>

        {/* scanner */}
        <div className="mt-5 flex items-center gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-[#0b1a44] p-4 text-white">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/60" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/40 [animation-delay:1s]" />
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-cyan-400/10 ring-1 ring-cyan-300/40 shadow-glow">
              <Fingerprint className="h-9 w-9 text-cyan-300" strokeWidth={1.5} />
              <span className="absolute inset-x-1 top-1/2 h-0.5 animate-scan rounded-full bg-cyan-300 shadow-[0_0_12px_2px_rgb(103_232_249/0.8)]" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200/80">Last scan</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={latest.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <p className="truncate font-display text-lg font-bold">{latest.name}</p>
                <p className="font-mono text-xs text-slate-300">
                  Checked in · {latest.time} AM
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat label="Checked in" value={count.toLocaleString()} />
          <Stat label="On time" value="97.2%" tone="text-emerald-600" />
          <Stat label="SMS sent" value={count.toLocaleString()} tone="text-brand-blue" />
        </div>

        {/* feed */}
        <ul className="relative mt-4 h-[232px] space-y-2 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {entries.map((e) => (
              <motion.li
                key={e.key}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                  {e.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-brand-navy">{e.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{e.meta}</p>
                </div>
                <span className="font-mono text-[11px] text-slate-500">{e.time}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", statusClass[e.status])}>{e.status}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      {/* floating SMS bubble */}
      <motion.div
        className="absolute -bottom-6 -left-6 hidden w-60 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl sm:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <MessageSquareText className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-bold text-brand-navy">SMS to parent</p>
          <span className="ml-auto font-mono text-[10px] text-slate-400">now</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-600">
          Dear Parent, {latest.name.replace("Mr. ", "")} has checked in at {latest.time} AM. — Diamond School
        </p>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, tone = "text-brand-navy" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("font-mono text-sm font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
