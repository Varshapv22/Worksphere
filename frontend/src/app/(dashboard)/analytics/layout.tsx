import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="analytics">{children}</ModuleGate>;
}
