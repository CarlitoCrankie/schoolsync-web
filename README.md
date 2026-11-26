# Diamond Attendance — Web (Next.js)

Marketing site + (next) sign-in and role dashboards for the Diamond Attendance platform.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · Motion (animations) · lucide-react icons · self-hosted fonts (Inter, Hanken Grotesk, JetBrains Mono).

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure

```
src/
  app/
    page.tsx            Marketing home
    login/              Sign-in flow (school/organisation → institution → role → credentials)
    admin/              Institution admin: overview, people, attendance, import, scanners, settings
    parent/             Parent portal (one child per login): today, history, contact
    staff/              Staff portal (read-only attendance): today, my record, profile
    console/            DiamondAttendance owner console, served only on the console subdomain
    api/leads/          Site-survey form endpoint (TODO: forward to backend)
    globals.css         Theme tokens (brand colours, fonts, animations)
  components/
    backgrounds/        Animated aurora + grid backdrops
    marketing/          Header, Hero, LiveScanCard, HowItWorks, Deployments, Contact, Testimonials, Footer
    motion/             Reveal-on-scroll + reduced-motion provider
    brand/              Logo
    theme/              Light/dark theme toggle + no-flash script
  components/app/       Dashboard kit: AppShell, PortalShell, UI primitives, charts
  features/auth/        Sign-in flow, institutions/roles data, PREVIEW auth api (api.ts)
  features/session/     Session + 30-minute inactivity sign-out (PREVIEW: localStorage)
  features/demo/        PREVIEW seeded demo people/attendance/scanners, replace with API calls
  features/admin|portal|console/  Layout + context for each area
  middleware.ts         Console subdomain routing
  content/site.ts       All marketing copy & contact details (edit here)
```

## Sign-in preview

Until the backend exists, `src/features/auth/api.ts` fakes sign-in: password `demo1234` works with any ID; staff/admin IDs starting with `NEW` show first-time password setup; `INACTIVE` shows a deactivated account; 5 wrong passwords lock for 15 minutes; `/login?reason=expired` shows the session-expired notice.

## Dashboards preview

Sign in at `/login` with password `demo1234`. Admin lands on `/admin`, staff on `/staff`, parents on `/parent`.
As a parent, the student ID picks the child (e.g. `DS-2024-0001` for Demo School, `PI-2024-0007` for Peculiar).
All figures come from `src/features/demo/data.ts` and edits are kept in memory only.

## Owner console (subdomain)

The console is only reachable on a host starting with `console.`; on the main domain `/console` returns 404.

- Local: open http://console.localhost:3000 (sign in with any `@diamondattendance.com` email + `demo1234`).
- Production: add `console.diamondattendance.com` as a domain on the same Vercel project. No other setup is needed.
- Before launch the console needs its own backend auth (and 2FA); today it uses the preview session.

## Before launch
- Replace placeholder testimonials in `src/content/site.ts` with real, consented quotes.
- Wire `/api/leads` to the backend or an email inbox.
