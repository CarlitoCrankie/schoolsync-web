"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, CheckCircle2, Download, FileSpreadsheet, Fingerprint, PencilLine, SkipForward, TriangleAlert, Upload, Users } from "lucide-react";
import { Button, PageHeader, Panel, Pill, Segmented, fieldClass, useToast } from "@/components/app/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import type { Person, PersonType } from "@/features/demo/data";
import { downloadCsv } from "@/lib/useQuery";
import { cn } from "@/lib/utils";

type Row = Record<string, string> & { _row: string };
const COLS: Record<PersonType, { key: string; label: string; required: boolean }[]> = {
  student: [
    { key: "first_name", label: "First name", required: true },
    { key: "last_name", label: "Last name", required: true },
    { key: "class", label: "Class", required: true },
    { key: "parent_name", label: "Parent name", required: true },
    { key: "parent_relation", label: "Relation", required: false },
    { key: "parent_phone", label: "Parent phone", required: true },
  ],
  staff: [
    { key: "first_name", label: "First name", required: true },
    { key: "last_name", label: "Last name", required: true },
    { key: "department", label: "Department", required: true },
    { key: "title", label: "Job title", required: false },
    { key: "phone", label: "Phone", required: true },
    { key: "email", label: "Email", required: false },
  ],
};

const SAMPLE: Record<PersonType, string[][]> = {
  student: [
    ["Kwame", "Asante", "JHS 1A", "Yaw Asante", "Father", "+233 24 112 3344"],
    ["Sandra", "Osei", "JHS 1A", "Mercy Osei", "Mother", "+233 20 445 6677"],
    ["Emmanuel", "Mensah", "JHS 2B", "Kojo Mensah", "Father", "024 000"],
    ["Fatima", "Bello", "JHS 1B", "Usman Bello", "Father", "+233 54 889 0012"],
    ["Akua", "Owusu", "", "Grace Owusu", "Mother", "+233 27 301 4455"],
    ["Selorm", "Agbeko", "JHS 3A", "Dzifa Agbeko", "Mother", "0244 512 908"],
    ["Sandra", "Osei", "JHS 1A", "Mercy Osei", "Mother", "+233 20 445 6677"],
    ["Nii", "Lartey", "Primary 6", "Naa Lartey", "Aunt", "+233 55 120 7788"],
  ],
  staff: [
    ["Grace", "Osei", "Teaching", "Science Teacher", "+233 24 411 9022", "grace.osei@example.com"],
    ["Marcus", "Mensah", "Teaching", "Mathematics Teacher", "+233 20 771 8830", ""],
    ["Priscilla", "Darko", "Administration", "Front Desk", "", ""],
    ["Daniel", "Opoku", "Security", "Security Officer", "+233 27 552 0199", ""],
  ],
};

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim()));
}

const normPhone = (p: string) => p.replace(/[\s-]/g, "");
const validPhone = (p: string) => /^(\+233\d{9}|0\d{9})$/.test(normPhone(p));
const validEmail = (e: string) => !e || /^\S+@\S+\.\S+$/.test(e);

