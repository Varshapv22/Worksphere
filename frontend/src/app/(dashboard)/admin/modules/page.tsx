"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

export default function AdminModulesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // undefined = modal closed, null = creating, Module = editing
  const [modalModule, setModalModule] = useState<Module | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Module[] }>("/admin/modules");
      setModules(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load modules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(module: Module) {
    const ok = await confirm({ title: `Delete the "${module.name}" module?`, variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/admin/modules/${module.id}`, { method: "DELETE" });
      toast.success("Module deleted.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete module.");
    }
  }

  const columns: Column<Module>[] = [
    {
      header: "Module",
      accessor: (m) => {
        const Icon = moduleIcon(m.icon);
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{m.name}</div>
              <div className="text-xs text-gray-400">{m.slug}</div>
            </div>
          </div>
        );
      },
    },
    { header: "Category", accessor: (m) => m.category || "—" },
    { header: "Companies enabled", accessor: (m) => m.enabled_company_count ?? 0 },
    {
      header: "Availability",
      accessor: (m) => (
        <Badge variant={m.is_available ? "success" : "warning"} dot>
          {m.is_available ? "Available" : "Coming soon"}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessor: (m) => (
        <Badge variant={m.is_active ? "brand" : "neutral"} dot>
          {m.is_active ? "Listed" : "Hidden"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-32",
      accessor: (m) => (
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-brand-700 transition-colors hover:text-brand-800 hover:underline"
            onClick={() => setModalModule(m)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline"
            onClick={() => handleDelete(m)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App marketplace"
        description="Manage the modules companies can install"
        actions={
          <Button onClick={() => setModalModule(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Add module
          </Button>
        }
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={modules}
          keyExtractor={(m) => m.id}
          loading={loading}
          emptyMessage="No modules in the catalog yet."
        />
      </Card>
      {modalModule !== undefined && (
        <ModuleModal
          module={modalModule}
          onClose={() => setModalModule(undefined)}
          onSaved={() => {
            setModalModule(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}

function ModuleModal({
  module,
  onClose,
  onSaved,
}: {
  module: Module | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(module?.name ?? "");
  const [slug, setSlug] = useState(module?.slug ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [icon, setIcon] = useState(module?.icon ?? "");
  const [category, setCategory] = useState(module?.category ?? "");
  const [isActive, setIsActive] = useState(module?.is_active ?? true);
  const [isAvailable, setIsAvailable] = useState(module?.is_available ?? false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      name,
      slug,
      description: description || null,
      icon: icon || null,
      category: category || null,
      is_active: isActive,
      is_available: isAvailable,
    };

    try {
      if (module) {
        await apiFetch(`/admin/modules/${module.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Module updated.");
      } else {
        await apiFetch("/admin/modules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Module created.");
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
    <Modal open onClose={onClose} title={module ? "Edit module" : "Add module"}>
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
          label="Slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={errors.slug?.[0]}
          hint="Unique identifier, e.g. help-desk"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Icon"
            name="icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            error={errors.icon?.[0]}
            hint="Lucide icon name, e.g. Clock"
          />
          <Input
            label="Category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            error={errors.category?.[0]}
            hint="e.g. Operations"
          />
        </div>
        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description?.[0]}
        />
        <Checkbox
          label="Listed in the marketplace"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Checkbox
          label="Available to enable (uncheck to show as “Coming soon”)"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
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
