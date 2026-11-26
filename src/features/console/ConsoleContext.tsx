"use client";

import { createContext, useContext, useState } from "react";
import { Building2, Fingerprint, LayoutGrid, ShieldCheck } from "lucide-react";
import { BiometricLoader } from "@/components/brand/Biometric";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { ToastProvider } from "@/components/app/ui";
import { institutions as seed, type Institution } from "@/features/auth/data";
import { devicesFor } from "@/features/demo/data";
import { useNow, useSession, type Session } from "@/features/session/session";
import { dateKey, fmtDate } from "@/lib/format";

export const OWNER_BRAND = "#1642a8";

type Ctx = {
  session: Session;
  now: Date;
  todayKey: string;
  institutions: Institution[];
  setInstitutions: React.Dispatch<React.SetStateAction<Institution[]>>;
};

const ConsoleCtx = createContext<Ctx | null>(null);
export function useConsole() {
  const c = useContext(ConsoleCtx);
  if (!c) throw new Error("useConsole outside ConsoleLayout");
  return c;
}

export function DiamondMark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-sm" style={{ width: size, height: size }}>
      <Fingerprint style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

export function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // Paths are relative to the console subdomain: "/login" is /console/login.
  const { session, signOut } = useSession({ kind: "owner" }, "/login");
  const now = useNow();
  const [list, setList] = useState<Institution[]>(seed);

  if (!session || !now) {
    return (
      <BiometricLoader label="Opening the console" />
    );
  }

  const offline = list.filter((i) => i.active).flatMap((i) => devicesFor(i)).filter((d) => d.status === "offline").length;
  const nav: NavItem[] = [
    { href: "/", label: "Overview", icon: LayoutGrid },
    { href: "/institutions", label: "Institutions", icon: Building2, badge: list.length },
    { href: "/devices", label: "Scanners & agents", icon: Fingerprint, badge: offline || undefined, badgeTone: "rose" },
  ];
  const name = session.name || session.identifier.split("@")[0];
  const todayKey = dateKey(now);

  return (
    <ToastProvider>
      <ConsoleCtx.Provider value={{ session, now, todayKey, institutions: list, setInstitutions: setList }}>
        <AppShell
          brand={{ mark: <DiamondMark />, name: "Diamond Attendance", sub: "Owner console" }}
          brandColor={OWNER_BRAND}
          nav={nav}
          user={{ name: name.charAt(0).toUpperCase() + name.slice(1), role: "Platform owner", initials: name.slice(0, 2).toUpperCase() }}
          notifications={offline}
          poweredBy={false}
          onSignOut={() => signOut()}
          topLeft={
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 sm:flex dark:bg-amber-500/15 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Internal: DiamondAttendance staff only
              </span>
              <span className="rounded-full bg-subtle px-2.5 py-1 font-mono text-[11px] font-medium text-body">{fmtDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>© {now.getFullYear()} Diamond Attendance</span>
              <span className="font-mono">console</span>
            </div>
          }
        >
          {children}
        </AppShell>
      </ConsoleCtx.Provider>
    </ToastProvider>
  );
}
