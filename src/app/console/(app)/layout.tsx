import { ConsoleLayout } from "@/features/console/ConsoleContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleLayout>{children}</ConsoleLayout>;
}
