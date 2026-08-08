import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function PayrollSimulatorLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="payroll">{children}</ModuleGate>;
}
