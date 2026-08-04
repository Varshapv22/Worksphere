"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { SubscriptionPlan } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

function featureSummary(features: SubscriptionPlan["features"]) {
  if (!features) return "—";
  const list = Array.isArray(features) ? features : Object.keys(features).filter((k) => features[k]);
  return list.length > 0 ? list.join(", ") : "—";
}

export default function AdminPlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // undefined = modal closed, null = creating, SubscriptionPlan = editing
  const [modalPlan, setModalPlan] = useState<SubscriptionPlan | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: SubscriptionPlan[] }>("/admin/subscription-plans");
      setPlans(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(plan: SubscriptionPlan) {
    if (!confirm(`Delete the "${plan.name}" plan?`)) return;
    try {
      await apiFetch(`/admin/subscription-plans/${plan.id}`, { method: "DELETE" });
      toast.success("Plan deleted.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete plan.");
    }
  }

  const columns: Column<SubscriptionPlan>[] = [
    { header: "Name", accessor: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
    { header: "Price", accessor: (p) => `$${p.price_monthly}/mo` },
    { header: "Employee cap", accessor: (p) => p.max_employees },
    { header: "Features", accessor: (p) => featureSummary(p.features) },
    { header: "Companies", accessor: (p) => p.company_count ?? "—" },
    {
      header: "Status",
      accessor: (p) => (
        <Badge variant={p.is_active ? "success" : "neutral"} dot>
          {p.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-32",
      accessor: (p) => (
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-brand-700 transition-colors hover:text-brand-800 hover:underline"
            onClick={() => setModalPlan(p)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline"
            onClick={() => handleDelete(p)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Subscription plans"
        description="Manage the plans companies can subscribe to"
        actions={
          <Button onClick={() => setModalPlan(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Add plan
          </Button>
        }
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={plans}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage="No subscription plans yet."
        />
      </Card>
      {modalPlan !== undefined && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setModalPlan(undefined)}
          onSaved={() => {
            setModalPlan(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}

function existingFeatureLines(features: SubscriptionPlan["features"]) {
  if (!features) return "";
  const list = Array.isArray(features) ? features : Object.keys(features).filter((k) => features[k]);
  return list.join("\n");
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(plan?.name ?? "");
  const [slug, setSlug] = useState(plan?.slug ?? "");
  const [priceMonthly, setPriceMonthly] = useState(String(plan?.price_monthly ?? "0"));
  const [maxEmployees, setMaxEmployees] = useState(String(plan?.max_employees ?? "25"));
  const [featuresText, setFeaturesText] = useState(existingFeatureLines(plan?.features));
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      name,
      slug,
      price_monthly: Number(priceMonthly),
      max_employees: Number(maxEmployees),
      features: featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      is_active: isActive,
    };

    try {
      if (plan) {
        await apiFetch(`/admin/subscription-plans/${plan.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Plan updated.");
      } else {
        await apiFetch("/admin/subscription-plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Plan created.");
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? { general: [err.message] });
      } else {
        setErrors({ general: ["Something went wrong."] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={plan ? "Edit plan" : "Add plan"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name?.[0]}
        />
        <Input
          label="Slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={errors.slug?.[0]}
          hint="Unique identifier, e.g. growth"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price / month (USD)"
            name="price_monthly"
            type="number"
            min="0"
            step="0.01"
            required
            value={priceMonthly}
            onChange={(e) => setPriceMonthly(e.target.value)}
            error={errors.price_monthly?.[0]}
          />
          <Input
            label="Employee cap"
            name="max_employees"
            type="number"
            min="0"
            required
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            error={errors.max_employees?.[0]}
          />
        </div>
        <Textarea
          label="Features"
          name="features"
          rows={4}
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          hint="One feature per line"
          error={errors.features?.[0]}
        />
        <Checkbox
          label="Plan is active (visible to companies)"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {errors.general && <p className="text-sm text-danger-600">{errors.general[0]}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
