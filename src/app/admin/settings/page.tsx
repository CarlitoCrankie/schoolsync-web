"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Bell, Building2, Clock, Info, Lock, MessageSquareText, Palette, Save } from "lucide-react";
import { Button, Field, PageHeader, Panel, PanelHeader, Segmented, fieldClass, useToast } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import { platformSupport } from "@/features/auth/data";
import type { Rules } from "@/features/demo/data";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsPage() {
  const { inst, settings, setSettings } = useAdmin();
  const toast = useToast();
  const school = inst.type === "school";
  const [draft, setDraft] = useState(settings);
  const [who, setWho] = useState<"student" | "staff">(school ? "student" : "staff");
  const [contact, setContact] = useState(inst.contact);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings) || JSON.stringify(contact) !== JSON.stringify(inst.contact);
  const rules = draft[who];
  const setRule = (k: keyof Rules) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [who]: { ...d[who], [k]: e.target.value } }));

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        sub="Working hours, late and early-exit rules, parent SMS and contact details."
        actions={
          <Button
            icon={Save}
            disabled={!dirty}
            onClick={() => {
              setSettings(draft);
              toast("Settings saved");
            }}
          >
            Save changes
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title={<span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[color:var(--brand-fg)]" /> Hours & rules</span>} sub="Used to work out on time, late, absent and left early" right={school ? <Segmented layoutId="rules-who" value={who} onChange={setWho} options={[{ value: "student", label: "Students" }, { value: "staff", label: "Staff" }]} /> : undefined} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Day starts">
                <input type="time" className={fieldClass} value={rules.start} onChange={setRule("start")} />
              </Field>
              <Field label="Late after" hint={`Check-ins after ${fmtTime(rules.late)} are marked late; no check-in by then counts as absent.`}>
                <input type="time" className={fieldClass} value={rules.late} onChange={setRule("late")} />
              </Field>
              <Field label="Day ends">
                <input type="time" className={fieldClass} value={rules.end} onChange={setRule("end")} />
              </Field>
              <Field label="Left early before" hint={`Check-outs before ${fmtTime(rules.earlyExit)} are marked left early.`}>
                <input type="time" className={fieldClass} value={rules.earlyExit} onChange={setRule("earlyExit")} />
              </Field>
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-[12px] font-semibold text-body">Working days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => {
                  const on = draft.workingDays.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDraft((s) => ({ ...s, workingDays: on ? s.workingDays.filter((x) => x !== i) : [...s.workingDays, i].sort() }))}
                      className={cn("w-12 rounded-xl py-2 text-xs font-semibold transition-colors", on ? "text-white" : "bg-subtle text-muted hover:text-heading")}
                      style={on ? { background: "var(--brand-strong)" } : undefined}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          {school && (
            <Panel>
              <PanelHeader title={<span className="flex items-center gap-2"><Bell className="h-4 w-4 text-[color:var(--brand-fg)]" /> Parent SMS</span>} sub="Sent automatically to each student's parent phone" />
              <div className="divide-y divide-line">
                {(
                  [
                    ["smsOnCheckIn", "When a student checks in", "Dear Parent, Kwesi has checked in at 7:42 AM. – " + inst.name],
                    ["smsOnCheckOut", "When a student checks out", "Dear Parent, Kwesi has checked out at 2:45 PM. – " + inst.name],
                    ["smsOnAbsent", "When a student is absent", `Dear Parent, Kwesi has not checked in today (cut-off ${fmtTime(draft.student.late)}). Please contact the school. – ${inst.name}`],
                  ] as const
                ).map(([k, label, preview]) => (
                  <div key={k} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">{label}</p>
                      <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-card-muted px-3 py-2 text-xs text-muted">
                        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {preview}
                      </p>
                    </div>
                    <Toggle on={draft[k]} onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))} />
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[color:var(--brand-fg)]" /> Contact details</span>} sub={`Shown to ${school ? "parents and staff" : "staff"} who need help`} />
            <div className="space-y-4 p-5">
              <Field label="Phone">
                <input className={fieldClass} value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input className={fieldClass} value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-[color:var(--brand-fg)]" /> Branding</span>} right={<Lock className="h-4 w-4 text-faint" />} />
            <div className="p-5">
              <motion.div whileHover={{ scale: 1.01 }} className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center gap-3 p-4 text-white" style={{ background: `linear-gradient(135deg, ${inst.brand.primary}, ${inst.brand.secondary})` }}>
                  <InstitutionMark inst={inst} size={40} className="ring-white/40" />
                  <div>
                    <p className="font-display font-bold">{inst.name}</p>
                    <p className="text-[11px] text-white/80">Preview of your portal header</p>
                  </div>
                </div>
                <div className="flex gap-2 bg-card p-3">
                  {[inst.brand.primary, inst.brand.secondary].map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-lg bg-subtle px-2 py-1 font-mono text-[11px] text-body">
                      <span className="h-3 w-3 rounded" style={{ background: c }} /> {c}
                    </span>
                  ))}
                </div>
              </motion.div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> To change your logo or colours, contact Diamond Attendance on {platformSupport.phone}.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "" : "bg-line-strong")} style={on ? { background: "var(--brand-strong)" } : undefined}>
      <motion.span layout className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow", on ? "right-0.5" : "left-0.5")} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
    </button>
  );
}
