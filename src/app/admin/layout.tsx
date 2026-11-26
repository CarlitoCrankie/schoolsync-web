import type { Metadata } from "next";
import { AdminLayout } from "@/features/admin/AdminContext";

export const metadata: Metadata = { title: "Admin — Diamond Attendance" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
