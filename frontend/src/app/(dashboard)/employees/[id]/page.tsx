"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  Blocks,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Laptop,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useViewAsEmployee } from "@/lib/viewAsEmployeeContext";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type {
  Department,
  Designation,
  Employee,
  Employee360,
  Paginated,
  Profile360Asset,
  Profile360Certificate,
  Profile360Document,
  Profile360Note,
  Profile360Project,
  Profile360Review,
  Profile360Training,
} from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import { cn } from "@/lib/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtMonth(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function tenure(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months}m`;
  return months === 0 ? `${years}y` : `${years}y ${months}m`;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3.5", n <= value ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
      ))}
    </span>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "bg-brand-500" : value >= 3 ? "bg-amber-400" : "bg-danger-400";
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-gray-700">{value}</span>
    </div>
  );
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",      label: "Overview",      icon: User },
  { id: "attendance",    label: "Attendance",    icon: Clock },
  { id: "leave",         label: "Leave",         icon: Calendar },
  { id: "payroll",       label: "Payroll",        icon: TrendingUp },
  { id: "performance",   label: "Performance",   icon: Target },
  { id: "skills",        label: "Skills",        icon: Zap },
  { id: "projects",      label: "Projects",      icon: Briefcase },
  { id: "assets",        label: "Assets",        icon: Laptop },
  { id: "training",      label: "Training",      icon: Blocks },
  { id: "certificates",  label: "Certificates",  icon: Award },
  { id: "documents",     label: "Documents",     icon: FileText },
  { id: "notes",         label: "Notes",         icon: MessageSquare },
  { id: "timeline",      label: "Timeline",      icon: ChevronRight },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusVariant(s?: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "on_leave") return "warning";
  if (s === "terminated") return "danger";
  return "neutral";
}

// ─── Section: Overview ───────────────────────────────────────────────────────

