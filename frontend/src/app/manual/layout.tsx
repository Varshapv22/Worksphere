import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "User Manual — WorkSphere",
  description: "The complete WorkSphere guide: employee, company admin, and super admin.",
};

export default function ManualLayout({ children }: { children: ReactNode }) {
  return children;
}
