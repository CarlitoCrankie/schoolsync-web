"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DiamondMark } from "@/features/console/ConsoleContext";
import { inputClass } from "@/features/auth/ui";
import { saveSession } from "@/features/session/session";
import { useQueryParam } from "@/lib/useQuery";

/** PREVIEW: any @diamondattendance.com email with password `demo1234`. Replace with POST /api/console/auth/login (+ 2FA). */
export default function ConsoleLogin() {
  const router = useRouter();
  const reason = useQueryParam("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Console sign in — Diamond Attendance";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    if (!/@diamondattendance\.com$/i.test(email.trim()) || password !== "demo1234") {
      setBusy(false);
      setError("Those details don't match a console account.");
      return;
    }
    const name = email.trim().split("@")[0];
    saveSession({ kind: "owner", identifier: email.trim(), name });
    router.replace("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4">
      <div aria-hidden className="bg-grid absolute inset-0 opacity-70" />
      <motion.div aria-hidden className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-blue/20 blur-3xl" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 10, repeat: Infinity }} />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm rounded-2xl border border-line bg-card p-7 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <DiamondMark size={48} />
          <h1 className="mt-4 font-display text-xl font-bold text-heading">Owner console</h1>
          <p className="mt-1 text-sm text-muted">Diamond Attendance staff only</p>
        </div>

        {reason === "expired" && (
          <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">You were signed out after 30 minutes of inactivity.</p>
        )}
        {error && (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-body">Work email</span>
          <input className={inputClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@diamondattendance.com" required />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-body">Password</span>
          <div className="relative">
            <input className={inputClass + " pr-10"} type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-heading" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <button type="submit" disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign in
        </button>

        <p className="mt-5 flex items-start gap-1.5 text-[11px] text-faint">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Every action here is logged. Preview: any @diamondattendance.com email with password <code className="font-mono text-body">demo1234</code>.
        </p>
      </motion.form>
    </div>
  );
}
