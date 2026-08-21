"use client";

import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from "react";
import { CheckCircle2, Clock3, GripVertical, Lock, XCircle, type LucideIcon } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Module } from "@/lib/types";
import { moduleIcon } from "@/lib/moduleIcons";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";

type Lane = "disabled" | "active" | "coming_soon";

function laneOf(m: Module): Lane {
  if (!m.is_available) return "coming_soon";
  return m.is_enabled ? "active" : "disabled";
}

export default function ModulesMarketplacePage() {
  const toast = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<Lane | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Module[] }>("/modules");
      setModules(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the app marketplace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (mod: Module, next: boolean) => {
      setTogglingId(mod.id);
      // Optimistic update so the drag/switch feels immediate.
      setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, is_enabled: next } : m)));
      try {
        await apiFetch(`/modules/${mod.id}/toggle`, {
          method: "PATCH",
          body: JSON.stringify({ is_enabled: next }),
        });
        toast.success(next ? `${mod.name} enabled.` : `${mod.name} disabled.`);
      } catch (err) {
        setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, is_enabled: !next } : m)));
        toast.error(err instanceof ApiError ? err.message : `Failed to update ${mod.name}.`);
      } finally {
        setTogglingId(null);
      }
    },
    [toast]
  );

  function handleDragStart(e: DragEvent<HTMLDivElement>, mod: Module) {
    if (!mod.is_available || togglingId === mod.id) return;
    setDragId(mod.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(mod.id));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, lane: Lane) {
    e.preventDefault();
    setDragOverLane(null);
    const id = Number(e.dataTransfer.getData("text/plain")) || dragId;
    setDragId(null);
    const mod = modules.find((m) => m.id === id);
    if (!mod || lane === "coming_soon" || laneOf(mod) === lane) return;

    if (lane === "active") {
      if (!(mod.is_granted ?? true)) {
        toast.error(`${mod.name} isn't included in your plan. Contact your admin to add it.`);
        return;
      }
      handleToggle(mod, true);
    } else if (lane === "disabled") {
      handleToggle(mod, false);
    }
  }

  const enabledCount = modules.filter((m) => m.is_enabled).length;
  const availableCount = modules.filter((m) => m.is_available).length;

  const disabledModules = modules.filter((m) => laneOf(m) === "disabled");
  const activeModules = modules.filter((m) => laneOf(m) === "active");
  const comingSoonModules = modules.filter((m) => laneOf(m) === "coming_soon");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App Marketplace"
        description="Drag a module into Active to switch it on for your company"
      />

      {!loading && modules.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
            <CheckCircle2 className="size-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{enabledCount}</span>
            {" of "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{availableCount}</span>
            {" available modules enabled"}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <Skeleton className="h-5 w-32" />
              {[0, 1].map((j) => (
                <Skeleton key={j} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <EmptyState message="No modules are available yet." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KanbanLane
            lane="disabled"
            title="Disabled"
            subtitle="Drag into Active to switch on"
            icon={Lock}
            accent="gray"
            modules={disabledModules}
            isDragOver={dragOverLane === "disabled"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverLane("disabled");
            }}
            onDragLeave={() => setDragOverLane((l) => (l === "disabled" ? null : l))}
            onDrop={(e) => handleDrop(e, "disabled")}
          >
            {disabledModules.length === 0 ? (
              <EmptyState message="Everything available is switched on." />
            ) : (
              disabledModules.map((m) => (
                <ModuleCard
                  key={m.id}
                  mod={m}
                  lane="disabled"
                  dragging={dragId === m.id}
                  busy={togglingId === m.id}
                  onDragStart={(e) => handleDragStart(e, m)}
                  onDragEnd={() => setDragId(null)}
                  onMove={() => {
                    if (!(m.is_granted ?? true)) {
                      toast.error(`${m.name} isn't included in your plan. Contact your admin to add it.`);
                      return;
                    }
                    handleToggle(m, true);
                  }}
                />
              ))
            )}
          </KanbanLane>

          <KanbanLane
            lane="active"
            title="Active"
            subtitle="Live for your company right now"
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
              <EmptyState message="Nothing switched on yet — drag a module here." />
            ) : (
              activeModules.map((m) => (
                <ModuleCard
                  key={m.id}
                  mod={m}
                  lane="active"
                  dragging={dragId === m.id}
                  busy={togglingId === m.id}
                  onDragStart={(e) => handleDragStart(e, m)}
                  onDragEnd={() => setDragId(null)}
                  onMove={() => handleToggle(m, false)}
                />
              ))
            )}
          </KanbanLane>

          <KanbanLane
            lane="coming_soon"
            title="Coming Soon"
            subtitle="Not released yet — not actionable"
            icon={Clock3}
            accent="warning"
            modules={comingSoonModules}
            isDragOver={false}
            onDragOver={() => {
              // Not a drop target - no preventDefault, so the browser shows
              // the "not allowed" cursor and no drop event ever fires here.
            }}
            onDragLeave={() => {}}
            onDrop={() => {}}
          >
            {comingSoonModules.length === 0 ? (
              <EmptyState message="Nothing in the pipeline right now." />
            ) : (
              comingSoonModules.map((m) => (
                <ModuleCard key={m.id} mod={m} lane="coming_soon" dragging={false} busy={false} onDragStart={() => {}} onDragEnd={() => {}} />
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
  accent: "gray" | "brand" | "warning";
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
        "flex min-h-[16rem] flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors",
        accent === "brand" && "border-brand-200 bg-brand-50/40 dark:border-brand-800/60 dark:bg-brand-900/10",
        accent === "gray" && "border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40",
        accent === "warning" && "border-warning-200 bg-warning-50/40 dark:border-warning-800/60 dark:bg-warning-900/10",
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
              accent === "brand" && "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
              accent === "gray" && "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
              accent === "warning" && "bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-400"
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
  onMove,
}: {
  mod: Module;
  lane: Lane;
  dragging: boolean;
  busy: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onMove?: () => void;
}) {
  const Icon = moduleIcon(mod.icon);
  const isGranted = mod.is_granted ?? true;
  const locked = lane === "disabled" && !isGranted;
  const draggable = lane !== "coming_soon" && !busy;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all",
        "hover:shadow-md dark:border-gray-700 dark:bg-gray-800",
        dragging && "opacity-40",
        busy && "pointer-events-none opacity-60"
      )}
    >
      {draggable && (
        <span className="mt-0.5 cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600" aria-hidden="true">
          <GripVertical className="size-4" />
        </span>
      )}

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
          {locked && (
            <span title="Not in your plan — contact your admin">
              <Lock className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </span>
          )}
        </div>
        {mod.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {mod.category && <Badge variant="neutral">{mod.category}</Badge>}
          {locked && (
            <Badge variant="neutral" dot>
              Not in your plan
            </Badge>
          )}
        </div>
      </div>

      {onMove && (
        <button
          type="button"
          onClick={onMove}
          disabled={busy}
          title={lane === "disabled" ? "Switch on" : "Switch off"}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors",
            "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          )}
        >
          {lane === "disabled" ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <XCircle className="size-4" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
