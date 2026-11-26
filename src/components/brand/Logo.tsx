import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-sm">
        <Fingerprint className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span className={cn("block font-display text-[15px] font-bold tracking-tight", dark ? "text-white" : "text-heading")}>
          Diamond Attendance
        </span>
        <span className={cn("hidden text-[9px] font-semibold sm:block uppercase tracking-[0.18em]", dark ? "text-faint" : "text-faint")}>
          Biometric Infrastructure
        </span>
      </span>
    </span>
  );
}
