"use client";

import { motion } from "motion/react";
import { Briefcase, Building2, Fingerprint, IdCard, Info, Mail, Phone } from "lucide-react";
import { Avatar, Panel, PanelHeader, Pill } from "@/components/app/ui";
import { usePortal } from "@/features/portal/PortalContext";

export default function StaffProfile() {
  const { inst, person } = usePortal();
  const school = inst.type === "school";
  const rows = [
    { icon: IdCard, label: school ? "Staff ID" : "Employee ID", value: person.code, mono: true },
    { icon: Building2, label: "Department", value: person.group },
    { icon: Briefcase, label: "Role", value: person.title ?? "—" },
    { icon: Phone, label: "Phone", value: person.phone ?? "—", mono: true },
    { icon: Mail, label: "Email", value: person.email ?? "—", mono: true },
  ];

  return (
    <div className="space-y-5 pt-1">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 pt-2 text-center">
        <Avatar initials={person.initials} size={72} />
        <h1 className="font-display text-xl font-bold text-heading">{person.name}</h1>
        <div className="flex flex-wrap justify-center gap-1.5">
          <Pill tone="brand">{person.title ?? person.group}</Pill>
          {person.enrolled ? (
            <Pill tone="emerald">
              <Fingerprint className="h-3 w-3" /> Registered on scanner
            </Pill>
          ) : (
            <Pill tone="amber">
              <Fingerprint className="h-3 w-3" /> Not registered on scanner
            </Pill>
          )}
        </div>
      </motion.div>

      <Panel>
        <PanelHeader title="My details" sub={inst.name} />
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-5 py-3.5">
              <r.icon className="h-4 w-4 shrink-0 text-faint" />
              <span className="flex-1 text-sm text-muted">{r.label}</span>
              <span className={`truncate text-sm font-medium text-heading ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 border-t border-line bg-card-muted px-5 py-3 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Something wrong? Ask your admin at {inst.contact.phone} or {inst.contact.email} to update it.
        </p>
      </Panel>
    </div>
  );
}
