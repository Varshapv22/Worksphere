"use client";

import Link from "next/link";
import { Blocks, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useModules } from "@/lib/modulesContext";
import { Skeleton } from "@/components/Skeleton";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface ModuleGateProps {
  slug: string;
  children: ReactNode;
}

/**
 * Renders children only when the given module slug is enabled for the current
 * company. While modules are loading it shows a skeleton; if the module is not
 * enabled it shows a "go to marketplace" prompt instead of the page content.
 *
 * ModulesContext must be provided by DashboardShell (a parent in the tree).
 */
export function ModuleGate({ slug, children }: ModuleGateProps) {
  const { enabledSlugs } = useModules();

  // Still waiting for the module list to load.
  if (enabledSlugs === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Card>
          <div className="flex flex-col gap-3 py-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      </div>
    );
  }

  // Module is not enabled for this company.
  if (!enabledSlugs.has(slug)) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Lock className="size-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        </span>
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Module not enabled
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This feature hasn&apos;t been activated for your company yet. Head to the
            App Marketplace to enable it.
          </p>
        </div>
        <Link href="/modules">
          <Button>
            <Blocks className="size-4" aria-hidden="true" />
            Go to App Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
