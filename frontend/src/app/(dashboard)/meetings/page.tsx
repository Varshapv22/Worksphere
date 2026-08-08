"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  X,
  Users,
  ListChecks,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import type { Meeting, MeetingActionItem, Employee, PaginationMeta } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtShort(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  open:        "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  done:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// ── Action Item ───────────────────────────────────────────────────────────────

function ActionItemRow({
  item,
  onStatusChange,
  onDelete,
}: {
  item: MeetingActionItem;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const nextStatus = item.status === "open" ? "in_progress" : item.status === "in_progress" ? "done" : "open";
  return (
    <div className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={() => onStatusChange(item.id, nextStatus)}
        className="shrink-0 text-gray-300 hover:text-brand-500"
        title={`Mark as ${nextStatus}`}
      >
        {item.status === "done"
          ? <CheckCircle2 className="size-4.5 text-green-500" />
          : <Circle className="size-4.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", item.status === "done" && "line-through text-gray-400")}>{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.assignee && (
            <span className="text-xs text-gray-400">{item.assignee.full_name}</span>
          )}
          {item.due_date && (
            <span className="text-xs text-gray-400">Due {fmtShort(item.due_date)}</span>
          )}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColors[item.status])}>
            {item.status.replace("_", " ")}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-gray-300 hover:text-red-500"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── Meeting Card ──────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onDelete,
  onRefresh,
}: {
  meeting: Meeting;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<MeetingActionItem[]>(meeting.action_items);

  async function handleStatusChange(id: number, status: string) {
    try {
      const res = await apiFetch<{ data: MeetingActionItem }>(`/action-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((i) => i.id === id ? res.data : i));
    } catch {
      toast.error("Failed to update item.");
    }
  }

  async function handleDeleteItem(id: number) {
    try {
      await apiFetch(`/action-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Failed to delete item.");
    }
  }

  const done = items.filter((i) => i.status === "done").length;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
          <CalendarCheck className="size-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{meeting.title}</h3>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                <span><Clock className="inline size-3.5 mr-1" />{fmtDate(meeting.meeting_at)}</span>
                {meeting.organizer && <span>by {meeting.organizer.name}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                {expanded ? "Hide" : "View"} ({items.length} items)
              </button>
              <button
                type="button"
                onClick={() => onDelete(meeting.id)}
                className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {meeting.description && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{meeting.description}</p>
          )}

          {items.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <ListChecks className="size-3.5" />
                {done}/{items.length} action items done
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: items.length > 0 ? `${(done / items.length) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          {meeting.notes && (
            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Meeting Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
            </div>
          )}
          {items.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No action items.</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

type ActionItemForm = { title: string; assignee_id: string; due_date: string };

function CreateMeetingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (m: Meeting) => void;
}) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [actionItems, setActionItems] = useState<ActionItemForm[]>([{ title: "", assignee_id: "", due_date: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ data: Employee[] }>("/employees?per_page=500")
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, [open]);

  function addItem() { setActionItems((a) => [...a, { title: "", assignee_id: "", due_date: "" }]); }
  function removeItem(i: number) { setActionItems((a) => a.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ActionItemForm, value: string) {
    setActionItems((a) => a.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Meeting }>("/meetings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          notes: notes || null,
          meeting_at: meetingAt,
          action_items: actionItems.filter((a) => a.title).map((a) => ({
            title: a.title,
            assignee_id: a.assignee_id ? parseInt(a.assignee_id) : null,
            due_date: a.due_date || null,
          })),
        }),
      });
      toast.success("Meeting created!");
      onCreated(res.data);
      setTitle(""); setDescription(""); setNotes(""); setMeetingAt("");
      setActionItems([{ title: "", assignee_id: "", due_date: "" }]);
    } catch {
      toast.error("Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Meeting" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g. Sprint Planning" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date & Time *</label>
            <input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Optional…" />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meeting Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Key decisions, discussion points…" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Action Items</label>
            <button type="button" onClick={addItem} className="text-xs text-brand-600 hover:underline dark:text-brand-400">+ Add</button>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {actionItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)}
                  placeholder="Action item…"
                  className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                <select value={item.assignee_id} onChange={(e) => updateItem(i, "assignee_id", e.target.value)}
                  className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                  <option value="">Assignee</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
                <input type="date" value={item.due_date} onChange={(e) => updateItem(i, "due_date", e.target.value)}
                  className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                {actionItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!title || !meetingAt}>
            <Plus className="size-4" /> Create Meeting
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const toast = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Meeting[]; meta: PaginationMeta }>(`/meetings?page=${page}`);
      setMeetings(res.data);
      setMeta(res.meta);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this meeting?")) return;
    try {
      await apiFetch(`/meetings/${id}`, { method: "DELETE" });
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meeting deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  const totalItems = meetings.reduce((sum, m) => sum + m.action_items.length, 0);
  const doneItems = meetings.reduce((sum, m) => sum + m.action_items.filter((i) => i.status === "done").length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meeting Notes & Action Items"
        description="Capture meeting notes, decisions, and follow-up tasks"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> New Meeting
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Meetings", value: meta.total },
          { label: "Action Items", value: totalItems },
          { label: "Items Done", value: doneItems },
          { label: "Completion Rate", value: totalItems > 0 ? `${Math.round((doneItems / totalItems) * 100)}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loading ? "—" : value}</span>
          </div>
        ))}
      </div>

      {/* Meeting list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
          <CalendarCheck className="size-12 text-gray-300" />
          <div>
            <p className="font-semibold text-gray-500">No meetings yet</p>
            <p className="mt-1 text-sm text-gray-400">Create your first meeting to capture notes and assign tasks.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="size-4" /> New Meeting</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} onRefresh={load} />
            ))}
          </div>
          {meta.last_page > 1 && <Pagination meta={meta} onPageChange={setPage} />}
        </>
      )}

      <CreateMeetingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(m) => { setMeetings((prev) => [m, ...prev]); setShowCreate(false); }}
      />
    </div>
  );
}
