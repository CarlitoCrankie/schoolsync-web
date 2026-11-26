"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Slow-moving blurred colour fields with an engineering grid on top.
 * Purely decorative: sits behind content with pointer-events disabled.
 */
export function Aurora({ className }: { className?: string }) {
  const blobs = [
    { className: "left-[-10%] top-[-20%] h-[520px] w-[520px] bg-blue-300/40 dark:bg-blue-600/25", x: [0, 60, -20, 0], y: [0, 40, 80, 0], d: 22 },
    { className: "right-[-8%] top-[5%] h-[460px] w-[460px] bg-cyan-300/35 dark:bg-cyan-500/15", x: [0, -70, 10, 0], y: [0, 60, -30, 0], d: 26 },
    { className: "left-[30%] bottom-[-30%] h-[480px] w-[480px] bg-indigo-300/30 dark:bg-indigo-600/20", x: [0, 50, -60, 0], y: [0, -40, 20, 0], d: 30 },
  ];

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={cn("absolute rounded-full blur-3xl", b.className)}
          animate={{ x: b.x, y: b.y }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="bg-grid mask-radial absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface" />
    </div>
  );
}
