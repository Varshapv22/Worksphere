"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList, Users } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import type { AttendanceRecord, Employee, LeaveRequest, Paginated } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [presentToday, setPresentToday] = useState<number | string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [employees, leaveRequests] = await Promise.all([
          apiFetch<Paginated<Employee>>("/employees"),
          apiFetch<Paginated<LeaveRequest>>("/leave-requests?status=pending"),
        ]);
        setHeadcount(employees.meta.total);
        setPendingLeave(leaveRequests.meta.total);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard data.");
      }

      // Fetched separately: the Attendance module may be disabled for this
      // company, in which case this 403s and the stat is simply left blank
      // rather than breaking the rest of the dashboard.
      try {
        const today = todayStr();
        const attendance = await apiFetch<Paginated<AttendanceRecord>>(`/attendance?from=${today}&to=${today}`);
        setPresentToday(attendance.data.filter((r) => r.clock_in).length);
      } catch {
        // Not "still loading" (null) - the module just isn't enabled.
        setPresentToday("—");
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="An overview of your organization today" />
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Headcount" value={headcount} icon={Users} />
        <StatCard label="Present today" value={presentToday} icon={CalendarCheck} />
        <StatCard label="Pending leave requests" value={pendingLeave} icon={ClipboardList} />
      </div>
    </div>
  );
}
