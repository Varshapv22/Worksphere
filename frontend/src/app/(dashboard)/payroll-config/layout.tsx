import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function PayrollConfigLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="payroll">{children}</ModuleGate>;
}
