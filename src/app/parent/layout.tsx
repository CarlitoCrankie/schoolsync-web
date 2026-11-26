import type { Metadata } from "next";
import { PortalLayout } from "@/features/portal/PortalContext";

export const metadata: Metadata = { title: "Parent portal — Diamond Attendance" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalLayout role="parent">{children}</PortalLayout>;
}
