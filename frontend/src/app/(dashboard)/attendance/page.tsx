"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useViewAsEmployee } from "@/lib/viewAsEmployeeContext";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AttendanceRecord, Employee, Paginated, PaginationMeta } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";

const PER_PAGE = 20;
const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const viewingAsEmployee = useViewAsEmployee();
  const toast = useToast();
  const confirm = useConfirm();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamEmployeeFilter, setTeamEmployeeFilter] = useState("");
  const [teamMembers, setTeamMembers] = useState<{ id: number; full_name: string }[]>([]);
  const [todaysRecord, setTodaysRecord] = useState<AttendanceRecord | null>(null);

  // Managers/admins land straight on the whole team's attendance - there's
  // no personal clock-in clutter on their view. "View as Employee" flips
  // this to false so they see exactly what a regular employee sees: just
  // their own clock-in/out, with no team table.
  const showTeam =
    Boolean(user?.permissions?.includes("attendance.manage") || user?.permissions?.includes("attendance.view")) &&
    !viewingAsEmployee;

  // The paginated table for the page. When not showing the team, this is
  // scoped to the caller's own employee_id — otherwise a manager/admin would
  // get every company record back instead of just their own history.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (showTeam) {
        if (teamEmployeeFilter) params.set("employee_id", teamEmployeeFilter);
      } else if (user?.employee?.id) {
        params.set("employee_id", String(user.employee.id));
      }
      const res = await apiFetch<Paginated<AttendanceRecord>>(`/attendance?${params.toString()}`);
      setRecords(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [page, showTeam, teamEmployeeFilter, user?.employee?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Back to page 1 whenever the view or the team filter changes, so we're
  // never left showing an out-of-range page for the new result set.
  useEffect(() => {
    setPage(1);
  }, [showTeam, teamEmployeeFilter]);

  // Today's clock-in status is fetched independently of the paginated
  // history table above — otherwise it would silently go stale (or blank)
  // whenever the caller is browsing any page but the first.
  const loadToday = useCallback(async () => {
    if (showTeam) {
      setTodaysRecord(null);
      return;
    }
    try {
      const today = todayStr();
      const params = new URLSearchParams({ from: today, to: today, per_page: "1" });
      if (user?.employee?.id) params.set("employee_id", String(user.employee.id));
      const res = await apiFetch<Paginated<AttendanceRecord>>(`/attendance?${params.toString()}`);
      setTodaysRecord(res.data[0] ?? null);
    } catch {
      // Non-fatal — the status card just won't reflect today's state.
    }
  }, [showTeam, user?.employee?.id]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // The Team dropdown needs every employee at the company, not just the 20
  // on the current attendance page, so it's fetched separately.
  useEffect(() => {
    if (!showTeam) {
      setTeamMembers([]);
      return;
    }
    let cancelled = false;
    apiFetch<Paginated<Employee>>("/employees?per_page=200")
      .then((res) => {
        if (cancelled) return;
        setTeamMembers(
          res.data
            .map((e) => ({ id: e.id, full_name: e.full_name }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
        );
      })
      .catch(() => {
        // Non-fatal — the employee filter dropdown just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [showTeam]);

  const clockedIn = Boolean(todaysRecord?.clock_in) && !todaysRecord?.clock_out;
  const completedToday = Boolean(todaysRecord?.clock_in) && Boolean(todaysRecord?.clock_out);

  async function handleClockIn() {
    const ok = await confirm({
      title: "Clock in now?",
      description: "This records the current time as your start of day.",
      confirmLabel: "Clock in",
      variant: "primary",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);
    try {
      await apiFetch("/attendance/clock-in", { method: "POST" });
      toast.success("Clocked in.");
      await Promise.all([load(), loadToday()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock in.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClockOut() {
    const ok = await confirm({
      title: "Clock out now?",
      description: "This records the current time as your end of day.",
      confirmLabel: "Clock out",
      variant: "danger",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);
    try {
      await apiFetch("/attendance/clock-out", { method: "POST" });
      toast.success("Clocked out.");
      await Promise.all([load(), loadToday()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock out.");
    } finally {
      setActionLoading(false);
    }
  }

  const baseColumns: Column<AttendanceRecord>[] = [
    { header: "Date", accessor: (r) => new Date(r.date).toLocaleDateString() },
    {
      header: "Clock in",
      accessor: (r) => {
        if (!r.clock_in) return "—";
        const time = new Date(r.clock_in);
        const isBefore10 = time.getHours() < 10;
        return (
          <span className={isBefore10 ? "font-medium text-danger-600 dark:text-danger-400" : undefined}>
            {time.toLocaleTimeString()}
          </span>
        );
      },
    },
    {
      header: "Clock out",
      accessor: (r) => (r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "—"),
    },
    {
      header: "Status",
      accessor: (r) => (
        <Badge dot variant={r.clock_out ? "neutral" : r.clock_in ? "success" : "warning"}>
          {r.clock_out ? "Completed" : r.clock_in ? "In progress" : "—"}
        </Badge>
      ),
    },
  ];

  const teamColumns: Column<AttendanceRecord>[] = [
    {
      header: "Employee",
      accessor: (r) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {r.employee?.full_name ?? "Unknown employee"}
        </span>
      ),
    },
    ...baseColumns,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Attendance"
        description={showTeam ? "Monitor your team's daily clock-in and clock-out times" : "Track daily clock-in and clock-out times"}
      />

      {!showTeam && (
        <>
          <Card>
            <div className="flex flex-col items-center gap-4 py-6">
              {completedToday ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    You&apos;ve completed today&apos;s attendance
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(todaysRecord!.clock_in!).toLocaleTimeString()} – {new Date(todaysRecord!.clock_out!).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {todaysRecord?.clock_in
                    ? `Clocked in at ${new Date(todaysRecord.clock_in).toLocaleTimeString()}`
                    : "You haven't clocked in today."}
                </p>
              )}
              {error && <p className="text-sm text-danger-600">{error}</p>}
              {clockedIn ? (
                <Button variant="danger" size="lg" isLoading={actionLoading} onClick={handleClockOut}>
                  <LogOut className="size-4" aria-hidden="true" />
                  Clock Out
                </Button>
              ) : !completedToday ? (
                <Button size="lg" isLoading={actionLoading} onClick={handleClockIn}>
                  <LogIn className="size-4" aria-hidden="true" />
                  Clock In
                </Button>
              ) : null}
            </div>
          </Card>

          <Card title="History">
            <Table
              columns={baseColumns}
              data={records}
              keyExtractor={(r) => r.id}
              loading={loading}
              emptyMessage="No attendance records found."
            />
            <div className="mt-4">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          </Card>
        </>
      )}

      {showTeam && (
        <Card title="Team attendance" description="Every employee's clock-in and clock-out history">
          {teamMembers.length > 0 && (
            <div className="mb-4 sm:w-64">
              <Select
                label="Employee"
                value={teamEmployeeFilter}
                onChange={(e) => setTeamEmployeeFilter(e.target.value)}
              >
                <option value="">All employees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Table
            columns={teamColumns}
            data={records}
            keyExtractor={(r) => r.id}
            loading={loading}
            emptyMessage="No attendance records found."
          />
          <div className="mt-4">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
