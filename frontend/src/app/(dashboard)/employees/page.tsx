"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { GitBranch, Plus, Search, Users } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Department, Designation, Employee, Paginated, PaginationMeta } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Table, type Column } from "@/components/Table";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { ViewToggle } from "@/components/ViewToggle";

const EMPLOYEE_VIEWS = [
  { href: "/employees", label: "List", icon: Users },
  { href: "/org-chart", label: "Org Chart", icon: GitBranch },
];

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentId) params.set("department_id", departmentId);
      params.set("page", String(page));
      const res = await apiFetch<Paginated<Employee>>(`/employees?${params.toString()}`);
      setEmployees(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, page]);

  useEffect(() => {
    apiFetch<Paginated<Department>>("/departments?page=1")
      .then((res) => setDepartments(res.data))
      .catch(() => {
        // Non-fatal — the department filter just stays empty.
      });
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const columns: Column<Employee>[] = [
    {
      header: "Name",
      accessor: (e) => (
        <Link
          href={`/employees/${e.id}`}
          className="rounded-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {e.full_name}
        </Link>
      ),
    },
    { header: "Email", accessor: (e) => e.email },
    {
      header: "Department",
      accessor: (e) => e.department?.name ?? "—",
    },
    { header: "Designation", accessor: (e) => e.designation?.title ?? "—" },
    {
      header: "Status",
      accessor: (e) => (
        <Badge dot variant={e.employment_status === "active" ? "success" : "neutral"}>
          {e.employment_status ?? "—"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Employees"
        description="Manage your organization's workforce"
        actions={
          <>
            <ViewToggle items={EMPLOYEE_VIEWS} />
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add employee
            </Button>
          </>
        }
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Search"
              name="search"
              icon={<Search className="size-4" aria-hidden="true" />}
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="sm:w-56">
            <Select
              label="Department"
              id="department_filter"
              value={departmentId}
              onChange={(e) => {
                setPage(1);
                setDepartmentId(e.target.value);
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}

        <Table
          columns={columns}
          data={employees}
          keyExtractor={(e) => e.id}
          loading={loading}
          emptyMessage="No employees found."
        />

        <div className="mt-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </Card>

      <AddEmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        departments={departments}
        onCreated={() => {
          setModalOpen(false);
          loadEmployees();
        }}
      />
    </div>
  );
}

function AddEmployeeModal({
  open,
  onClose,
  departments,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  departments: Department[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<Paginated<Designation>>("/designations?page=1")
      .then((res) => setDesignations(res.data))
      .catch(() => {
        // Non-fatal — the designation dropdown just stays empty.
      });
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await apiFetch("/employees", {
        method: "POST",
        body: JSON.stringify({
          employee_code: employeeCode,
          first_name: firstName,
          last_name: lastName,
          email,
          department_id: departmentId ? Number(departmentId) : null,
          designation_id: designationId ? Number(designationId) : null,
          date_of_joining: dateOfJoining || null,
        }),
      });
      setEmployeeCode("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setDepartmentId("");
      setDesignationId("");
      setDateOfJoining("");
      toast.success("Employee added.");
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? { general: [err.message] });
      } else {
        setErrors({ general: ["Something went wrong."] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add employee" description="Create a new employee record">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Employee code"
            name="employee_code"
            required
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            error={errors.employee_code?.[0]}
          />
          <Input
            label="Date of joining"
            name="date_of_joining"
            type="date"
            required
            value={dateOfJoining}
            onChange={(e) => setDateOfJoining(e.target.value)}
            error={errors.date_of_joining?.[0]}
          />
          <Input
            label="First name"
            name="first_name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.first_name?.[0]}
          />
          <Input
            label="Last name"
            name="last_name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.last_name?.[0]}
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.[0]}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Department"
            id="new_employee_department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label="Designation"
            id="new_employee_designation"
            value={designationId}
            onChange={(e) => setDesignationId(e.target.value)}
          >
            <option value="">Select designation</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        </div>
        {errors.general && <p className="text-sm text-danger-600">{errors.general[0]}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
