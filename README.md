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
    api/leads/          Site-survey form endpoint (TODO: forward to backend)
    globals.css         Theme tokens (brand colours, fonts, animations)
  components/
    backgrounds/        Animated aurora + grid backdrops
    marketing/          Header, Hero, LiveScanCard, HowItWorks, Deployments, Contact, Testimonials, Footer
    motion/             Reveal-on-scroll + reduced-motion provider
    brand/              Logo
    theme/              Light/dark theme toggle + no-flash script
  features/auth/        Sign-in flow, institutions/roles data, PREVIEW auth api (api.ts)
  content/site.ts       All marketing copy & contact details (edit here)
```

## Sign-in preview

Until the backend exists, `src/features/auth/api.ts` fakes sign-in: password `demo1234` works with any ID; staff/admin IDs starting with `NEW` show first-time password setup; `INACTIVE` shows a deactivated account; 5 wrong passwords lock for 15 minutes; `/login?reason=expired` shows the session-expired notice.

## Before launch
- Replace placeholder testimonials in `src/content/site.ts` with real, consented quotes.
- Wire `/api/leads` to the backend or an email inbox.
