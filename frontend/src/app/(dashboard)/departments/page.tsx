"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useViewAsEmployee } from "@/lib/viewAsEmployeeContext";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { Department, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const viewingAsEmployee = useViewAsEmployee();
  const canManageDepartments = Boolean(user?.permissions?.includes("departments.manage")) && !viewingAsEmployee;
  const toast = useToast();
  const confirm = useConfirm();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // undefined = modal closed, null = creating, Department = editing
  const [modalDept, setModalDept] = useState<Department | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<Department>>("/departments?page=1");
      setDepartments(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number) {
    const ok = await confirm({ title: "Delete this department?", variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/departments/${id}`, { method: "DELETE" });
      toast.success("Department deleted.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete department.");
    }
  }

  const columns: Column<Department>[] = [
    { header: "Name", accessor: (d) => <span className="font-medium text-gray-900 dark:text-gray-100">{d.name}</span> },
    { header: "Description", accessor: (d) => d.description ?? "—" },
    {
      header: "Actions",
      className: "w-32",
      accessor: (d) =>
        canManageDepartments ? (
          <div className="flex gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm text-brand-700 transition-colors hover:text-brand-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              onClick={() => setModalDept(d)}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-600"
              onClick={() => handleDelete(d.id)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Delete
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
        title="Departments"
        description="Organize your company into departments"
        actions={
          canManageDepartments && (
            <Button onClick={() => setModalDept(null)}>
              <Plus className="size-4" aria-hidden="true" />
              Add department
            </Button>
          )
        }
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={departments}
          keyExtractor={(d) => d.id}
          loading={loading}
          emptyMessage="No departments found."
        />
      </Card>
      {modalDept !== undefined && (
        <DepartmentModal
          department={modalDept}
          onClose={() => setModalDept(undefined)}
          onSaved={() => {
            setModalDept(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}

function DepartmentModal({
  department,
  onClose,
  onSaved,
}: {
  department: Department | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (department) {
        await apiFetch(`/departments/${department.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, description: description || null }),
        });
        toast.success("Department updated.");
      } else {
        await apiFetch("/departments", {
          method: "POST",
          body: JSON.stringify({ name, description: description || null }),
        });
        toast.success("Department created.");
      }
      onSaved();
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
    <Modal open onClose={onClose} title={department ? "Edit department" : "Add department"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name?.[0]}
        />
        <Input
          label="Description"
          name="description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description?.[0]}
        />
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
