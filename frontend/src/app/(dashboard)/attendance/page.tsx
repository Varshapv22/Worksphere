"use client";

import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { AttendanceRecord, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const toast = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<AttendanceRecord>>("/attendance");
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

  const todaysRecord = records.find((r) => r.date.slice(0, 10) === todayStr());
  const clockedIn = Boolean(todaysRecord?.clock_in) && !todaysRecord?.clock_out;

  async function handleClockIn() {
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

  const columns: Column<AttendanceRecord>[] = [
    { header: "Date", accessor: (r) => new Date(r.date).toLocaleDateString() },
    {
      header: "Clock in",
      accessor: (r) => (r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "—"),
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Attendance" description="Track daily clock-in and clock-out times" />

      <Card>
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-gray-600">
            {todaysRecord?.clock_in
              ? `Clocked in at ${new Date(todaysRecord.clock_in).toLocaleTimeString()}`
              : "You haven't clocked in today."}
          </p>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          {clockedIn ? (
            <Button
              variant="danger"
              size="lg"
              isLoading={actionLoading}
              onClick={handleClockOut}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Clock Out
            </Button>
          ) : (
            <Button
              size="lg"
              isLoading={actionLoading}
              disabled={Boolean(todaysRecord?.clock_out)}
              onClick={handleClockIn}
            >
              <LogIn className="size-4" aria-hidden="true" />
              Clock In
            </Button>
          )}
        </div>
      </Card>

      <Card title="History">
        <Table
          columns={columns}
          data={records}
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage="No attendance records found."
        />
      </Card>
    </div>
  );
}
