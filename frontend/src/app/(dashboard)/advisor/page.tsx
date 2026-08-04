"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { InsightCard } from "@/components/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import type { AdvisorResponse, WorkforceInsight } from "@/lib/types";

function formatGeneratedAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdvisorPage() {
  const [insights, setInsights] = useState<WorkforceInsight[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdvisorResponse>("/advisor/insights");
      setInsights(res.data);
      setGeneratedAt(res.generated_at);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load workforce insights."
      );
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Workforce Advisor"
        description="Recommendations drawn from your live attendance, performance, and payroll data — not just another report."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            isLoading={refreshing}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 via-brand-600 to-emerald-700 p-6 text-white shadow-sm">
        <Sparkles
          className="pointer-events-none absolute -right-4 -top-4 size-32 text-white/10"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-1.5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Advisor, not just a record keeper
          </span>
          <p className="max-w-2xl text-sm text-white/90">
            Every card below is generated from real data in your workspace right now
            {generatedAt ? ` — last refreshed ${formatGeneratedAt(generatedAt)}.` : "."}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            insights.length > 1 && "lg:grid-cols-2"
          )}
        >
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            icon={Sparkles}
            message="No signals right now — attendance, performance, and payroll all look healthy."
          />
        )
      )}
    </div>
  );
}
