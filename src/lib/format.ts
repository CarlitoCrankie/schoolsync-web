/** Date/time helpers. Times are "HH:MM" strings (24h); dates are "YYYY-MM-DD" keys. */

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** "07:42" → "7:42 AM" */
export function fmtTime(t?: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function fmtDate(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return fromKey(key).toLocaleDateString("en-GB", opts);
}

export function fmtHours(mins: number) {
  if (mins <= 0) return "0h";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
