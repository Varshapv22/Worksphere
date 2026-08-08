import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="developer-api">{children}</ModuleGate>;
}
