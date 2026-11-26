"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { testimonials } from "@/content/site";
import { cn } from "@/lib/utils";

/** NOTE: content is placeholder until real, consented client quotes are supplied. */
export function Testimonials() {
  return (
    <section className="border-b border-line/70 bg-surface-2 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          className="mb-14"
          eyebrow="What clients say"
          title="Trusted by headteachers, bursars and HR managers"
          body="How institutions moved from paper registers to automated biometric attendance."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
              className="flex flex-col justify-between rounded-2xl border border-line/80 bg-card p-6 shadow-card"
            >
              <div>
                <Quote className="mb-4 h-6 w-6 text-blue-200" />
                <p className="text-sm italic leading-relaxed text-body">&ldquo;{t.quote}&rdquo;</p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold", t.tone)}>{t.initials}</span>
                <div>
                  <p className="text-xs font-bold text-heading">{t.name}</p>
                  <p className="text-[11px] text-muted">{t.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
