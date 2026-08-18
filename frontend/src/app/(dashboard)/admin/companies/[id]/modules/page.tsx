"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { AdminCompany, Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Switch } from "@/components/Switch";
import { Table, type Column } from "@/components/Table";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";

export default function AdminCompanyModulesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const companyId = params.id;

  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, modulesRes] = await Promise.all([
        apiFetch<{ data: AdminCompany }>(`/admin/companies/${companyId}`),
        apiFetch<{ data: Module[] }>(`/admin/companies/${companyId}/modules`),
      ]);
      setCompany(companyRes.data);
      setModules(modulesRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load module access.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleGrant(module: Module, next: boolean) {
    setTogglingId(module.id);
    setModules((prev) =>
      prev.map((m) => (m.id === module.id ? { ...m, is_granted: next, is_enabled: next ? m.is_enabled : false } : m))
    );
    try {
      await apiFetch(`/admin/companies/${companyId}/modules/${module.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_granted: next }),
      });
      toast.success(next ? `${module.name} granted to ${company?.name}.` : `${module.name} revoked from ${company?.name}.`);
    } catch (err) {
      setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, is_granted: !next } : m)));
      toast.error(err instanceof ApiError ? err.message : `Failed to update ${module.name}.`);
    } finally {
      setTogglingId(null);
    }
  }

  const columns: Column<Module>[] = [
    {
      header: "Module",
      accessor: (m) => {
        const Icon = moduleIcon(m.icon);
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{m.name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{m.category || "—"}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Platform status",
      accessor: (m) => (
        <Badge variant={m.is_available ? "success" : "warning"} dot>
          {m.is_available ? "Available" : "Coming soon"}
        </Badge>
      ),
    },
    {
      header: "Enabled by company",
      accessor: (m) =>
        m.is_enabled ? (
          <Badge variant="brand" dot>Enabled</Badge>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        ),
    },
    {
      header: "Access",
      className: "w-56",
      accessor: (m) => (
        <Switch
          checked={m.is_granted ?? true}
          onChange={(checked) => handleToggleGrant(m, checked)}
          disabled={!m.is_available || togglingId === m.id}
          label={m.is_granted ?? true ? "Granted" : "Not included in plan"}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/companies")}
        className="w-fit"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to companies
      </Button>
      <PageHeader
        title={company ? `Module access — ${company.name}` : "Module access"}
        description="Choose which modules this company is allowed to install. Modules left off here stay hidden from their App Marketplace as “Not in your plan”, even once the platform makes them generally available."
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
        <Table
          columns={columns}
          data={modules}
          keyExtractor={(m) => m.id}
          loading={loading}
          emptyMessage="No modules in the catalog yet."
        />
      </Card>
    </div>
  );
}
