"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, MessageSquareText, Phone, Search, Send, UserCheck, UserX } from "lucide-react";
import { Avatar, Button, EmptyState, Modal, PageHeader, Panel, PanelHeader, Pill, Segmented, StatusPill, fieldClass, useToast } from "@/components/app/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import { dayFor, devicesFor, historyFor, isSchoolDay, summarize, tally, type DayRecord, type DayStatus, type Person } from "@/features/demo/data";
import { addDays, fmtDate, fmtTime, pct } from "@/lib/format";
import { downloadCsv, useQueryParam } from "@/lib/useQuery";
import { cn } from "@/lib/utils";

type Cohort = "all" | "student" | "staff";

export default function AttendancePage() {
  const { inst, now, todayKey, dayKey: lastDay, nouns, settings } = useAdmin();
  const toast = useToast();
  const school = inst.type === "school";
  const [day, setDay] = useState(lastDay);
  const [cohort, setCohort] = useState<Cohort>("all");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [gate, setGate] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [inspect, setInspect] = useState<{ person: Person; rec: DayRecord } | null>(null);
  const [smsSent, setSmsSent] = useState<Record<string, boolean>>({});

  const qStatus = useQueryParam("status");
  useEffect(() => {
    if (qStatus === "absent") setStatus("absent");
  }, [qStatus]);

  const rows = useMemo(() => dayFor(inst, day, now), [inst, day, now]);
  const cohortRows = rows.filter((r) => cohort === "all" || r.person.type === cohort);
  const groups = [...new Set(cohortRows.map((r) => r.person.group))].sort();
  const gates = devicesFor(inst).map((d) => d.name);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cohortRows
      .filter(({ person, rec }) => {
        if (group !== "all" && person.group !== group) return false;
        if (status !== "all" && rec.status !== status) return false;
        if (gate !== "all" && rec.inGate !== gate && rec.outGate !== gate) return false;
        return !term || `${person.name} ${person.code} ${person.group}`.toLowerCase().includes(term);
      })
      .sort((a, b) => (a.rec.in ?? "99").localeCompare(b.rec.in ?? "99"));
  }, [cohortRows, group, status, gate, q]);
  useEffect(() => setPage(1), [day, cohort, group, status, gate, q]);

  const size = 15;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const shown = filtered.slice((page - 1) * size, page * size);
  const s = summarize(cohortRows);
  const lateRows = cohortRows.filter((r) => r.rec.status === "late");
  const avgLate = lateRows.length ? Math.round(lateRows.reduce((a, r) => a + r.rec.minutesLate, 0) / lateRows.length) : 0;
  const absentStudents = rows.filter((r) => r.rec.status === "absent" && r.person.type === "student");
  const absentAll = rows.filter((r) => r.rec.status === "absent");
  const schoolDay = isSchoolDay(inst, day);
  const isToday = day === todayKey;

  const shiftDay = (n: number) => {
    let k = addDays(day, n);
    for (let i = 0; i < 7 && !isSchoolDay(inst, k); i++) k = addDays(k, n);
    if (k <= todayKey) setDay(k);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Attendance {isToday && <Pill tone="emerald"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live</Pill>}
          </span>
        }
        title="Attendance register"
        sub="Check-in and check-out times from every scanner, with the parent SMS status for each student."
        actions={
          <>
            <div className="flex items-center rounded-xl border border-line bg-card px-1 py-0.5">
              <button type="button" onClick={() => shiftDay(-1)} className="rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label="Previous day">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <label className="relative flex cursor-pointer items-center gap-1.5 px-2 font-mono text-xs font-semibold text-heading">
                <CalendarDays className="h-4 w-4 text-[color:var(--brand-fg)]" />
                {isToday ? "Today, " : ""}
                {fmtDate(day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                <input type="date" value={day} max={todayKey} onChange={(e) => e.target.value && setDay(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick a date" />
              </label>
              <button type="button" onClick={() => shiftDay(1)} disabled={day >= todayKey} className="rounded-lg p-1.5 text-muted hover:bg-subtle disabled:opacity-30" aria-label="Next day">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => {
                downloadCsv(`${inst.id}-attendance-${day}.csv`, [
                  ["Date", "ID", "Name", "Type", nouns.group, "Check-in", "In gate", "Check-out", "Out gate", "Status", "Minutes late"],
                  ...filtered.map(({ person, rec }) => [day, person.code, person.name, person.type, person.group, rec.in, rec.inGate, rec.out, rec.outGate, rec.status, rec.minutesLate || ""]),
                ]);
                toast(`Exported ${filtered.length} rows`);
              }}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {!schoolDay ? (
        <Panel>
          <EmptyState icon={CalendarDays} title={`No ${school ? "school" : "work"} on ${fmtDate(day)}`} body="This day isn't set as a working day in Settings." action={<Button variant="secondary" onClick={() => setDay(lastDay)}>Go to last working day</Button>} />
        </Panel>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={UserCheck} label="Checked in" value={`${s.in}`} extra={`/ ${s.total}`} bar={pct(s.in, s.total)} />
            <Kpi icon={UserCheck} label="On time" value={`${s.present}`} extra={`${pct(s.present, Math.max(1, s.in))}% of present`} tone="emerald" />
            <Kpi icon={Clock} label="Late" value={`${s.late}`} extra={avgLate ? `avg +${avgLate} min` : `after ${fmtTime(settings.student.late)}`} tone="amber" />
            <Kpi icon={UserX} label="Absent" value={`${s.absent}`} extra={s.notYet ? `${s.notYet} not in yet` : "no check-in"} tone="rose" />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-12">
            <Panel className="xl:col-span-9">
              <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                {school ? (
                  <Segmented
                    layoutId="att-cohort"
                    value={cohort}
                    onChange={(v) => {
                      setCohort(v);
                      setGroup("all");
                    }}
                    options={[
                      { value: "all", label: "Everyone" },
                      { value: "student", label: "Students" },
                      { value: "staff", label: "Staff" },
                    ]}
                  />
                ) : (
                  <span className="font-display text-sm font-bold text-heading">All staff</span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select value={group} onChange={(e) => setGroup(e.target.value)} className={cn(fieldClass, "w-auto py-2 text-xs")} aria-label={nouns.group}>
                    <option value="all">All {nouns.groups.toLowerCase()}</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={cn(fieldClass, "w-auto py-2 text-xs")} aria-label="Status">
                    <option value="all">All statuses</option>
                    <option value="present">On time</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="left_early">Left early</option>
                    {isToday && <option value="not_yet">Not in yet</option>}
                  </select>
                  <select value={gate} onChange={(e) => setGate(e.target.value)} className={cn(fieldClass, "w-auto py-2 text-xs")} aria-label="Gate">
                    <option value="all">All scanners</option>
                    {gates.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or ID…" className={cn(fieldClass, "w-44 py-2 pl-8 text-xs")} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-card-muted font-mono text-[10.5px] uppercase tracking-wider text-muted">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Check-in</th>
                      <th className="px-4 py-3 font-semibold">Check-out</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      {school && <th className="px-4 py-3 font-semibold">Parent SMS</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shown.map(({ person, rec }, i) => (
                      <motion.tr key={person.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }} onClick={() => setInspect({ person, rec })} className="cursor-pointer transition-colors hover:bg-card-muted">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar initials={person.initials} size={32} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-semibold text-heading">
                                {person.name} {person.type === "staff" && school && <Pill>STAFF</Pill>}
                              </p>
                              <p className="font-mono text-[11px] text-muted">
                                {person.code} · {person.group}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rec.in ? (
                            <>
                              <p className={cn("font-mono font-semibold", rec.status === "late" ? "text-amber-600 dark:text-amber-400" : "text-heading")}>{fmtTime(rec.in)}</p>
                              <p className="text-[11px] text-muted">{rec.inGate}</p>
                            </>
                          ) : (
                            <span className={cn("font-mono text-xs", rec.status === "absent" ? "font-semibold text-rose-600 dark:text-rose-400" : "text-faint")}>{rec.status === "absent" ? "No check-in" : "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rec.out ? (
                            <>
                              <p className="font-mono font-semibold text-heading">{fmtTime(rec.out)}</p>
                              <p className="text-[11px] text-muted">{rec.outGate}</p>
                            </>
                          ) : rec.in ? (
                            <Pill tone="sky">On site</Pill>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={rec.status} extra={rec.minutesLate ? `+${rec.minutesLate}m` : undefined} />
                        </td>
                        {school && (
                          <td className="px-4 py-3">
                            <SmsCell rec={rec} person={person} sent={smsSent[person.id]} />
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {shown.length === 0 && <EmptyState icon={Search} title="No records match" body="Try changing the filters." />}
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
                <span>
                  Showing <strong className="text-heading">{shown.length ? (page - 1) * size + 1 : 0}–{(page - 1) * size + shown.length}</strong> of <strong className="text-heading">{filtered.length}</strong>
                </span>
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

            {/* Follow-up rail */}
            <Panel className="xl:col-span-3">
              <PanelHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Absence follow-up
                  </span>
                }
                sub={`No check-in by ${fmtTime(settings.student.late)}`}
                right={<Pill tone="rose">{absentAll.length}</Pill>}
              />
              <div className="p-4">
                {school && absentStudents.length > 0 && (
                  <Button
                    className="mb-3 w-full"
                    variant="danger"
                    icon={Send}
                    disabled={absentStudents.every((r) => smsSent[r.person.id] || r.rec.sms === "delivered" || !r.person.guardian?.phone)}
                    onClick={() => {
                      const todo = absentStudents.filter((r) => r.person.guardian?.phone && r.rec.sms !== "delivered" && !smsSent[r.person.id]);
                      setSmsSent((m) => ({ ...m, ...Object.fromEntries(todo.map((r) => [r.person.id, true])) }));
                      toast(todo.length ? `Absence SMS sent to ${todo.length} parents` : "All parents already notified", "info");
                    }}
                  >
                    Send absence SMS
                  </Button>
                )}
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-0.5">
                  {absentAll.map(({ person }) => {
                    const phone = person.type === "student" ? person.guardian?.phone : person.phone;
                    return (
                      <div key={person.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card-muted p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-heading">{person.name}</p>
                          <p className="font-mono text-[10.5px] text-muted">
                            {person.group} · {person.code}
                          </p>
                        </div>
                        {phone ? (
                          <a href={`tel:${phone.replace(/\s/g, "")}`} title={`Call ${phone}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-rose-600 transition-colors hover:bg-rose-600 hover:text-white">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Pill tone="amber">No phone</Pill>
                        )}
                      </div>
                    );
                  })}
                  {absentAll.length === 0 && <EmptyState icon={UserCheck} title="No absences" body={isToday ? "Absences are counted after the late cut-off." : "Everyone checked in."} />}
                </div>
                {absentAll.length > 0 && (
                  <button type="button" onClick={() => setStatus("absent")} className="mt-3 w-full text-center text-xs font-semibold text-[color:var(--brand-fg)] hover:underline">
                    Show all absences in the register →
                  </button>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}

      <InspectModal row={inspect} onClose={() => setInspect(null)} day={day} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, extra, bar, tone = "brand" }: { icon: typeof Clock; label: string; value: string; extra: string; bar?: number; tone?: "brand" | "emerald" | "amber" | "rose" }) {
  const color = { brand: "text-heading", emerald: "text-heading", amber: "text-amber-600 dark:text-amber-400", rose: "text-rose-600 dark:text-rose-400" }[tone];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <Icon className="h-4 w-4 text-faint" />
      </div>
      <div className="my-2 flex items-baseline gap-2">
        <span className={cn("font-display text-3xl font-bold tabular-nums", color)}>{value}</span>
        <span className="text-[11px] text-muted">{extra}</span>
      </div>
      {bar !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
            <motion.div className="h-full rounded-full" style={{ background: "var(--brand-fg)" }} initial={{ width: 0 }} animate={{ width: `${bar}%` }} transition={{ duration: 0.8 }} />
          </div>
          <span className="font-mono text-[11px] font-bold text-[color:var(--brand-fg)]">{bar}%</span>
        </div>
      )}
    </motion.div>
  );
}

function SmsCell({ rec, person, sent }: { rec: DayRecord; person: Person; sent?: boolean }) {
  if (person.type !== "student") return <span className="text-[11px] text-faint">Not applicable</span>;
  if (!person.guardian?.phone) return <Pill tone="amber">No phone</Pill>;
  if (rec.status === "not_yet") return <span className="text-[11px] text-faint">—</span>;
  if (sent || rec.sms === "delivered")
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <MessageSquareText className="h-3.5 w-3.5" /> {rec.status === "absent" ? "Absence SMS sent" : `Sent ${fmtTime(rec.in)}`}
      </span>
    );
  return <Pill tone="rose">Failed</Pill>;
}

function InspectModal({ row, onClose, day }: { row: { person: Person; rec: DayRecord } | null; onClose: () => void; day: string }) {
  const { inst } = useAdmin();
  const hist = row ? historyFor(inst, row.person, day, 14).filter((r) => r.status !== "no_school") : [];
  const t = tally(hist);
  return (
    <Modal open={!!row} onClose={onClose} title="Attendance record" icon={Clock}>
      {row && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-card-muted p-3.5">
            <div className="flex items-center gap-3">
              <Avatar initials={row.person.initials} size={44} />
              <div>
                <p className="font-display font-bold text-heading">{row.person.name}</p>
                <p className="font-mono text-xs text-muted">
                  {row.person.code} · {row.person.group}
                </p>
              </div>
            </div>
            <StatusPill status={row.rec.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Check-in", fmtTime(row.rec.in), row.rec.inGate],
              ["Check-out", fmtTime(row.rec.out), row.rec.outGate],
              ["Date", fmtDate(day, { weekday: "long", day: "numeric", month: "short" }), ""],
              ["Last 2 weeks", `${t.rate}% attended`, `${t.late} late · ${t.absent} absent`],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl border border-line p-3">
                <p className="text-muted">{k}</p>
                <p className="mt-0.5 font-mono font-semibold text-heading">{v}</p>
                {sub && <p className="text-[11px] text-muted">{sub}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {hist
              .slice(0, 10)
              .reverse()
              .map((r) => (
                <div key={r.date} title={`${fmtDate(r.date)}: ${r.status}`} className={cn("h-8 flex-1 rounded-md", r.status === "absent" ? "bg-rose-400" : r.status === "late" || r.status === "left_early" ? "bg-amber-400" : "bg-emerald-400")} />
              ))}
          </div>
          <p className="text-center text-[11px] text-muted">Last 10 working days, oldest to newest</p>
        </div>
      )}
    </Modal>
  );
}
