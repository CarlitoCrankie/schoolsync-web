/**
 * PREVIEW DATA. A deterministic, seeded stand-in for the backend so every
 * dashboard has realistic people, scans, devices and history. Replace these
 * functions with API calls (`/persons`, `/attendance`, `/devices`) later; the
 * shapes match the agreed database design.
 */
import { addDays, dateKey, fromKey, fromMinutes, nowMinutes, toMinutes } from "@/lib/format";
import { findInstitution, institutions, type Institution } from "@/features/auth/data";

/* ── seeded random ─────────────────────────────────────────── */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

/* ── types ─────────────────────────────────────────────────── */
export type PersonType = "student" | "staff";
export type Person = {
  id: string;
  code: string;
  name: string;
  initials: string;
  type: PersonType;
  group: string; // class (students) or department (staff)
  title?: string;
  guardian?: { name: string; relation: string; phone?: string };
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  enrolled: boolean; // registered on the scanner
  hasLogin: boolean;
};

export type DayStatus = "present" | "late" | "absent" | "left_early" | "not_yet" | "no_school";
export type DayRecord = {
  personId: string;
  date: string;
  in?: string;
  out?: string;
  inGate?: string;
  outGate?: string;
  status: DayStatus;
  minutesLate: number;
  sms?: "delivered" | "failed" | "no_phone" | "not_applicable";
};

export type Rules = { start: string; late: string; end: string; earlyExit: string };
export type Settings = { student: Rules; staff: Rules; workingDays: number[]; smsOnCheckIn: boolean; smsOnCheckOut: boolean; smsOnAbsent: boolean };

export type Device = {
  id: string;
  name: string;
  location: string;
  serial: string;
  model: string;
  status: "online" | "warning" | "offline";
  lastSeenMins: number;
  scansToday: number;
};

/* ── reference lists ───────────────────────────────────────── */
const firstNames = ["Kwesi", "Ama", "Kofi", "Abena", "Yaw", "Akosua", "Kwame", "Efua", "Kojo", "Adwoa", "Kwabena", "Esi", "Nana", "Afia", "Fiifi", "Akua", "Selorm", "Dzifa", "Elikem", "Edem", "Naa", "Nii", "Ewurabena", "Mawuli", "Sena", "Delali", "Gifty", "Samuel", "Grace", "Daniel", "Mercy", "Emmanuel", "Priscilla", "David", "Joyce", "Isaac"];
const lastNames = ["Mensah", "Asante", "Boateng", "Owusu", "Osei", "Appiah", "Agyeman", "Amoah", "Darko", "Quaye", "Addo", "Tetteh", "Ansah", "Sarpong", "Acheampong", "Frimpong", "Nkrumah", "Amponsah", "Badu", "Opoku", "Kumi", "Lartey", "Ofori", "Agbeko", "Dogbe"];
const relations = ["Mother", "Father", "Guardian", "Aunt", "Uncle"];
const schoolClasses = ["JHS 1A", "JHS 1B", "JHS 2A", "JHS 2B", "JHS 3A", "JHS 3B", "Primary 5", "Primary 6"];
const schoolDepts = ["Teaching", "Teaching", "Teaching", "Administration", "Accounts", "Kitchen", "Security", "Maintenance"];
const schoolTitles: Record<string, string[]> = {
  Teaching: ["Class Teacher", "Mathematics Teacher", "Science Teacher", "English Teacher", "ICT Teacher"],
  Administration: ["Head Teacher", "Office Administrator", "Front Desk"],
  Accounts: ["Bursar", "Accounts Officer"],
  Kitchen: ["Cook", "Kitchen Assistant"],
  Security: ["Security Officer"],
  Maintenance: ["Groundskeeper", "Driver"],
};
const orgDepts = ["Operations", "Warehouse", "Finance", "Human Resources", "Sales", "IT", "Security", "Logistics"];

/* ── settings ──────────────────────────────────────────────── */
export function settingsFor(inst: Institution): Settings {
  return {
    student: { start: "07:30", late: "08:00", end: "14:30", earlyExit: "14:00" },
    staff: inst.type === "school" ? { start: "07:00", late: "07:45", end: "16:00", earlyExit: "15:30" } : { start: "08:00", late: "08:30", end: "17:00", earlyExit: "16:30" },
    workingDays: [1, 2, 3, 4, 5],
    smsOnCheckIn: true,
    smsOnCheckOut: false,
    smsOnAbsent: true,
  };
}

/* ── people ────────────────────────────────────────────────── */
const peopleCache = new Map<string, Person[]>();

