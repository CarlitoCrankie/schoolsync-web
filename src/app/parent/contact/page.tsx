"use client";

import { motion } from "motion/react";
import { Info, KeyRound, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { Panel, PanelHeader } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { usePortal } from "@/features/portal/PortalContext";

export default function ParentContact() {
  const { inst, person } = usePortal();
  const g = person.guardian;
  const rows = [
    { icon: UserRound, label: "Parent / guardian", value: g ? `${g.name} (${g.relation})` : "—" },
    { icon: MessageSquareText, label: "SMS alerts go to", value: g?.phone ?? "No phone on record", warn: !g?.phone },
    { icon: KeyRound, label: "Signs in with", value: person.code },
  ];

  return (
    <div className="space-y-5 pt-1">
      <h1 className="font-display text-xl font-bold text-heading">Contact</h1>

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <InstitutionMark inst={inst} size={56} />
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-heading">{inst.name}</p>
            <p className="text-xs text-muted">Questions about attendance, absences or your details</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <motion.a whileTap={{ scale: 0.97 }} href={`tel:${inst.contact.phone.replace(/\s/g, "")}`} className="flex flex-col items-center gap-1.5 rounded-xl py-4 text-white" style={{ background: "var(--brand-strong)" }}>
            <Phone className="h-5 w-5" />
            <span className="text-sm font-semibold">Call</span>
            <span className="font-mono text-[11px] text-white/80">{inst.contact.phone}</span>
          </motion.a>
          <motion.a whileTap={{ scale: 0.97 }} href={`mailto:${inst.contact.email}`} className="flex flex-col items-center gap-1.5 rounded-xl bg-subtle py-4 text-heading ring-1 ring-line">
            <Mail className="h-5 w-5 text-[color:var(--brand-fg)]" />
            <span className="text-sm font-semibold">Email</span>
            <span className="max-w-full truncate px-2 font-mono text-[11px] text-muted">{inst.contact.email}</span>
          </motion.a>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Your details on file" sub={`For ${person.name}, ${person.group}`} />
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-5 py-3.5">
              <r.icon className="h-4 w-4 shrink-0 text-faint" />
              <span className="flex-1 text-sm text-muted">{r.label}</span>
              <span className={r.warn ? "text-sm font-semibold text-amber-600 dark:text-amber-400" : "font-mono text-sm font-medium text-heading"}>{r.value}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 border-t border-line bg-card-muted px-5 py-3 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          To change your phone number or reset your password, contact the school. They&apos;ll update it for you.
        </p>
      </Panel>
    </div>
  );
}
