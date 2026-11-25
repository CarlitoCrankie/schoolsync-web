"use client";

import { motion } from "motion/react";
import { ArrowRight, Phone } from "lucide-react";
import { Aurora } from "@/components/backgrounds/Aurora";
import { LiveScanCard } from "@/components/marketing/LiveScanCard";
import { icons } from "@/components/marketing/icons";
import { contact, highlights } from "@/content/site";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const toneClass: Record<string, string> = {
  blue: "bg-blue-50 text-brand-blue",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

export function Hero() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-28 pb-20 lg:pt-36" aria-labelledby="hero-title">
      <Aurora />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-blue shadow-sm backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
            Biometric attendance · Schools & workplaces
          </motion.div>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-navy sm:text-5xl lg:text-[58px]"
          >
            Attendance for schools,{" "}
            <span className="text-gradient animate-shimmer">workplaces & campuses</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
            className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
          >
            On-site biometric check-in at the gate, instant SMS alerts to parents, and a live dashboard branded for your
            institution. Choose a set-up that fits your people and your facility.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease }}
            className="mt-8 flex flex-wrap items-center gap-3.5"
          >
            <a
              href="#contact"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-brand-navy px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:bg-brand-blue hover:shadow-xl"
            >
              Book a free site survey
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={contact.phoneMainHref}
              className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/80 px-6 py-3.5 font-mono text-sm font-semibold text-brand-navy shadow-sm backdrop-blur transition-all hover:border-slate-300 hover:bg-white"
            >
              <Phone className="h-4 w-4 text-brand-blue" />
              {contact.phoneMain}
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mx-auto w-full max-w-md lg:max-w-none"
        >
          <LiveScanCard />
        </motion.div>
      </div>

      <div className="relative mx-auto mt-20 grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {highlights.map((h, i) => {
          const Icon = icons[h.icon];
          return (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * i, ease }}
              whileHover={{ y: -4 }}
              className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-card backdrop-blur"
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClass[h.tone])}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-brand-navy">{h.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{h.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
