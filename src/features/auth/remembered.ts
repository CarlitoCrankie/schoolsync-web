import type { Role } from "./data";

/** What "Remember me on this device" keeps: the institution and role, never credentials. */
export type Remembered = { institutionId: string; role: Role };

const KEY = "da:signin";

export function loadRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Remembered) : null;
  } catch {
    return null;
  }
}

export function saveRemembered(r: Remembered) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}

export function clearRemembered() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
