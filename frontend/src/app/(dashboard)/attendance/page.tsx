"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogIn, LogOut, Users } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AttendanceRecord, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type AttendanceTab = "mine" | "team";

export default function AttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AttendanceTab>("mine");
  const [teamEmployeeFilter, setTeamEmployeeFilter] = useState("");

  // Only managers/admins get team-wide records back from the API at all -
  // for a plain employee this is always false and the Team tab stays hidden.
  const canViewTeam = Boolean(
    user?.permissions?.includes("attendance.manage") || user?.permissions?.includes("attendance.view")
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<AttendanceRecord>>("/attendance?per_page=100");
      setRecords(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The API returns every employee's records to a manager/admin, so "my"
  // rows have to be picked out by employee_id - matching on date alone
  // could grab a co-worker's record for today instead of the caller's own.
  const myRecords = useMemo(
    () => (user?.employee ? records.filter((r) => r.employee?.id === user.employee!.id) : records),
    [records, user?.employee]
  );

  const teamMembers = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of records) {
      if (r.employee) map.set(r.employee.id, r.employee.full_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records]);

  const teamRecords = useMemo(
    () => (teamEmployeeFilter ? records.filter((r) => r.employee?.id === Number(teamEmployeeFilter)) : records),
    [records, teamEmployeeFilter]
  );

  const todaysRecord = myRecords.find((r) => r.date.slice(0, 10) === todayStr());
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
      await load();
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
      await load();
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
        description="Track daily clock-in and clock-out times"
        actions={
          canViewTeam && (
            <Tabs
              active={activeTab}
              onChange={(key) => setActiveTab(key as AttendanceTab)}
              items={[
                { key: "mine", label: "My Attendance", icon: LogIn },
                { key: "team", label: "Team", icon: Users },
              ]}
            />
          )
        }
      />

      {activeTab === "mine" && (
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
              data={myRecords}
              keyExtractor={(r) => r.id}
              loading={loading}
              emptyMessage="No attendance records found."
            />
          </Card>
        </>
      )}

      {activeTab === "team" && canViewTeam && (
        <Card title="Team attendance" description="Every employee's clock-in and clock-out history">
          {teamMembers.length > 0 && (
            <div className="mb-4 sm:w-64">
              <Select
                label="Employee"
                value={teamEmployeeFilter}
                onChange={(e) => setTeamEmployeeFilter(e.target.value)}
              >
                <option value="">All employees</option>
                {teamMembers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Table
            columns={teamColumns}
            data={teamRecords}
            keyExtractor={(r) => r.id}
            loading={loading}
            emptyMessage="No attendance records found."
          />
        </Card>
      )}
    </div>
  );
}
