"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Paginated, SupportTicket, TicketStatus } from "@/lib/types";
import { Card } from "@/components/Card";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

function statusVariant(status: TicketStatus): "warning" | "brand" | "success" | "neutral" {
  if (status === "open") return "warning";
  if (status === "in_progress") return "brand";
  if (status === "resolved") return "success";
  return "neutral";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function AdminSupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (status) params.set("status", status);
      const res = await apiFetch<Paginated<SupportTicket>>(`/admin/support-tickets?${params.toString()}`);
      setTickets(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  const columns: Column<SupportTicket>[] = [
    {
      header: "Subject",
      accessor: (t) => (
        <button type="button" className="text-left font-medium text-brand-700 hover:underline" onClick={() => setOpenTicketId(t.id)}>
          {t.subject}
        </button>
      ),
    },
    { header: "Company", accessor: (t) => t.company?.name ?? "—" },
    { header: "Priority", accessor: (t) => t.priority },
    { header: "Status", accessor: (t) => <Badge variant={statusVariant(t.status)} dot>{t.status.replace("_", " ")}</Badge> },
    { header: "Updated", accessor: (t) => formatDateTime(t.updated_at) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Support" description="Support tickets raised by companies" />
      <Card>
        <div className="mb-4 sm:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table columns={columns} data={tickets} keyExtractor={(t) => t.id} loading={loading} emptyMessage="No support tickets." />
      </Card>

      {openTicketId && (
        <TicketModal
          ticketId={openTicketId}
          onClose={() => setOpenTicketId(null)}
          onUpdated={() => load(statusFilter)}
        />
      )}
    </div>
  );
}

function TicketModal({
  ticketId,
  onClose,
  onUpdated,
}: {
  ticketId: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: SupportTicket }>(`/admin/support-tickets/${ticketId}`);
      setTicket(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load ticket.");
    }
  }, [ticketId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/support-tickets/${ticketId}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) });
      setReply("");
      load();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send reply.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      await apiFetch(`/admin/support-tickets/${ticketId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  }

  return (
    <Modal open onClose={onClose} title={ticket?.subject ?? "Ticket"}>
      {!ticket ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{ticket.company?.name}</span>
            <Select value={ticket.status} onChange={(e) => updateStatus(e.target.value)} className="w-auto">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-100 p-3 dark:border-gray-700">
            {ticket.messages?.map((m) => (
              <div key={m.id} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {m.user?.name ?? "—"}
                    {m.user?.is_super_admin && <span className="ml-1.5 text-xs text-brand-600">(support)</span>}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(m.created_at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{m.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleReply} className="flex flex-col gap-2">
            <Textarea rows={3} placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex justify-end">
              <Button type="submit" size="sm" isLoading={submitting}>
                Reply
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
