"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Lock,
  Search,
  type LucideIcon,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { AdminCompany, Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";

type Lane = "active" | "inactive";

export default function AdminCompanyModulesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const companyId = params.id;

  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<Lane | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, modulesRes] = await Promise.all([
        apiFetch<{ data: AdminCompany }>(`/admin/companies/${companyId}`),
        apiFetch<{ data: Module[] }>(`/admin/companies/${companyId}/modules`),
      ]);
      setCompany(companyRes.data);
      setModules(modulesRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load module access.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const setGrant = useCallback(
    async (mod: Module, granted: boolean) => {
      if ((mod.is_granted ?? true) === granted || pendingId === mod.id) return;
      setPendingId(mod.id);
      setModules((prev) =>
        prev.map((m) =>
          m.id === mod.id ? { ...m, is_granted: granted, is_enabled: granted ? m.is_enabled : false } : m
        )
      );
      try {
        await apiFetch(`/admin/companies/${companyId}/modules/${mod.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_granted: granted }),
        });
        toast.success(
          granted
            ? `${mod.name} activated for ${company?.name ?? "this company"}.`
            : `${mod.name} deactivated for ${company?.name ?? "this company"}.`
        );
      } catch (err) {
        setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, is_granted: !granted } : m)));
        toast.error(err instanceof ApiError ? err.message : `Failed to update ${mod.name}.`);
      } finally {
        setPendingId(null);
      }
    },
    [companyId, company?.name, toast, pendingId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
    );
  }, [modules, query]);

  const activeModules = filtered.filter((m) => m.is_granted ?? true);
  const inactiveModules = filtered.filter((m) => !(m.is_granted ?? true));

  const persistActiveOrder = useCallback(
    async (ordered: Module[]) => {
      const moduleIds = ordered.filter((m) => m.is_granted ?? true).map((m) => m.id);
      if (moduleIds.length === 0) return;
      try {
        await apiFetch(`/admin/companies/${companyId}/modules/reorder`, {
          method: "POST",
          body: JSON.stringify({ module_ids: moduleIds }),
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to save the new module order.");
        load();
      }
    },
    [companyId, toast, load]
  );

  function handleDragStart(e: DragEvent<HTMLDivElement>, mod: Module) {
    setDragId(mod.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(mod.id));
  }

  // Hovering one card over another within the same lane live-reorders the
  // list so the drop position is obvious. Hovering across lanes is ignored
  // here - that transition (and its grant/revoke side effect) happens on drop.
  function handleCardDragOver(e: DragEvent<HTMLDivElement>, overMod: Module) {
    e.preventDefault();
    e.stopPropagation();
    if (dragId === null || dragId === overMod.id) return;
    setModules((prev) => {
      const dragged = prev.find((m) => m.id === dragId);
      if (!dragged) return prev;
      const draggedIsActive = dragged.is_granted ?? true;
      const overIsActive = overMod.is_granted ?? true;
      if (draggedIsActive !== overIsActive) return prev;
      const without = prev.filter((m) => m.id !== dragId);
      const overIndex = without.findIndex((m) => m.id === overMod.id);
      if (overIndex === -1) return prev;
      without.splice(overIndex, 0, dragged);
      return without;
    });
  }

  function handleCardDrop(e: DragEvent<HTMLDivElement>, overMod: Module) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLane(null);
    const id = Number(e.dataTransfer.getData("text/plain")) || dragId;
    setDragId(null);
    const dragged = modules.find((m) => m.id === id);
    if (!dragged) return;
    const overIsActive = overMod.is_granted ?? true;
    const draggedIsActive = dragged.is_granted ?? true;
    if (draggedIsActive !== overIsActive) {
      setGrant(dragged, overIsActive);
      return;
    }
    if (overIsActive) {
      persistActiveOrder(modules);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, lane: Lane) {
    e.preventDefault();
    setDragOverLane(null);
    const id = Number(e.dataTransfer.getData("text/plain")) || dragId;
    const mod = modules.find((m) => m.id === id);
    setDragId(null);
    if (!mod) return;
    const wasGranted = mod.is_granted ?? true;
    const targetIsActive = lane === "active";
    if (wasGranted !== targetIsActive) {
      setGrant(mod, targetIsActive);
      return;
    }
    if (targetIsActive) {
      // Dropped on empty space in the Active lane (not on a specific card) - move to the end.
      const without = modules.filter((m) => m.id !== id);
      let lastActiveIndex = -1;
      without.forEach((m, i) => {
        if (m.is_granted ?? true) lastActiveIndex = i;
      });
      without.splice(lastActiveIndex + 1, 0, mod);
      setModules(without);
      persistActiveOrder(without);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/companies")} className="w-fit">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to companies
      </Button>

      <PageHeader
        title={company ? `Module access — ${company.name}` : "Module access"}
        description="Drag a module across to activate or deactivate it, or use the arrow buttons. Drag within Active to set the order this company sees them in — deactivating turns a module off for them immediately."
        actions={
          company && (
            <Badge variant={company.is_active ? "success" : "neutral"} dot>
              {company.subscription_plan ? `${company.subscription_plan.name} plan` : "No plan"}
            </Badge>
          )
        }
      />

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-400">
          {error}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <Skeleton className="h-5 w-32" />
              {[0, 1, 2].map((j) => (
                <Skeleton key={j} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KanbanLane
            lane="inactive"
            title="Inactive"
            subtitle="Not part of this company's plan"
            icon={Lock}
            accent="gray"
            modules={inactiveModules}
            isDragOver={dragOverLane === "inactive"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverLane("inactive");
            }}
            onDragLeave={() => setDragOverLane((l) => (l === "inactive" ? null : l))}
            onDrop={(e) => handleDrop(e, "inactive")}
          >
            {inactiveModules.length === 0 ? (
              <EmptyState message={query ? "No matching modules." : "Every module is active for this company."} />
            ) : (
              inactiveModules.map((m) => (
                <ModuleCard
                  key={m.id}
                  mod={m}
                  lane="inactive"
                  dragging={dragId === m.id}
                  busy={pendingId === m.id}
                  onDragStart={(e) => handleDragStart(e, m)}
                  onDragEnd={() => setDragId(null)}
                  onCardDragOver={(e) => handleCardDragOver(e, m)}
                  onCardDrop={(e) => handleCardDrop(e, m)}
                  onMove={() => setGrant(m, true)}
                />
              ))
            )}
          </KanbanLane>

          <KanbanLane
            lane="active"
            title="Active"
            subtitle="Available on this company's App Marketplace"
            icon={CheckCircle2}
            accent="brand"
            modules={activeModules}
            isDragOver={dragOverLane === "active"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverLane("active");
            }}
            onDragLeave={() => setDragOverLane((l) => (l === "active" ? null : l))}
            onDrop={(e) => handleDrop(e, "active")}
          >
            {activeModules.length === 0 ? (
              <EmptyState message={query ? "No matching modules." : "No modules activated yet."} />
            ) : (
              activeModules.map((m) => (
                <ModuleCard
                  key={m.id}
                  mod={m}
                  lane="active"
                  dragging={dragId === m.id}
                  busy={pendingId === m.id}
                  onDragStart={(e) => handleDragStart(e, m)}
                  onDragEnd={() => setDragId(null)}
                  onCardDragOver={(e) => handleCardDragOver(e, m)}
                  onCardDrop={(e) => handleCardDrop(e, m)}
                  onMove={() => setGrant(m, false)}
                />
              ))
            )}
          </KanbanLane>
        </div>
      )}
    </div>
  );
}

function KanbanLane({
  title,
  subtitle,
  icon: Icon,
  accent,
  modules,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  lane: Lane;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: "gray" | "brand";
  modules: Module[];
  isDragOver: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors min-h-[16rem]",
        accent === "brand"
          ? "border-brand-200 bg-brand-50/40 dark:border-brand-800/60 dark:bg-brand-900/10"
          : "border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40",
        isDragOver &&
          (accent === "brand"
            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300 dark:bg-brand-900/30 dark:ring-brand-700"
            : "border-gray-400 bg-gray-100 ring-2 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600")
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              accent === "brand"
                ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
          {modules.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function ModuleCard({
  mod,
  lane,
  dragging,
  busy,
  onDragStart,
  onDragEnd,
  onCardDragOver,
  onCardDrop,
  onMove,
}: {
  mod: Module;
  lane: Lane;
  dragging: boolean;
  busy: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onCardDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onCardDrop: (e: DragEvent<HTMLDivElement>) => void;
  onMove: () => void;
}) {
  const Icon = moduleIcon(mod.icon);

  return (
    <div
      draggable={!busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onCardDragOver}
      onDrop={onCardDrop}
      className={cn(
        "group flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all",
        "hover:shadow-md dark:border-gray-700 dark:bg-gray-800",
        dragging && "opacity-40",
        busy && "pointer-events-none opacity-60"
      )}
    >
      <span className="mt-0.5 cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600" aria-hidden="true">
        <GripVertical className="size-4" />
      </span>

      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          lane === "active"
            ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{mod.name}</h3>
          {!mod.is_available && (
            <span title="Not yet released platform-wide">
              <Clock3 className="size-3.5 shrink-0 text-warning-500" aria-hidden="true" />
            </span>
          )}
        </div>
        {mod.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {mod.category && <Badge variant="neutral">{mod.category}</Badge>}
          {mod.is_enabled && (
            <Badge variant="success" dot>
              Switched on
            </Badge>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onMove}
        disabled={busy}
        title={lane === "inactive" ? "Activate for this company" : "Deactivate for this company"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors",
          "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        )}
      >
        {lane === "inactive" ? (
          <ChevronRight className="size-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
