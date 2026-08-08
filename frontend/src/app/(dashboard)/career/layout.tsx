import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function CareerLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="career-roadmap">{children}</ModuleGate>;
}
