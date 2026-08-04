"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Switch } from "@/components/Switch";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App marketplace"
        description="Install only the modules your company needs"
      />
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
              <h2 className="text-sm font-semibold text-gray-500">{category}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const Icon = moduleIcon(m.icon);
                  return (
                    <Card key={m.id}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        {!m.is_available && (
                          <Badge variant="warning" dot>
                            Coming soon
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-gray-900">{m.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <Switch
                          checked={Boolean(m.is_enabled)}
                          onChange={(checked) => handleToggle(m, checked)}
                          disabled={!m.is_available || togglingId === m.id}
                          label={m.is_enabled ? "Enabled" : "Disabled"}
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
