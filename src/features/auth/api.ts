import { findInstitution, type Role } from "./data";

export type SignInInput = { institutionId: string; role: Role; identifier: string; password: string };

export type SignInResult =
  | { ok: true; displayName: string; mustChangePassword: boolean }
  | { ok: false; error: "invalid"; attemptsLeft: number }
  | { ok: false; error: "locked"; retryAt: number }
  | { ok: false; error: "deactivated" }
  | { ok: false; error: "institution_inactive" };

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil?: number }>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * PREVIEW sign-in. Replace with a POST to the backend `/api/auth/login`.
 *
 * Demo rules:
 *  - password `demo1234` signs in
 *  - an ID starting with `NEW` (staff/admin) goes to "set your password"
 *  - ID `INACTIVE` returns a deactivated account
 *  - 5 wrong passwords lock the ID for 15 minutes
 */
export async function signIn(input: SignInInput): Promise<SignInResult> {
  await wait(900);
  const inst = findInstitution(input.institutionId);
  if (!inst || !inst.active) return { ok: false, error: "institution_inactive" };

  const key = `${input.institutionId}:${input.role}:${input.identifier.trim().toUpperCase()}`;
  const rec = attempts.get(key) ?? { count: 0 };
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return { ok: false, error: "locked", retryAt: rec.lockedUntil };

  const id = input.identifier.trim().toUpperCase();
  if (id === "INACTIVE") return { ok: false, error: "deactivated" };

  if (input.password !== "demo1234") {
    rec.count += 1;
    if (rec.count >= MAX_ATTEMPTS) {
      rec.lockedUntil = Date.now() + LOCK_MS;
      rec.count = 0;
      attempts.set(key, rec);
      return { ok: false, error: "locked", retryAt: rec.lockedUntil };
    }
    attempts.set(key, rec);
    return { ok: false, error: "invalid", attemptsLeft: MAX_ATTEMPTS - rec.count };
  }

  attempts.delete(key);
  return {
    ok: true,
    displayName: input.role === "parent" ? "Parent of " + input.identifier.trim() : input.identifier.trim(),
    mustChangePassword: input.role !== "parent" && id.startsWith("NEW"),
  };
}

/** PREVIEW: replace with POST `/api/auth/change-password`. */
export async function setNewPassword(password: string): Promise<{ ok: true }> {
  void password;
  await wait(800);
  return { ok: true };
}
