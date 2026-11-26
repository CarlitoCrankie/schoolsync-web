/**
 * All marketing copy and contact details live here so they can be edited
 * without touching components.
 *
 * TODO before launch: the testimonials and the compliance/uptime claims below
 * (SOC2, GES compliant, 99.98% uptime, "< 1 second") came from the design
 * mock-up. Replace them with real, verifiable ones or remove them.
 */

export const contact = {
  phoneMain: "+233 30 200 4820",
  phoneMainHref: "tel:+233302004820",
  phoneMobile: "024 195 2695",
  phoneMobileHref: "tel:+233241952695",
  whatsapp: "+233 (0) 55 918 2000",
  whatsappHref: "https://wa.me/233559182000",
  emails: ["ops@diamondattendance.com", "nabilaraw90@gmail.com"],
  hours: "Mon – Fri, 08:00 – 18:00 GMT",
  city: "Accra, Ghana",
};

export const nav = [
  { label: "Home", href: "#top" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Solutions & Hardware", href: "#architectures" },
  { label: "Contact", href: "#contact" },
];

export const highlights = [
  {
    icon: "badge-check",
    title: "Zero upfront barrier",
    body: "Free on-site assessment and terminal hardware trial for qualified schools.",
    tone: "blue",
  },
  {
    icon: "zap",
    title: "Instant parent alerts",
    body: "SMS alerts to parents and guardians the moment a student checks in.",
    tone: "cyan",
  },
  {
    icon: "wifi",
    title: "Works offline",
    body: "Gates keep logging during outages and sync automatically when back online.",
    tone: "emerald",
  },
  {
    icon: "shield-check",
    title: "Audit-ready records",
    body: "Clean roll-call exports and a full history of every check-in and check-out.",
    tone: "indigo",
  },
] as const;

export const steps = [
  {
    n: "01",
    icon: "scan-face",
    tag: "Entrance check-in",
    title: "Fast biometric scan",
    body: "Students and staff tap a finger or look at the face terminal at the gate. No cards to lose, no proxy sign-ins.",
    foot: "Recognition in about a second",
    color: "bg-brand-accent",
    tagClass: "bg-blue-100/80 text-brand-blue",
  },
  {
    n: "02",
    icon: "cpu",
    tag: "On-site sync agent",
    title: "Recorded on site, synced to the cloud",
    body: "The school's on-site system stores every scan locally first, then syncs to the Diamond cloud. No internet? Nothing is lost.",
    foot: "Offline buffering and auto-sync",
    color: "bg-teal-600",
    tagClass: "bg-teal-100/80 text-teal-800",
  },
  {
    n: "03",
    icon: "message-square",
    tag: "Notifications & dashboards",
    title: "Parents and managers know instantly",
    body: "Parents get an SMS when their child arrives. Admins, staff and parents each see attendance on their own branded dashboard.",
    foot: "SMS alerts + live dashboards",
    color: "bg-emerald-600",
    tagClass: "bg-emerald-100/80 text-emerald-800",
  },
] as const;

export const tiers = [
  {
    badge: "Entry tier",
    title: "Corporate offices & small academies",
    subtitle: "Single / dual access point",
    body: "For branch offices, private schools and smaller facilities that need fast, reliable check-in without turnstiles.",
    hardware: [
      ["1–2 face + fingerprint terminals", "wall-mounted at the entrance"],
      ["On-site PC with sync agent", "keeps working offline"],
      ["Backup power (UPS)", "for terminal, PC and router"],
      ["SMS alerts", "with your own sender name"],
    ],
    capacity: "50 – 500",
    featured: false,
  },
  {
    badge: "Most deployed",
    title: "Multi-gate facilities & large campuses",
    subtitle: "Several gates, peak-hour throughput",
    body: "For senior high schools, factories and office towers where hundreds arrive within the same morning window.",
    hardware: [
      ["Multiple face + fingerprint terminals", "one per gate or lane"],
      ["Turnstile / flap-gate integration", "optional, per gate"],
      ["Central sync agent", "with per-device health monitoring"],
      ["Staff & student dashboards", "branded with your logo"],
    ],
    capacity: "500 – 2,500",
    featured: true,
  },
  {
    badge: "Multi-site",
    title: "Multi-campus, healthcare & boarding",
    subtitle: "Several sites, one dashboard",
    body: "For institutions with several branches or buildings that need one view of attendance across every site.",
    hardware: [
      ["Terminals at every site and gate", "grouped by branch"],
      ["One sync agent per site", "each monitored centrally"],
      ["Branch and department reporting", "across all locations"],
      ["Custom integrations", "on request"],
    ],
    capacity: "2,000 – 10,000+",
    featured: false,
  },
] as const;

/** PLACEHOLDER — replace with real, consented testimonials before launch. */
export const testimonials = [
  {
    quote:
      "Managing our shift workers used to mean long queues and buddy-punching. Check-ins now take seconds, and management gets a verified attendance export every day.",
    name: "Client name",
    role: "Operations Director, Logistics company",
    initials: "OD",
    tone: "bg-blue-100 text-brand-blue dark:bg-blue-500/20 dark:text-blue-300",
  },
  {
    quote:
      "We needed something that fits an annual school budget. Diamond gave us a clear installation proposal, trained our gate staff, and it has run reliably since.",
    name: "Client name",
    role: "Bursar, Private school",
    initials: "BS",
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    quote:
      "Parents now get a text the moment their child arrives. The calls to the front office asking 'did my child get to school?' have almost stopped.",
    name: "Client name",
    role: "Headteacher, Basic school",
    initials: "HT",
    tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
] as const;

export const liveFeed = [
  { initials: "KM", name: "Kwesi Mensah", meta: "Grade 11 · Main Gate", time: "07:42", status: "On time" },
  { initials: "AS", name: "Abigail Serwaa", meta: "Grade 12 · North Gate", time: "07:44", status: "On time" },
  { initials: "KB", name: "Mr. Kofi Boateng", meta: "Staff · Staff Gate", time: "07:45", status: "Staff" },
  { initials: "EA", name: "Evelyn Appiah", meta: "Grade 10 · Main Gate", time: "07:47", status: "On time" },
  { initials: "DB", name: "David Boateng", meta: "Grade 12 · South Gate", time: "08:14", status: "Late" },
  { initials: "NA", name: "Nana Ama Darko", meta: "Grade 9 · Main Gate", time: "07:49", status: "On time" },
] as const;
