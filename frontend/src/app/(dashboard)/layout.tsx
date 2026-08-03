import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
