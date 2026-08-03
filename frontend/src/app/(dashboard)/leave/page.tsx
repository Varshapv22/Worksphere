"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { LeaveRequest, LeaveStatus, LeaveType, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

function badgeVariant(status: LeaveStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

export default function LeavePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await apiFetch<Paginated<LeaveRequest>>(`/leave-requests${qs}`);
      setRequests(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    apiFetch<Paginated<LeaveType>>("/leave-types?page=1")
      .then((res) => setLeaveTypes(res.data))
      .catch(() => {
        // Non-fatal — the leave type dropdown just stays empty.
      });
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    try {
      await apiFetch("/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          leave_type_id: leaveTypeId ? Number(leaveTypeId) : undefined,
          start_date: startDate,
          end_date: endDate,
          reason: reason || undefined,
        }),
      });
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      toast.success("Leave request submitted.");
      loadRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormErrors(err.errors ?? { general: [err.message] });
      } else {
        setFormErrors({ general: ["Something went wrong."] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: number) {
    try {
      await apiFetch(`/leave-requests/${id}/approve`, { method: "POST" });
      toast.success("Leave request approved.");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve request.");
    }
  }

  async function handleReject(id: number) {
    try {
      await apiFetch(`/leave-requests/${id}/reject`, { method: "POST" });
      toast.success("Leave request rejected.");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject request.");
    }
  }

  const columns: Column<LeaveRequest>[] = [
    { header: "Employee", accessor: (r) => r.employee?.full_name ?? `#${r.employee_id}` },
    { header: "Type", accessor: (r) => r.leave_type?.name ?? `#${r.leave_type_id}` },
    { header: "From", accessor: (r) => r.start_date },
    { header: "To", accessor: (r) => r.end_date },
    {
      header: "Status",
      accessor: (r) => (
        <Badge dot variant={badgeVariant(r.status)}>
          {r.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (r) =>
        r.status === "pending" && r.employee_id !== user?.id ? (
          <div className="flex gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm text-success-700 transition-colors hover:text-green-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600"
              onClick={() => handleApprove(r.id)}
            >
              <Check className="size-3.5" aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-600"
              onClick={() => handleReject(r.id)}
            >
              <X className="size-3.5" aria-hidden="true" />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Leave" description="Request time off and review your team's requests" />

      <Card title="Request leave">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Leave type"
              id="leave_type"
              required
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              <option value="">Select type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
            <Input
              label="Start date"
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={formErrors.start_date?.[0]}
            />
            <Input
              label="End date"
              name="end_date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={formErrors.end_date?.[0]}
            />
            <div className="sm:col-span-2 lg:col-span-1">
              <Textarea
                label="Reason"
                name="reason"
                rows={1}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={formErrors.reason?.[0]}
              />
            </div>
          </div>
          {formErrors.general && (
            <p className="text-sm text-danger-600">{formErrors.general[0]}</p>
          )}
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button type="submit" isLoading={submitting}>
              Submit request
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Requests">
        <div className="mb-4 sm:w-56">
          <Select
            label="Status"
            id="status_filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={requests}
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage="No leave requests found."
        />
      </Card>
    </div>
  );
}
