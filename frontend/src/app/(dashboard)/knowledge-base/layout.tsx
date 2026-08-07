import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function KnowledgeBaseLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="knowledge-base">{children}</ModuleGate>;
}
