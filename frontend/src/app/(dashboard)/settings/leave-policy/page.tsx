"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarRange, Loader2, Pencil, Plus, ShieldOff, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/Switch";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import type { LeaveType, Paginated } from "@/lib/types";

interface LeaveTypeForm {
  name: string;
  days_per_year: string;
  is_paid: boolean;
}

const emptyForm: LeaveTypeForm = { name: "", days_per_year: "0", is_paid: true };

function LeaveTypeModal({
  open,
  leaveType,
  onClose,
  onSaved,
}: {
  open: boolean;
  leaveType: LeaveType | null;
  onClose: () => void;
  onSaved: (lt: LeaveType) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<LeaveTypeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      leaveType
        ? {
            name: leaveType.name,
            days_per_year: String(leaveType.days_per_year ?? 0),
            is_paid: leaveType.is_paid ?? true,
          }
        : emptyForm
    );
  }, [open, leaveType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const body = {
        name: form.name,
        days_per_year: Number(form.days_per_year),
        is_paid: form.is_paid,
      };
      const method = leaveType ? "PUT" : "POST";
      const url = leaveType ? `/leave-types/${leaveType.id}` : "/leave-types";
      const res = await apiFetch<{ data: LeaveType }>(url, { method, body: JSON.stringify(body) });
      toast.success(leaveType ? "Leave type updated." : "Leave type added.");
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      } else {
        toast.error("Failed to save leave type.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={leaveType ? "Edit Leave Type" : "Add Leave Type"} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Annual Leave"
          required
          error={errors.name?.[0]}
        />
        <Input
          label="Total days per year"
          type="number"
          min={0}
          value={form.days_per_year}
          onChange={(e) => setForm((f) => ({ ...f, days_per_year: e.target.value }))}
          required
          error={errors.days_per_year?.[0]}
        />
        <Switch
          id="is_paid"
          checked={form.is_paid}
          onChange={(checked) => setForm((f) => ({ ...f, is_paid: checked }))}
          label="Paid leave"
        />
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {leaveType ? "Update" : "Add Leave Type"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function LeavePolicyPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);

  const canManage = Boolean(user?.permissions?.includes("leave.manage"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Paginated<LeaveType>>("/leave-types?page=1");
      setLeaveTypes(res.data);
    } catch {
      // Non-fatal — the list just stays empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(leaveType: LeaveType) {
    const ok = await confirm({
      title: `Remove "${leaveType.name}"?`,
      description: "Employees will no longer be able to request this leave type.",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/leave-types/${leaveType.id}`, { method: "DELETE" });
      setLeaveTypes((prev) => prev.filter((lt) => lt.id !== leaveType.id));
      toast.success("Leave type removed.");
    } catch {
      toast.error("Failed to remove leave type.");
    }
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Leave Policy" description="Configure how much leave employees earn each year" />
        <Card>
          <EmptyState icon={ShieldOff} message="You don't have permission to manage leave policy." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Policy"
        description="Configure the overall leave entitlement employees earn each year"
        actions={
          <Button
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
          >
            <Plus className="size-4" /> Add Leave Type
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : leaveTypes.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CalendarRange className="size-12 text-gray-300" />
            <div>
              <p className="font-semibold text-gray-500">No leave types configured yet</p>
              <p className="mt-1 text-sm text-gray-400">Add your first leave type, like Annual Leave or Sick Leave.</p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="size-4" /> Add Leave Type
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaveTypes.map((lt) => (
            <Card key={lt.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{lt.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {lt.days_per_year ?? 0} <span className="text-sm font-normal text-gray-400">days / year</span>
                  </p>
                  <Badge variant={lt.is_paid ? "success" : "neutral"} className="mt-2">
                    {lt.is_paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(lt);
                      setShowModal(true);
                    }}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-700"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(lt)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <LeaveTypeModal
        open={showModal}
        leaveType={editTarget}
        onClose={() => {
          setShowModal(false);
          setEditTarget(null);
        }}
        onSaved={(lt) => {
          setShowModal(false);
          setEditTarget(null);
          setLeaveTypes((prev) => {
            const idx = prev.findIndex((x) => x.id === lt.id);
            if (idx >= 0) return prev.map((x) => (x.id === lt.id ? lt : x));
            return [...prev, lt];
          });
        }}
      />
    </div>
  );
}
