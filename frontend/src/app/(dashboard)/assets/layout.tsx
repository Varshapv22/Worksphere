import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function AssetsLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="asset-management">{children}</ModuleGate>;
}
