import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Placeholder — the full sign-in flow (context → institution → role → credentials) is the next build step. */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f8fafc] px-4 text-center">
      <Logo />
      <h1 className="font-display text-2xl font-bold text-brand-navy">Sign in is coming next</h1>
      <p className="max-w-sm text-sm text-slate-600">The school / organisation sign-in flow will live here.</p>
      <Link href="/" className="text-sm font-semibold text-brand-blue hover:text-brand-navy">← Back to home</Link>
    </main>
  );
}
