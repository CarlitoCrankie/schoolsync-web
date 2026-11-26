import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { contact, nav } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-card pb-8 pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-line/80 pb-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted">
              Biometric attendance for schools, workplaces and campuses: on-site terminals that work offline, instant SMS
              alerts to parents, and live dashboards branded for every institution.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-heading">Navigation</h4>
            <ul className="space-y-2.5 text-xs text-muted">
              {nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="transition-colors hover:text-heading">{n.label}</a>
                </li>
              ))}
              <li>
                <Link href="/login" className="transition-colors hover:text-heading">Sign in</Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-heading">Support</h4>
            <ul className="space-y-2.5 font-mono text-xs text-body">
              <li><a href={contact.phoneMainHref} className="hover:text-heading">{contact.phoneMain}</a></li>
              <li><a href={contact.whatsappHref} className="hover:text-heading">{contact.whatsapp}</a></li>
              <li><a href={contact.phoneMobileHref} className="hover:text-heading">{contact.phoneMobile}</a></li>
              <li><a href={`mailto:${contact.emails[0]}`} className="hover:text-heading">{contact.emails[0]}</a></li>
            </ul>
            <p className="mt-3 text-[11px] text-faint">{contact.hours}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-[11px] text-faint sm:flex-row">
          <p>© {new Date().getFullYear()} Diamond Attendance. All rights reserved. {contact.city}.</p>
          <div className="flex items-center gap-5">
            <a href="#top" className="hover:text-body">Privacy Policy</a>
            <a href="#top" className="hover:text-body">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
