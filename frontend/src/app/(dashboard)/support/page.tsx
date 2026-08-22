"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Paginated, SupportTicket, TicketStatus } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
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

export default function SupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<SupportTicket>>("/support-tickets?per_page=50");
      setTickets(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<SupportTicket>[] = [
    {
      header: "Subject",
      accessor: (t) => (
        <button type="button" className="text-left font-medium text-brand-700 hover:underline" onClick={() => setOpenTicketId(t.id)}>
          {t.subject}
        </button>
      ),
    },
    { header: "Priority", accessor: (t) => t.priority },
    { header: "Status", accessor: (t) => <Badge variant={statusVariant(t.status)} dot>{t.status.replace("_", " ")}</Badge> },
    { header: "Updated", accessor: (t) => formatDateTime(t.updated_at) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Support"
        description="Get help from the WorkSphere team"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New ticket
          </Button>
        }
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table columns={columns} data={tickets} keyExtractor={(t) => t.id} loading={loading} emptyMessage="No support tickets yet." />
      </Card>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {openTicketId && (
        <TicketModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onUpdated={load} />
      )}
    </div>
  );
}

function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/support-tickets", {
        method: "POST",
        body: JSON.stringify({ subject, priority, body }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New support ticket">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <Textarea label="Describe the issue" rows={4} required value={body} onChange={(e) => setBody(e.target.value)} />
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
      const res = await apiFetch<{ data: SupportTicket }>(`/support-tickets/${ticketId}`);
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
      await apiFetch(`/support-tickets/${ticketId}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) });
      setReply("");
      load();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send reply.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={ticket?.subject ?? "Ticket"}>
      {!ticket ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Badge variant={statusVariant(ticket.status)} dot>
            {ticket.status.replace("_", " ")}
          </Badge>
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-100 p-3 dark:border-gray-700">
            {ticket.messages?.map((m) => (
              <div key={m.id} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {m.user?.is_super_admin ? "WorkSphere Support" : (m.user?.name ?? "—")}
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
