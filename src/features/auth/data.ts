/**
 * Sign-in reference data.
 *
 * PREVIEW: institutions and the demo rules in api.ts stand in for the backend
 * until `/api/auth` and `/api/institutions` exist. Only institutions enlisted
 * on DiamondAttendance are ever listed.
 */

export type InstitutionType = "school" | "organisation";
export type Role = "parent" | "staff" | "admin";

export type Institution = {
  id: string;
  name: string;
  location: string;
  type: InstitutionType;
  initials: string;
  logo?: string;
  brand: { primary: string; secondary: string };
  contact: { phone: string; email: string };
  active: boolean;
  demo?: boolean;
};

export const institutions: Institution[] = [
  {
    id: "peculiar",
    name: "Peculiar International School",
    location: "Accra",
    type: "school",
    initials: "PI",
    logo: "/institutions/peculiar.jpg",
    brand: { primary: "#1b2a6b", secondary: "#c9a227" },
    contact: { phone: "+233 30 200 4820", email: "office@peculiar.example" },
    active: true,
  },
  {
    id: "demo-school",
    name: "Demo School",
    location: "Kumasi",
    type: "school",
    initials: "DS",
    brand: { primary: "#0f6e5c", secondary: "#f59e0b" },
    contact: { phone: "+233 30 200 4820", email: "office@demo-school.example" },
    active: true,
    demo: true,
  },
  {
    id: "demo-workplace",
    name: "Demo Workplace Ltd",
    location: "Tema",
    type: "organisation",
    initials: "DW",
    brand: { primary: "#7c2d12", secondary: "#fb923c" },
    contact: { phone: "+233 30 200 4820", email: "hr@demo-workplace.example" },
    active: true,
    demo: true,
  },
];

export const platformSupport = {
  name: "DiamondAttendance support",
  phone: "+233 30 200 4820",
  email: "ops@diamondattendance.com",
};

export type RoleConfig = {
  key: Role;
  title: string;
  blurb: string;
  idLabel: string;
  idPlaceholder: string;
  idHelp?: string;
  submit: string;
};

export const roles: Record<Role, RoleConfig> = {
  parent: {
    key: "parent",
    title: "Parent / Guardian",
    blurb: "See your child's attendance and arrival times.",
    idLabel: "Student ID",
    idPlaceholder: "e.g. PIS-2024-0891",
    idHelp: "Your child's student ID, from the school.",
    submit: "Sign in to parent portal",
  },
  staff: {
    key: "staff",
    title: "Staff",
    blurb: "See your own attendance and hours.",
    idLabel: "Staff ID or email",
    idPlaceholder: "e.g. STF-042 or name@school.edu.gh",
    submit: "Sign in as staff",
  },
  admin: {
    key: "admin",
    title: "Administrator",
    blurb: "Manage people, attendance and settings.",
    idLabel: "Username or email",
    idPlaceholder: "e.g. admin or name@school.edu.gh",
    submit: "Sign in as administrator",
  },
};

/** Parents only exist for schools. */
export function rolesFor(type: InstitutionType): Role[] {
  return type === "school" ? ["parent", "staff", "admin"] : ["staff", "admin"];
}

export function findInstitution(id?: string | null) {
  return institutions.find((i) => i.id === id);
}
