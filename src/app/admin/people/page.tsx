"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Fingerprint,
  KeyRound,
  Phone,
  PhoneOff,
  Search,
  Upload,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Avatar, Button, EmptyState, Field, Modal, PageHeader, Panel, Pill, Segmented, StatCard, StatusPill, fieldClass, useToast } from "@/components/app/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import { historyFor, tally, type Person, type PersonType } from "@/features/demo/data";
import { fmtDate, fmtTime } from "@/lib/format";
import { downloadCsv, useQueryParam } from "@/lib/useQuery";
import { cn } from "@/lib/utils";

type Filter = "all" | "missing" | "unenrolled" | "nologin" | "inactive";

export default function PeoplePage() {
  const { inst, people, setPeople, nouns, dayKey } = useAdmin();
  const toast = useToast();
  const school = inst.type === "school";
  const [tab, setTab] = useState<PersonType>(school ? "student" : "staff");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [view, setView] = useState<Person | null>(null);
  const [reset, setReset] = useState<Person | null>(null);
  const [adding, setAdding] = useState(false);
  const [deactivate, setDeactivate] = useState<Person | null>(null);

  const qFilter = useQueryParam("filter");
  const qAdd = useQueryParam("add");
  useEffect(() => {
    if (qFilter === "missing" || qFilter === "unenrolled") setFilter(qFilter);
    if (qAdd) setAdding(true);
  }, [qFilter, qAdd]);

  const ofType = people.filter((p) => p.type === tab);
  const groups = [...new Set(ofType.map((p) => p.group))].sort();
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ofType.filter((p) => {
      if (filter === "inactive" ? p.status !== "inactive" : p.status !== "active") return false;
      if (filter === "missing" && p.guardian?.phone) return false;
      if (filter === "missing" && p.type !== "student") return false;
      if (filter === "unenrolled" && p.enrolled) return false;
      if (filter === "nologin" && p.hasLogin) return false;
      if (group !== "all" && p.group !== group) return false;
      return !term || `${p.name} ${p.code} ${p.group} ${p.guardian?.name ?? ""} ${p.guardian?.phone ?? ""} ${p.title ?? ""}`.toLowerCase().includes(term);
    });
  }, [ofType, q, group, filter]);

  useEffect(() => setPage(1), [q, group, filter, tab, size]);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const shown = list.slice((page - 1) * size, page * size);

  const active = people.filter((p) => p.status === "active");
  const students = active.filter((p) => p.type === "student");
  const missing = students.filter((p) => !p.guardian?.phone).length;
  const enrolledPct = Math.round((active.filter((p) => p.enrolled).length / Math.max(1, active.length)) * 1000) / 10;
  const noLogin = active.filter((p) => !p.hasLogin).length;

  const chips: { key: Filter; label: string; count?: number; tone?: string }[] = [
    { key: "all", label: "All active" },
    ...(tab === "student" ? [{ key: "missing" as Filter, label: "Missing parent phone", count: missing, tone: "rose" }] : []),
    { key: "unenrolled", label: "Not on scanner", count: ofType.filter((p) => p.status === "active" && !p.enrolled).length },
    { key: "nologin", label: "No sign-in yet", count: ofType.filter((p) => p.status === "active" && !p.hasLogin).length },
    { key: "inactive", label: "Deactivated", count: ofType.filter((p) => p.status === "inactive").length },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="People directory"
        sub={school ? "Students, their parents and staff. Add people, fix contact details and reset sign-in passwords." : "Everyone who signs in at your scanners. Add people, update details and reset sign-in passwords."}
        actions={
          <>
            <Link href="/admin/import">
              <Button variant="secondary" icon={Upload}>
                Import
              </Button>
            </Link>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => {
                downloadCsv(`${inst.id}-${tab}s.csv`, [
                  ["ID", "Name", nouns.group, ...(tab === "student" ? ["Parent", "Relation", "Parent phone"] : ["Title", "Phone", "Email"]), "On scanner", "Status"],
                  ...list.map((p) => [p.code, p.name, p.group, ...(tab === "student" ? [p.guardian?.name, p.guardian?.relation, p.guardian?.phone] : [p.title, p.phone, p.email]), p.enrolled ? "Yes" : "No", p.status]),
                ]);
                toast(`Exported ${list.length} records`);
              }}
            >
              Export CSV
            </Button>
            <Button icon={UserPlus} onClick={() => setAdding(true)}>
              Add person
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Active people" value={active.length} icon={Users} sub={school ? `${students.length} students · ${active.length - students.length} staff` : "Staff"} />
        <StatCard index={1} label="On a scanner" value={`${enrolledPct}%`} icon={Fingerprint} tone="emerald" sub="Fingerprint or face registered" />
        {school ? (
          <StatCard index={2} label="Missing parent phone" value={missing} icon={PhoneOff} tone="rose" valueClass={missing ? "text-rose-600 dark:text-rose-400" : undefined} sub="No arrival SMS for these" />
        ) : (
          <StatCard index={2} label="Departments" value={new Set(active.map((p) => p.group)).size} icon={Users} tone="sky" sub="Across the organisation" />
        )}
        <StatCard index={3} label="No sign-in yet" value={noLogin} icon={KeyRound} tone="amber" sub="Issue them a password" />
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {school ? (
              <Segmented
                layoutId="people-tab"
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setGroup("all");
                  if (v === "staff" && filter === "missing") setFilter("all");
                }}
                options={[
                  { value: "student", label: `Students (${people.filter((p) => p.type === "student" && p.status === "active").length})` },
                  { value: "staff", label: `Staff (${people.filter((p) => p.type === "staff" && p.status === "active").length})` },
                ]}
              />
            ) : (
              <p className="font-display text-sm font-bold text-heading">Staff</p>
            )}
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <select value={group} onChange={(e) => setGroup(e.target.value)} className={cn(fieldClass, "w-auto py-2 text-xs")} aria-label={nouns.group}>
                <option value="all">All {tab === "student" ? "classes" : "departments"}</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "student" ? "Search name, ID, parent or phone…" : "Search name, ID or title…"} className={cn(fieldClass, "py-2 pl-9 text-xs")} />
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  filter === c.key ? "text-white" : c.tone === "rose" ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300" : "bg-subtle text-body hover:bg-subtle-hover",
                )}
                style={filter === c.key ? { background: "var(--brand-strong)" } : undefined}
              >
                {c.label}
                {c.count !== undefined && <span className="font-mono opacity-80">{c.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-card-muted font-mono text-[10.5px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-semibold">Name & ID</th>
                <th className="px-4 py-3 font-semibold">{tab === "student" ? "Class" : "Department"}</th>
                <th className="px-4 py-3 font-semibold">{tab === "student" ? "Parent / guardian" : "Contact"}</th>
                <th className="px-4 py-3 text-center font-semibold">Scanner</th>
                <th className="px-4 py-3 text-center font-semibold">Sign-in</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="transition-colors hover:bg-card-muted">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={p.initials} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-heading">{p.name}</p>
                        <p className="font-mono text-[11px] text-[color:var(--brand-fg)]">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-heading">{p.group}</p>
                    {p.title && <p className="text-[11px] text-muted">{p.title}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {p.type === "student" ? (
                      p.guardian?.phone ? (
                        <>
                          <p className="font-medium text-heading">
                            {p.guardian.name} <span className="text-muted">({p.guardian.relation})</span>
                          </p>
                          <p className="flex items-center gap-1 font-mono text-[11px] text-muted">
                            <Phone className="h-3 w-3" /> {p.guardian.phone}
                          </p>
                        </>
                      ) : (
                        <Pill tone="rose">
                          <PhoneOff className="h-3 w-3" /> No parent phone
                        </Pill>
                      )
                    ) : (
                      <>
                        <p className="font-mono text-[11.5px] text-heading">{p.phone}</p>
                        <p className="truncate text-[11px] text-muted">{p.email}</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{p.enrolled ? <Pill tone="emerald"><CheckCircle2 className="h-3 w-3" /> Registered</Pill> : <Pill tone="amber">Not yet</Pill>}</td>
                  <td className="px-4 py-3 text-center">{p.status === "inactive" ? <Pill>Deactivated</Pill> : p.hasLogin ? <Pill tone="sky">Active</Pill> : <Pill tone="amber">Not issued</Pill>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconBtn label="View" icon={Eye} onClick={() => setView(p)} />
                      {p.status === "active" && <IconBtn label="Reset password" icon={KeyRound} onClick={() => setReset(p)} />}
                      <IconBtn label={p.status === "active" ? "Deactivate" : "Reactivate"} icon={p.status === "active" ? UserMinus : UserRoundCheck} onClick={() => setDeactivate(p)} />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <EmptyState icon={Search} title="No one matches" body="Try a different search or filter." />}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            Show
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-heading">
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            of <strong className="text-heading">{list.length}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line p-1.5 disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono">
              {page} / {pages}
            </span>
            <button type="button" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line p-1.5 disabled:opacity-40" aria-label="Next page">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Panel>

      <PersonModal person={view} onClose={() => setView(null)} dayKey={dayKey} />
      <ResetModal person={reset} onClose={() => setReset(null)} onIssued={(p) => setPeople((all) => all.map((x) => (x.id === p.id ? { ...x, hasLogin: true } : x)))} />
      <AddModal
        open={adding}
        onClose={() => setAdding(false)}
        type={tab}
        onAdd={(p) => {
          setPeople((all) => [p, ...all]);
          setFilter("all");
          setQ("");
          toast(`${p.name} added. Register them at a scanner next.`);
        }}
      />
      <Modal
        open={!!deactivate}
        onClose={() => setDeactivate(null)}
        title={deactivate?.status === "active" ? "Deactivate person?" : "Reactivate person?"}
        icon={deactivate?.status === "active" ? UserMinus : UserRoundCheck}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivate(null)}>
              Cancel
            </Button>
            <Button
              variant={deactivate?.status === "active" ? "danger" : "primary"}
              onClick={() => {
                if (!deactivate) return;
                setPeople((all) => all.map((x) => (x.id === deactivate.id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x)));
                toast(`${deactivate.name} ${deactivate.status === "active" ? "deactivated" : "reactivated"}`, "info");
                setDeactivate(null);
              }}
            >
              {deactivate?.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">
          {deactivate?.status === "active"
            ? `${deactivate?.name} will stop appearing in today's register and can no longer sign in. Their attendance history is kept, and you can reactivate them at any time.`
            : `${deactivate?.name} will appear in the register again and can sign in.`}
        </p>
      </Modal>
    </div>
  );
}

function IconBtn({ label, icon: Icon, onClick }: { label: string; icon: typeof Eye; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-subtle hover:text-[color:var(--brand-fg)]">
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PersonModal({ person, onClose, dayKey }: { person: Person | null; onClose: () => void; dayKey: string }) {
  const { inst } = useAdmin();
  const hist = person ? historyFor(inst, person, dayKey, 28).filter((r) => r.status !== "no_school") : [];
  const t = tally(hist);
  return (
    <Modal open={!!person} onClose={onClose} title="Person details" icon={Eye} wide>
      {person && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar initials={person.initials} size={56} />
            <div>
              <p className="font-display text-lg font-bold text-heading">{person.name}</p>
              <p className="font-mono text-xs text-[color:var(--brand-fg)]">
                {person.code} · {person.group}
                {person.title ? ` · ${person.title}` : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              ["Attendance (4 wks)", `${t.rate}%`],
              ["Late", t.late],
              ["Absent", t.absent],
              ["Scanner", person.enrolled ? "Registered" : "Not yet"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-card-muted p-3">
                <p className="text-muted">{k}</p>
                <p className="mt-0.5 font-display text-lg font-bold text-heading">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            {person.type === "student" ? (
              <>
                <Info label="Parent / guardian" value={`${person.guardian?.name ?? "—"} (${person.guardian?.relation ?? "—"})`} />
                <Info label="Parent phone (SMS)" value={person.guardian?.phone ?? "Missing"} mono />
              </>
            ) : (
              <>
                <Info label="Phone" value={person.phone ?? "—"} mono />
                <Info label="Email" value={person.email ?? "—"} />
              </>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-heading">Recent days</p>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {hist.slice(0, 6).map((r) => (
                <div key={r.date} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <span className="text-heading">{fmtDate(r.date)}</span>
                  <span className="font-mono text-muted">
                    {fmtTime(r.in)} → {fmtTime(r.out)}
                  </span>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-muted">{label}</p>
      <p className={cn("mt-0.5 font-semibold text-heading", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("").replace(/(.{4})/, "$1-");
}

function ResetModal({ person, onClose, onIssued }: { person: Person | null; onClose: () => void; onIssued: (p: Person) => void }) {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [sms, setSms] = useState(true);
  const [force, setForce] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (person) {
      setPw(makePassword());
      setCopied(false);
      setSms(!!(person.type === "student" ? person.guardian?.phone : person.phone));
    }
  }, [person]);
  if (!person) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const parent = person.type === "student";
  const phone = parent ? person.guardian?.phone : person.phone;

  return (
    <Modal
      open={!!person}
      onClose={onClose}
      title={parent ? "Parent sign-in password" : "Staff sign-in password"}
      icon={KeyRound}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={KeyRound}
            onClick={() => {
              onIssued(person);
              toast(sms && phone ? `Password set and sent by SMS to ${phone}` : "Password set. Share it with them directly.");
              onClose();
            }}
          >
            Set password
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-card-muted p-4">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[color:var(--brand-fg)]">{parent ? "For the parent of" : "For"}</p>
          <p className="mt-1 font-display text-base font-bold text-heading">{person.name}</p>
          <p className="font-mono text-xs text-muted">
            {person.code} · {person.group}
          </p>
          {parent && (
            <p className="mt-2 border-t border-line pt-2 text-xs text-body">
              Signs in with student ID <strong className="font-mono">{person.code}</strong>
              {person.guardian ? ` · ${person.guardian.name}` : ""}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-body">New password</p>
          <div className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3">
            <span className="font-mono text-lg font-bold tracking-wider text-heading">{pw}</span>
            <Button
              size="sm"
              variant="secondary"
              icon={copied ? CheckCircle2 : Copy}
              onClick={() => {
                navigator.clipboard?.writeText(pw);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted">Shown once. After you close this window it can&apos;t be viewed again, only reset.</p>
        </div>
        <label className={cn("flex items-start gap-2.5 rounded-xl border border-line p-3", !phone && "opacity-50")}>
          <input type="checkbox" disabled={!phone} checked={sms && !!phone} onChange={(e) => setSms(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: "var(--brand-strong)" }} />
          <span className="text-xs">
            <span className="block font-semibold text-heading">Send it by SMS</span>
            <span className="font-mono text-muted">{phone ?? "No phone number on file"}</span>
          </span>
        </label>
        {parent ? (
          <p className="rounded-xl bg-subtle px-3.5 py-3 text-[11.5px] text-body">Parents can&apos;t change this password themselves. They contact the school if they need it reset.</p>
        ) : (
          <label className="flex items-start gap-2.5 rounded-xl border border-line p-3">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: "var(--brand-strong)" }} />
            <span className="text-xs">
              <span className="block font-semibold text-heading">Ask them to choose their own password at first sign-in</span>
              <span className="text-muted">Recommended</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

function AddModal({ open, onClose, type: initial, onAdd }: { open: boolean; onClose: () => void; type: PersonType; onAdd: (p: Person) => void }) {
  const { inst, people } = useAdmin();
  const school = inst.type === "school";
  const [type, setType] = useState<PersonType>(initial);
  const [form, setForm] = useState({ first: "", last: "", group: "", title: "", gName: "", gRel: "Mother", gPhone: "", phone: "", email: "" });
  useEffect(() => {
    if (open) {
      setType(school ? initial : "staff");
      setForm({ first: "", last: "", group: "", title: "", gName: "", gRel: "Mother", gPhone: "", phone: "", email: "" });
    }
  }, [open, initial, school]);
  const groups = [...new Set(people.filter((p) => p.type === type).map((p) => p.group))].sort();
  const count = people.filter((p) => p.type === type).length + 1;
  const code = type === "student" ? `${inst.initials}-${new Date().getFullYear()}-${String(count).padStart(4, "0")}` : `${school ? "STF" : "EMP"}-${String(count).padStart(3, "0")}`;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.first && form.last && form.group && (type === "staff" || form.gName);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add person"
      icon={UserPlus}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onAdd({
                id: `${inst.id}-new-${Date.now()}`,
                code,
                name: `${form.first} ${form.last}`,
                initials: (form.first[0] + form.last[0]).toUpperCase(),
                type,
                group: form.group,
                title: type === "staff" ? form.title || undefined : undefined,
                guardian: type === "student" ? { name: form.gName, relation: form.gRel, phone: form.gPhone || undefined } : undefined,
                phone: type === "staff" ? form.phone || undefined : undefined,
                email: type === "staff" ? form.email || undefined : undefined,
                status: "active",
                enrolled: false,
                hasLogin: false,
              });
              onClose();
            }}
          >
            Save person
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {school && (
          <Segmented
            layoutId="add-type"
            value={type}
            onChange={setType}
            options={[
              { value: "student", label: "Student" },
              { value: "staff", label: "Staff" },
            ]}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input className={fieldClass} value={form.first} onChange={set("first")} placeholder="e.g. Kwame" />
          </Field>
          <Field label="Last name">
            <input className={fieldClass} value={form.last} onChange={set("last")} placeholder="e.g. Mensah" />
          </Field>
          <Field label={type === "student" ? "Class" : "Department"}>
            <input className={fieldClass} list="groups" value={form.group} onChange={set("group")} placeholder={type === "student" ? "e.g. JHS 2A" : "e.g. Teaching"} />
            <datalist id="groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>
          <Field label="ID (automatic)">
            <input className={cn(fieldClass, "bg-card-muted font-mono text-[color:var(--brand-fg)]")} readOnly value={code} />
          </Field>
        </div>
        {type === "student" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parent / guardian name">
              <input className={fieldClass} value={form.gName} onChange={set("gName")} placeholder="e.g. Akosua Mensah" />
            </Field>
            <Field label="Relation">
              <select className={fieldClass} value={form.gRel} onChange={set("gRel")}>
                {["Mother", "Father", "Guardian", "Aunt", "Uncle"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Parent phone" hint="Arrival and absence SMS go to this number.">
                <input className={fieldClass} value={form.gPhone} onChange={set("gPhone")} placeholder="+233 24 000 0000" type="tel" />
              </Field>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Job title">
              <input className={fieldClass} value={form.title} onChange={set("title")} placeholder="e.g. Class Teacher" />
            </Field>
            <Field label="Phone">
              <input className={fieldClass} value={form.phone} onChange={set("phone")} placeholder="+233 24 000 0000" type="tel" />
            </Field>
            <div className="col-span-2">
              <Field label="Email (optional)">
                <input className={fieldClass} value={form.email} onChange={set("email")} placeholder="name@example.com" type="email" />
              </Field>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2.5 rounded-xl bg-card-muted p-3 text-xs text-body">
          <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-fg)]" />
          Next, register their fingerprint or face at a scanner using this ID. Until then they won&apos;t be able to check in.
        </div>
      </div>
    </Modal>
  );
}
