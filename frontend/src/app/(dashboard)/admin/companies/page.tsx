"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Blocks, Check, CircleCheck, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AdminCompany, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Input";
import { Table, type Column } from "@/components/Table";
import { PageHeader } from "@/components/PageHeader";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function AdminCompaniesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1" });
      if (searchTerm) params.set("search", searchTerm);
      const res = await apiFetch<Paginated<AdminCompany>>(`/admin/companies?${params.toString()}`);
      setCompanies(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 300);
    return () => clearTimeout(timeout);
  }, [load, search]);

  async function toggleActive(company: AdminCompany) {
    const suspending = company.is_active;
    const ok = await confirm(
      suspending
        ? {
            title: `Suspend ${company.name}?`,
            description: "Their users won't be able to sign in until you reactivate them.",
            confirmLabel: "Suspend",
            variant: "danger",
          }
        : {
            title: `Reactivate ${company.name}?`,
            description: "Their users will be able to sign in again immediately.",
            confirmLabel: "Reactivate",
            variant: "primary",
          }
    );
    if (!ok) return;

    setBusyId(company.id);
    try {
      await apiFetch(`/admin/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !company.is_active }),
      });
      toast.success(suspending ? "Company suspended." : "Company reactivated.");
      load(search);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update company.");
    } finally {
      setBusyId(null);
    }
  }

  async function approve(company: AdminCompany) {
    const ok = await confirm({
      title: `Approve ${company.name}?`,
      description: "Their admin will be able to sign in and start using WorkSphere.",
      confirmLabel: "Approve",
      variant: "primary",
    });
    if (!ok) return;

    setBusyId(company.id);
    try {
      await apiFetch(`/admin/companies/${company.id}/approve`, { method: "POST" });
      toast.success(`${company.name} approved — they can now sign in.`);
      load(search);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve company.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(company: AdminCompany) {
    const ok = await confirm({
      title: `Reject ${company.name}'s registration?`,
      description: "They will not be able to sign in.",
      confirmLabel: "Reject",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(company.id);
    try {
      await apiFetch(`/admin/companies/${company.id}/reject`, { method: "POST" });
      toast.success(`${company.name} rejected.`);
      load(search);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject company.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<AdminCompany>[] = [
    {
      header: "Company",
      accessor: (c) => (
        <Link href={`/admin/companies/${c.id}`} className="group inline-block">
          <p className="font-medium text-gray-900 group-hover:text-brand-700 group-hover:underline dark:text-gray-100 dark:group-hover:text-brand-400">
            {c.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
        </Link>
      ),
    },
    {
      header: "Plan",
      accessor: (c) =>
        c.subscription_plan ? (
          <span>
            {c.subscription_plan.name}
            <span className="text-gray-400">
              {" "}
              · ${c.subscription_plan.price_monthly}/mo
            </span>
          </span>
        ) : (
          <span className="text-gray-400">No plan</span>
        ),
    },
    {
      header: "Usage",
      accessor: (c) =>
        c.subscription_plan ? (
          <span className={c.usage_percent && c.usage_percent >= 80 ? "font-semibold text-warning-700" : ""}>
            {c.employee_count} / {c.subscription_plan.max_employees} ({c.usage_percent ?? 0}%)
          </span>
        ) : (
          <span>{c.employee_count} employees</span>
        ),
    },
    {
      header: "Status",
      accessor: (c) => {
        if (c.status === "pending") {
          return (
            <Badge variant="warning" dot>
              Pending approval
            </Badge>
          );
        }
        if (c.status === "rejected") {
          return (
            <Badge variant="danger" dot>
              Rejected
            </Badge>
          );
        }
        return (
          <Badge variant={c.is_active ? "success" : "neutral"} dot>
            {c.is_active ? "Active" : "Suspended"}
          </Badge>
        );
      },
    },
    { header: "Joined", accessor: (c) => formatDate(c.created_at) },
    {
      header: "Actions",
      className: "w-64",
      accessor: (c) => {
        const busy = busyId === c.id;
        const modulesLink = (
          <Link
            href={`/admin/companies/${c.id}/modules`}
            className="inline-flex items-center gap-1 rounded-sm text-gray-600 transition-colors hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Blocks className="size-3.5" aria-hidden="true" />
            Modules
          </Link>
        );

        if (c.status === "pending") {
          return (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => approve(c)}
                className="inline-flex items-center gap-1 rounded-sm text-success-700 transition-colors hover:text-success-800 hover:underline disabled:opacity-50"
              >
                <Check className="size-3.5" aria-hidden="true" />
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => reject(c)}
                className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline disabled:opacity-50"
              >
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </button>
              {modulesLink}
            </div>
          );
        }

        if (c.status === "rejected") {
          return (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => approve(c)}
                className="inline-flex items-center gap-1 rounded-sm text-success-700 transition-colors hover:text-success-800 hover:underline disabled:opacity-50"
              >
                <CircleCheck className="size-3.5" aria-hidden="true" />
                Approve anyway
              </button>
              {modulesLink}
            </div>
          );
        }

        return (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => toggleActive(c)}
              className={
                c.is_active
                  ? "inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline disabled:opacity-50"
                  : "inline-flex items-center gap-1 rounded-sm text-success-700 transition-colors hover:text-success-800 hover:underline disabled:opacity-50"
              }
            >
              {c.is_active ? (
                <>
                  <Ban className="size-3.5" aria-hidden="true" />
                  Suspend
                </>
              ) : (
                <>
                  <CircleCheck className="size-3.5" aria-hidden="true" />
                  Reactivate
                </>
              )}
            </button>
            {modulesLink}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Companies" description="Every tenant workspace on the platform" />
      <Card>
        <div className="mb-4">
          <Input
            placeholder="Search by company name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={companies}
          keyExtractor={(c) => c.id}
          loading={loading}
          emptyMessage="No companies have registered yet."
        />
      </Card>
    </div>
  );
}
