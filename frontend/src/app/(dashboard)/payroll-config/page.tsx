"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import type { PayrollConfig } from "@/lib/types";

// ── common countries ──────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "IN", name: "India", currency_code: "INR", currency_symbol: "₹", tax: 15, pf: 12, tz: "Asia/Kolkata" },
  { code: "US", name: "United States", currency_code: "USD", currency_symbol: "$", tax: 22, pf: 0, tz: "America/New_York" },
  { code: "GB", name: "United Kingdom", currency_code: "GBP", currency_symbol: "£", tax: 20, pf: 0, tz: "Europe/London" },
  { code: "AE", name: "UAE", currency_code: "AED", currency_symbol: "AED", tax: 0, pf: 0, tz: "Asia/Dubai" },
  { code: "SG", name: "Singapore", currency_code: "SGD", currency_symbol: "S$", tax: 17, pf: 20, tz: "Asia/Singapore" },
  { code: "AU", name: "Australia", currency_code: "AUD", currency_symbol: "A$", tax: 30, pf: 11, tz: "Australia/Sydney" },
  { code: "CA", name: "Canada", currency_code: "CAD", currency_symbol: "CA$", tax: 26, pf: 6, tz: "America/Toronto" },
  { code: "DE", name: "Germany", currency_code: "EUR", currency_symbol: "€", tax: 19, pf: 10, tz: "Europe/Berlin" },
];

// ── form ──────────────────────────────────────────────────────────────────────

interface ConfigForm {
  country_code: string; country_name: string; currency_code: string; currency_symbol: string;
  tax_rate: string; provident_fund_rate: string; payroll_frequency: string; timezone: string;
}

const emptyForm: ConfigForm = {
  country_code: "", country_name: "", currency_code: "", currency_symbol: "",
  tax_rate: "0", provident_fund_rate: "0", payroll_frequency: "monthly", timezone: "UTC",
};

function ConfigModal({
  open,
  config,
  onClose,
  onSaved,
}: {
  open: boolean;
  config: PayrollConfig | null;
  onClose: () => void;
  onSaved: (c: PayrollConfig) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ConfigForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (config) {
      setForm({
        country_code: config.country_code,
        country_name: config.country_name,
        currency_code: config.currency_code,
        currency_symbol: config.currency_symbol,
        tax_rate: String(config.tax_rate),
        provident_fund_rate: String(config.provident_fund_rate),
        payroll_frequency: config.payroll_frequency,
        timezone: config.timezone,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, config]);

  function set(field: keyof ConfigForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function applyCountryPreset(code: string) {
    const preset = COUNTRIES.find((c) => c.code === code);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      country_code: preset.code,
      country_name: preset.name,
      currency_code: preset.currency_code,
      currency_symbol: preset.currency_symbol,
      tax_rate: String(preset.tax),
      provident_fund_rate: String(preset.pf),
      timezone: preset.tz,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        country_code: form.country_code,
        country_name: form.country_name,
        currency_code: form.currency_code,
        currency_symbol: form.currency_symbol,
        tax_rate: parseFloat(form.tax_rate),
        provident_fund_rate: parseFloat(form.provident_fund_rate),
        payroll_frequency: form.payroll_frequency,
        timezone: form.timezone,
      };
      const method = config ? "PUT" : "POST";
      const url = config ? `/payroll-configs/${config.id}` : "/payroll-configs";
      const res = await apiFetch<{ data: PayrollConfig }>(url, { method, body: JSON.stringify(body) });
      toast.success(config ? "Updated!" : "Config added!");
      onSaved(res.data);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <Modal open={open} onClose={onClose} title={config ? "Edit Payroll Config" : "Add Country Config"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!config && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick Preset</label>
            <select onChange={(e) => applyCountryPreset(e.target.value)} className={inp}>
              <option value="">Select a country preset…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Country Code *</label>
            <input value={form.country_code} onChange={(e) => set("country_code", e.target.value.toUpperCase())} maxLength={3} required className={inp} placeholder="IN" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Country Name *</label>
            <input value={form.country_name} onChange={(e) => set("country_name", e.target.value)} required className={inp} placeholder="India" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency Code *</label>
            <input value={form.currency_code} onChange={(e) => set("currency_code", e.target.value.toUpperCase())} maxLength={3} required className={inp} placeholder="INR" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency Symbol *</label>
            <input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} required className={inp} placeholder="₹" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tax Rate %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Provident Fund %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.provident_fund_rate} onChange={(e) => set("provident_fund_rate", e.target.value)} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payroll Frequency</label>
            <select value={form.payroll_frequency} onChange={(e) => set("payroll_frequency", e.target.value)} className={inp}>
              <option value="weekly">Weekly</option>
              <option value="bi_weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timezone</label>
            <input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={inp} placeholder="Asia/Kolkata" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{config ? "Update" : "Add Config"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayrollConfigPage() {
  const toast = useToast();
  const [configs, setConfigs] = useState<PayrollConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<PayrollConfig | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: PayrollConfig[] }>("/payroll-configs");
      setConfigs(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Remove this payroll configuration?")) return;
    try {
      await apiFetch(`/payroll-configs/${id}`, { method: "DELETE" });
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      toast.success("Config removed.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  async function handleToggle(config: PayrollConfig) {
    try {
      const res = await apiFetch<{ data: PayrollConfig }>(`/payroll-configs/${config.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !config.is_active }),
      });
      setConfigs((prev) => prev.map((c) => c.id === config.id ? res.data : c));
    } catch {
      toast.error("Failed to update.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Multi-Country Payroll"
        description="Configure currency, tax rules, holidays, and payroll frequency per country"
        actions={
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus className="size-4" /> Add Country
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
          <Globe className="size-12 text-gray-300" />
          <div>
            <p className="font-semibold text-gray-500">No country configs yet</p>
            <p className="mt-1 text-sm text-gray-400">Add your first country to support multi-country payroll.</p>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="size-4" /> Add Country</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <Card key={config.id} className={cn(!config.is_active && "opacity-60")}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{config.country_code}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500")}>
                      {config.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{config.country_name}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(config)}
                    className="text-gray-400 hover:text-brand-500"
                    title={config.is_active ? "Deactivate" : "Activate"}
                  >
                    {config.is_active ? <ToggleRight className="size-5 text-brand-500" /> : <ToggleLeft className="size-5" />}
                  </button>
                  <button type="button" onClick={() => { setEditTarget(config); setShowModal(true); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-700">
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(config.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Currency", value: `${config.currency_code} (${config.currency_symbol})` },
                  { label: "Tax Rate", value: `${config.tax_rate}%` },
                  { label: "Provident Fund", value: `${config.provident_fund_rate}%` },
                  { label: "Frequency", value: config.payroll_frequency.replace("_", "-") },
                  { label: "Timezone", value: config.timezone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfigModal
        open={showModal}
        config={editTarget}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSaved={(c) => {
          setShowModal(false);
          setEditTarget(null);
          setConfigs((prev) => {
            const idx = prev.findIndex((x) => x.id === c.id);
            if (idx >= 0) return prev.map((x) => x.id === c.id ? c : x);
            return [...prev, c];
          });
        }}
      />
    </div>
  );
}