function OverviewSection({ employee, onUpdated, canManage }: { employee: Employee; onUpdated: (e: Employee) => void; canManage: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  // Bail out of an in-progress edit if the viewer's permission to manage
  // employees drops mid-session (e.g. toggling "View as Employee").
  useEffect(() => {
    if (!canManage) setEditing(false);
  }, [canManage]);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [form, setForm] = useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone ?? "",
    date_of_birth: (employee.date_of_birth as string | null | undefined) ? String(employee.date_of_birth).slice(0, 10) : "",
    gender: employee.gender ?? "",
    department_id: employee.department?.id ? String(employee.department.id) : "",
    designation_id: employee.designation?.id ? String(employee.designation.id) : "",
    date_of_joining: employee.date_of_joining ? String(employee.date_of_joining).slice(0, 10) : "",
    employment_status: employee.employment_status ?? "",
  });

  useEffect(() => {
    Promise.all([
      apiFetch<Paginated<Department>>("/departments?page=1"),
      apiFetch<Paginated<Designation>>("/designations?page=1"),
    ]).then(([d, des]) => {
      setDepartments(d.data);
      setDesignations(des.data);
    }).catch(() => {});
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch<{ data: Employee }>(`/employees/${employee.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          department_id: form.department_id ? Number(form.department_id) : null,
          designation_id: form.designation_id ? Number(form.designation_id) : null,
          phone: form.phone || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
        }),
      });
      toast.success("Employee updated.");
      onUpdated(updated.data);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, value?: string | null) => (
    <div key={label}>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{value || "—"}</p>
    </div>
  );

  if (editing) {
    return (
      <Card title="Edit profile" actions={<Button variant="secondary" onClick={() => setEditing(false)}><X className="size-4" />Cancel</Button>}>
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" name="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <Input label="Last name" name="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Date of birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          <Select label="Gender" id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Department" id="dept" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Unassigned</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Designation" id="desig" value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })}>
            <option value="">Unassigned</option>
            {designations.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
          <Input label="Date of joining" name="date_of_joining" type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
          <Select label="Employment status" id="status" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })}>
            <option value="">—</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </Select>
          <div className="col-span-full flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
            <Button type="submit" isLoading={saving}><Save className="size-4" />Save changes</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Personal information" actions={canManage ? <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</Button> : undefined}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          {field("Employee code", employee.employee_code)}
          {field("Email", employee.email)}
          {field("Phone", employee.phone)}
          {field("Date of birth", fmtDate(employee.date_of_birth as string | undefined))}
          {field("Gender", employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : undefined)}
          {field("Date of joining", fmtDate(employee.date_of_joining as string | undefined))}
          {field("Department", employee.department?.name)}
          {field("Designation", employee.designation?.title)}
          {field("Manager", employee.manager?.full_name)}
          {field("Employment status", employee.employment_status?.replace("_", " "))}
        </div>
      </Card>

      {employee.emergency_contact && (
        <Card title="Emergency contact">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            {Object.entries(employee.emergency_contact as Record<string, string>).map(([k, v]) =>
              field(k.replace("_", " "), v)
            )}
          </div>
        </Card>
      )}

      {employee.address && (
        <Card title="Address">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            {Object.entries(employee.address as Record<string, string>).map(([k, v]) =>
              field(k.replace("_", " "), v)
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Section: Attendance ─────────────────────────────────────────────────────

function AttendanceSection({ data }: { data: Employee360["attendance"] }) {
  const records = data.recent;
  const present = records.filter((r) => r.clock_in).length;
  const avgMinutes = records.filter((r) => r.work_minutes).reduce((s, r) => s + (r.work_minutes ?? 0), 0) / (records.filter((r) => r.work_minutes).length || 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Days present (last 30)", value: present, color: "text-brand-600 bg-brand-50" },
          { label: "Days absent", value: records.length - present, color: "text-danger-600 bg-danger-50" },
          { label: "Avg work hours", value: isNaN(avgMinutes) ? "—" : `${Math.floor(avgMinutes / 60)}h ${Math.round(avgMinutes % 60)}m`, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className={cn("text-xl font-bold", color.split(" ")[0])}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <Card>
        {records.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Date", "Clock In", "Clock Out", "Hours"].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const hrs = r.work_minutes ? `${Math.floor(r.work_minutes / 60)}h ${r.work_minutes % 60}m` : "—";
                  return (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">{fmtDate(r.date)}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{r.clock_in ?? "—"}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{r.clock_out ?? "—"}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{hrs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Section: Leave ──────────────────────────────────────────────────────────

function LeaveSection({ data }: { data: Employee360["leave"] }) {
  const statusV = (s: string): "success" | "warning" | "danger" | "neutral" =>
    s === "approved" ? "success" : s === "pending" ? "warning" : s === "rejected" ? "danger" : "neutral";

  return (
    <div className="flex flex-col gap-4">
      {data.balances.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.balances.map((b) => (
            <div key={b.id} className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{b.leave_type}</p>
              <p className="mt-2 text-3xl font-bold text-brand-600">{b.remaining}</p>
              <p className="mt-0.5 text-xs text-gray-400">days remaining</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.min(100, (b.used / b.allocated) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{b.used} used of {b.allocated}</p>
            </div>
          ))}
        </div>
      )}
      <Card title="Recent leave requests">
        {data.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No leave requests yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700">
            {data.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.type}</p>
                  <p className="text-xs text-gray-400">{fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {r.days} day{r.days !== 1 ? "s" : ""}</p>
                  {r.reason && <p className="mt-0.5 text-xs text-gray-500 italic">{r.reason}</p>}
                </div>
                <Badge variant={statusV(r.status)} dot>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Section: Payroll ────────────────────────────────────────────────────────

function PayrollSection({ data }: { data: Employee360["payroll"] }) {
  const records = data.records;
  const latest = records[0];

  return (
    <div className="flex flex-col gap-4">
      {latest && (
        <Card title={`Latest payslip — ${fmtMonth(latest.period_month, latest.period_year)}`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: "Basic salary",  value: latest.basic_salary },
              { label: "Allowances",    value: latest.allowances },
              { label: "Bonus",         value: latest.bonus },
              { label: "Overtime",      value: latest.overtime_pay },
              { label: "Deductions",    value: -latest.deductions },
              { label: "Net salary",    value: latest.net_salary },
            ].map(({ label, value }) => (
              <div key={label} className={cn("rounded-lg p-3", label === "Net salary" ? "bg-brand-50 dark:bg-brand-900/20" : "bg-gray-50 dark:bg-gray-700/30")}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className={cn("mt-1 text-lg font-bold", label === "Net salary" ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-gray-100")}>
                  {value >= 0 ? "" : "−"}{Math.abs(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card title="Salary history">
        {records.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No payroll records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Period", "Basic", "Net Salary", "Status"].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">{fmtMonth(r.period_month, r.period_year)}</td>
                    <td className="py-2.5 text-gray-600 dark:text-gray-400">{r.basic_salary.toLocaleString()}</td>
                    <td className="py-2.5 font-semibold text-brand-700 dark:text-brand-400">{r.net_salary.toLocaleString()}</td>
                    <td className="py-2.5">
                      <Badge variant={r.status === "paid" ? "success" : r.status === "processed" ? "brand" : "neutral"} dot>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Section: Performance ────────────────────────────────────────────────────

function PerformanceSection({ data }: { data: Employee360["performance"] }) {
  const reviews = data.reviews;
  const latest = reviews[0];

  return (
    <div className="flex flex-col gap-4">
      {latest && (
        <Card title={`Latest review — ${latest.review_period}`}>
          <div className="flex flex-col gap-3">
            <RatingBar label="Communication" value={latest.communication_rating} />
            <RatingBar label="Technical" value={latest.technical_rating} />
            <RatingBar label="Teamwork" value={latest.teamwork_rating} />
            <RatingBar label="Leadership" value={latest.leadership_rating} />
            <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-900/20">
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">Overall score</span>
              <span className="text-2xl font-bold text-brand-600">{latest.overall_score.toFixed(1)}<span className="text-sm font-normal text-brand-400">/5</span></span>
            </div>
            {latest.summary && <p className="text-sm text-gray-600 dark:text-gray-400 italic">&ldquo;{latest.summary}&rdquo;</p>}
          </div>
        </Card>
      )}
      <Card title={`All reviews (${reviews.length})`}>
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No performance reviews yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{r.review_period}</p>
                  {r.reviewer && <p className="text-xs text-gray-400">Reviewed by {r.reviewer}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StarRating value={Math.round(r.overall_score)} />
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.overall_score.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Section: Skills ─────────────────────────────────────────────────────────

function SkillsSection({ data }: { data: Employee360["skills"] }) {
  const grouped = data.reduce<Record<string, typeof data>>((acc, s) => {
    const k = s.category ?? "General";
    (acc[k] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Card title={`Skills (${data.length})`}>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No skills recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(grouped).map(([cat, skills]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cat}</p>
              <div className="flex flex-col gap-2">
                {skills.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={s.proficiency} />
                      <span className="text-xs text-gray-400 w-16 text-right">
                        {["", "Beginner", "Basic", "Intermediate", "Advanced", "Expert"][s.proficiency] ?? ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Projects ───────────────────────────────────────────────────────

function ProjectsSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Project[]; onChanged: (items: Profile360Project[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ project_name: "", role: "", start_date: "", status: "active" as Profile360Project["status"] });

  useEffect(() => {
    if (!canManage) setAdding(false);
  }, [canManage]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Project }>(`/employees/${employeeId}/projects`, { method: "POST", body: JSON.stringify(form) });
      onChanged([res.data, ...data]);
      setForm({ project_name: "", role: "", start_date: "", status: "active" });
      setAdding(false);
      toast.success("Project added.");
    } catch { toast.error("Failed to add project."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/projects/${id}`, { method: "DELETE" });
      onChanged(data.filter((p) => p.id !== id));
      toast.success("Project removed.");
    } catch { toast.error("Failed to remove project."); }
  }

  const statusColor: Record<string, string> = { active: "bg-brand-50 text-brand-700 border-brand-200", completed: "bg-success-50 text-success-700 border-success-200", on_hold: "bg-warning-50 text-warning-700 border-warning-200" };

  return (
    <Card title={`Projects (${data.length})`} actions={canManage ? <Button variant="secondary" onClick={() => setAdding((v) => !v)}><Plus className="size-4" />Add</Button> : undefined}>
      {adding && canManage && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Project name" name="project_name" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
            <Input label="Role" name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <Input label="Start date" name="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Select label="Status" id="proj_status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Profile360Project["status"] })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On hold</option>
            </Select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      )}
      {data.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-gray-400">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((p) => (
            <div key={p.id} className={cn("rounded-lg border p-3", statusColor[p.status] ?? "bg-gray-50 border-gray-200")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{p.project_name}</p>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(p.id)} className="rounded p-0.5 text-gray-400 hover:text-danger-600"><Trash2 className="size-3.5" /></button>
                )}
              </div>
              {p.role && <p className="text-xs text-gray-600">{p.role}</p>}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{p.start_date ? fmtDate(p.start_date) : "—"}{p.end_date ? ` → ${fmtDate(p.end_date)}` : ""}</span>
                <span className="capitalize font-medium">{p.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Assets ─────────────────────────────────────────────────────────

function AssetsSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Asset[]; onChanged: (items: Profile360Asset[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", serial_number: "", assigned_date: "" });

  useEffect(() => {
    if (!canManage) setAdding(false);
  }, [canManage]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Asset }>(`/employees/${employeeId}/assets`, { method: "POST", body: JSON.stringify(form) });
      onChanged([...data, res.data]);
      setForm({ name: "", type: "", serial_number: "", assigned_date: "" });
      setAdding(false);
      toast.success("Asset added.");
    } catch { toast.error("Failed to add asset."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/assets/${id}`, { method: "DELETE" });
      onChanged(data.filter((a) => a.id !== id));
      toast.success("Asset removed.");
    } catch { toast.error("Failed to remove asset."); }
  }

  return (
    <Card title={`Assets (${data.length})`} actions={canManage ? <Button variant="secondary" onClick={() => setAdding((v) => !v)}><Plus className="size-4" />Add</Button> : undefined}>
      {adding && canManage && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Asset name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Type" id="asset_type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">Select type</option>
              <option value="laptop">Laptop</option>
              <option value="phone">Phone</option>
              <option value="access_card">Access card</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Serial number" name="serial_number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            <Input label="Assigned date" name="assigned_date" type="date" value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      )}
      {data.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-gray-400">No assets assigned yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700">
              {["Asset", "Type", "Serial No.", "Assigned", "Returned", ""].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400">{h}</th>)}
            </tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">{a.name}</td>
                  <td className="py-2.5 capitalize text-gray-600 dark:text-gray-400">{a.type?.replace("_", " ") ?? "—"}</td>
                  <td className="py-2.5 text-gray-500">{a.serial_number ?? "—"}</td>
                  <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmtDate(a.assigned_date)}</td>
                  <td className="py-2.5">
                    {a.returned_date ? <Badge variant="neutral">{fmtDate(a.returned_date)}</Badge> : <Badge variant="success" dot>Active</Badge>}
                  </td>
                  <td className="py-2.5">
                    {canManage && (
                      <button type="button" onClick={() => handleDelete(a.id)} className="rounded p-1 text-gray-400 hover:text-danger-600"><Trash2 className="size-3.5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Section: Training ───────────────────────────────────────────────────────

function TrainingSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Training[]; onChanged: (items: Profile360Training[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ course_name: "", provider: "", completed_date: "", status: "enrolled" as Profile360Training["status"] });

  useEffect(() => {
    if (!canManage) setAdding(false);
  }, [canManage]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Training }>(`/employees/${employeeId}/training`, { method: "POST", body: JSON.stringify(form) });
      onChanged([res.data, ...data]);
      setForm({ course_name: "", provider: "", completed_date: "", status: "enrolled" });
      setAdding(false);
      toast.success("Training added.");
    } catch { toast.error("Failed to add training."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/training/${id}`, { method: "DELETE" });
      onChanged(data.filter((t) => t.id !== id));
    } catch { toast.error("Failed to remove."); }
  }

  const statusV = (s: string): "success" | "warning" | "danger" | "neutral" =>
    s === "completed" ? "success" : s === "enrolled" ? "brand" as "neutral" : "danger";

  return (
    <Card title={`Training (${data.length})`} actions={canManage ? <Button variant="secondary" onClick={() => setAdding((v) => !v)}><Plus className="size-4" />Add</Button> : undefined}>
      {adding && canManage && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Course name" name="course_name" required value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
            <Input label="Provider" name="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            <Input label="Completion date" name="completed_date" type="date" value={form.completed_date} onChange={(e) => setForm({ ...form, completed_date: e.target.value })} />
            <Select label="Status" id="training_status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Profile360Training["status"] })}>
              <option value="enrolled">Enrolled</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      )}
      {data.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-gray-400">No training records yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700">
          {data.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{t.course_name}</p>
                {t.provider && <p className="text-xs text-gray-400">{t.provider}</p>}
                {t.completed_date && <p className="text-xs text-gray-400">Completed: {fmtDate(t.completed_date)}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusV(t.status)} dot>{t.status}</Badge>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(t.id)} className="rounded p-1 text-gray-400 hover:text-danger-600"><Trash2 className="size-3.5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Certificates ───────────────────────────────────────────────────

function CertificatesSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Certificate[]; onChanged: (items: Profile360Certificate[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", issuer: "", issue_date: "", expiry_date: "" });

  useEffect(() => {
    if (!canManage) setAdding(false);
  }, [canManage]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Certificate }>(`/employees/${employeeId}/certificates`, { method: "POST", body: JSON.stringify(form) });
      onChanged([res.data, ...data]);
      setForm({ name: "", issuer: "", issue_date: "", expiry_date: "" });
      setAdding(false);
      toast.success("Certificate added.");
    } catch { toast.error("Failed to add certificate."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/certificates/${id}`, { method: "DELETE" });
      onChanged(data.filter((c) => c.id !== id));
    } catch { toast.error("Failed to remove."); }
  }

  const isExpired = (d?: string | null) => d && new Date(d) < new Date();

  return (
    <Card title={`Certificates (${data.length})`} actions={canManage ? <Button variant="secondary" onClick={() => setAdding((v) => !v)}><Plus className="size-4" />Add</Button> : undefined}>
      {adding && canManage && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Certificate name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Issuer" name="issuer" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
            <Input label="Issue date" name="issue_date" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            <Input label="Expiry date" name="expiry_date" type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      )}
      {data.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-gray-400">No certificates yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                {c.issuer && <p className="text-xs text-gray-400">{c.issuer}</p>}
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  {c.issue_date && <span>Issued: {fmtDate(c.issue_date)}</span>}
                  {c.expiry_date && (
                    <span className={isExpired(c.expiry_date) ? "text-danger-600" : "text-success-600"}>
                      {isExpired(c.expiry_date) ? "Expired: " : "Expires: "}{fmtDate(c.expiry_date)}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <button type="button" onClick={() => handleDelete(c.id)} className="rounded p-1 text-gray-400 hover:text-danger-600"><Trash2 className="size-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Documents ──────────────────────────────────────────────────────

function DocumentsSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Document[]; onChanged: (items: Profile360Document[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", url: "" });

  useEffect(() => {
    if (!canManage) setAdding(false);
  }, [canManage]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Document }>(`/employees/${employeeId}/documents`, { method: "POST", body: JSON.stringify(form) });
      onChanged([res.data, ...data]);
      setForm({ name: "", type: "", url: "" });
      setAdding(false);
      toast.success("Document added.");
    } catch { toast.error("Failed to add document."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/documents/${id}`, { method: "DELETE" });
      onChanged(data.filter((d) => d.id !== id));
    } catch { toast.error("Failed to remove."); }
  }

  return (
    <Card title={`Documents (${data.length})`} actions={canManage ? <Button variant="secondary" onClick={() => setAdding((v) => !v)}><Plus className="size-4" />Add</Button> : undefined}>
      {adding && canManage && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Document name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Type" id="doc_type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">Select type</option>
              <option value="contract">Contract</option>
              <option value="offer_letter">Offer letter</option>
              <option value="id_proof">ID proof</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="mt-3">
            <Input label="URL (optional)" name="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} hint="Link to the document" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      )}
      {data.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-gray-400">No documents yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700">
          {data.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info-50 text-info-600"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{d.name}</p>
                <p className="text-xs text-gray-400 capitalize">{d.type?.replace("_", " ") ?? "Document"} · {fmtDate(d.created_at)}</p>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">
                  <ExternalLink className="size-4" />
                </a>
              )}
              {canManage && (
                <button type="button" onClick={() => handleDelete(d.id)} className="rounded p-1 text-gray-400 hover:text-danger-600"><Trash2 className="size-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Notes ──────────────────────────────────────────────────────────

function NotesSection({ employeeId, data, onChanged, canManage }: { employeeId: number; data: Profile360Note[]; onChanged: (items: Profile360Note[]) => void; canManage: boolean }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [type, setType] = useState<Profile360Note["type"]>("general");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Profile360Note }>(`/employees/${employeeId}/notes`, { method: "POST", body: JSON.stringify({ body: body.trim(), type }) });
      onChanged([res.data, ...data]);
      setBody("");
      toast.success("Note added.");
    } catch { toast.error("Failed to add note."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/employees/${employeeId}/notes/${id}`, { method: "DELETE" });
      onChanged(data.filter((n) => n.id !== id));
    } catch { toast.error("Failed to delete note."); }
  }

  const noteColors: Record<Profile360Note["type"], string> = {
    general: "bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600",
    hr: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40",
    performance: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40",
  };
  const noteBadge: Record<Profile360Note["type"], "neutral" | "info" | "warning"> = { general: "neutral", hr: "info", performance: "warning" };

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
      <Card title="Add note">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["general", "hr", "performance"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", type === t ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400")}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <textarea
            ref={textRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note about this employee…"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving} disabled={!body.trim()}><MessageSquare className="size-4" />Add note</Button>
          </div>
        </form>
      </Card>
      )}

      {data.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-gray-400">No notes yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((n) => (
            <div key={n.id} className={cn("rounded-xl border p-4", noteColors[n.type])}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={noteBadge[n.type]}>{n.type}</Badge>
                  <span className="text-xs text-gray-400">
                    {n.author && `${n.author} · `}{new Date(n.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(n.id)} className="rounded p-0.5 text-gray-400 hover:text-danger-600"><X className="size-3.5" /></button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Timeline ────────────────────────────────────────────────────────

const timelineIcons: Record<string, typeof User> = {
  joined: Users, payroll: TrendingUp, performance: Target,
  skill: Zap, project: Briefcase, asset: Laptop, training: Blocks,
  certificate: Award, note: MessageSquare,
  leave_approved: CheckCircle2, leave_rejected: XCircle, leave_pending: Calendar,
};

const timelineColors: Record<string, string> = {
  joined: "bg-brand-100 text-brand-700",
  payroll: "bg-success-50 text-success-700",
  performance: "bg-amber-50 text-amber-700",
  skill: "bg-indigo-50 text-indigo-700",
  project: "bg-blue-50 text-blue-700",
  asset: "bg-gray-100 text-gray-700",
  training: "bg-orange-50 text-orange-700",
  certificate: "bg-yellow-50 text-yellow-700",
  note: "bg-gray-50 text-gray-600",
  leave_approved: "bg-success-50 text-success-700",
  leave_rejected: "bg-danger-50 text-danger-700",
  leave_pending: "bg-warning-50 text-warning-700",
};

function TimelineSection({ data }: { data: Employee360["timeline"] }) {
  if (data.length === 0) {
    return <Card><p className="py-8 text-center text-sm text-gray-400">No activity yet.</p></Card>;
  }

  return (
    <Card title="Activity timeline">
      <div className="relative pl-6">
        <div className="absolute left-[11px] top-0 h-full w-px bg-gray-100 dark:bg-gray-700" />
        <div className="flex flex-col gap-5">
          {data.map((event) => {
            const Icon = timelineIcons[event.type] ?? FolderOpen;
            const colorClass = timelineColors[event.type] ?? "bg-gray-50 text-gray-500";
            return (
              <div key={event.id} className="relative flex items-start gap-3">
                <span className={cn("relative z-10 flex size-5.5 shrink-0 items-center justify-center rounded-full", colorClass)}>
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                  {event.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{event.description}</p>}
                  <p className="mt-1 text-xs text-gray-400">{fmtDate(event.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const viewingAsEmployee = useViewAsEmployee();
  const canManageEmployees = Boolean(user?.permissions?.includes("employees.manage")) && !viewingAsEmployee;
  const id = params.id;

  const [data, setData] = useState<Employee360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    setLoading(true);
    apiFetch<Employee360>(`/employees/${id}/360`)
      .then((res) => setData(res))
      .catch(() => toast.error("Failed to load employee profile."))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete this employee?",
      description: "This cannot be undone.",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/employees/${id}`, { method: "DELETE" });
      toast.success("Employee deleted.");
      router.push("/employees");
    } catch {
      toast.error("Failed to delete employee.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-danger-600">Employee not found.</p>;
  }

  const { employee } = data;
  const emp = employee;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-600" />
        <div className="px-6 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-8 flex size-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-700 text-2xl font-bold text-white dark:border-gray-900">
                {initials(emp.full_name)}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{emp.full_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{emp.designation?.title ?? "—"}</span>
                  {emp.department && <><span className="text-gray-300">·</span><span>{emp.department.name}</span></>}
                  <Badge variant={statusVariant(emp.employment_status)} dot>{emp.employment_status?.replace("_", " ") ?? "unknown"}</Badge>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 pb-1">
              {canManageEmployees && (
                <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-100 transition-colors">
                  <Trash2 className="size-3.5" />Delete
                </button>
              )}
            </div>
          </div>

          {/* Quick info strip */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            {emp.email && <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-gray-400" />{emp.email}</span>}
            {emp.phone && <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-gray-400" />{emp.phone}</span>}
            {emp.date_of_joining && <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-gray-400" />Joined {fmtDate(emp.date_of_joining as string)} · {tenure(emp.date_of_joining as string)} tenure</span>}
            <span className="flex items-center gap-1.5"><Users className="size-3.5 text-gray-400" />Code: {emp.employee_code}</span>
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Days present (30d)", value: data.attendance.recent.filter((r) => r.clock_in).length },
              { label: "Leave remaining", value: data.leave.balances.reduce((s, b) => s + b.remaining, 0) },
              { label: "Reviews", value: data.performance.reviews.length },
              { label: "Skills", value: data.skills.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="min-h-64">
        {activeTab === "overview" && (
          <OverviewSection employee={emp} onUpdated={(e) => setData({ ...data, employee: e })} canManage={canManageEmployees} />
        )}
        {activeTab === "attendance" && <AttendanceSection data={data.attendance} />}
        {activeTab === "leave" && <LeaveSection data={data.leave} />}
        {activeTab === "payroll" && <PayrollSection data={data.payroll} />}
        {activeTab === "performance" && <PerformanceSection data={data.performance} />}
        {activeTab === "skills" && <SkillsSection data={data.skills} />}
        {activeTab === "projects" && (
          <ProjectsSection employeeId={emp.id} data={data.projects} onChanged={(items) => setData({ ...data, projects: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "assets" && (
          <AssetsSection employeeId={emp.id} data={data.assets} onChanged={(items) => setData({ ...data, assets: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "training" && (
          <TrainingSection employeeId={emp.id} data={data.training} onChanged={(items) => setData({ ...data, training: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "certificates" && (
          <CertificatesSection employeeId={emp.id} data={data.certificates} onChanged={(items) => setData({ ...data, certificates: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "documents" && (
          <DocumentsSection employeeId={emp.id} data={data.documents} onChanged={(items) => setData({ ...data, documents: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "notes" && (
          <NotesSection employeeId={emp.id} data={data.notes} onChanged={(items) => setData({ ...data, notes: items })} canManage={canManageEmployees} />
        )}
        {activeTab === "timeline" && <TimelineSection data={data.timeline} />}
      </div>
    </div>
  );
}