export default function ImportPage() {
  const { inst, people, setPeople } = useAdmin();
  const toast = useToast();
  const school = inst.type === "school";
  const [type, setType] = useState<PersonType>(school ? "student" : "staff");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [show, setShow] = useState<"all" | "valid" | "errors">("all");
  const [sendSms, setSendSms] = useState(true);
  const [imported, setImported] = useState(0);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cols = COLS[type];

  const validate = (r: Row) => {
    const errs: Record<string, string> = {};
    for (const c of cols) if (c.required && !r[c.key]?.trim()) errs[c.key] = "Required";
    const phoneKey = type === "student" ? "parent_phone" : "phone";
    if (r[phoneKey]?.trim() && !validPhone(r[phoneKey])) errs[phoneKey] = "Use +233 XX XXX XXXX or 0XX XXX XXXX";
    if (type === "staff" && !validEmail(r.email ?? "")) errs.email = "Not a valid email";
    return errs;
  };

  const checked = useMemo(() => {
    const seen = new Map<string, string>();
    return rows.map((r) => {
      const errs = validate(r);
      const key = `${r.first_name}|${r.last_name}|${r.class ?? r.department}`.toLowerCase();
      if (seen.has(key)) errs.first_name = `Duplicate of row ${seen.get(key)}`;
      else seen.set(key, r._row);
      return { r, errs };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, type]);
  const errorCount = checked.filter((c) => Object.keys(c.errs).length).length;
  const validCount = checked.length - errorCount;
  const visible = checked.filter((c) => (show === "all" ? true : show === "errors" ? Object.keys(c.errs).length : !Object.keys(c.errs).length));

  function load(table: string[][], name: string) {
    const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const hasHeader = cols.every((c) => header.includes(c.key) || !c.required);
    const body = hasHeader ? table.slice(1) : table;
    const keys = hasHeader ? header : cols.map((c) => c.key);
    setRows(body.map((cells, i) => ({ _row: String(i + 2), ...Object.fromEntries(keys.map((k, j) => [k, (cells[j] ?? "").trim()])) }) as Row));
    setFileName(name);
    setShow("all");
    setStep(2);
  }

  async function onFile(f?: File | null) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      toast("Please upload a .csv file (in Excel: File → Save As → CSV)", "warning");
      return;
    }
    load(parseCsv(await f.text()), f.name);
  }

  function commit(includeErrors: boolean) {
    const good = checked.filter((c) => includeErrors || !Object.keys(c.errs).length);
    const base = people.filter((p) => p.type === type).length;
    const year = new Date().getFullYear();
    const newPeople: Person[] = good
      .filter((c) => !Object.keys(c.errs).length)
      .map(({ r }, i) => ({
        id: `${inst.id}-imp-${Date.now()}-${i}`,
        code: type === "student" ? `${inst.initials}-${year}-${String(base + i + 1).padStart(4, "0")}` : `${school ? "STF" : "EMP"}-${String(base + i + 1).padStart(3, "0")}`,
        name: `${r.first_name} ${r.last_name}`,
        initials: (r.first_name[0] + r.last_name[0]).toUpperCase(),
        type,
        group: r.class || r.department,
        title: r.title || undefined,
        guardian: type === "student" ? { name: r.parent_name, relation: r.parent_relation || "Guardian", phone: r.parent_phone } : undefined,
        phone: type === "staff" ? r.phone : undefined,
        email: type === "staff" ? r.email || undefined : undefined,
        status: "active",
        enrolled: false,
        hasLogin: sendSms,
      }));
    setPeople((all) => [...newPeople, ...all]);
    setImported(newPeople.length);
    setStep(3);
  }

  const stepsUi = [
    { n: 1, title: "Upload file", sub: fileName || "CSV from Excel or Google Sheets" },
    { n: 2, title: "Check & fix", sub: rows.length ? `${validCount} ready · ${errorCount} to fix` : "Validate every row" },
    { n: 3, title: "Imported", sub: imported ? `${imported} people added` : "Then register at a scanner" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`Import · Step ${step} of 3`}
        title={`Import ${type === "student" ? "students & parents" : "staff"}`}
        sub="Add many people at once, for example at the start of term. Every row is checked before anything is saved."
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => downloadCsv(`${type}-import-template.csv`, [cols.map((c) => c.key), SAMPLE[type][0]])}
          >
            Download template
          </Button>
        }
      />

      {/* Stepper */}
      <Panel className="mb-6 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {stepsUi.map((s) => {
            const done = step > s.n;
            const on = step === s.n;
            return (
              <div key={s.n} className={cn("flex items-center gap-3 transition-opacity", !done && !on && "opacity-50")}>
                <motion.span
                  animate={{ scale: on ? 1.05 : 1 }}
                  className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold", done || on ? "text-white" : "bg-subtle text-muted")}
                  style={done || on ? { background: "var(--brand-strong)", boxShadow: on ? "0 0 0 4px color-mix(in oklab, var(--brand-fg) 20%, transparent)" : undefined } : undefined}
                >
                  {done ? <Check className="h-4 w-4" /> : s.n}
                </motion.span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">Step {s.n}</p>
                  <p className="text-sm font-semibold text-heading">{s.title}</p>
                  <p className="truncate text-[11px] text-muted">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {school && (
              <Segmented
                layoutId="imp-type"
                value={type}
                onChange={setType}
                options={[
                  { value: "student", label: "Students & parents" },
                  { value: "staff", label: "Staff" },
                ]}
              />
            )}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                onFile(e.dataTransfer.files[0]);
              }}
              className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors", drag ? "border-[color:var(--brand-fg)] bg-card-muted" : "border-line-strong")}
            >
              <motion.span animate={{ y: drag ? -6 : [0, -5, 0] }} transition={drag ? {} : { duration: 3, repeat: Infinity }} className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "var(--brand-strong)" }}>
                <Upload className="h-7 w-7" />
              </motion.span>
              <h3 className="mt-4 font-display text-lg font-bold text-heading">Drop your CSV file here</h3>
              <p className="mt-1 max-w-md text-sm text-muted">
                Columns: {cols.map((c) => c.label + (c.required ? "" : " (optional)")).join(", ")}. Download the template if you&apos;re not sure.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button icon={FileSpreadsheet} onClick={() => input.current?.click()}>
                  Choose file
                </Button>
                <Button variant="secondary" onClick={() => load([cols.map((c) => c.key), ...SAMPLE[type]], `sample-${type}s.csv`)}>
                  Try with a sample file
                </Button>
              </div>
              <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Panel className="flex items-center gap-3 p-4 md:col-span-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-[color:var(--brand-fg)]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{fileName}</p>
                  <p className="font-mono text-[11px] text-muted">{rows.length} rows</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
                  Replace
                </Button>
              </Panel>
              <Panel className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-muted">Ready</p>
                  <p className="font-display text-3xl font-bold text-heading">
                    {validCount}
                    <span className="font-mono text-sm text-muted"> / {rows.length}</span>
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </Panel>
              <Panel className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-muted">To fix</p>
                  <p className={cn("font-display text-3xl font-bold", errorCount ? "text-rose-600 dark:text-rose-400" : "text-heading")}>{errorCount}</p>
                </div>
                <TriangleAlert className={cn("h-8 w-8", errorCount ? "text-rose-500" : "text-faint")} />
              </Panel>
            </div>

            {errorCount > 0 && (
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <span className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4" /> {errorCount} row{errorCount > 1 ? "s need" : " needs"} fixing. Click a highlighted cell to edit it here.
                </span>
                <Button size="sm" variant="secondary" onClick={() => setShow("errors")}>
                  Show only rows to fix
                </Button>
              </div>
            )}

            <Panel>
              <div className="flex items-center gap-1.5 border-b border-line p-3">
                {(["all", "valid", "errors"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setShow(k)}
                    className={cn("rounded-full px-3 py-1 text-xs font-semibold", show === k ? "text-white" : "text-body hover:bg-subtle")}
                    style={show === k ? { background: "var(--brand-strong)" } : undefined}
                  >
                    {k === "all" ? `All (${rows.length})` : k === "valid" ? `Ready (${validCount})` : `To fix (${errorCount})`}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-card-muted font-mono text-[10.5px] uppercase tracking-wider text-muted">
                      <th className="px-3 py-2.5">Row</th>
                      {cols.map((c) => (
                        <th key={c.key} className="px-3 py-2.5">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map(({ r, errs }) => {
                      const bad = Object.keys(errs).length > 0;
                      return (
                        <tr key={r._row} className={cn(bad && "bg-rose-50/60 dark:bg-rose-500/5")}>
                          <td className={cn("px-3 py-2 font-mono", bad ? "font-bold text-rose-600 dark:text-rose-400" : "text-muted")}>{r._row}</td>
                          {cols.map((c) => (
                            <td key={c.key} className="px-3 py-2 align-top">
                              {errs[c.key] ? (
                                <div>
                                  <div className="relative">
                                    <input
                                      value={r[c.key] ?? ""}
                                      onChange={(e) => setRows((all) => all.map((x) => (x._row === r._row ? { ...x, [c.key]: e.target.value } : x)))}
                                      className={cn(fieldClass, "min-w-[140px] border-rose-400 py-1.5 pr-7 text-xs")}
                                      placeholder={c.label}
                                    />
                                    <PencilLine className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-400" />
                                  </div>
                                  <p className="mt-0.5 text-[10.5px] text-rose-600 dark:text-rose-400">{errs[c.key]}</p>
                                </div>
                              ) : (
                                <span className={cn("text-heading", /phone/.test(c.key) && "font-mono")}>{r[c.key] || <span className="text-faint">—</span>}</span>
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-2">{bad ? <Pill tone="rose">Fix</Pill> : <Pill tone="emerald"><Check className="h-3 w-3" /></Pill>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            {type === "student" && (
              <label className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: "var(--brand-strong)" }} />
                <span className="text-sm">
                  <span className="block font-semibold text-heading">Send each parent their sign-in details by SMS</span>
                  <span className="text-muted">They sign in with the student ID and a one-time password. Parents can&apos;t change it; the school resets it if needed.</span>
                </span>
              </label>
            )}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex gap-2">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
                  Back
                </Button>
                {errorCount > 0 && validCount > 0 && (
                  <Button variant="ghost" icon={SkipForward} onClick={() => commit(false)}>
                    Skip {errorCount} and import the rest
                  </Button>
                )}
              </div>
              <Button icon={Check} disabled={errorCount > 0 || !validCount} onClick={() => commit(false)}>
                Import {validCount} {type === "student" ? "students" : "staff"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Panel className="flex flex-col items-center px-6 py-14 text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                <Check className="h-8 w-8" strokeWidth={3} />
              </motion.span>
              <h3 className="mt-5 font-display text-xl font-bold text-heading">{imported} people imported</h3>
              <p className="mt-2 max-w-md text-sm text-muted">
                {type === "student" && sendSms ? "Parents have been sent their sign-in details by SMS. " : ""}
                Next, register each person&apos;s fingerprint or face at a scanner using their ID so they can check in.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href="/admin/people?filter=unenrolled">
                  <Button icon={Fingerprint}>See who needs registering</Button>
                </Link>
                <Button
                  variant="secondary"
                  icon={Users}
                  onClick={() => {
                    setRows([]);
                    setFileName("");
                    setImported(0);
                    setStep(1);
                  }}
                >
                  Import another file
                </Button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
