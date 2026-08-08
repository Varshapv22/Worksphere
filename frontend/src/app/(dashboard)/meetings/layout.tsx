import { ModuleGate } from "@/components/ModuleGate";
import type { ReactNode } from "react";

export default function MeetingsLayout({ children }: { children: ReactNode }) {
  return <ModuleGate slug="meetings">{children}</ModuleGate>;
}
