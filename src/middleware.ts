import { NextResponse, type NextRequest } from "next/server";

/**
 * The DiamondAttendance owner console lives on its own subdomain
 * (console.diamondattendance.com, or console.localhost:3000 in development).
 *
 *  - On the console host every path is served from `src/app/console/*`
 *    (so `/institutions` → `/console/institutions`), and nothing else on the
 *    site is reachable from it.
 *  - On any other host `/console/*` is hidden and returns a 404, so schools,
 *    parents and staff never see it.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  if (host.startsWith("console.")) {
    if (pathname === "/console" || pathname.startsWith("/console/")) return NextResponse.next();
    url.pathname = `/console${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/console" || pathname.startsWith("/console/")) {
    url.pathname = "/__not-found";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and files with an extension (icons, images).
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
};
