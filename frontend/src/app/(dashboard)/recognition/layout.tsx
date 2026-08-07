import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function RecognitionLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="recognition">{children}</ModuleGate>;
}
