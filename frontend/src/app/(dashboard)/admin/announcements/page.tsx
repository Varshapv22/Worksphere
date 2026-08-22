"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AdminAnnouncement, AdminCompany, AnnouncementLevel, Paginated } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Table, type Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";

function levelVariant(level: AnnouncementLevel): "info" | "warning" | "danger" {
  if (level === "critical") return "danger";
  if (level === "warning") return "warning";
  return "info";
}

export default function AdminAnnouncementsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<AdminAnnouncement | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [announcementsRes, companiesRes] = await Promise.all([
        apiFetch<{ data: AdminAnnouncement[] }>("/admin/announcements"),
        apiFetch<Paginated<AdminCompany>>("/admin/companies?per_page=200"),
      ]);
      setAnnouncements(announcementsRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(item: AdminAnnouncement) {
    const ok = await confirm({ title: `Delete "${item.title}"?`, variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/admin/announcements/${item.id}`, { method: "DELETE" });
      toast.success("Announcement deleted.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete announcement.");
    }
  }

  const columns: Column<AdminAnnouncement>[] = [
    { header: "Title", accessor: (a) => <span className="font-medium text-gray-900 dark:text-gray-100">{a.title}</span> },
    { header: "Level", accessor: (a) => <Badge variant={levelVariant(a.level)}>{a.level}</Badge> },
    {
      header: "Audience",
      accessor: (a) => (a.audience_type === "all" ? "All companies" : `${a.company_ids?.length ?? 0} companies`),
    },
    {
      header: "Status",
      accessor: (a) => (
        <Badge variant={a.is_active ? "success" : "neutral"} dot>
          {a.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-32",
      accessor: (a) => (
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-brand-700 transition-colors hover:text-brand-800 hover:underline"
            onClick={() => setModalItem(a)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline"
            onClick={() => handleDelete(a)}
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
        title="Announcements"
        description="Banners shown to companies across the platform"
        actions={
          <Button onClick={() => setModalItem(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Add announcement
          </Button>
        }
      />
      <Card>
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <Table
          columns={columns}
          data={announcements}
          keyExtractor={(a) => a.id}
          loading={loading}
          emptyMessage="No announcements yet."
        />
      </Card>
      {modalItem !== undefined && (
        <AnnouncementModal
          item={modalItem}
          companies={companies}
          onClose={() => setModalItem(undefined)}
          onSaved={() => {
            setModalItem(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function AnnouncementModal({
  item,
  companies,
  onClose,
  onSaved,
}: {
  item: AdminAnnouncement | null;
  companies: AdminCompany[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [level, setLevel] = useState<AnnouncementLevel>(item?.level ?? "info");
  const [audienceType, setAudienceType] = useState(item?.audience_type ?? "all");
  const [companyIds, setCompanyIds] = useState<number[]>(item?.company_ids ?? []);
  const [startsAt, setStartsAt] = useState(toDateInputValue(item?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toDateInputValue(item?.ends_at ?? null));
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  function toggleCompany(id: number) {
    setCompanyIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      title,
      body,
      level,
      audience_type: audienceType,
      company_ids: audienceType === "specific" ? companyIds : [],
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      is_active: isActive,
    };

    try {
      if (item) {
        await apiFetch(`/admin/announcements/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Announcement updated.");
      } else {
        await apiFetch("/admin/announcements", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Announcement created.");
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
    <Modal open onClose={onClose} title={item ? "Edit announcement" : "Add announcement"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title?.[0]} />
        <Textarea label="Body" rows={3} required value={body} onChange={(e) => setBody(e.target.value)} error={errors.body?.[0]} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value as AnnouncementLevel)}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </Select>
          <Select
            label="Audience"
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value as "all" | "specific")}
          >
            <option value="all">All companies</option>
            <option value="specific">Specific companies</option>
          </Select>
        </div>
        {audienceType === "specific" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Companies</span>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-600">
              {companies.map((c) => (
                <Checkbox
                  key={c.id}
                  label={c.name}
                  checked={companyIds.includes(c.id)}
                  onChange={() => toggleCompany(c.id)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Starts (optional)" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input label="Ends (optional)" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Checkbox label="Active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
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
