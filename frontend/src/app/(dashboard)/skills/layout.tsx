import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function SkillsLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="skills-matrix">{children}</ModuleGate>;
}
