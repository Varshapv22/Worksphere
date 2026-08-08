"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import type { Employee, Department } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function DiffBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400 text-sm">No change</span>;
  const positive = value > 0;
  return (
    <span className={cn("flex items-center gap-1 text-sm font-semibold", positive ? "text-green-600" : "text-red-600")}>
      {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
      {positive ? "+" : ""}{fmt(value)}
    </span>
  );
}

// ── Simulation result ─────────────────────────────────────────────────────────

interface SimResult {
  employee: { id: number; full_name: string; designation?: string | null; department?: string | null };
  current: { basic_salary: number; net_salary: number; period: string | null };
  simulation: {
    basic_salary: number; allowances: number; bonus: number; overtime_pay: number;
    gross_salary: number; tax: number; tax_rate: number; provident_fund: number; pf_rate: number; net_salary: number;
  };
  comparison: { salary_change_pct: number | null; net_change: number };
}

function SimResultCard({ result }: { result: SimResult }) {
  const sim = result.simulation;
  const cur = result.current;
  const cmp = result.comparison;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{result.employee.full_name}</p>
          {result.employee.designation && <p className="text-xs text-gray-400">{result.employee.designation}</p>}
        </div>
        {cmp.salary_change_pct != null && (
          <span className={cn(
            "rounded-full px-3 py-1 text-sm font-bold",
            cmp.salary_change_pct > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {cmp.salary_change_pct > 0 ? "+" : ""}{cmp.salary_change_pct}%
          </span>
        )}
      </div>

      {/* Before → After */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
          <p className="text-xs text-gray-400">Current Net</p>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{fmt(cur.net_salary)}</p>
        </div>
        <ArrowRight className="size-5 text-gray-300 shrink-0" />
        <div className="flex-1 rounded-lg bg-brand-50 p-3 text-center dark:bg-brand-900/20">
          <p className="text-xs text-brand-500">New Net</p>
          <p className="text-lg font-bold text-brand-700 dark:text-brand-400">{fmt(sim.net_salary)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Basic Salary</span><span className="font-medium">{fmt(sim.basic_salary)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Allowances</span><span className="font-medium">{fmt(sim.allowances)}</span>
        </div>
        {sim.bonus > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Bonus</span><span className="font-medium">{fmt(sim.bonus)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Gross Salary</span><span className="font-medium">{fmt(sim.gross_salary)}</span>
        </div>
        <div className="border-t border-dashed border-gray-200 dark:border-gray-600 my-1" />
        <div className="flex justify-between text-red-600 dark:text-red-400">
          <span>Tax ({sim.tax_rate}%)</span><span>-{fmt(sim.tax)}</span>
        </div>
        <div className="flex justify-between text-red-600 dark:text-red-400">
          <span>Provident Fund ({sim.pf_rate}%)</span><span>-{fmt(sim.provident_fund)}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-600 my-1 pt-1 flex justify-between font-semibold text-gray-900 dark:text-gray-100">
          <span>Net Salary</span>
          <span className="text-brand-600 dark:text-brand-400">{fmt(sim.net_salary)}</span>
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="text-gray-400 text-xs">Change vs current</span>
          <DiffBadge value={cmp.net_change} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayrollSimulatorPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single
  const [employeeId, setEmployeeId] = useState("");
  const [newBasic, setNewBasic] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [pfRate, setPfRate] = useState("8");
  const [singleResult, setSingleResult] = useState<SimResult | null>(null);

  // Bulk
  const [deptId, setDeptId] = useState("");
  const [increasePct, setIncreasePct] = useState("");
  const [bulkResult, setBulkResult] = useState<{ employees: BulkRow[]; total_current_cost: number; total_new_cost: number; total_increase: number } | null>(null);

  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Employee[] }>("/employees?per_page=500"),
      apiFetch<{ data: Department[] }>("/departments"),
    ]).then(([empRes, deptRes]) => {
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    }).catch(() => {});
  }, []);

  async function handleSingleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !newBasic) return;
    setSimulating(true);
    try {
      const res = await apiFetch<{ data: SimResult }>("/payroll/simulate", {
        method: "POST",
        body: JSON.stringify({
          employee_id: parseInt(employeeId),
          new_basic_salary: parseFloat(newBasic),
          tax_rate: parseFloat(taxRate),
          provident_fund_rate: parseFloat(pfRate),
        }),
      });
      setSingleResult(res.data);
    } catch {
      toast.error("Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleBulkSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!increasePct) return;
    setSimulating(true);
    try {
      const res = await apiFetch<{ data: typeof bulkResult }>("/payroll/simulate-bulk", {
        method: "POST",
        body: JSON.stringify({
          department_id: deptId ? parseInt(deptId) : null,
          increase_pct: parseFloat(increasePct),
          tax_rate: parseFloat(taxRate),
          provident_fund_rate: parseFloat(pfRate),
        }),
      });
      setBulkResult(res.data);
    } catch {
      toast.error("Bulk simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll Simulator"
        description="Test salary changes before applying them — see exact impact on gross, tax, and net pay"
      />

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-gray-200 bg-white p-1 w-fit dark:border-gray-700 dark:bg-gray-800">
        {(["single", "bulk"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-medium transition-colors capitalize",
              mode === m
                ? "bg-brand-600 text-white shadow"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            )}
          >
            {m === "single" ? "Single Employee" : "Bulk (Dept / All)"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
            {mode === "single" ? "Simulate Individual" : "Simulate Bulk Increase"}
          </h2>
          <form onSubmit={mode === "single" ? handleSingleSimulate : handleBulkSimulate} className="flex flex-col gap-4">
            {mode === "single" ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Employee *</label>
                  <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className={inp}>
                    <option value="">Choose employee…</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">New Basic Salary *</label>
                  <input type="number" min="0" step="100" value={newBasic} onChange={(e) => setNewBasic(e.target.value)} required className={inp} placeholder="e.g. 55000" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department (optional)</label>
                  <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className={inp}>
                    <option value="">All departments</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Salary Increase % *</label>
                  <input type="number" step="0.1" value={increasePct} onChange={(e) => setIncreasePct(e.target.value)} required className={inp} placeholder="e.g. 10" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tax Rate %</label>
                <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inp} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">PF Rate %</label>
                <input type="number" min="0" max="100" step="0.1" value={pfRate} onChange={(e) => setPfRate(e.target.value)} className={inp} />
              </div>
            </div>
            <Button type="submit" isLoading={simulating} className="mt-2">
              <Calculator className="size-4" /> Run Simulation
            </Button>
          </form>
        </Card>

        {/* Result */}
        <div className="flex flex-col gap-4">
          {mode === "single" ? (
            singleResult ? (
              <SimResultCard result={singleResult} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
                <Calculator className="size-12 text-gray-300" />
                <p className="text-sm text-gray-400">Fill in the form and run a simulation to see results.</p>
              </div>
            )
          ) : bulkResult ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Current Total", value: fmt(bulkResult.total_current_cost) },
                  { label: "New Total", value: fmt(bulkResult.total_new_cost) },
                  { label: "Total Increase", value: fmt(bulkResult.total_increase) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{value}</p>
                  </div>
                ))}
              </div>
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Employee</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Current Basic</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">New Basic</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Net Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800">
                    {bulkResult.employees.map((row) => (
                      <tr key={row.employee_id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{row.full_name}</td>
                        <td className="px-4 py-2.5 text-gray-500">{fmt(row.current_basic)}</td>
                        <td className="px-4 py-2.5 text-brand-600 dark:text-brand-400">{fmt(row.new_basic)}</td>
                        <td className="px-4 py-2.5"><DiffBadge value={row.net_change} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <Users className="size-12 text-gray-300" />
              <p className="text-sm text-gray-400">Select a department and increase %, then run to see impact across all employees.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BulkRow {
  employee_id: number; full_name: string;
  current_basic: number; current_net: number;
  new_basic: number; new_net: number; net_change: number;
}
