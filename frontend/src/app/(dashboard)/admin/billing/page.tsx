"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AdminCompany, Invoice, InvoiceStatus, Paginated, PlatformSettings } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusVariant(status: InvoiceStatus): "success" | "warning" | "danger" | "neutral" | "brand" {
  if (status === "paid") return "success";
  if (status === "submitted") return "brand";
  if (status === "pending") return "warning";
  if (status === "overdue") return "danger";
  return "neutral";
}

export default function AdminBillingPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({ upi_id: null, upi_payee_name: null });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (status) params.set("status", status);
      const [invoicesRes, companiesRes, settingsRes] = await Promise.all([
        apiFetch<Paginated<Invoice>>(`/admin/invoices?${params.toString()}`),
        apiFetch<Paginated<AdminCompany>>("/admin/companies?per_page=200"),
        apiFetch<PlatformSettings>("/admin/settings"),
      ]);
      setInvoices(invoicesRes.data);
      setCompanies(companiesRes.data);
      setSettings(settingsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  async function markStatus(invoice: Invoice, status: "paid" | "cancelled" | "overdue") {
    const ok = await confirm({
      title:
        status === "paid"
          ? `Mark this invoice paid?`
          : status === "cancelled"
            ? "Cancel this invoice?"
            : "Mark this invoice overdue?",
      description: invoice.upi_reference ? `UPI reference: ${invoice.upi_reference}` : undefined,
      confirmLabel: status === "paid" ? "Mark paid" : status === "cancelled" ? "Cancel invoice" : "Mark overdue",
      variant: status === "paid" ? "primary" : "danger",
    });
    if (!ok) return;

    setBusyId(invoice.id);
    try {
      await apiFetch(`/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Invoice updated.");
      load(statusFilter);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update invoice.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Invoice>[] = [
    { header: "Company", accessor: (i) => i.company?.name ?? "—" },
    { header: "Period", accessor: (i) => `${formatDate(i.period_start)} – ${formatDate(i.period_end)}` },
    { header: "Amount", accessor: (i) => `${i.currency} ${i.amount}` },
    {
      header: "Status",
      accessor: (i) => (
        <Badge variant={statusVariant(i.status)} dot>
          {i.status}
        </Badge>
      ),
    },
    { header: "UPI reference", accessor: (i) => i.upi_reference ?? "—" },
    {
      header: "Actions",
      className: "w-56",
      accessor: (i) => {
        const busy = busyId === i.id;
        if (i.status === "paid" || i.status === "cancelled") return null;
        return (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => markStatus(i, "paid")}
              className="inline-flex items-center rounded-sm text-success-700 transition-colors hover:text-success-800 hover:underline disabled:opacity-50"
            >
              Mark paid
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => markStatus(i, "cancelled")}
              className="inline-flex items-center rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Billing"
        description="UPI payment settings and every invoice across the platform"
        actions={
          <Button onClick={() => setShowGenerate(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Generate invoice
          </Button>
        }
      />

      <Card title="UPI settings" description="Companies pay their subscription to this UPI id">
        <SettingsForm settings={settings} onSaved={setSettings} />
      </Card>

      <Card>
        <div className="mb-4 sm:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(i) => i.id}
          loading={loading}
          emptyMessage="No invoices yet."
        />
      </Card>

      {showGenerate && (
        <GenerateInvoiceModal
          companies={companies}
          onClose={() => setShowGenerate(false)}
          onSaved={() => {
            setShowGenerate(false);
            load(statusFilter);
          }}
        />
      )}
    </div>
  );
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: PlatformSettings;
  onSaved: (s: PlatformSettings) => void;
}) {
  const toast = useToast();
  const [upiId, setUpiId] = useState(settings.upi_id ?? "");
  const [payeeName, setPayeeName] = useState(settings.upi_payee_name ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUpiId(settings.upi_id ?? "");
    setPayeeName(settings.upi_payee_name ?? "");
  }, [settings]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const res = await apiFetch<PlatformSettings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ upi_id: upiId, upi_payee_name: payeeName }),
      });
      onSaved(res);
      toast.success("Settings saved.");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-md">
      <Input
        label="UPI ID"
        placeholder="worksphere@upi"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        error={errors.upi_id?.[0]}
      />
      <Input
        label="Payee name"
        placeholder="WorkSphere Inc."
        value={payeeName}
        onChange={(e) => setPayeeName(e.target.value)}
        error={errors.upi_payee_name?.[0]}
      />
      {errors.general && <p className="text-sm text-danger-600">{errors.general[0]}</p>}
      <div>
        <Button type="submit" size="sm" isLoading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

function GenerateInvoiceModal({
  companies,
  onClose,
  onSaved,
}: {
  companies: AdminCompany[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState(companies[0] ? String(companies[0].id) : "");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setErrors({});
    try {
      await apiFetch(`/admin/companies/${companyId}/invoices`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes || undefined,
        }),
      });
      toast.success("Invoice generated.");
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
    <Modal open onClose={onClose} title="Generate invoice">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount?.[0]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Period start"
            type="date"
            required
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            error={errors.period_start?.[0]}
          />
          <Input
            label="Period end"
            type="date"
            required
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            error={errors.period_end?.[0]}
          />
        </div>
        <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {errors.general && <p className="text-sm text-danger-600">{errors.general[0]}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Generate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
