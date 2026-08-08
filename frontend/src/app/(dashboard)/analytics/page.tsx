"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Wallet,
  Building2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import type { AnalyticsOverview } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  color = "brand",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  color?: string;
}) {
  const positive = trend != null ? trend >= 0 : null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`flex size-8 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`size-4 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
      {trend != null && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-green-600" : "text-red-600")}>
          {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {positive ? "+" : ""}{trend}% {trendLabel}
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data, label }: { data: { month: string; value: number | string }[]; label: string }) {
  const values = data.map((d) => Number(d.value));
  const max = Math.max(...values, 1);
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((Number(d.value) / max) * 96));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-brand-400 dark:bg-brand-500 transition-all"
                style={{ height: `${h}px` }}
                title={`${d.month}: ${d.value}`}
              />
              <span className="text-[9px] text-gray-400 whitespace-nowrap">{d.month.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [hiring, setHiring] = useState<{ month: string; hires: string }[]>([]);
  const [attrition, setAttrition] = useState<{ month: string; terminations: string }[]>([]);
  const [payroll, setPayroll] = useState<{ month: string; total: string }[]>([]);
  const [departments, setDepartments] = useState<{ department: string; total: number; active: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: AnalyticsOverview }>("/analytics/overview"),
      apiFetch<{ data: { month: string; hires: string }[] }>("/analytics/hiring-trends"),
      apiFetch<{ data: { month: string; terminations: string }[] }>("/analytics/attrition"),
      apiFetch<{ data: { month: string; total: string }[] }>("/analytics/payroll-trends"),
      apiFetch<{ data: { department: string; total: number; active: number }[] }>("/analytics/department-breakdown"),
    ])
      .then(([ov, h, a, p, d]) => {
        setOverview(ov.data);
        setHiring(h.data);
        setAttrition(a.data);
        setPayroll(p.data);
        setDepartments(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const ov = overview;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Company Analytics"
        description="Workforce insights — attrition, hiring, attendance, and payroll trends"
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Headcount"
          value={ov?.headcount.total ?? 0}
          sub={`${ov?.headcount.active ?? 0} active`}
          icon={Users}
        />
        <StatCard
          label="Attendance Rate"
          value={`${ov?.attendance.rate_percent ?? 0}%`}
          sub={`${ov?.attendance.approved_leaves_month ?? 0} approved leaves this month`}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="New Hires (Month)"
          value={ov?.headcount.new_hires_month ?? 0}
          icon={UserPlus}
          color="green"
        />
        <StatCard
          label="Payroll This Month"
          value={fmt(ov?.payroll.this_month ?? 0)}
          trend={ov?.payroll.growth_pct}
          trendLabel="vs last month"
          icon={Wallet}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          {hiring.length > 0
            ? <MiniBarChart data={hiring.map((d) => ({ month: d.month, value: d.hires }))} label="Hiring Trend (12 months)" />
            : <p className="text-sm text-gray-400">Not enough hiring data yet.</p>}
        </Card>
        <Card>
          {attrition.length > 0
            ? <MiniBarChart data={attrition.map((d) => ({ month: d.month, value: d.terminations }))} label="Attrition (12 months)" />
            : <p className="text-sm text-gray-400">No attrition data yet.</p>}
        </Card>
        <Card>
          {payroll.length > 0
            ? <MiniBarChart data={payroll.map((d) => ({ month: d.month, value: d.total }))} label="Payroll Cost Trend" />
            : <p className="text-sm text-gray-400">No payroll data yet.</p>}
        </Card>
      </div>

      {/* Department breakdown */}
      <Card>
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 className="size-4 text-brand-500" />
          Department Breakdown
        </h2>
        {departments.length === 0 ? (
          <p className="text-sm text-gray-400">No department data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Department</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Active</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => {
                  const pct = dept.total > 0 ? Math.round((dept.active / dept.total) * 100) : 0;
                  return (
                    <tr key={dept.department} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{dept.department}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{dept.total}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{dept.active}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payroll summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payroll This Month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(ov?.payroll.this_month ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payroll Last Month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(ov?.payroll.last_month ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Growth</p>
          <p className={cn("mt-2 text-2xl font-bold", (ov?.payroll.growth_pct ?? 0) >= 0 ? "text-green-600" : "text-red-600")}>
            {(ov?.payroll.growth_pct ?? 0) > 0 ? "+" : ""}{ov?.payroll.growth_pct ?? 0}%
          </p>
        </Card>
      </div>
    </div>
  );
}
