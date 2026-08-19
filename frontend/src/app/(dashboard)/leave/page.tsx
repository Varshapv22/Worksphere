"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Gift, ListChecks, Plus, Trash2, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Holiday, LeaveRequest, LeaveStatus, LeaveType, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Select } from "@/components/Select";
import { Radio } from "@/components/Radio";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { cn } from "@/lib/cn";

type LeaveTab = "calendar" | "holidays" | "requests";

function badgeVariant(status: LeaveStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Builds a local midnight Date from just the YYYY-MM-DD prefix, tolerant of
// either a plain date string or a full ISO timestamp from the API — avoids
// both malformed-string bugs and UTC/local timezone day-shift bugs.
function parseApiDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = parseApiDate(startIso);
  const end = parseApiDate(endIso);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// 6 weeks x 7 days covering the full month plus leading/trailing days.
function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Request-leave modal ──────────────────────────────────────────────────────

function RequestLeaveModal({
  open,
  defaultDate,
  leaveTypes,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultDate: string | null;
  leaveTypes: LeaveType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeaveTypeId("");
    setStartDate(defaultDate ?? "");
    setEndDate(defaultDate ?? "");
    setIsHalfDay(false);
    setReason("");
    setFormErrors({});
  }, [open, defaultDate]);

  const isSingleDay = startDate !== "" && startDate === endDate;
  const days =
    !startDate || !endDate
      ? 0
      : isHalfDay && isSingleDay
      ? 0.5
      : daysBetweenInclusive(startDate, endDate);

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
          days,
          is_half_day: isHalfDay && isSingleDay,
          reason: reason || undefined,
        }),
      });
      toast.success("Leave request submitted.");
      onCreated();
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

  return (
    <Modal open={open} onClose={onClose} title="Request leave" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Leave type"
          id="modal_leave_type"
          required
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          error={formErrors.leave_type_id?.[0]}
        >
          <option value="">Select type</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start date"
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              const value = e.target.value;
              setStartDate(value);
              if (endDate && value > endDate) setEndDate(value);
            }}
            error={formErrors.start_date?.[0]}
          />
          <Input
            label="End date"
            type="date"
            required
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={formErrors.end_date?.[0]}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Duration</legend>
          <div className="flex gap-4">
            <Radio
              name="duration"
              value="full_day"
              label="Full day"
              checked={!isHalfDay}
              onChange={() => setIsHalfDay(false)}
            />
            <Radio
              name="duration"
              value="half_day"
              label="Half day"
              checked={isHalfDay}
              disabled={!isSingleDay}
              onChange={() => setIsHalfDay(true)}
            />
          </div>
          {!isSingleDay && (
            <p className="text-xs text-gray-400">Half day only applies to a single-day request.</p>
          )}
        </fieldset>

        <Textarea
          label="Reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={formErrors.reason?.[0]}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          This request covers{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">{days || 0}</span>{" "}
          day{days === 1 ? "" : "s"}.
        </p>

        {formErrors.general && <p className="text-sm text-danger-600">{formErrors.general[0]}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Submit request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaveTab>("calendar");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const toast = useToast();

  const loadHolidays = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Holiday[] }>("/holidays");
      setHolidays(res.data);
    } catch {
      // Non-fatal — the calendar just won't show holiday markers.
    }
  }, []);

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

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays) map.set(h.date.slice(0, 10), h);
    return map;
  }, [holidays]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const r of requests) {
      if (r.status !== "approved" && r.status !== "pending") continue;
      const cur = parseApiDate(r.start_date);
      const end = parseApiDate(r.end_date);
      let guard = 0;
      while (cur.getTime() <= end.getTime() && guard < 366) {
        const iso = toISODate(cur);
        const list = map.get(iso) ?? [];
        list.push(r);
        map.set(iso, list);
        cur.setDate(cur.getDate() + 1);
        guard++;
      }
    }
    return map;
  }, [requests]);

  const monthGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const todayIso = useMemo(() => toISODate(new Date()), []);
  const pendingCount = useMemo(() => requests.filter((r) => r.status === "pending").length, [requests]);

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

  async function handleAddHoliday(e: FormEvent) {
    e.preventDefault();
    setAddingHoliday(true);
    setHolidayError(null);
    try {
      await apiFetch("/holidays", {
        method: "POST",
        body: JSON.stringify({ name: holidayName, date: holidayDate }),
      });
      setHolidayName("");
      setHolidayDate("");
      toast.success("Company holiday added.");
      loadHolidays();
    } catch (err) {
      setHolidayError(err instanceof ApiError ? err.message : "Failed to add holiday.");
    } finally {
      setAddingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id: number) {
    try {
      await apiFetch(`/holidays/${id}`, { method: "DELETE" });
      toast.success("Holiday removed.");
      loadHolidays();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove holiday.");
    }
  }

  const columns: Column<LeaveRequest>[] = [
    { header: "Employee", accessor: (r) => r.employee?.full_name ?? `#${r.employee_id}` },
    { header: "Type", accessor: (r) => r.leave_type?.name ?? `#${r.leave_type_id}` },
    { header: "From", accessor: (r) => r.start_date },
    { header: "To", accessor: (r) => r.end_date },
    { header: "Days", accessor: (r) => (r.is_half_day ? "0.5 (half day)" : r.days) },
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
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-success-200 bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-700 transition-colors hover:bg-success-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600 dark:border-success-900/40 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30"
              onClick={() => handleApprove(r.id)}
            >
              <Check className="size-3.5" aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-danger-200 bg-danger-50 px-2.5 py-1.5 text-xs font-semibold text-danger-700 transition-colors hover:bg-danger-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-600 dark:border-danger-900/40 dark:bg-danger-900/20 dark:text-danger-400 dark:hover:bg-danger-900/30"
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
      <PageHeader
        title="Leave"
        description="Request time off and review your team's requests"
        actions={
          <Tabs
            active={activeTab}
            onChange={(key) => setActiveTab(key as LeaveTab)}
            items={[
              { key: "calendar", label: "Calendar", icon: CalendarDays },
              { key: "holidays", label: "Company Holidays", icon: Gift, badge: holidays.length },
              { key: "requests", label: "Requests", icon: ListChecks, badge: pendingCount },
            ]}
          />
        }
      />

      {activeTab === "calendar" && (
      <Card
        title={viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        description="Click any day to request leave"
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewDate(new Date())}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {w}
              </div>
            ))}
            {monthGrid.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === viewDate.getMonth();
              const holiday = holidaysByDate.get(iso);
              const dayLeaves = leaveByDate.get(iso) ?? [];
              const visible = dayLeaves.slice(0, holiday ? 2 : 3);
              const overflow = dayLeaves.length - visible.length;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setModalDate(iso)}
                  className={cn(
                    "flex min-h-24 flex-col items-start gap-1 bg-white p-1.5 text-left transition-colors hover:bg-brand-50 dark:bg-gray-800 dark:hover:bg-brand-900/20",
                    !inMonth && "bg-gray-50 dark:bg-gray-800/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      iso === todayIso
                        ? "bg-brand-600 text-white"
                        : inMonth
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-300 dark:text-gray-600"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex w-full flex-col gap-0.5">
                    {holiday && (
                      <span title={holiday.name}>
                        <Badge variant="danger" className="w-full !inline-flex truncate">
                          {holiday.name}
                        </Badge>
                      </span>
                    )}
                    {visible.map((r) => (
                      <span
                        key={r.id}
                        title={`${r.employee?.full_name ?? "Employee"} · ${r.leave_type?.name ?? "Leave"} · ${r.status}${r.is_half_day ? " · half day" : ""}`}
                      >
                        <Badge dot variant={badgeVariant(r.status)} className="w-full !inline-flex truncate">
                          {r.employee?.full_name?.split(" ")[0] ?? "Employee"}
                        </Badge>
                      </span>
                    ))}
                    {overflow > 0 && <span className="px-1 text-[11px] text-gray-400">+{overflow} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success-600" aria-hidden="true" /> Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warning-600" aria-hidden="true" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-danger-600" aria-hidden="true" /> Holiday
          </span>
        </div>
      </Card>
      )}

      {activeTab === "holidays" && (
      <Card title="Company Holidays" description="Non-working days visible to everyone on the calendar above">
        <form onSubmit={handleAddHoliday} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Holiday name"
              placeholder="e.g. Independence Day"
              required
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <Input
              label="Date"
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
          </div>
          <Button type="submit" isLoading={addingHoliday}>
            <Plus className="size-4" aria-hidden="true" />
            Add holiday
          </Button>
        </form>
        {holidayError && <p className="mt-2 text-sm text-danger-600">{holidayError}</p>}

        {holidays.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-gray-700 dark:text-gray-200">{h.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{h.date}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="rounded p-1 text-gray-300 transition-colors hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-900/20"
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      )}

      <RequestLeaveModal
        open={modalDate !== null}
        defaultDate={modalDate}
        leaveTypes={leaveTypes}
        onClose={() => setModalDate(null)}
        onCreated={() => {
          setModalDate(null);
          loadRequests();
        }}
      />

      {activeTab === "requests" && (
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
      )}
    </div>
  );
}
