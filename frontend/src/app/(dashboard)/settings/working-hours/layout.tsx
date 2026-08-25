import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function WorkingHoursLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="attendance">{children}</ModuleGate>;
}
