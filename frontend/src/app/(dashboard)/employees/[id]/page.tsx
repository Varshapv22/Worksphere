"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Department, Designation, Employee, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";

interface EmployeeForm {
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  designation_id: string;
  date_of_joining: string;
  employment_status: string;
}

function isWrapped(value: unknown): value is { data: Employee } {
  return typeof value === "object" && value !== null && "data" in value;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [form, setForm] = useState<EmployeeForm>({
    first_name: "",
    last_name: "",
    email: "",
    department_id: "",
    designation_id: "",
    date_of_joining: "",
    employment_status: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [empResponse, depts, desigs] = await Promise.all([
          apiFetch<{ data: Employee } | Employee>(`/employees/${id}`),
          apiFetch<Paginated<Department>>("/departments?page=1"),
          apiFetch<Paginated<Designation>>("/designations?page=1"),
        ]);
        const emp = isWrapped(empResponse) ? empResponse.data : empResponse;
        setEmployee(emp);
        setDepartments(depts.data);
        setDesignations(desigs.data);
        setForm({
          first_name: emp.first_name ?? "",
          last_name: emp.last_name ?? "",
          email: emp.email ?? "",
          department_id: emp.department?.id ? String(emp.department.id) : "",
          designation_id: emp.designation?.id ? String(emp.designation.id) : "",
          date_of_joining: emp.date_of_joining ? emp.date_of_joining.slice(0, 10) : "",
          employment_status: emp.employment_status ?? "",
        });
      } catch (err) {
        setNotice(err instanceof ApiError ? err.message : "Failed to load employee.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setNotice(null);
    try {
      await apiFetch(`/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          department_id: form.department_id ? Number(form.department_id) : null,
          designation_id: form.designation_id ? Number(form.designation_id) : null,
          date_of_joining: form.date_of_joining || null,
          employment_status: form.employment_status || undefined,
        }),
      });
      toast.success("Employee updated.");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        if (!err.errors) toast.error(err.message);
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this employee?")) return;
    try {
      await apiFetch(`/employees/${id}`, { method: "DELETE" });
      toast.success("Employee deleted.");
      router.push("/employees");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete employee.");
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!employee) return <p className="text-sm text-danger-600">{notice ?? "Employee not found."}</p>;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={employee.full_name}
        description={employee.email}
        actions={
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        }
      />
      <Card>
        {notice && <p className="mb-3 text-sm text-gray-700">{notice}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="first_name"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            error={errors.first_name?.[0]}
          />
          <Input
            label="Last name"
            name="last_name"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            error={errors.last_name?.[0]}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email?.[0]}
          />
          <Select
            label="Department"
            id="edit_employee_department"
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label="Designation"
            id="edit_employee_designation"
            value={form.designation_id}
            onChange={(e) => setForm({ ...form, designation_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
          <Input
            label="Date of joining"
            name="date_of_joining"
            type="date"
            value={form.date_of_joining}
            onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
            error={errors.date_of_joining?.[0]}
          />
          <Select
            label="Employment status"
            id="edit_employee_status"
            value={form.employment_status}
            onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
          >
            <option value="">—</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </Select>
          <div className="col-span-full flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="submit" isLoading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
