import type { Institution } from "@/features/auth/data";
import { dayFor, devicesLive, lastSchoolDay, summarize } from "@/features/demo/data";
import { dateKey } from "@/lib/format";

export type InstStats = ReturnType<typeof instStats>;

/** Per-institution figures for the owner console (PREVIEW: computed from demo data). */
export function instStats(inst: Institution, now: Date) {
  const todayKey = dateKey(now);
  const dayKey = lastSchoolDay(inst, todayKey);
  const rows = inst.active ? dayFor(inst, dayKey, now) : [];
  const s = summarize(rows);
  const devices = devicesLive(inst, dayKey);
  const expected = s.total - s.notYet;
  return {
    inst,
    dayKey,
    live: dayKey === todayKey,
    rows,
    people: s.total,
    students: rows.filter((r) => r.person.type === "student").length,
    staff: rows.filter((r) => r.person.type === "staff").length,
    summary: s,
    rate: expected ? Math.round((s.in / expected) * 1000) / 10 : 0,
    devices,
    online: devices.filter((d) => d.status === "online").length,
    // PREVIEW: the sync agent heartbeat comes from the agent's /heartbeat calls.
    agent: { version: "2.3.1", lastBeatSecs: inst.active ? 20 + (inst.id.length * 7) % 40 : null },
  };
}
