import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { themeScript } from "@/components/theme/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diamond Attendance — Biometric attendance for schools & workplaces",
  description:
    "On-site biometric attendance, secure gate access and instant SMS notifications for schools, workplaces and campuses in Ghana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
