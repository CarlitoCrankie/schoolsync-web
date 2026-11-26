"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { BarChart3, ClipboardList, Fingerprint, LayoutGrid, Settings as SettingsIcon, Upload, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { PageSkeleton, ToastProvider } from "@/components/app/ui";
import { InstitutionMark } from "@/features/auth/ui";
import { findInstitution, type Institution } from "@/features/auth/data";
import { dayFor, devicesFor, lastSchoolDay, peopleFor, settingsFor, type Person, type Settings } from "@/features/demo/data";
import { useNow, useSession, type Session } from "@/features/session/session";
import { dateKey, fmtDate } from "@/lib/format";

type Ctx = {
  inst: Institution;
  session: Session;
  now: Date;
  todayKey: string;
  /** Today if it's a working day, otherwise the most recent working day. */
  dayKey: string;
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  nouns: { student: string; students: string; staff: string; group: string; groups: string };
};

const AdminCtx = createContext<Ctx | null>(null);
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin outside AdminLayout");
  return c;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useSession({ kind: "institution", role: "admin" });
  const now = useNow();
  const inst = findInstitution(session?.institutionId);

  if (!session || !inst || !now) {
    return (
      <div className="min-h-screen bg-surface p-8">
        <PageSkeleton />
      </div>
    );
  }
  return (
    <ToastProvider>
      <AdminInner inst={inst} session={session} now={now} signOut={signOut}>
        {children}
      </AdminInner>
    </ToastProvider>
  );
}

function AdminInner({ inst, session, now, signOut, children }: { inst: Institution; session: Session; now: Date; signOut: () => void; children: React.ReactNode }) {
  const [people, setPeople] = useState(() => peopleFor(inst));
  const [settings, setSettings] = useState(() => settingsFor(inst));
  const todayKey = dateKey(now);
  const dayKey = lastSchoolDay(inst, todayKey);
  const school = inst.type === "school";
  const nouns = school
    ? { student: "student", students: "Students", staff: "Staff", group: "Class", groups: "Classes" }
    : { student: "employee", students: "Employees", staff: "Staff", group: "Department", groups: "Departments" };

  const absent = useMemo(() => dayFor(inst, dayKey, now).filter((r) => r.rec.status === "absent").length, [inst, dayKey, now]);
  const offline = devicesFor(inst).filter((d) => d.status === "offline").length;

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutGrid },
    { href: "/admin/people", label: "People", icon: Users, badge: people.filter((p) => p.status === "active").length },
    { href: "/admin/attendance", label: "Attendance", icon: ClipboardList, badge: absent || undefined, badgeTone: "rose" },
    { href: "/admin/import", label: "Import", icon: Upload },
    { href: "/admin/devices", label: "Scanners", icon: Fingerprint, badge: offline || undefined, badgeTone: "rose" },
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ];

  const name = session.identifier.includes("@") ? session.identifier.split("@")[0] : session.identifier;

  return (
    <AdminCtx.Provider value={{ inst, session, now, todayKey, dayKey, people, setPeople, settings, setSettings, nouns }}>
      <AppShell
        brand={{ mark: <InstitutionMark inst={inst} size={36} />, name: inst.name, sub: "Admin portal" }}
        brandColor={inst.brand.primary}
        nav={nav}
        user={{ name: name.charAt(0).toUpperCase() + name.slice(1), role: "Administrator", initials: name.slice(0, 2).toUpperCase() }}
        notifications={absent + offline}
        onSignOut={() => signOut()}
        topLeft={
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden items-center gap-1.5 font-semibold text-heading sm:flex">
              <BarChart3 className="h-4 w-4 text-[color:var(--brand-fg)]" /> {inst.name}
            </span>
            <span className="hidden text-faint sm:inline">/</span>
            <span className="rounded-full bg-subtle px-2.5 py-1 font-mono text-[11px] font-medium text-body">{fmtDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
        }
        sidebarFoot={<SyncCard offline={offline} />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {now.getFullYear()} {inst.name}</span>
            <span className="font-mono">Powered by DiamondAttendance</span>
          </div>
        }
      >
        {children}
      </AppShell>
    </AdminCtx.Provider>
  );
}

function SyncCard({ offline }: { offline: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-card-muted px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${offline ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${offline ? "bg-amber-500" : "bg-emerald-500"}`} />
        </span>
        <div>
          <p className="text-[12px] font-semibold text-heading">Sync agent</p>
          <p className="font-mono text-[10px] text-muted">{offline ? `${offline} scanner offline` : "All scanners online"}</p>
        </div>
      </div>
    </div>
  );
}
