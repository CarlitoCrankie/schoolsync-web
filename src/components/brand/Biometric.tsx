import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fingerprint ridges (lucide "fingerprint" geometry), each drawn with a staggered stroke animation. */
const RIDGES = [
  "M2 12a10 10 0 0 1 18-6",
  "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",
  "M9 6.8a6 6 0 0 1 9 5.2v2",
  "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",
  "M14 13.12c0 2.38 0 6.38-1 8.88",
  "M17.29 21.02c.12-.6.43-2.3.5-3.02",
  "M21.8 16c.2-2 .131-5.354 0-6",
  "M8.65 22c.21-.66.45-1.32.57-2",
  "M2 16h.01",
];

/**
 * Animated biometric scanner: fingerprint ridges draw in while a beam sweeps
 * across, framed by scanner corners. Pure CSS (see globals.css `.bio-*`), so
 * it animates before React hydrates. Colour comes from `currentColor`.
 */
export function FingerprintScanner({ size = 96, rings = true, check = false, className }: { size?: number; rings?: boolean; check?: boolean; className?: string }) {
  const corner = "bio-corner";
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {rings && (
        <>
          <span className="bio-ring" />
          <span className="bio-ring" style={{ animationDelay: "1s" }} />
        </>
      )}
      <div className="bio-frame h-full w-full border border-current/25 bg-current/5">
        <span className={cn(corner, "left-[8%] top-[8%] rounded-tl-lg border-l-2 border-t-2")} />
        <span className={cn(corner, "right-[8%] top-[8%] rounded-tr-lg border-r-2 border-t-2")} />
        <span className={cn(corner, "bottom-[8%] left-[8%] rounded-bl-lg border-b-2 border-l-2")} />
        <span className={cn(corner, "bottom-[8%] right-[8%] rounded-br-lg border-b-2 border-r-2")} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: "56%", height: "56%" }} aria-hidden>
          <g opacity={0.18}>
            {RIDGES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {RIDGES.map((d, i) => (
            <path key={d} d={d} pathLength={1} className="bio-ridge" style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
        </svg>
        <span className="bio-beam" />
      </div>
      {check && (
        <span className="bio-check absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-[#071634]" style={{ width: size * 0.32, height: size * 0.32 }}>
          <Check style={{ width: "60%", height: "60%" }} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

/** Loading state: scanner + message. `fullScreen` centres it in the viewport. */
export function BiometricLoader({ label = "Loading", sub, fullScreen = true, tone = "text-brand-blue dark:text-sky-400", className }: { label?: string; sub?: string; fullScreen?: boolean; tone?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-10 text-center", fullScreen ? "min-h-screen bg-surface px-6" : "py-16", className)}>
      <FingerprintScanner size={84} className={tone} />
      <div>
        <p className="flex items-center justify-center gap-0.5 font-display text-[15px] font-semibold text-heading">
          {label}
          <span className="bio-dot">.</span>
          <span className="bio-dot" style={{ animationDelay: "0.15s" }}>
            .
          </span>
          <span className="bio-dot" style={{ animationDelay: "0.3s" }}>
            .
          </span>
        </p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}

/**
 * Runs before first paint. First full load of the session gets the branded
 * splash; later full loads only show it if loading drags past 0.5s. Either
 * way it stays until the window "load" event (page, fonts, scripts), with a
 * short minimum on the first visit so the scan reads, and a 15s safety net.
 */
const splashScript = `(function(){var d=document.documentElement,seen=false;try{seen=!!sessionStorage.getItem('da:splash');sessionStorage.setItem('da:splash','1');}catch(e){}d.setAttribute('data-splash',seen?'quick':'full');var t0=Date.now(),min=seen?0:1100;function done(){setTimeout(function(){d.setAttribute('data-splash-state','done');},Math.max(0,min-(Date.now()-t0)));}if(document.readyState==='complete'){done();}else{window.addEventListener('load',done);}setTimeout(function(){d.setAttribute('data-splash-state','done');},15000);})();`;

/**
 * Site-wide loading splash: the fingerprint scans until the page is ready,
 * then verifies and fades into the site. Server-rendered and CSS-driven so it
 * covers the page from the very first paint, even on a slow connection.
 */
export function AppSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      <noscript>
        <style>{"#da-splash{display:none}"}</style>
      </noscript>
      <div id="da-splash" role="status" aria-label="Loading Diamond Attendance" className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#071634] text-sky-300">
        <div className="bg-grid-dark absolute inset-0 opacity-50" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/40 blur-3xl" />
        <FingerprintScanner size={128} check className="relative" />
        <div className="bio-word relative mt-10 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-white">Diamond Attendance</p>
          <p className="mt-1 text-xs text-sky-200/70">Biometric attendance for schools &amp; workplaces</p>
          <div className="mt-3 grid font-mono text-[11px] uppercase tracking-[0.22em]">
            <span className="bio-status-scan col-start-1 row-start-1 flex justify-center text-sky-300/80">
              Loading<span className="bio-dot">.</span>
              <span className="bio-dot" style={{ animationDelay: "0.15s" }}>.</span>
              <span className="bio-dot" style={{ animationDelay: "0.3s" }}>.</span>
            </span>
            <span className="bio-status-ok col-start-1 row-start-1 text-emerald-300">Ready</span>
          </div>
        </div>
      </div>
    </>
  );
}
