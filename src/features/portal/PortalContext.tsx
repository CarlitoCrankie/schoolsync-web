"use client";

import { createContext, useContext } from "react";
import { CalendarDays, Home, Phone, UserRound, UserRoundPlus } from "lucide-react";
import { BiometricLoader } from "@/components/brand/Biometric";
import { PortalShell, type PortalTab } from "@/components/app/PortalShell";
import { ToastProvider } from "@/components/app/ui";
import { findInstitution, type Institution } from "@/features/auth/data";
import { lastSchoolDay, peopleFor, settingsFor, type Person, type Rules } from "@/features/demo/data";
import { useNow, useSession } from "@/features/session/session";
import { dateKey } from "@/lib/format";

type Ctx = {
  inst: Institution;
  person: Person;
  rules: Rules;
  now: Date;
  todayKey: string;
  /** Today if it's a working day, otherwise the most recent working day. */
  dayKey: string;
  isWorkingDay: boolean;
};

const PortalCtx = createContext<Ctx | null>(null);
export function usePortal() {
  const c = useContext(PortalCtx);
  if (!c) throw new Error("usePortal outside PortalLayout");
  return c;
}

/** In preview, the signed-in ID picks the matching demo person; any other ID falls back to the first one. */
function resolvePerson(inst: Institution, role: "parent" | "staff", identifier: string) {
  const type = role === "parent" ? "student" : "staff";
  const pool = peopleFor(inst).filter((p) => p.type === type && p.status === "active");
  const id = identifier.trim().toLowerCase();
  return pool.find((p) => p.code.toLowerCase() === id || p.email?.toLowerCase() === id) ?? pool[0];
}

export function PortalLayout({ role, children }: { role: "parent" | "staff"; children: React.ReactNode }) {
  const { session, signOut } = useSession({ kind: "institution", role });
  const now = useNow();
  const inst = findInstitution(session?.institutionId);

  if (!session || !inst || !now) {
    return (
      <BiometricLoader label={role === "parent" ? "Checking today\u2019s attendance" : "Loading your record"} />
    );
  }

  const person = resolvePerson(inst, role, session.identifier);
  const todayKey = dateKey(now);
  const dayKey = lastSchoolDay(inst, todayKey);
  const base = `/${role}`;
  const tabs: PortalTab[] =
    role === "parent"
      ? [
          { href: base, label: "Today", icon: Home },
          { href: `${base}/history`, label: "History", icon: CalendarDays },
          { href: `${base}/contact`, label: "Contact", icon: Phone },
        ]
      : [
          { href: base, label: "Today", icon: Home },
          { href: `${base}/history`, label: "My record", icon: CalendarDays },
          { href: `${base}/profile`, label: "Profile", icon: UserRound },
        ];

  const firstName = person.name.replace(/^(Mr\.|Mrs\.)\s/, "").split(" ")[0];

  return (
    <ToastProvider>
      <PortalCtx.Provider value={{ inst, person, rules: settingsFor(inst)[person.type], now, todayKey, dayKey, isWorkingDay: dayKey === todayKey }}>
        <PortalShell
          inst={inst}
          portalLabel={role === "parent" ? "Parent portal" : inst.type === "school" ? "Staff portal" : "Employee portal"}
          person={{
            name: role === "parent" ? person.guardian?.name ?? "Parent" : person.name,
            initials: role === "parent" ? (person.guardian?.name ?? "P").split(" ").map((s) => s[0]).join("").slice(0, 2) : person.initials,
            meta: role === "parent" ? `Parent of ${firstName} · ${person.code}` : `${person.title ?? person.group} · ${person.code}`,
          }}
          tabs={tabs}
          onSignOut={() => signOut()}
          extraMenu={role === "parent" ? { label: "Sign in for another child", icon: UserRoundPlus, onClick: () => signOut("/login?switch=1") } : undefined}
        >
          {children}
        </PortalShell>
      </PortalCtx.Provider>
    </ToastProvider>
  );
}
