"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Hourglass, TriangleAlert, Users, Wallet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import type { PlatformStats } from "@/lib/types";

function currency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<PlatformStats>("/admin/stats");
        setStats(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load platform stats.");
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform Dashboard"
        description="How WorkSphere itself is doing — companies, revenue, and usage across every tenant."
      />
      {error && <p className="text-sm text-danger-600">{error}</p>}

      {stats && stats.companies.pending > 0 && (
        <Link
          href="/admin/companies"
          className="flex items-center gap-3 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 transition-colors hover:bg-amber-100"
        >
          <Hourglass className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">
              {stats.companies.pending} {stats.companies.pending === 1 ? "company is" : "companies are"} waiting
            </span>{" "}
            for approval — review them now.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={stats?.companies.total ?? null} icon={Building2} />
        <StatCard label="Pending approval" value={stats?.companies.pending ?? null} icon={Hourglass} />
        <StatCard label="Employees (all tenants)" value={stats?.employees.total ?? null} icon={Users} />
        <StatCard
          label="Monthly recurring revenue"
          value={stats ? currency(stats.revenue.mrr) : null}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Company status" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Active</dt>
              <dd>
                <Badge variant="success" dot>
                  {stats?.companies.active ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Pending</dt>
              <dd>
                <Badge variant="warning" dot>
                  {stats?.companies.pending ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Suspended</dt>
              <dd>
                <Badge variant="neutral" dot>
                  {stats?.companies.suspended ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Rejected</dt>
              <dd>
                <Badge variant="danger" dot>
                  {stats?.companies.rejected ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">On trial</dt>
              <dd>
                <Badge variant="info" dot>
                  {stats?.companies.on_trial ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <dt className="text-gray-600">Annual run rate</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100">
                {stats ? currency(stats.revenue.arr) : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Approaching plan limits"
          description="Companies at 80%+ of their subscription's employee cap"
          className="lg:col-span-2"
        >
          {!stats ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : stats.companies_near_limit.length === 0 ? (
            <EmptyState message="No companies are close to their plan's employee limit." />
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {stats.companies_near_limit.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <TriangleAlert className="size-4 shrink-0 text-warning-600" aria-hidden="true" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  </div>
                  <span className="text-gray-600">
                    {c.employee_count} / {c.max_employees} employees ·{" "}
                    <span className="font-semibold text-warning-700">{c.usage_percent}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
