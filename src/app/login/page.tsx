import type { Metadata } from "next";
import { SignInFlow } from "@/features/auth/SignInFlow";

export const metadata: Metadata = { title: "Sign in — Diamond Attendance" };

export default function LoginPage() {
  return <SignInFlow />;
}
