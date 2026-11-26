import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  dark = false,
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
  dark?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      <span className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", dark ? "text-cyan-300" : "text-accent")}>
        {eyebrow}
      </span>
      <h2
        className={cn(
          "mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl",
          dark ? "text-white" : "text-heading",
        )}
      >
        {title}
      </h2>
      {body && <p className={cn("mt-3 text-sm sm:text-base", dark ? "text-slate-300" : "text-body")}>{body}</p>}
    </Reveal>
  );
}
