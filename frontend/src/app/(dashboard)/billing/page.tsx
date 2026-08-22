"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Invoice, InvoiceStatus, Paginated, PlatformSettings } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

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

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payment, setPayment] = useState<PlatformSettings>({ upi_id: null, upi_payee_name: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, paymentRes] = await Promise.all([
        apiFetch<Paginated<Invoice>>("/invoices?per_page=50"),
        apiFetch<PlatformSettings>("/invoices/payment-details"),
      ]);
      setInvoices(invoicesRes.data);
      setPayment(paymentRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load billing info.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<Invoice>[] = [
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
      header: "",
      className: "w-40",
      accessor: (i) =>
        i.status === "pending" ? (
          <Button size="sm" variant="secondary" onClick={() => setPayInvoice(i)}>
            Submit payment
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Billing" description="Your subscription invoices and payment history" />

      <Card title="Pay via UPI" description="Transfer your invoice amount to this UPI id, then submit the reference below">
        {!payment.upi_id ? (
          <EmptyState message="Payment details haven't been configured yet — contact support." />
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">UPI ID</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{payment.upi_id}</dd>
            </div>
            {payment.upi_payee_name && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Payee name</dt>
                <dd className="text-gray-700 dark:text-gray-300">{payment.upi_payee_name}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(i) => i.id}
          loading={loading}
          emptyMessage="No invoices yet."
        />
      </Card>

      {payInvoice && (
        <SubmitPaymentModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={() => {
            setPayInvoice(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SubmitPaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/invoices/${invoice.id}/submit-payment`, {
        method: "POST",
        body: JSON.stringify({ upi_reference: reference }),
      });
      toast.success("Payment submitted — awaiting verification.");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Submit UPI payment">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Amount due: <span className="font-medium text-gray-900 dark:text-gray-100">{invoice.currency} {invoice.amount}</span>
        </p>
        <Input
          label="UPI transaction reference"
          required
          autoFocus
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}
