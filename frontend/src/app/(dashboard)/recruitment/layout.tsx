import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function RecruitmentLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="recruitment">{children}</ModuleGate>;
}
