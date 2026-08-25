"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Clock, Loader2, ShieldOff } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import type { WorkingHourConfig } from "@/lib/types";

const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

interface ConfigForm {
  work_start_time: string;
  work_end_time: string;
  standard_hours_per_day: string;
  late_grace_minutes: string;
  half_day_threshold_hours: string;
  work_days: string[];
}

function toForm(config: WorkingHourConfig): ConfigForm {
  return {
    work_start_time: config.work_start_time.slice(0, 5),
    work_end_time: config.work_end_time.slice(0, 5),
    standard_hours_per_day: String(config.standard_hours_per_day),
    late_grace_minutes: String(config.late_grace_minutes),
    half_day_threshold_hours: String(config.half_day_threshold_hours),
    work_days: config.work_days,
  };
}

export default function WorkingHoursPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const canManage = Boolean(user?.roles?.includes("company-admin"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: WorkingHourConfig }>("/working-hours-config");
      setForm(toForm(res.data));
    } catch {
      // Non-fatal — the form just won't populate.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(day: string) {
    setForm((f) =>
      f
        ? {
            ...f,
            work_days: f.work_days.includes(day) ? f.work_days.filter((d) => d !== day) : [...f.work_days, day],
          }
        : f
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setErrors({});
    try {
      const body = {
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        standard_hours_per_day: Number(form.standard_hours_per_day),
        late_grace_minutes: Number(form.late_grace_minutes),
        half_day_threshold_hours: Number(form.half_day_threshold_hours),
        work_days: form.work_days,
      };
      const res = await apiFetch<{ data: WorkingHourConfig }>("/working-hours-config", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setForm(toForm(res.data));
      toast.success("Working hours updated.");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      } else {
        toast.error("Failed to save working hours.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Working Hours" description="Configure standard office hours and attendance rules" />
        <Card>
          <EmptyState icon={ShieldOff} message="You don't have permission to manage working hours." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Working Hours" description="Configure standard office hours and attendance rules used to mark late and half-day check-ins" />

      {loading || !form ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Work start time"
                type="time"
                value={form.work_start_time}
                onChange={(e) => setForm((f) => (f ? { ...f, work_start_time: e.target.value } : f))}
                required
                error={errors.work_start_time?.[0]}
              />
              <Input
                label="Work end time"
                type="time"
                value={form.work_end_time}
                onChange={(e) => setForm((f) => (f ? { ...f, work_end_time: e.target.value } : f))}
                required
                error={errors.work_end_time?.[0]}
              />
              <Input
                label="Standard hours per day"
                type="number"
                min={0}
                max={24}
                step="0.5"
                value={form.standard_hours_per_day}
                onChange={(e) => setForm((f) => (f ? { ...f, standard_hours_per_day: e.target.value } : f))}
                required
                error={errors.standard_hours_per_day?.[0]}
              />
              <Input
                label="Late grace period (minutes)"
                type="number"
                min={0}
                max={240}
                value={form.late_grace_minutes}
                onChange={(e) => setForm((f) => (f ? { ...f, late_grace_minutes: e.target.value } : f))}
                hint="Clock-ins after start time + grace are marked late"
                required
                error={errors.late_grace_minutes?.[0]}
              />
              <Input
                label="Half-day threshold (hours)"
                type="number"
                min={0}
                max={24}
                step="0.5"
                value={form.half_day_threshold_hours}
                onChange={(e) => setForm((f) => (f ? { ...f, half_day_threshold_hours: e.target.value } : f))}
                hint="Clock-outs below this worked duration are marked half-day"
                required
                error={errors.half_day_threshold_hours?.[0]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Working days</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const active = form.work_days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                          : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {errors.work_days && <p className="text-xs text-danger-600">{errors.work_days[0]}</p>}
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <Clock className="size-4 shrink-0" />
              Employees clocking in after {form.work_start_time} plus {form.late_grace_minutes || 0} min are marked
              late; clocking out with under {form.half_day_threshold_hours || 0}h worked is marked half-day.
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
              <Button type="submit" isLoading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
