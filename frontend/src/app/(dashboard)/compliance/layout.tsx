import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function ComplianceLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="compliance">{children}</ModuleGate>;
}