export function peopleFor(inst: Institution): Person[] {
  const cached = peopleCache.get(inst.id);
  if (cached) return cached;
  const r = rng(inst.id + ":people");
  const prefix = inst.initials;
  const out: Person[] = [];
  const mk = (type: PersonType, i: number): Person => {
    const fn = pick(r, firstNames);
    const ln = pick(r, lastNames);
    const name = `${fn} ${ln}`;
    const status = r() < 0.03 ? "inactive" : "active";
    if (type === "student") {
      const missing = r() < 0.04;
      const gfn = pick(r, firstNames);
      return {
        id: `${inst.id}-s${i}`,
        code: `${prefix}-2024-${String(i + 1).padStart(4, "0")}`,
        name,
        initials: fn[0] + ln[0],
        type,
        group: pick(r, schoolClasses),
        guardian: { name: `${gfn} ${ln}`, relation: pick(r, relations), phone: missing ? undefined : `+233 ${pick(r, ["24", "20", "54", "55", "27", "50"])} ${String(Math.floor(r() * 900) + 100)} ${String(Math.floor(r() * 9000) + 1000)}` },
        status,
        enrolled: r() > 0.03,
        hasLogin: r() > 0.12,
      };
    }
    const dept = inst.type === "school" ? pick(r, schoolDepts) : pick(r, orgDepts);
    const title = inst.type === "school" ? pick(r, schoolTitles[dept]) : `${dept} ${pick(r, ["Officer", "Associate", "Lead", "Assistant", "Supervisor"])}`;
    return {
      id: `${inst.id}-t${i}`,
      code: `${inst.type === "school" ? "STF" : "EMP"}-${String(i + 1).padStart(3, "0")}`,
      name: (r() < 0.5 ? (inst.type === "school" ? "Mr. " : "") : inst.type === "school" ? "Mrs. " : "") + name,
      initials: fn[0] + ln[0],
      type,
      group: dept,
      title,
      phone: `+233 ${pick(r, ["24", "20", "54", "55"])} ${String(Math.floor(r() * 900) + 100)} ${String(Math.floor(r() * 9000) + 1000)}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${inst.id}.example`,
      status,
      enrolled: r() > 0.02,
      hasLogin: r() > 0.1,
    };
  };
  if (inst.type === "school") {
    for (let i = 0; i < 180; i++) out.push(mk("student", i));
    for (let i = 0; i < 24; i++) out.push(mk("staff", i));
  } else {
    for (let i = 0; i < 72; i++) out.push(mk("staff", i));
  }
  peopleCache.set(inst.id, out);
  return out;
}

/* ── devices ───────────────────────────────────────────────── */
export function devicesFor(inst: Institution): Device[] {
  const r = rng(inst.id + ":devices");
  const names =
    inst.type === "school"
      ? [["Main Gate", "Front entrance"], ["Main Gate 2", "Front entrance, lane 2"], ["Staff Entrance", "Admin block"], ["Back Gate", "Sports field side"]]
      : [["Main Entrance", "Reception"], ["Warehouse Door", "Loading bay"], ["Staff Exit", "Car park"]];
  return names.map(([name, location], i) => {
    const offline = i === names.length - 1 && inst.id !== "demo-workplace";
    return {
      id: `${inst.id}-d${i}`,
      name,
      location,
      serial: `ZK${String(Math.floor(r() * 9e7) + 1e7)}`,
      model: pick(r, ["ZKTeco MB20-VL", "ZKTeco SpeedFace-V5L", "ZKTeco K40"]),
      status: offline ? "offline" : "online",
      lastSeenMins: offline ? 23 : 0,
      scansToday: 0,
    };
  });
}

/* ── attendance ────────────────────────────────────────────── */
export function isSchoolDay(inst: Institution, key: string) {
  return settingsFor(inst).workingDays.includes(fromKey(key).getDay());
}

/** The most recent working day on or before `key`. */
export function lastSchoolDay(inst: Institution, key: string) {
  let k = key;
  for (let i = 0; i < 7 && !isSchoolDay(inst, k); i++) k = addDays(k, -1);
  return k;
}

