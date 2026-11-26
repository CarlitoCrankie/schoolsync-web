"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  Fingerprint,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Palette,
  Plus,
  Power,
  Search,
  Trash2,
  Briefcase,
} from "lucide-react";
import { Button, EmptyState, Field, Modal, PageHeader, Panel, Pill, Segmented, fieldClass, useToast } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import type { Institution, InstitutionType } from "@/features/auth/data";
import { useConsole } from "@/features/console/ConsoleContext";
import { instStats } from "@/features/console/stats";
import { useQueryParam } from "@/lib/useQuery";
import { cn } from "@/lib/utils";

export default function InstitutionsPage() {
  const { institutions, setInstitutions, now } = useConsole();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | InstitutionType>("all");
  const [wizard, setWizard] = useState(false);
  const [brandFor, setBrandFor] = useState<Institution | null>(null);
  const [toggleFor, setToggleFor] = useState<Institution | null>(null);
  const isNew = useQueryParam("new");
  useEffect(() => {
    if (isNew) setWizard(true);
  }, [isNew]);

  const stats = useMemo(() => institutions.map((i) => instStats(i, now)), [institutions, now]);
  const shown = stats.filter((s) => (type === "all" || s.inst.type === type) && `${s.inst.name} ${s.inst.location}`.toLowerCase().includes(q.toLowerCase()));

  const update = (id: string, patch: Partial<Institution>) => setInstitutions((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div>
      <PageHeader
        eyebrow="Institutions"
        title="Institutions"
        sub="Schools and organisations on Diamond Attendance. Only these appear on the sign-in page."
        actions={
          <Button icon={Plus} onClick={() => setWizard(true)}>
            Onboard institution
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or town…" className={cn(fieldClass, "pl-9")} />
        </div>
        <Segmented
          layoutId="inst-type"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All" },
            { value: "school", label: "Schools" },
            { value: "organisation", label: "Organisations" },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Panel>
          <EmptyState icon={Building2} title="No institutions match" body="Try a different search." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s, i) => (
            <motion.div key={s.inst.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Panel className={cn("overflow-hidden", !s.inst.active && "opacity-70")}>
                <div className="h-14" style={{ background: `linear-gradient(135deg, ${s.inst.brand.primary}, ${s.inst.brand.secondary})` }} />
                <div className="-mt-7 px-5 pb-5">
                  <InstitutionMark inst={s.inst} size={52} className="ring-4 ring-card" />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-heading">{s.inst.name}</p>
                      <p className="text-xs text-muted">
                        {s.inst.type === "school" ? "School" : "Organisation"} · {s.inst.location}
                      </p>
                    </div>
                    {s.inst.active ? <Pill tone="emerald">Active</Pill> : <Pill tone="slate">Deactivated</Pill>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["People", s.people || "—"],
                      ["Today", s.inst.active ? `${s.rate}%` : "—"],
                      ["Scanners", `${s.online}/${s.devices.length}`],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-card-muted py-2 ring-1 ring-line">
                        <p className="text-[10.5px] text-muted">{l}</p>
                        <p className="font-mono text-sm font-bold text-heading">{v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 truncate font-mono text-[11px] text-faint">
                    {s.inst.contact.email} · {s.inst.contact.phone}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" icon={Palette} onClick={() => setBrandFor(s.inst)}>
                      Branding
                    </Button>
                    <Button size="sm" variant={s.inst.active ? "ghost" : "secondary"} icon={Power} onClick={() => setToggleFor(s.inst)}>
                      {s.inst.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>
      )}

      <OnboardWizard
        open={wizard}
        onClose={() => setWizard(false)}
        taken={institutions.map((i) => i.id)}
        onCreate={(inst) => {
          setInstitutions((l) => [...l, inst]);
          toast(`${inst.name} onboarded`);
        }}
      />

      {brandFor && (
        <BrandingModal
          inst={brandFor}
          onClose={() => setBrandFor(null)}
          onSave={(patch) => {
            update(brandFor.id, patch);
            setBrandFor(null);
            toast(`Branding updated for ${brandFor.name}`);
          }}
        />
      )}

      <Modal
        open={!!toggleFor}
        onClose={() => setToggleFor(null)}
        title={toggleFor?.active ? "Deactivate institution?" : "Reactivate institution?"}
        icon={Power}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToggleFor(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleFor?.active ? "danger" : "primary"}
              onClick={() => {
                if (!toggleFor) return;
                update(toggleFor.id, { active: !toggleFor.active });
                toast(`${toggleFor.name} ${toggleFor.active ? "deactivated" : "reactivated"}`, toggleFor.active ? "warning" : "success");
                setToggleFor(null);
              }}
            >
              {toggleFor?.active ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">
          {toggleFor?.active
            ? `${toggleFor?.name} will disappear from the sign-in page and nobody there can sign in. Scanner data is kept and nothing is deleted.`
            : `${toggleFor?.name} will appear on the sign-in page again and its accounts can sign in.`}
        </p>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Branding preview ───────────────────────── */

function BrandPreview({ name, type, initials, logo, primary, secondary }: { name: string; type: InstitutionType; initials: string; logo?: string; primary: string; secondary: string }) {
  const inst: Institution = { id: "preview", name: name || "Institution name", location: "", type, initials: initials || "??", logo, brand: { primary, secondary }, contact: { phone: "", email: "" }, active: true };
  return (
    <div className="overflow-hidden rounded-2xl border border-line" data-brand style={{ ["--brand" as string]: primary }}>
      <div className="relative flex items-center gap-3 overflow-hidden p-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in oklab, ${primary} 70%, ${secondary}))` }}>
        <motion.span aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl" style={{ background: secondary, opacity: 0.4 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="relative h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
        ) : (
          <InstitutionMark inst={inst} size={40} className="relative ring-2 ring-white/30" />
        )}
        <div className="relative min-w-0">
          <p className="truncate font-display font-bold">{inst.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/75">{type === "school" ? "Parent portal" : "Employee portal"}</p>
        </div>
      </div>
      <div className="space-y-2 bg-surface p-4">
        <div className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-line">
          <span className="text-xs font-semibold text-heading">Checked in</span>
          <span className="font-mono text-xs font-bold text-[color:var(--brand-fg)]">7:42 AM</span>
        </div>
        <div className="rounded-xl py-2 text-center text-xs font-semibold text-white" style={{ background: "var(--brand-strong)" }}>
          Sign in
        </div>
        <p className="text-center font-mono text-[9.5px] text-faint">Powered by DiamondAttendance</p>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-card p-1" />
        <input className={cn(fieldClass, "font-mono")} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function LogoField({ logo, onChange }: { logo?: string; onChange: (v?: string) => void }) {
  return (
    <Field label="Logo" hint="PNG or JPG, square works best">
      <div className="flex items-center gap-3">
        <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-card-muted text-faint hover:text-heading">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5" />}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => onChange(String(r.result));
              r.readAsDataURL(f);
            }}
          />
        </label>
        {logo ? (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange(undefined)}>
            Remove
          </Button>
        ) : (
          <span className="text-xs text-muted">No logo, so initials are shown</span>
        )}
      </div>
    </Field>
  );
}

function BrandingModal({ inst, onClose, onSave }: { inst: Institution; onClose: () => void; onSave: (p: Partial<Institution>) => void }) {
  const [primary, setPrimary] = useState(inst.brand.primary);
  const [secondary, setSecondary] = useState(inst.brand.secondary);
  const [logo, setLogo] = useState(inst.logo);
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Branding · ${inst.name}`}
      icon={Palette}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Check} onClick={() => onSave({ brand: { primary, secondary }, logo })}>
            Save branding
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <LogoField logo={logo} onChange={setLogo} />
          <ColorField label="Primary colour" value={primary} onChange={setPrimary} />
          <ColorField label="Accent colour" value={secondary} onChange={setSecondary} />
          <p className="text-xs text-muted">Only Diamond Attendance can change an institution&apos;s branding. Admins see it read-only.</p>
        </div>
        <BrandPreview name={inst.name} type={inst.type} initials={inst.initials} logo={logo} primary={primary} secondary={secondary} />
      </div>
    </Modal>
  );
}

/* ───────────────────────── Onboarding wizard ───────────────────────── */

const STEPS = ["Details", "Branding", "Scanners", "Admin"] as const;

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function OnboardWizard({ open, onClose, onCreate, taken }: { open: boolean; onClose: () => void; onCreate: (i: Institution) => void; taken: string[] }) {
  const blank = {
    name: "",
    type: "school" as InstitutionType,
    location: "",
    phone: "",
    email: "",
    primary: "#1642a8",
    secondary: "#06b6d4",
    logo: undefined as string | undefined,
    scanners: [{ name: "Main Gate", location: "Front entrance" }],
    adminName: "",
    adminEmail: "",
  };
  const [step, setStep] = useState(0);
  const [f, setF] = useState(blank);
  const [done, setDone] = useState<{ inst: Institution; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const initials = f.name
    .split(/\s+/)
    .filter((w) => w && !/^(of|the|and|&)$/i.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const valid = [
    f.name.trim().length > 2 && f.location.trim() && /^(\+233\s?\d[\d\s]{7,}|0\d{9})$/.test(f.phone.trim()) && /\S+@\S+\.\S+/.test(f.email),
    /^#[0-9a-f]{6}$/i.test(f.primary) && /^#[0-9a-f]{6}$/i.test(f.secondary),
    f.scanners.length > 0 && f.scanners.every((s) => s.name.trim()),
    f.adminName.trim() && /\S+@\S+\.\S+/.test(f.adminEmail),
  ][step];

  function close() {
    onClose();
    setTimeout(() => {
      setStep(0);
      setF(blank);
      setDone(null);
      setCopied(false);
    }, 300);
  }

  function create() {
    let id = f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    while (taken.includes(id)) id += "-2";
    const inst: Institution = { id, name: f.name.trim(), type: f.type, location: f.location.trim(), initials: initials || "NEW", logo: f.logo, brand: { primary: f.primary, secondary: f.secondary }, contact: { phone: f.phone.trim(), email: f.email.trim() }, active: true };
    onCreate(inst);
    setDone({ inst, password: genPassword() });
  }

  return (
    <Modal
      open={open}
      wide
      onClose={close}
      title={done ? "Institution onboarded" : "Onboard an institution"}
      icon={Building2}
      footer={
        done ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            {step > 0 && (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button disabled={!valid} onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!valid} icon={Check} onClick={create}>
                Create institution
              </Button>
            )}
          </>
        )
      }
    >
      {!done && (
        <ol className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors", i < step ? "bg-emerald-500 text-white" : i === step ? "text-white" : "bg-subtle text-muted")} style={i === step ? { background: "var(--brand-strong)" } : undefined}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-semibold sm:block", i === step ? "text-heading" : "text-muted")}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-emerald-500" : "bg-line")} />}
            </li>
          ))}
        </ol>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={done ? "done" : step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
          {done ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <InstitutionMark inst={done.inst} size={48} />
                <div>
                  <p className="font-display text-lg font-bold text-heading">{done.inst.name}</p>
                  <p className="text-xs text-muted">Now listed on the sign-in page under {done.inst.type === "school" ? "Schools" : "Organisations"}.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  <KeyRound className="h-4 w-4" /> Admin sign-in, shown once
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted">Admin ID</dt>
                  <dd className="font-mono text-heading">{f.adminEmail}</dd>
                  <dt className="text-muted">Temporary password</dt>
                  <dd className="flex items-center gap-2 font-mono font-bold text-heading">
                    {done.password}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${f.adminEmail} / ${done.password}`);
                        setCopied(true);
                      }}
                      className="rounded-md p-1 text-muted hover:bg-white/60 hover:text-heading dark:hover:bg-white/10"
                      aria-label="Copy"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </dd>
                </dl>
                <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/80">Hand this to {f.adminName} in person or by phone. They&apos;ll choose their own password at first sign-in.</p>
              </div>
              <p className="text-xs text-muted">
                Next: install the sync agent on the school&apos;s PC and pair {f.scanners.length} scanner{f.scanners.length > 1 ? "s" : ""}. They&apos;ll show under Scanners & agents once they check in.
              </p>
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["school", "School", GraduationCap, "Students, parents and staff"],
                    ["organisation", "Organisation", Briefcase, "Staff only"],
                  ] as const
                ).map(([v, l, I, d]) => (
                  <button key={v} type="button" onClick={() => set("type", v)} className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors", f.type === v ? "border-[color:var(--brand-fg)] bg-[color:var(--brand-fg)]/5 ring-2 ring-[color:var(--brand-fg)]/20" : "border-line hover:bg-subtle")}>
                    <I className="mt-0.5 h-5 w-5 text-[color:var(--brand-fg)]" />
                    <span>
                      <span className="block text-sm font-semibold text-heading">{l}</span>
                      <span className="text-xs text-muted">{d}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Field label="Name">
                <input className={fieldClass} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={f.type === "school" ? "e.g. Bright Future Academy" : "e.g. Kumasi Logistics Ltd"} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Town / city">
                  <input className={fieldClass} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Kumasi" />
                </Field>
                <Field label="Contact phone" hint="Shown to parents and staff">
                  <input className={fieldClass} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+233 24 000 0000" />
                </Field>
              </div>
              <Field label="Contact email">
                <input className={fieldClass} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="office@school.com" />
              </Field>
            </div>
          ) : step === 1 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-4">
                <LogoField logo={f.logo} onChange={(v) => set("logo", v)} />
                <ColorField label="Primary colour" value={f.primary} onChange={(v) => set("primary", v)} />
                <ColorField label="Accent colour" value={f.secondary} onChange={(v) => set("secondary", v)} />
              </div>
              <BrandPreview name={f.name} type={f.type} initials={initials} logo={f.logo} primary={f.primary} secondary={f.secondary} />
            </div>
          ) : step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Name each scanner the way staff will recognise it. Serial numbers are picked up when the sync agent pairs them.</p>
              {f.scanners.map((s, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Fingerprint className="mb-3 h-4 w-4 shrink-0 text-faint" />
                  <Field label={i === 0 ? "Scanner name" : ""}>
                    <input className={fieldClass} value={s.name} onChange={(e) => set("scanners", f.scanners.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  </Field>
                  <Field label={i === 0 ? "Where" : ""}>
                    <input className={fieldClass} value={s.location} onChange={(e) => set("scanners", f.scanners.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))} />
                  </Field>
                  <button type="button" disabled={f.scanners.length === 1} onClick={() => set("scanners", f.scanners.filter((_, j) => j !== i))} className="mb-1.5 rounded-lg p-2 text-faint hover:bg-subtle hover:text-rose-600 disabled:opacity-30" aria-label="Remove scanner">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => set("scanners", [...f.scanners, { name: "", location: "" }])}>
                Add scanner
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">The first admin account. They&apos;ll add everyone else from their dashboard.</p>
              <Field label="Admin's full name">
                <input className={fieldClass} value={f.adminName} onChange={(e) => set("adminName", e.target.value)} placeholder="e.g. Ama Mensah" />
              </Field>
              <Field label="Admin's email" hint="Used as their sign-in ID">
                <input className={fieldClass} type="email" value={f.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="admin@school.com" />
              </Field>
              <p className="rounded-xl bg-card-muted px-3 py-2.5 text-xs text-muted ring-1 ring-line">A temporary password is generated on the next screen and shown only once.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
