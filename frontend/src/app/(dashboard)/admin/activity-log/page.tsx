"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminActivityLog, AdminCompany, Paginated, PaginationMeta } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

function actionLabel(action: string) {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionVariant(action: string): "success" | "danger" | "neutral" | "brand" {
  if (action.endsWith(".approve") || action.endsWith(".create") || action.endsWith(".grant")) return "success";
  if (action.endsWith(".reject") || action.endsWith(".delete") || action.endsWith(".revoke")) return "danger";
  if (action.endsWith(".update")) return "brand";
  return "neutral";
}

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Paginated<AdminCompany>>("/admin/companies?per_page=200")
      .then((res) => setCompanies(res.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (companyId) params.set("company_id", companyId);
      params.set("page", String(page));
      const res = await apiFetch<Paginated<AdminActivityLog>>(`/admin/activity-logs?${params.toString()}`);
      setLogs(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, [search, companyId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<AdminActivityLog>[] = [
    {
      header: "Time",
      accessor: (log) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">
          {new Date(log.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Admin",
      accessor: (log) => log.admin?.name ?? "—",
    },
    {
      header: "Action",
      accessor: (log) => <Badge variant={actionVariant(log.action)}>{actionLabel(log.action)}</Badge>,
    },
    {
      header: "Subject",
      accessor: (log) => log.subject_label ?? "—",
    },
    {
      header: "Details",
      accessor: (log) =>
        log.changes && Object.keys(log.changes).length > 0 ? (
          <details className="text-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer select-none text-brand-700 hover:underline">View</summary>
            <pre className="mt-1 max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded-sm bg-gray-50 p-2 dark:bg-gray-800">
              {JSON.stringify(log.changes, null, 2)}
            </pre>
          </details>
        ) : (
          "—"
        ),
    },
    {
      header: "IP",
      accessor: (log) => <span className="text-gray-500 dark:text-gray-400">{log.ip_address ?? "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Activity log"
        description="Audit trail of platform-management actions taken by super admins"
      />
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by action or subject…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="sm:w-64">
            <Select
              value={companyId}
              onChange={(e) => {
                setPage(1);
                setCompanyId(e.target.value);
              }}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(log) => log.id}
          loading={loading}
          emptyMessage="No admin activity recorded yet."
        />
        <div className="mt-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
