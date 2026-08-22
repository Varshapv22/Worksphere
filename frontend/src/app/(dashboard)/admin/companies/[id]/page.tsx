"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, Blocks, Check, CircleCheck, LogIn, Mail, MapPin, Phone, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AdminActivityLog, AdminCompany, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function actionLabel(action: string) {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { impersonateCompany } = useAuth();
  const companyId = params.id;

  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, logsRes] = await Promise.all([
        apiFetch<{ data: AdminCompany }>(`/admin/companies/${companyId}`),
        apiFetch<Paginated<AdminActivityLog>>(`/admin/activity-logs?company_id=${companyId}&per_page=10`),
      ]);
      setCompany(companyRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load company.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    if (!company) return;
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

    setBusy(true);
    try {
      await apiFetch(`/admin/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !company.is_active }),
      });
      toast.success(suspending ? "Company suspended." : "Company reactivated.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update company.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!company) return;
    const ok = await confirm({
      title: `Approve ${company.name}?`,
      description: "Their admin will be able to sign in and start using WorkSphere.",
      confirmLabel: "Approve",
      variant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch(`/admin/companies/${company.id}/approve`, { method: "POST" });
      toast.success(`${company.name} approved — they can now sign in.`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve company.");
    } finally {
      setBusy(false);
    }
  }

  async function impersonate() {
    if (!company) return;
    const ok = await confirm({
      title: `Log in as ${company.name}'s admin?`,
      description: "You'll see the platform exactly as their admin does. This is logged in the activity log.",
      confirmLabel: "Log in as admin",
      variant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    try {
      await impersonateCompany(company.id, company.name);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to impersonate this company's admin.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!company) return;
    const ok = await confirm({
      title: `Reject ${company.name}'s registration?`,
      description: "They will not be able to sign in.",
      confirmLabel: "Reject",
      variant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch(`/admin/companies/${company.id}/reject`, { method: "POST" });
      toast.success(`${company.name} rejected.`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject company.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/companies")} className="w-fit">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to companies
      </Button>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-400">
          {error}
        </div>
      )}

      <PageHeader
        title={company?.name ?? (loading ? "Loading…" : "Company")}
        description={company ? `/${company.slug}` : undefined}
        actions={
          company && (
            <>
              {company.status === "pending" ? (
                <Badge variant="warning" dot>
                  Pending approval
                </Badge>
              ) : company.status === "rejected" ? (
                <Badge variant="danger" dot>
                  Rejected
                </Badge>
              ) : (
                <Badge variant={company.is_active ? "success" : "neutral"} dot>
                  {company.is_active ? "Active" : "Suspended"}
                </Badge>
              )}
            </>
          )
        }
      />

      {company && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/companies/${company.id}/modules`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Blocks className="size-3.5" aria-hidden="true" />
            Module access
          </Link>

          {company.status === "pending" && (
            <>
              <Button size="sm" disabled={busy} onClick={approve}>
                <Check className="size-3.5" aria-hidden="true" />
                Approve
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={reject}>
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </Button>
            </>
          )}

          {company.status === "rejected" && (
            <Button size="sm" disabled={busy} onClick={approve}>
              <CircleCheck className="size-3.5" aria-hidden="true" />
              Approve anyway
            </Button>
          )}

          {company.status === "approved" && (
            <>
              {company.is_active && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={impersonate}>
                  <LogIn className="size-3.5" aria-hidden="true" />
                  Log in as admin
                </Button>
              )}
              <Button variant={company.is_active ? "danger" : "primary"} size="sm" disabled={busy} onClick={toggleActive}>
                {company.is_active ? (
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
              </Button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Contact" className="lg:col-span-1">
          {!company ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <dd className="text-gray-700 dark:text-gray-300">{company.email}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <dd className="text-gray-700 dark:text-gray-300">{company.phone ?? "—"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="size-4 shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
                <dd className="text-gray-700 dark:text-gray-300">{company.address ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <dt className="text-gray-500">Timezone</dt>
                <dd className="text-gray-700 dark:text-gray-300">{company.timezone}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Currency</dt>
                <dd className="text-gray-700 dark:text-gray-300">{company.currency}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Joined</dt>
                <dd className="text-gray-700 dark:text-gray-300">{formatDate(company.created_at)}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card title="Plan & usage" className="lg:col-span-1">
          {!company ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Plan</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {company.subscription_plan ? company.subscription_plan.name : "No plan"}
                </dd>
              </div>
              {company.subscription_plan && (
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Price</dt>
                  <dd className="text-gray-700 dark:text-gray-300">${company.subscription_plan.price_monthly}/mo</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Employees</dt>
                <dd
                  className={
                    company.usage_percent && company.usage_percent >= 80
                      ? "font-semibold text-warning-700"
                      : "text-gray-700 dark:text-gray-300"
                  }
                >
                  {company.employee_count}
                  {company.subscription_plan ? ` / ${company.subscription_plan.max_employees}` : ""}
                  {company.usage_percent !== null ? ` (${company.usage_percent}%)` : ""}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <dt className="text-gray-500">Trial ends</dt>
                <dd className="text-gray-700 dark:text-gray-300">{formatDate(company.trial_ends_at)}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card title="Recent activity" description="Platform-management actions for this company" className="lg:col-span-1">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : logs.length === 0 ? (
            <EmptyState message="No admin activity recorded for this company yet." />
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{actionLabel(log.action)}</span>
                    <span className="whitespace-nowrap text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">by {log.admin?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
