"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { contact } from "@/content/site";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100";
const label = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden border-b border-slate-200/70 bg-white py-24">
      <div aria-hidden className="bg-grid mask-radial absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          className="mb-14"
          eyebrow="Talk to us directly"
          title="Talk to an implementation engineer"
          body="No phone trees. Speak directly with the engineers who survey your gates and install the hardware."
        />

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-5">
            <Reveal>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal to-brand-dark-teal p-6 text-white shadow-lg">
                <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
                <span className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> WhatsApp desk
                </span>
                <p className="font-mono text-xl font-bold tracking-tight">{contact.whatsapp}</p>
                <p className="mt-2.5 text-sm text-emerald-100/90">
                  Send your site plan, number of gates or entrance photos for a terminal recommendation.
                </p>
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-dark-teal shadow-sm transition-colors hover:bg-emerald-50"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" /> Chat on WhatsApp
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-6">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-brand-blue">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-brand-navy">Call us</h3>
                    <p className="text-[11px] text-slate-500">{contact.hours}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a href={contact.phoneMainHref} className="rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-brand-blue">
                    <span className="block text-[10px] font-medium text-slate-400">Office line</span>
                    <span className="mt-0.5 block font-mono text-xs font-bold text-brand-navy">{contact.phoneMain}</span>
                  </a>
                  <a href={contact.phoneMobileHref} className="rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-brand-blue">
                    <span className="block text-[10px] font-medium text-slate-400">Mobile</span>
                    <span className="mt-0.5 block font-mono text-xs font-bold text-brand-navy">{contact.phoneMobile}</span>
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-6">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-brand-blue">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-brand-navy">Email</h3>
                    <p className="text-[11px] text-slate-500">Proposals, tenders and official requests</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {contact.emails.map((m) => (
                    <a
                      key={m}
                      href={`mailto:${m}`}
                      className="block rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 font-mono text-xs font-medium text-brand-navy transition-colors hover:border-brand-blue"
                    >
                      {m}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-6 shadow-card sm:p-8">
              <span className="mb-3 inline-block rounded-md bg-blue-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                Free assessment
              </span>
              <h3 className="font-display text-xl font-bold text-brand-navy sm:text-2xl">Request a free site assessment</h3>
              <p className="mt-1.5 text-sm text-slate-600">
                Tell us about your institution and we&apos;ll get back to you with a recommended set-up and quote.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="org">Organisation / institution *</label>
                    <input id="org" name="organisation" required className={field} placeholder="e.g. Diamond School" />
                  </div>
                  <div>
                    <label className={label} htmlFor="size">Number of people *</label>
                    <input id="size" name="size" required className={field} placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className={label} htmlFor="location">Location / region *</label>
                    <input id="location" name="location" required className={field} placeholder="e.g. Greater Accra" />
                  </div>
                  <div>
                    <label className={label} htmlFor="method">Preferred contact *</label>
                    <select id="method" name="contactMethod" className={field} defaultValue="whatsapp">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Phone call</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="phone">Phone / WhatsApp *</label>
                    <input id="phone" name="phone" type="tel" required className={field} placeholder="+233 XX XXX XXXX" />
                  </div>
                  <div>
                    <label className={label} htmlFor="tier">Set-up of interest</label>
                    <select id="tier" name="tier" className={field} defaultValue="multi-gate">
                      <option value="entry">Offices & small academies</option>
                      <option value="multi-gate">Multi-gate facilities & large campuses</option>
                      <option value="multi-site">Multi-campus, healthcare & boarding</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label} htmlFor="notes">Gates, questions or requirements</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className={field}
                    placeholder="Number of gates, turnstiles, offline needs, notification preferences…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-blue disabled:opacity-70"
                >
                  {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
                  {status === "sending" ? "Sending…" : "Request free site assessment"}
                </button>

                <AnimatePresence>
                  {(status === "sent" || status === "error") && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="status"
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-3.5 text-xs font-medium",
                        status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700",
                      )}
                    >
                      {status === "sent" && <CheckCircle2 className="h-4 w-4" />}
                      {status === "sent"
                        ? "Thank you! We've received your request and an engineer will contact you shortly."
                        : "Something went wrong. Please try again or reach us on WhatsApp."}
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
