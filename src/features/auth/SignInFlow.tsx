"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { homeFor, saveSession } from "@/features/session/session";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Clock,
  CloudOff,
  Eye,
  EyeOff,
  Fingerprint,
  GraduationCap,
  IdCard,
  Info,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  ShieldX,
  UserX,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthShell } from "./AuthShell";
import { setNewPassword, signIn, type SignInResult } from "./api";
import { findInstitution, institutions, platformSupport, roles, rolesFor, type Institution, type InstitutionType, type Role } from "./data";
import { clearRemembered, loadRemembered, saveRemembered } from "./remembered";
import { Banner, InstitutionMark, OptionCard, PrimaryButton, StepTitle, inputClass } from "./ui";

type Step = "type" | "institution" | "role" | "credentials" | "set-password" | "forgot" | "done";
const order: Step[] = ["type", "institution", "role", "credentials", "set-password", "forgot", "done"];
const numbered: Partial<Record<Step, number>> = { type: 1, institution: 2, role: 3, credentials: 4 };

const roleIcons: Record<Role, typeof Users> = { parent: Users, staff: IdCard, admin: ShieldCheck };
const roleTint: Record<Role, string> = {
  parent: "text-amber-600 dark:text-amber-400",
  staff: "text-sky-600 dark:text-sky-400",
  admin: "text-violet-600 dark:text-violet-400",
};

