import { AuthProvider } from "@/lib/auth";
import type { ReactNode } from "react";

// Auth pages (login / register-company) need the same AuthProvider context
// so they can call login()/registerCompany() — the dashboard layout wraps
// its own subtree separately.
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
