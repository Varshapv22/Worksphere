import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function AiAssistantLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="ai-assistant">{children}</ModuleGate>;
}
