"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Building, Building2, Check, Network } from "lucide-react";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { tiers } from "@/content/site";
import { cn } from "@/lib/utils";

const tierIcons = [Building, Building2, Network];

export function Deployments() {
  return (
    <section id="architectures" className="relative border-b border-slate-200/70 bg-[#f8fafc] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="Solutions & hardware"
            title="Choose a set-up for your facility"
            body="Every institution has different gates, numbers of people and access needs. Start from a reference set-up or ask for a custom proposal."
          />
          <a href="#contact" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-navy">
            Need a multi-gate proposal? <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-7 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <SpotlightCard key={t.title} featured={t.featured} index={i}>
              <TierBody tier={t} Icon={tierIcons[i]} />
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({ children, featured, index }: { children: React.ReactNode; featured: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-7",
        featured ? "border-2 border-brand-blue shadow-card-featured lg:-mt-4 lg:mb-4" : "border border-slate-200/90 shadow-card",
      )}
    >
      {/* cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(380px circle at var(--mx) var(--my), rgb(37 99 235 / 0.08), transparent 60%)" }}
      />
      {featured && (
        <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-brand-blue via-brand-accent to-teal-500 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Most deployed
        </span>
      )}
      <div className="relative flex h-full flex-col justify-between">{children}</div>
    </motion.article>
  );
}

function TierBody({ tier, Icon }: { tier: (typeof tiers)[number]; Icon: typeof Building }) {
  return (
    <>
      <div>
        <div className="mb-5 mt-1 flex items-center justify-between">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tier.featured ? "bg-blue-50 text-brand-blue" : "bg-slate-100 text-slate-600")}>
            <Icon className="h-5 w-5" />
          </span>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tier.featured ? "bg-blue-50 text-brand-blue" : "bg-slate-100 text-slate-600")}>
            {tier.badge}
          </span>
        </div>
        <h3 className="font-display text-xl font-bold text-brand-navy">{tier.title}</h3>
        <p className="mt-1 text-xs font-semibold text-brand-blue">{tier.subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{tier.body}</p>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">What&apos;s included</span>
          <ul className="space-y-2.5 text-xs text-slate-700">
            {tier.hardware.map(([strong, rest]) => (
              <li key={strong} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.5} />
                <span>
                  <strong className="font-semibold">{strong}</strong> {rest}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-7">
        <div className={cn("mb-4 rounded-xl border p-3", tier.featured ? "border-blue-100 bg-blue-50/60" : "border-slate-200/70 bg-slate-50")}>
          <span className="block font-mono text-[11px] text-slate-500">
            Suited to <strong className="text-brand-navy">{tier.capacity}</strong> people
          </span>
        </div>
        <a
          href="#contact"
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-colors",
            tier.featured ? "bg-brand-navy text-white shadow-sm hover:bg-brand-blue" : "bg-slate-100 text-brand-navy hover:bg-slate-200",
          )}
        >
          Request a quote <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </>
  );
}