export function recordFor(inst: Institution, p: Person, key: string, now = new Date()): DayRecord {
  const base = { personId: p.id, date: key, minutesLate: 0 } as DayRecord;
  if (!isSchoolDay(inst, key) || p.status === "inactive") return { ...base, status: "no_school" };
  const rules = settingsFor(inst)[p.type];
  const todayKey = dateKey(now);
  if (key > todayKey) return { ...base, status: "no_school" };
  const live = key === todayKey;
  const cur = live ? nowMinutes(now) : 24 * 60;
  const devices = devicesFor(inst).filter((d) => d.status !== "offline" || !live);
  const gate = (n: number) => devices[n % devices.length]?.name;

  const r = rng(p.id + key);
  const roll = r();
  const start = toMinutes(rules.start);
  const lateAt = toMinutes(rules.late);
  const end = toMinutes(rules.end);

  if (roll < 0.045) {
    return { ...base, status: cur >= lateAt ? "absent" : "not_yet", sms: p.type === "student" ? (p.guardian?.phone ? "delivered" : "no_phone") : "not_applicable" };
  }
  const late = roll < 0.15;
  const inMin = late ? lateAt + 1 + Math.floor(r() * 40) : start - 35 + Math.floor(r() * (lateAt - start + 30));
  if (cur < inMin) return { ...base, status: "not_yet" };

  const leftEarly = r() < 0.03;
  const outMin = leftEarly ? toMinutes(rules.earlyExit) - 20 - Math.floor(r() * 90) : end + Math.floor(r() * 55);
  const hasOut = cur >= outMin;
  const sms = p.type === "student" ? (p.guardian?.phone ? (r() < 0.98 ? "delivered" : "failed") : "no_phone") : "not_applicable";
  return {
    ...base,
    in: fromMinutes(inMin),
    inGate: gate(Math.floor(r() * 10)),
    out: hasOut ? fromMinutes(outMin) : undefined,
    outGate: hasOut ? gate(Math.floor(r() * 10)) : undefined,
    status: leftEarly && hasOut ? "left_early" : late ? "late" : "present",
    minutesLate: late ? inMin - lateAt : 0,
    sms,
  };
}

export function dayFor(inst: Institution, key: string, now = new Date()) {
  const people = peopleFor(inst).filter((p) => p.status === "active");
  return people.map((p) => ({ person: p, rec: recordFor(inst, p, key, now) }));
}

export function summarize(rows: { person: Person; rec: DayRecord }[]) {
  const s = { total: rows.length, present: 0, late: 0, absent: 0, notYet: 0, leftEarly: 0, in: 0 };
  for (const { rec } of rows) {
    if (rec.status === "present") s.present++;
    if (rec.status === "late") s.late++;
    if (rec.status === "absent") s.absent++;
    if (rec.status === "not_yet") s.notYet++;
    if (rec.status === "left_early") s.leftEarly++;
    if (rec.in) s.in++;
  }
  return s;
}

/** Attendance rate (% of expected people who checked in) for the last `n` school days. */
export function trend(inst: Institution, endKey: string, n = 20, type?: PersonType) {
  const pts: { date: string; rate: number }[] = [];
  let k = endKey;
  const now = new Date();
  while (pts.length < n) {
    if (isSchoolDay(inst, k)) {
      const rows = dayFor(inst, k, now).filter((x) => !type || x.person.type === type);
      const s = summarize(rows);
      const expected = s.total - s.notYet;
      pts.unshift({ date: k, rate: expected ? Math.round((s.in / expected) * 1000) / 10 : 0 });
    }
    k = addDays(k, -1);
  }
  return pts;
}

/** A person's history over the last `days` calendar days (newest first). */
export function historyFor(inst: Institution, p: Person, endKey: string, days: number) {
  const out: DayRecord[] = [];
  for (let i = 0; i < days; i++) out.push(recordFor(inst, p, addDays(endKey, -i)));
  return out;
}

export function tally(records: DayRecord[]) {
  const t = { present: 0, late: 0, absent: 0, leftEarly: 0, days: 0, minutes: 0 };
  for (const r of records) {
    if (r.status === "no_school" || r.status === "not_yet") continue;
    t.days++;
    if (r.status === "present") t.present++;
    if (r.status === "late") t.late++;
    if (r.status === "absent") t.absent++;
    if (r.status === "left_early") t.leftEarly++;
    if (r.in && r.out) t.minutes += toMinutes(r.out) - toMinutes(r.in);
  }
  const attended = t.present + t.late + t.leftEarly;
  return { ...t, attended, rate: t.days ? Math.round((attended / t.days) * 1000) / 10 : 0 };
}

export function devicesLive(inst: Institution, key: string) {
  const rows = dayFor(inst, key);
  return devicesFor(inst).map((d) => ({
    ...d,
    scansToday: rows.reduce((n, { rec }) => n + (rec.inGate === d.name ? 1 : 0) + (rec.outGate === d.name ? 1 : 0), 0),
  }));
}

export { findInstitution, institutions };
