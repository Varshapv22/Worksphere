import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function BrandingLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="white-label">{children}</ModuleGate>;
}
