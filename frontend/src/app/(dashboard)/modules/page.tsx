"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { ModulesContext } from "@/lib/modulesContext";
import { useContext } from "react";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Switch } from "@/components/Switch";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";

function groupByCategory(modules: Module[]): Array<[string, Module[]]> {
  const groups = new Map<string, Module[]>();
  for (const m of modules) {
    const key = m.category || "Other";
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return Array.from(groups.entries());
}

export default function ModulesMarketplacePage() {
  const toast = useToast();
  const { enabledSlugs } = useContext(ModulesContext);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Module[] }>("/modules");
      setModules(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the app marketplace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(module: Module, next: boolean) {
    setTogglingId(module.id);
    // Optimistic update so the switch feels immediate.
    setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, is_enabled: next } : m)));
    try {
      await apiFetch(`/modules/${module.id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: next }),
      });
      toast.success(next ? `${module.name} enabled.` : `${module.name} disabled.`);
    } catch (err) {
      setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, is_enabled: !next } : m)));
      toast.error(err instanceof ApiError ? err.message : `Failed to update ${module.name}.`);
    } finally {
      setTogglingId(null);
    }
  }

  const enabledCount  = modules.filter((m) => m.is_enabled).length;
  const availableCount = modules.filter((m) => m.is_available).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App Marketplace"
        description="Install only the modules your company needs"
      />

      {/* Stats bar */}
      {!loading && modules.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
            <CheckCircle2 className="size-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{enabledCount}</span>
            {" of "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{availableCount}</span>
            {" available modules enabled"}
          </p>
        </div>
      )}

      {error && (
        <Card>
          <p className="text-sm text-danger-600">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-3 size-9 rounded-lg" />
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <EmptyState message="No modules are available yet." />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groupByCategory(modules).map(([category, items]) => (
            <div key={category} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{category}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const Icon = moduleIcon(m.icon);
                  const isEnabled = Boolean(m.is_enabled);
                  return (
                    <Card
                      key={m.id}
                      className={cn(
                        "transition-shadow",
                        isEnabled && "border-brand-300 ring-1 ring-brand-200 dark:border-brand-700 dark:ring-brand-800/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          isEnabled
                            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                            : "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-500"
                        )}>
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <div className="flex gap-1.5">
                          {isEnabled && (
                            <Badge variant="success" dot>Active</Badge>
                          )}
                          {!isEnabled && !m.is_available && (
                            <Badge variant="warning" dot>Coming soon</Badge>
                          )}
                        </div>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{m.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{m.description}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                        <Switch
                          checked={isEnabled}
                          onChange={(checked) => handleToggle(m, checked)}
                          disabled={!m.is_available || togglingId === m.id}
                          label={isEnabled ? "Enabled" : "Disabled"}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
