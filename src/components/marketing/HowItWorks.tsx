"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { icons } from "@/components/marketing/icons";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { steps } from "@/content/site";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-brand-navy py-24 text-white">
      {/* dark backdrop: grid + glows */}
      <div aria-hidden className="bg-grid-dark mask-radial absolute inset-0" />
      <div aria-hidden className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          dark
          eyebrow="From gate to phone"
          title="How attendance works"
          body="From the moment a student or employee arrives at the gate to the moment a parent or manager is notified, with no paperwork in between."
        />

        <div className="relative mt-16">
          {/* animated connector (desktop) */}
          <div aria-hidden className="absolute left-[16%] right-[16%] top-[42px] hidden h-px bg-white/15 md:block">
            <motion.span
              className="absolute -top-[3px] h-[7px] w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
              animate={{ left: ["-10%", "100%"] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s, i) => {
              const Icon = icons[s.icon];
              return (
                <motion.article
                  key={s.n}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d2662] p-6 transition-colors hover:border-cyan-300/40 hover:bg-[#10306f]"
                >
                  <div>
                    <div className="mb-5 flex items-start justify-between">
                      <span className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg", s.color)}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="font-mono text-3xl font-extrabold text-white/15 transition-colors group-hover:text-cyan-300/40">
                        {s.n}
                      </span>
                    </div>
                    <span className={cn("mb-2.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", s.tagClass)}>{s.tag}</span>
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-medium text-slate-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    {s.foot}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