export function SignInFlow() {
  const [step, setStep] = useState<Step>("type");
  const [dir, setDir] = useState(1);
  const [type, setType] = useState<InstitutionType>("school");
  const [inst, setInst] = useState<Institution>();
  const [role, setRole] = useState<Role>();
  const [returning, setReturning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [offline, setOffline] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // Restore "remember me", session-expired notice and connectivity.
  useEffect(() => {
    const saved = loadRemembered();
    const savedInst = findInstitution(saved?.institutionId);
    if (saved && savedInst) {
      setInst(savedInst);
      setType(savedInst.type);
      setRole(saved.role);
      setReturning(true);
      setStep("credentials");
    }
    setExpired(new URLSearchParams(window.location.search).get("reason") === "expired");
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  function go(next: Step) {
    setDir(order.indexOf(next) >= order.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  function back() {
    if (step === "institution") go("type");
    else if (step === "role") go("institution");
    else if (step === "credentials") go("role");
    else if (step === "forgot") go("credentials");
  }

  function switchAccount() {
    clearRemembered();
    setReturning(false);
    setInst(undefined);
    setRole(undefined);
    go("type");
  }

  const stepNo = numbered[step];
  const brand = inst?.brand.primary ?? "var(--primary)";

  return (
    <AuthShell institution={inst}>
      <div className="w-full max-w-[440px]">
        <motion.div
          layout
          data-brand
          style={{ ["--brand" as string]: brand }}
          className="overflow-hidden rounded-[26px] border border-line bg-card shadow-[0_24px_60px_-24px_rgb(10_34_89/0.35)] dark:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)]"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {inst ? (
                <InstitutionMark inst={inst} size={40} />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-blue text-white">
                  <Fingerprint className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-[14px] font-semibold leading-tight text-heading">{inst ? inst.name : "Diamond Attendance"}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{inst ? "Attendance portal" : "Sign in"}</p>
              </div>
            </div>
          </header>

          {/* Progress */}
          {stepNo && (
            <div className="border-b border-line bg-card-muted px-5 py-2.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                {stepNo > 1 && !(returning && step === "credentials") ? (
                  <button type="button" onClick={back} className="inline-flex items-center gap-1 text-muted transition-colors hover:text-heading">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                ) : (
                  <span className="text-faint">{returning ? "Saved on this device" : "Diamond Cloud"}</span>
                )}
                <span className="rounded-full border border-line bg-card px-2.5 py-0.5 text-body">Step {stepNo} of 4</span>
              </div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-subtle">
                <motion.div className="h-full rounded-full" style={{ background: "var(--brand-fg)" }} animate={{ width: `${(stepNo / 4) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          )}

          {/* Body */}
          <div className="relative px-5 pb-6 pt-6">
            <AnimatePresence>
              {offline && (
                <Banner key="offline" tone="sky" icon={CloudOff}>
                  <strong>You&apos;re offline.</strong> Check your internet connection, then try again.
                </Banner>
              )}
              {expired && (step === "type" || step === "credentials") && (
                <Banner key="expired" tone="amber" icon={Clock}>
                  You were signed out after 30 minutes of inactivity. Please sign in again.
                </Banner>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: 28 * d }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: -28 * d }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === "type" && (
                  <TypeStep
                    onPick={(t) => {
                      setType(t);
                      setInst(undefined);
                      go("institution");
                    }}
                  />
                )}
                {step === "institution" && (
                  <InstitutionStep
                    type={type}
                    onPick={(i) => {
                      setInst(i);
                      setRole(undefined);
                      go("role");
                    }}
                  />
                )}
                {step === "role" && inst && (
                  <RoleStep
                    inst={inst}
                    onChange={() => go("institution")}
                    onPick={(r) => {
                      setRole(r);
                      go("credentials");
                    }}
                  />
                )}
                {step === "credentials" && inst && role && (
                  <CredentialsStep
                    inst={inst}
                    role={role}
                    returning={returning}
                    offline={offline}
                    onChange={() => (returning ? switchAccount() : go("role"))}
                    onSwitch={switchAccount}
                    onForgot={() => go("forgot")}
                    onSuccess={(name, identifier, mustChange, remember) => {
                      setExpired(false);
                      setDisplayName(name);
                      saveSession({ kind: "institution", institutionId: inst.id, role, identifier, name });
                      if (remember) saveRemembered({ institutionId: inst.id, role });
                      else clearRemembered();
                      go(mustChange ? "set-password" : "done");
                    }}
                  />
                )}
                {step === "set-password" && <SetPasswordStep onDone={() => go("done")} />}
                {step === "forgot" && inst && role && <ForgotStep inst={inst} role={role} onBack={() => go("credentials")} />}
                {step === "done" && inst && role && <DoneStep inst={inst} role={role} name={displayName} onSignOut={() => (returning || loadRemembered() ? go("credentials") : switchAccount())} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-line bg-card-muted px-5 py-3 font-mono text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure sign-in
            </span>
            <span>Powered by DiamondAttendance</span>
          </footer>
        </motion.div>

        <PreviewNote />
      </div>
    </AuthShell>
  );
}

/* ─────────────────────────── Steps ─────────────────────────── */

function TypeStep({ onPick }: { onPick: (t: InstitutionType) => void }) {
  return (
    <>
      <StepTitle title="Sign in to attendance" body="Choose your school or workplace to continue." />
      <div role="radiogroup" aria-label="Institution type" className="space-y-3">
        <OptionCard icon={GraduationCap} iconClass="text-sky-500" title="School" body="For school administrators, staff and parents." onClick={() => onPick("school")} />
        <OptionCard icon={Building2} iconClass="text-indigo-500" title="Organisation" body="For workplaces and other organisations." onClick={() => onPick("organisation")} />
      </div>
      <div className="mt-6 border-t border-line pt-5 text-center text-[12px] text-muted">
        <p>Accounts are created by your school or organisation.</p>
        <p className="mt-0.5">
          Need access? <span className="font-semibold text-heading">Contact your administrator.</span>
        </p>
      </div>
    </>
  );
}

function InstitutionStep({ type, onPick }: { type: InstitutionType; onPick: (i: Institution) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => institutions.filter((i) => i.active && i.type === type && `${i.name} ${i.location}`.toLowerCase().includes(q.trim().toLowerCase())),
    [q, type],
  );
  const noun = type === "school" ? "school" : "organisation";

  return (
    <>
      <StepTitle title={`Choose your ${noun}`} body={`Only ${noun}s using Diamond Attendance are listed.`} />
      <div className="relative mb-3.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${noun}s…`} className={cn(inputClass, "pl-9")} aria-label={`Search ${noun}s`} />
      </div>
      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false}>
          {list.map((i, idx) => (
            <motion.div key={i.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.04 } }} exit={{ opacity: 0 }}>
              <OptionCard
                leading={<InstitutionMark inst={i} size={42} />}
                title={
                  <>
                    <span className="truncate">{i.name}</span>
                    {i.demo && <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted">Demo</span>}
                  </>
                }
                body={i.location}
                onClick={() => onPick(i)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
            <Search className="mx-auto h-5 w-5 text-faint" />
            <p className="mt-2 text-sm font-semibold text-heading">Not listed?</p>
            <p className="mt-1 text-[12.5px] text-muted">Your {noun} may not be on Diamond Attendance yet. Please check with your administrator.</p>
          </div>
        )}
      </div>
    </>
  );
}

function RoleStep({ inst, onPick, onChange }: { inst: Institution; onPick: (r: Role) => void; onChange: () => void }) {
  return (
    <>
      <StepTitle
        eyebrow={<ContextChip inst={inst} onChange={onChange} />}
        title={`What's your role at ${inst.name}?`}
        body="Choose how you'll use the attendance portal."
      />
      <div className="space-y-3">
        {rolesFor(inst.type).map((r, i) => {
          const cfg = roles[r];
          const Icon = r === "staff" && inst.type === "organisation" ? Briefcase : roleIcons[r];
          return (
            <motion.div key={r} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}>
              <OptionCard icon={Icon} iconClass={roleTint[r]} title={cfg.title} body={cfg.blurb} onClick={() => onPick(r)} />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function CredentialsStep({
  inst,
  role,
  returning,
  offline,
  onChange,
  onSwitch,
  onForgot,
  onSuccess,
}: {
  inst: Institution;
  role: Role;
  returning: boolean;
  offline: boolean;
  onChange: () => void;
  onSwitch: () => void;
  onForgot: () => void;
  onSuccess: (name: string, identifier: string, mustChange: boolean, remember: boolean) => void;
}) {
  const cfg = roles[role];
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Exclude<SignInResult, { ok: true }>>();
  const [now, setNow] = useState(() => Date.now());
  const [shake, setShake] = useState(0);

  const lockedFor = error?.error === "locked" ? Math.max(0, error.retryAt - now) : 0;
  useEffect(() => {
    if (!lockedFor) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedFor]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const res = await signIn({ institutionId: inst.id, role, identifier, password });
    setLoading(false);
    setNow(Date.now());
    if (res.ok) onSuccess(res.displayName, identifier.trim(), res.mustChangePassword, remember);
    else {
      setError(res);
      setPassword("");
      setShake((s) => s + 1);
    }
  }

  const mmss = `${Math.floor(lockedFor / 60000)}:${String(Math.floor((lockedFor % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <>
      {returning ? (
        <div className="mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Welcome back</p>
          <h1 className="mt-1 font-display text-[22px] font-bold tracking-tight text-heading">{cfg.title} sign-in</h1>
          <p className="mt-1 text-[13px] text-muted">
            {inst.name} · <button type="button" onClick={onSwitch} className="font-semibold text-[color:var(--brand-fg)] hover:underline">Not you? Switch</button>
          </p>
        </div>
      ) : (
        <StepTitle eyebrow={<ContextChip inst={inst} role={role} onChange={onChange} />} title="Sign in" body={role === "parent" ? "Use your child's student ID and the password the school gave you." : "Enter the details your administrator gave you."} />
      )}

      <AnimatePresence>
        {error?.error === "invalid" && (
          <Banner key="invalid" tone="rose" icon={ShieldX}>
            <strong>That ID or password isn&apos;t right.</strong> {error.attemptsLeft} attempt{error.attemptsLeft === 1 ? "" : "s"} left before sign-in is paused for 15 minutes.
          </Banner>
        )}
        {error?.error === "locked" && lockedFor > 0 && (
          <Banner key="locked" tone="amber" icon={Lock}>
            <strong>Too many attempts.</strong> Try again in <span className="font-mono">{mmss}</span> or contact {role === "admin" ? "Diamond Attendance support" : inst.name}.
          </Banner>
        )}
        {error?.error === "deactivated" && (
          <Banner key="deactivated" tone="slate" icon={UserX}>
            <strong>This account is no longer active.</strong> Please contact {inst.name}.
          </Banner>
        )}
        {error?.error === "institution_inactive" && (
          <Banner key="inactive" tone="slate" icon={Building2}>
            <strong>{inst.name} isn&apos;t using Diamond Attendance at the moment.</strong>
          </Banner>
        )}
      </AnimatePresence>

      <motion.form key={shake} onSubmit={submit} className="space-y-4" animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined} transition={{ duration: 0.4 }}>
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-[12px] font-semibold text-body">{cfg.idLabel}</label>
          <input
            id="identifier"
            autoFocus
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={cfg.idPlaceholder}
            className={inputClass}
            aria-describedby={cfg.idHelp ? "identifier-help" : undefined}
          />
          {cfg.idHelp && <p id="identifier-help" className="mt-1.5 text-[11.5px] text-muted">{cfg.idHelp}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-[12px] font-semibold text-body">Password</label>
            <button type="button" onClick={onForgot} className="text-[12px] font-medium text-[color:var(--brand-fg)] hover:underline">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              required
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-faint transition-colors hover:text-heading"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2.5 pt-0.5">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-line-strong" style={{ accentColor: "var(--brand-strong)" }} />
          <span className="text-[12.5px] text-body">Remember me on this device</span>
        </label>

        <PrimaryButton type="submit" loading={loading} disabled={loading || offline || lockedFor > 0}>
          {loading ? "Signing in…" : cfg.submit}
        </PrimaryButton>
      </motion.form>

      {role === "parent" && (
        <p className="mt-5 rounded-xl bg-card-muted px-3.5 py-3 text-center text-[12px] text-muted">
          Signing in for another child? Use that child&apos;s student ID. Each child has their own sign-in.
        </p>
      )}
    </>
  );
}

function SetPasswordStep({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const checks = [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), label: "Letters and numbers" },
    { ok: pw.length > 0 && pw === confirm, label: "Both passwords match" },
  ];
  const valid = checks.every((c) => c.ok);

  return (
    <>
      <StepTitle
        eyebrow={<span className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] text-body"><KeyRound className="h-3 w-3" /> First sign-in</span>}
        title="Set your password"
        body="You signed in with a temporary password. Choose your own to continue."
      />
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setLoading(true);
          await setNewPassword(pw);
          onDone();
        }}
      >
        <div>
          <label htmlFor="new-pw" className="mb-1.5 block text-[12px] font-semibold text-body">New password</label>
          <input id="new-pw" type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm-pw" className="mb-1.5 block text-[12px] font-semibold text-body">Confirm new password</label>
          <input id="confirm-pw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </div>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-2 text-[12px] transition-colors", c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted")}>
              <motion.span animate={{ scale: c.ok ? [1, 1.3, 1] : 1 }} className={cn("flex h-4 w-4 items-center justify-center rounded-full", c.ok ? "bg-emerald-500 text-white" : "bg-subtle")}>
                {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
              </motion.span>
              {c.label}
            </li>
          ))}
        </ul>
        <PrimaryButton type="submit" disabled={!valid || loading} loading={loading}>
          {loading ? "Saving…" : "Save and continue"}
        </PrimaryButton>
      </form>
    </>
  );
}

function ForgotStep({ inst, role, onBack }: { inst: Institution; role: Role; onBack: () => void }) {
  const contact = role === "admin" ? { name: platformSupport.name, phone: platformSupport.phone, email: platformSupport.email } : { name: inst.name, ...inst.contact };
  const message =
    role === "parent"
      ? `Your password is managed by ${inst.name}. Please contact the school to have it reset.`
      : role === "staff"
        ? "Please contact your administrator to reset your password."
        : "Please contact Diamond Attendance support to reset your password.";

  return (
    <>
      <StepTitle
        eyebrow={<span className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] text-body"><Info className="h-3 w-3" /> Password help</span>}
        title="Forgot your password?"
        body={message}
      />
      <div className="space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{contact.name}</p>
        <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3.5 transition-colors hover:border-[color:var(--brand-fg)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-subtle text-[color:var(--brand-fg)]"><Phone className="h-4 w-4" /></span>
          <span>
            <span className="block text-[11px] text-muted">Call</span>
            <span className="font-mono text-[13px] font-semibold text-heading">{contact.phone}</span>
          </span>
        </a>
        <a href={`mailto:${contact.email}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3.5 transition-colors hover:border-[color:var(--brand-fg)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-subtle text-[color:var(--brand-fg)]"><Mail className="h-4 w-4" /></span>
          <span>
            <span className="block text-[11px] text-muted">Email</span>
            <span className="font-mono text-[13px] font-semibold text-heading">{contact.email}</span>
          </span>
        </a>
      </div>
      <button type="button" onClick={onBack} className="mt-5 w-full rounded-xl border border-line py-2.5 text-[13px] font-semibold text-body transition-colors hover:bg-card-muted">
        Back to sign in
      </button>
    </>
  );
}

function DoneStep({ inst, role, name }: { inst: Institution; role: Role; name: string; onSignOut?: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push(homeFor(role)), 1100);
    return () => clearTimeout(t);
  }, [role, router]);
  return (
    <div className="py-4 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"
        style={{ background: "var(--brand-strong)" }}
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ border: "2px solid var(--brand-strong)" }} />
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.div>
      <h1 className="mt-5 font-display text-[22px] font-bold text-heading">You&apos;re signed in</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        {name} · {roles[role].title} · {inst.name}
      </p>
      <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-subtle">
        <motion.div className="h-full rounded-full" style={{ background: "var(--brand-fg)" }} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.05, ease: "easeInOut" }} />
      </div>
      <p className="mt-2 text-[12px] text-muted">Opening your dashboard…</p>
    </div>
  );
}

/* ─────────────────────────── Bits ─────────────────────────── */

function ContextChip({ inst, role, onChange }: { inst: Institution; role?: Role; onChange: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-md border border-line bg-card-muted px-2 py-0.5 font-mono text-[11px] text-body">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand-fg)" }} />
        <span className="truncate">{inst.name}{role ? ` · ${roles[role].title}` : ""}</span>
      </span>
      <button type="button" onClick={onChange} className="shrink-0 text-[11.5px] font-semibold text-[color:var(--brand-fg)] hover:underline">
        Change
      </button>
    </div>
  );
}

function PreviewNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 text-center">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted hover:text-heading">
        <Info className="h-3.5 w-3.5" /> Preview mode, no live accounts yet
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-2 rounded-xl border border-dashed border-line px-4 py-3 text-left text-[11.5px] leading-relaxed text-muted">
              Password <code className="font-mono text-heading">demo1234</code> signs in with any ID. Staff/admin IDs starting with{" "}
              <code className="font-mono text-heading">NEW</code> show first-time password setup. ID <code className="font-mono text-heading">INACTIVE</code> shows a deactivated
              account. Five wrong passwords pause sign-in for 15 minutes. Add <code className="font-mono text-heading">?reason=expired</code> to the URL to see the session-expired notice. After sign-in you land on your dashboard; as a parent of the demo schools, try a student ID like{" "}
              <code className="font-mono text-heading">DS-2024-0001</code>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
