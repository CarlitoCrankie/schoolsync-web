"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CalendarX2,
  Clock,
  Fingerprint,
  MessageSquareText,
  Pause,
  PhoneOff,
  Play,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  WifiOff,
} from "lucide-react";
import { AreaChart } from "@/components/app/charts";
import { Avatar, Button, EmptyState, Panel, PanelHeader, Pill, StatCard, StatusPill, fieldClass } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { useAdmin } from "@/features/admin/AdminContext";
import { dayFor, devicesLive, summarize, trend } from "@/features/demo/data";
import { fmtDate, fmtTime, pct, toMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AdminOverview() {
  const { inst, now, todayKey, dayKey, people, settings } = useAdmin();
  const school = inst.type === "school";
  const rows = useMemo(() => dayFor(inst, dayKey, now), [inst, dayKey, now]);
  const students = rows.filter((r) => r.person.type === "student");
  const staff = rows.filter((r) => r.person.type === "staff");
  const s = summarize(rows);
  const ss = summarize(students);
  const st = summarize(staff);
  const devices = devicesLive(inst, dayKey);
  const online = devices.filter((d) => d.status === "online").length;
  const points = useMemo(() => trend(inst, dayKey, 20), [inst, dayKey]);
  const avg = points.length ? Math.round((points.reduce((a, p) => a + p.rate, 0) / points.length) * 10) / 10 : 0;
  const isToday = dayKey === todayKey;
  const pastCutoff = !isToday || now.getHours() * 60 + now.getMinutes() >= toMinutes(settings.student.late);

  const missingPhone = people.filter((p) => p.type === "student" && p.status === "active" && !p.guardian?.phone).length;
  const notEnrolled = people.filter((p) => p.status === "active" && !p.enrolled).length;
  const offline = devices.filter((d) => d.status === "offline");
  const absentStudents = students.filter((r) => r.rec.status === "absent");

  const attention = [
    absentStudents.length > 0 && {
      key: "absent",
      icon: UserX,
      tone: "rose" as const,
      title: `${absentStudents.length} ${school ? "students" : "people"} absent ${isToday ? "today" : fmtDate(dayKey)}`,
      body: settings.smsOnAbsent && school ? "Absence SMS sent to parents with a phone number on file." : `No check-in after the ${fmtTime(settings.student.late)} cut-off.`,
      href: "/admin/attendance?status=absent",
      cta: "Review",
    },
    school && missingPhone > 0 && {
      key: "phone",
      icon: PhoneOff,
      tone: "amber" as const,
      title: `${missingPhone} students without a parent phone`,
      body: "Their parents won't receive arrival or absence SMS.",
      href: "/admin/people?filter=missing",
      cta: "Fix",
    },
    offline.length > 0 && {
      key: "offline",
      icon: WifiOff,
      tone: "rose" as const,
      title: `${offline[0].name} scanner offline`,
      body: `No signal for ${offline[0].lastSeenMins} min. Scans are kept on the device and sync when it's back.`,
      href: "/admin/devices",
      cta: "Details",
    },
    notEnrolled > 0 && {
      key: "enrol",
      icon: Fingerprint,
      tone: "slate" as const,
      title: `${notEnrolled} people not registered on a scanner`,
      body: "Register their fingerprint or face at the terminal.",
      href: "/admin/people?filter=unenrolled",
      cta: "View",
    },
  ].filter(Boolean) as { key: string; icon: typeof UserX; tone: "rose" | "amber" | "slate"; title: string; body: string; href: string; cta: string }[];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-line bg-card p-6 shadow-card"
      >
        <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: "var(--brand-fg)", opacity: 0.12 }} />
        <div aria-hidden className="absolute -bottom-24 right-40 h-48 w-48 rounded-full blur-3xl" style={{ background: inst.brand.secondary, opacity: 0.12 }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <InstitutionMark inst={inst} size={56} className="shadow-md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-heading">{inst.name}</h1>
                <Pill tone={offline.length ? "amber" : "emerald"}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", offline.length ? "bg-amber-500" : "animate-pulse bg-emerald-500")} />
                  {offline.length ? "Partially online" : "Live"}
                </Pill>
              </div>
              <p className="mt-1 text-sm text-muted">
                {isToday ? "Today" : `No ${school ? "school" : "work"} today, showing`} · {fmtDate(dayKey, { weekday: "long", day: "numeric", month: "long" })} · {inst.location}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/people?add=1">
              <Button icon={UserPlus}>Add person</Button>
            </Link>
            <Link href="/admin/attendance">
              <Button variant="secondary" icon={ArrowRight}>
                Today&apos;s register
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard index={0} label="Enrolled" value={s.total.toLocaleString()} icon={Users} sub={school ? `${ss.total} students · ${st.total} staff` : `${st.total} staff`} foot={<span className="text-muted">{notEnrolled ? `${notEnrolled} not on a scanner` : "All on a scanner"}</span>} />
        <StatCard
          index={1}
          label="Checked in"
          value={s.in.toLocaleString()}
          icon={UserCheck}
          tone="sky"
          suffix={<Pill tone="sky">{pct(s.in, s.total)}%</Pill>}
          sub={school ? `${ss.in} students · ${st.in} staff` : `of ${s.total} expected`}
          foot={<span className="text-emerald-600 dark:text-emerald-400">{s.notYet ? `${s.notYet} not in yet` : "Everyone accounted for"}</span>}
        />
        <StatCard index={2} label="Late" value={s.late} icon={Clock} tone="amber" suffix={<Pill tone="amber">after {fmtTime(settings.student.late)}</Pill>} sub={school ? `${ss.late} students · ${st.late} staff` : undefined} foot={<span className="text-amber-600 dark:text-amber-400">Parents notified by SMS</span>} />
        <StatCard
          index={3}
          label="Absent"
          value={pastCutoff ? s.absent : "—"}
          icon={UserX}
          tone="rose"
          valueClass={pastCutoff && s.absent ? "text-rose-600 dark:text-rose-400" : undefined}
          suffix={pastCutoff ? <Pill tone="rose">{pct(s.absent, s.total)}%</Pill> : undefined}
          sub={pastCutoff ? (school ? `${ss.absent} students · ${st.absent} staff` : undefined) : `Counted after ${fmtTime(settings.student.late)}`}
          foot={<Link href="/admin/attendance?status=absent" className="text-rose-600 hover:underline dark:text-rose-400">Follow up →</Link>}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard index={4} label="Scanners" value={`${online}/${devices.length}`} icon={Fingerprint} tone={offline.length ? "rose" : "emerald"} sub={offline.length ? `${offline.length} offline` : "All online"} foot={<Link href="/admin/devices" className="text-[color:var(--brand-fg)] hover:underline">View scanners →</Link>} />
        </div>
      </div>

      {/* Attention */}
      {attention.length > 0 && (
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Needs attention
                <Pill tone="rose">{attention.length}</Pill>
              </span>
            }
            sub="Things to sort out today"
          />
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {attention.map((a, i) => (
              <motion.div key={a.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-card-muted p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", a.tone === "rose" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" : a.tone === "amber" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" : "bg-subtle text-body")}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-heading">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{a.body}</p>
                  </div>
                </div>
                <Link href={a.href} className="self-end">
                  <Button size="sm" variant="secondary" icon={ArrowRight}>
                    {a.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <LiveFeed rows={rows} isToday={isToday} />
        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <PanelHeader title="Attendance trend" sub={`Last ${points.length} ${school ? "school" : "working"} days`} right={<Pill tone="brand">{avg}% avg</Pill>} />
            <div className="p-5">
              <AreaChart points={points} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Scanners" sub={`${online} of ${devices.length} online`} right={<Link href="/admin/devices" className="text-xs font-semibold text-[color:var(--brand-fg)] hover:underline">Manage</Link>} />
            <div className="grid grid-cols-2 gap-2 p-4">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-line bg-card-muted px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", d.status === "online" ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className="truncate text-xs font-medium text-heading">{d.name}</span>
                  </div>
                  <span className={cn("font-mono text-[10px] font-bold", d.status === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{d.status === "online" ? `${d.scansToday} scans` : "OFFLINE"}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function LiveFeed({ rows, isToday }: { rows: ReturnType<typeof dayFor>; isToday: boolean }) {
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState("");
  const [frozen, setFrozen] = useState<typeof rows | null>(null);
  const src = paused && frozen ? frozen : rows;

  const events = useMemo(() => {
    const ev = src.flatMap(({ person, rec }) => [
      ...(rec.in ? [{ key: person.id + "in", person, rec, time: rec.in, kind: "in" as const, gate: rec.inGate }] : []),
      ...(rec.out ? [{ key: person.id + "out", person, rec, time: rec.out, kind: "out" as const, gate: rec.outGate }] : []),
    ]);
    return ev
      .filter((e) => !q || `${e.person.name} ${e.person.code} ${e.person.group}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 8);
  }, [src, q]);

  return (
    <Panel className="lg:col-span-7">
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", paused ? "bg-amber-500" : "animate-pulse bg-sky-500")} />
            {isToday ? "Live check-ins" : "Latest check-ins"}
            <Pill tone={paused ? "amber" : "sky"}>{paused ? "Paused" : isToday ? "Live" : "Last day"}</Pill>
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className={cn(fieldClass, "w-36 py-1.5 pl-8 text-xs sm:w-44")} />
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={paused ? Play : Pause}
              onClick={() => {
                setFrozen(rows);
                setPaused((p) => !p);
              }}
            >
              {paused ? "Resume" : "Pause"}
            </Button>
          </div>
        }
      />
      <div className="space-y-2 p-4">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div key={e.key} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card-muted px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <Avatar initials={e.person.initials} size={38} />
                  <span className={cn("absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card", e.kind === "in" ? "bg-sky-500" : "bg-slate-500")}>
                    <Fingerprint className="h-2.5 w-2.5 text-white" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-heading">
                    {e.person.name}
                    {e.person.type === "staff" && <Pill>STAFF</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {e.person.group} · {e.kind === "in" ? "In" : "Out"} at {e.gate}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-xs font-semibold text-heading">{fmtTime(e.time)}</span>
                {e.kind === "in" ? (
                  <StatusPill status={e.rec.status === "left_early" ? "present" : e.rec.status} extra={e.rec.minutesLate ? `+${e.rec.minutesLate}m` : undefined} />
                ) : (
                  <Pill>Checked out</Pill>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && <EmptyState icon={CalendarX2} title="No scans yet" body="Check-ins appear here as people scan in at the gate." />}
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" /> Parents get an SMS on each student check-in
        </span>
        <Link href="/admin/attendance" className="flex items-center gap-1 font-semibold text-[color:var(--brand-fg)] hover:underline">
          Full register <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Panel>
  );
}
