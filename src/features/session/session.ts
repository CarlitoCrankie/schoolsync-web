"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/features/auth/data";

/**
 * PREVIEW session kept in localStorage. Replace with the backend's JWT /
 * refresh-token session once `/api/auth` exists.
 */
export type Session = {
  kind: "institution" | "owner";
  institutionId?: string;
  role?: Role;
  identifier: string;
  name: string;
  at: number;
};

const KEY = "da:session";
const ACTIVITY = "da:last-activity";
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/parent";
}

export function saveSession(s: Omit<Session, "at">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() }));
    localStorage.setItem(ACTIVITY, String(Date.now()));
  } catch {}
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(ACTIVITY);
  } catch {}
}

/**
 * Loads the session for a protected area, redirects to sign-in when missing or
 * of the wrong kind, and signs out after 30 minutes without activity.
 */
export function useSession(expect: { kind: Session["kind"]; role?: Role }, loginPath = "/login") {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = readSession();
    const last = Number(localStorage.getItem(ACTIVITY) ?? 0);
    if (s && last && Date.now() - last > IDLE_LIMIT_MS) {
      clearSession();
      router.replace(`${loginPath}?reason=expired`);
      return;
    }
    if (!s || s.kind !== expect.kind || (expect.role && s.role !== expect.role)) {
      router.replace(loginPath);
      return;
    }
    setSession(s);

    let timer: ReturnType<typeof setTimeout>;
    const bump = () => {
      try {
        localStorage.setItem(ACTIVITY, String(Date.now()));
      } catch {}
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearSession();
        router.replace(`${loginPath}?reason=expired`);
      }, IDLE_LIMIT_MS);
    };
    bump();
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut(to = loginPath) {
    clearSession();
    router.replace(to);
  }

  return { session, signOut };
}

/** Re-renders every `ms` so live dashboards keep their clock-based figures current. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
