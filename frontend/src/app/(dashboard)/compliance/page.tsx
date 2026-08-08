"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import type { ComplianceItem, ComplianceStatus, ComplianceType, Employee, PaginationMeta } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

const statusCfg: Record<ComplianceStatus, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  valid:          { label: "Valid",          icon: CheckCircle2,   color: "text-green-500" },
  expiring_soon:  { label: "Expiring Soon",  icon: AlertTriangle,  color: "text-amber-500" },
  expired:        { label: "Expired",        icon: XCircle,        color: "text-red-500" },
};

const typeLabelMap: Record<ComplianceType, string> = {
  passport: "Passport", visa: "Visa", certification: "Certification",
  insurance: "Insurance", medical: "Medical", drivers_license: "Driver's License",
  contract: "Contract", other: "Other",
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ComplianceRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ComplianceItem;
  onEdit: (i: ComplianceItem) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = statusCfg[item.status];
  const Icon = cfg.icon;
  const daysLeft = item.days_until_expiry;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4 shrink-0", cfg.color)} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
        </div>
        {item.document_number && <p className="ml-6 text-xs text-gray-400"># {item.document_number}</p>}
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {typeLabelMap[item.type]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.employee?.full_name ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(item.expiry_date)}</td>
      <td className="px-4 py-3 text-sm">
        {daysLeft != null ? (
          <span className={cn("font-medium", daysLeft < 0 ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : "text-green-600")}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button type="button" onClick={() => onEdit(item)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-700">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ComplianceForm {
  type: ComplianceType; name: string; document_number: string;
  employee_id: string; issue_date: string; expiry_date: string; notes: string;
}

const emptyForm: ComplianceForm = {
  type: "passport", name: "", document_number: "", employee_id: "", issue_date: "", expiry_date: "", notes: "",
};

function ComplianceModal({
  open,
  item,
  employees,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: ComplianceItem | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: (i: ComplianceItem) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ComplianceForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        type: item.type,
        name: item.name,
        document_number: item.document_number ?? "",
        employee_id: item.employee?.id?.toString() ?? "",
        issue_date: item.issue_date ?? "",
        expiry_date: item.expiry_date ?? "",
        notes: item.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, item]);

  function set(field: keyof ComplianceForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        type: form.type,
        name: form.name,
        document_number: form.document_number || null,
        employee_id: form.employee_id ? parseInt(form.employee_id) : null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      };
      const method = item ? "PUT" : "POST";
      const url = item ? `/compliance/${item.id}` : "/compliance";
      const res = await apiFetch<{ data: ComplianceItem }>(url, { method, body: JSON.stringify(body) });
      toast.success(item ? "Updated!" : "Added!");
      onSaved(res.data);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit Compliance Item" : "Add Compliance Item"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type *</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value as ComplianceType)} required className={inp}>
              {(Object.keys(typeLabelMap) as ComplianceType[]).map((t) => (
                <option key={t} value={t}>{typeLabelMap[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={inp} placeholder="e.g. Work Visa" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Document Number</label>
            <input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Employee</label>
            <select value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} className={inp}>
              <option value="">Company-wide</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issue Date</label>
            <input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{item ? "Update" : "Add Item"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const toast = useToast();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editTarget, setEditTarget] = useState<ComplianceItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const [itemsRes, summaryRes, empRes] = await Promise.all([
        apiFetch<{ data: ComplianceItem[]; meta: PaginationMeta }>(`/compliance?${params}`),
        apiFetch<{ data: { by_status: Record<string, number>; total: number } }>("/compliance/summary"),
        apiFetch<{ data: Employee[] }>("/employees?per_page=500"),
      ]);
      setItems(itemsRes.data);
      setMeta(itemsRes.meta);
      setSummary(summaryRes.data.by_status);
      setEmployees(empRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this compliance item?")) return;
    try {
      await apiFetch(`/compliance/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  function handleSaved(i: ComplianceItem) {
    setShowModal(false);
    setEditTarget(null);
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === i.id);
      if (idx >= 0) return prev.map((x) => x.id === i.id ? i : x);
      return [i, ...prev];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compliance Dashboard"
        description="Track document expiry dates and get ahead of compliance deadlines"
        actions={
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus className="size-4" /> Add Item
          </Button>
        }
      />

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(statusCfg) as ComplianceStatus[]).map((s) => {
          const cfg = statusCfg[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                statusFilter === s
                  ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("size-4", cfg.color)} />
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? "—" : (summary[s] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Days Left</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                  <Loader2 className="mx-auto size-6 animate-spin" />
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                  <ShieldCheck className="mx-auto mb-2 size-10 text-gray-300" />
                  <p>No compliance items found.</p>
                </td></tr>
              ) : (
                items.map((i) => (
                  <ComplianceRow
                    key={i.id}
                    item={i}
                    onEdit={(i) => { setEditTarget(i); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {meta.last_page > 1 && <Pagination meta={meta} onPageChange={setPage} />}

      <ComplianceModal
        open={showModal}
        item={editTarget}
        employees={employees}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
