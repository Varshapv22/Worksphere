"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Pencil,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import type { Asset, AssetStatus, Employee, PaginationMeta } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const statusConfig: Record<AssetStatus, { label: string; color: string }> = {
  purchased:   { label: "Purchased",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  assigned:    { label: "Assigned",    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  returned:    { label: "Returned",    color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" },
  disposed:    { label: "Disposed",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const lifecycleSteps: AssetStatus[] = ["purchased", "assigned", "maintenance", "returned", "disposed"];

// ── Asset Row ─────────────────────────────────────────────────────────────────

function AssetRow({
  asset,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  onEdit: (a: Asset) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = statusConfig[asset.status] ?? statusConfig.purchased;
  const warrantyExpiring = asset.warranty_expiry && new Date(asset.warranty_expiry) <= new Date(Date.now() + 30 * 86400000);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{asset.name}</p>
          {asset.type && <p className="text-xs text-gray-400">{asset.type} {asset.brand ? `· ${asset.brand}` : ""}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{asset.serial_number ?? "—"}</td>
      <td className="px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.color)}>
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {asset.assigned_to ? asset.assigned_to.full_name : "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={cn(warrantyExpiring && asset.warranty_expiry ? "text-amber-600 font-medium" : "text-gray-500")}>
          {fmtDate(asset.warranty_expiry)}
          {warrantyExpiring && asset.warranty_expiry && <AlertTriangle className="inline ml-1 size-3.5" />}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(asset)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-700"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Asset Modal ───────────────────────────────────────────────────────────────

interface AssetForm {
  name: string; type: string; serial_number: string; brand: string; model: string;
  purchase_date: string; purchase_cost: string; warranty_expiry: string;
  status: AssetStatus; assigned_to: string; assigned_date: string; notes: string;
}

const emptyForm: AssetForm = {
  name: "", type: "", serial_number: "", brand: "", model: "",
  purchase_date: "", purchase_cost: "", warranty_expiry: "",
  status: "purchased", assigned_to: "", assigned_date: "", notes: "",
};

function AssetModal({
  open,
  asset,
  employees,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: Asset | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: (a: Asset) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (asset) {
      setForm({
        name: asset.name,
        type: asset.type ?? "",
        serial_number: asset.serial_number ?? "",
        brand: asset.brand ?? "",
        model: asset.model ?? "",
        purchase_date: asset.purchase_date ?? "",
        purchase_cost: asset.purchase_cost?.toString() ?? "",
        warranty_expiry: asset.warranty_expiry ?? "",
        status: asset.status,
        assigned_to: asset.assigned_to?.id?.toString() ?? "",
        assigned_date: asset.assigned_date ?? "",
        notes: asset.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, asset]);

  function set(field: keyof AssetForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type || null,
        serial_number: form.serial_number || null,
        brand: form.brand || null,
        model: form.model || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        warranty_expiry: form.warranty_expiry || null,
        notes: form.notes || null,
      };
      if (asset) {
        body.status = form.status;
        body.assigned_to = form.assigned_to ? parseInt(form.assigned_to) : null;
        body.assigned_date = form.assigned_date || null;
      }
      const method = asset ? "PUT" : "POST";
      const url = asset ? `/assets/${asset.id}` : "/assets";
      const res = await apiFetch<{ data: Asset }>(url, { method, body: JSON.stringify(body) });
      toast.success(asset ? "Asset updated!" : "Asset added!");
      onSaved(res.data);
    } catch {
      toast.error("Failed to save asset.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <Modal open={open} onClose={onClose} title={asset ? "Edit Asset" : "Add Asset"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asset Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={inp} placeholder="e.g. MacBook Pro 14-inch" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type</label>
            <input value={form.type} onChange={(e) => set("type", e.target.value)} className={inp} placeholder="Laptop, Phone, Vehicle…" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Serial Number</label>
            <input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brand</label>
            <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Model</label>
            <input value={form.model} onChange={(e) => set("model", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Purchase Date</label>
            <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Purchase Cost</label>
            <input type="number" min="0" step="0.01" value={form.purchase_cost} onChange={(e) => set("purchase_cost", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Warranty Expiry</label>
            <input type="date" value={form.warranty_expiry} onChange={(e) => set("warranty_expiry", e.target.value)} className={inp} />
          </div>
          {asset && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value as AssetStatus)} className={inp}>
                  {lifecycleSteps.map((s) => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned To</label>
                <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className={inp}>
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{asset ? "Update" : "Add Asset"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const [assetsRes, statsRes, empRes] = await Promise.all([
        apiFetch<{ data: Asset[]; meta: PaginationMeta }>(`/assets?${params}`),
        apiFetch<{ data: { by_status: Record<string, number>; total: number; warranty_expiring_soon: number } }>("/assets/stats"),
        apiFetch<{ data: Employee[] }>("/employees?per_page=500"),
      ]);
      setAssets(assetsRes.data);
      setMeta(assetsRes.meta);
      setStats(statsRes.data.by_status);
      setEmployees(empRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this asset?")) return;
    try {
      await apiFetch(`/assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success("Asset deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  function handleSaved(a: Asset) {
    setShowModal(false);
    setEditTarget(null);
    setAssets((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      if (idx >= 0) return prev.map((x) => x.id === a.id ? a : x);
      return [a, ...prev];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asset Lifecycle"
        description="Track every company asset from purchase through disposal"
        actions={
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus className="size-4" /> Add Asset
          </Button>
        }
      />

      {/* Lifecycle stats */}
      <div className="flex flex-wrap gap-3">
        {lifecycleSteps.map((status, i) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("flex flex-col gap-0.5 rounded-xl border px-4 py-3", statusFilter === status ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800")}>
              <span className="text-xs text-gray-500">{statusConfig[status].label}</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats[status] ?? 0}</span>
            </div>
            {i < lifecycleSteps.length - 1 && <ArrowRight className="size-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search assets…"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All statuses</option>
          {lifecycleSteps.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Asset</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Serial #</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned To</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Warranty</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                  <Loader2 className="mx-auto size-6 animate-spin" />
                </td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                  <Boxes className="mx-auto mb-2 size-10 text-gray-300" />
                  <p>No assets found.</p>
                </td></tr>
              ) : (
                assets.map((a) => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    onEdit={(a) => { setEditTarget(a); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {meta.last_page > 1 && <Pagination meta={meta} onPageChange={setPage} />}

      <AssetModal
        open={showModal}
        asset={editTarget}
        employees={employees}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
