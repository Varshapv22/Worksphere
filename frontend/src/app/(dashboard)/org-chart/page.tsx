"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  GitBranch,
  RotateCcw,
  Search,
  UserMinus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import type { OrgNode } from "@/lib/types";

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function findNode(nodes: OrgNode[], id: number): OrgNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function getDescendantIds(node: OrgNode): Set<number> {
  const ids = new Set<number>();
  const walk = (n: OrgNode) => {
    for (const c of n.children) {
      ids.add(c.id);
      walk(c);
    }
  };
  walk(node);
  return ids;
}

function removeNode(nodes: OrgNode[], id: number): [OrgNode | null, OrgNode[]] {
  let removed: OrgNode | null = null;
  const result: OrgNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      removed = n;
    } else {
      const [r, newChildren] = removeNode(n.children, id);
      if (r) {
        removed = r;
        result.push({ ...n, children: newChildren });
      } else {
        result.push(n);
      }
    }
  }
  return [removed, result];
}

function insertNode(nodes: OrgNode[], parentId: number | null, node: OrgNode): OrgNode[] {
  if (parentId === null) {
    return [...nodes, { ...node, manager_id: null }];
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, { ...node, manager_id: parentId }] };
    }
    return { ...n, children: insertNode(n.children, parentId, node) };
  });
}

function moveNode(roots: OrgNode[], nodeId: number, newManagerId: number | null): OrgNode[] {
  const [removed, without] = removeNode(roots, nodeId);
  if (!removed) return roots;
  return insertNode(without, newManagerId, { ...removed, manager_id: newManagerId });
}

function countAll(nodes: OrgNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.children), 0);
}

// ─── DnD state ────────────────────────────────────────────────────────────────

interface DndState {
  draggingId: number | null;
  dropTargetId: number | null;
  dropToRoot: boolean;
  descendantIds: Set<number>;
}

const IDLE_DND: DndState = {
  draggingId: null,
  dropTargetId: null,
  dropToRoot: false,
  descendantIds: new Set(),
};

// ─── Node card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: OrgNode;
  dnd: DndState;
  searchQuery: string;
  onDragStart: (id: number) => void;
  onDragOver: (id: number) => void;
  onDragLeave: () => void;
  onDrop: (employeeId: number, newManagerId: number) => void;
  onDragEnd: () => void;
  onClick: (id: number) => void;
}

function NodeCard({
  node,
  dnd,
  searchQuery,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
}: NodeCardProps) {
  const isDragging = dnd.draggingId === node.id;
  const isDropTarget = dnd.dropTargetId === node.id && !isDragging;
  const isDescendant = dnd.descendantIds.has(node.id);
  const isInvalid = dnd.draggingId !== null && (isDragging || isDescendant);

  const isHighlighted =
    searchQuery.length > 1 &&
    node.full_name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div
      draggable
      onClick={() => onClick(node.id)}
      onDragStart={() => onDragStart(node.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isInvalid && dnd.draggingId !== node.id) {
          e.dataTransfer.dropEffect = "move";
          onDragOver(node.id);
        } else {
          e.dataTransfer.dropEffect = "none";
        }
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dnd.draggingId !== null && dnd.draggingId !== node.id && !isInvalid) {
          onDrop(dnd.draggingId, node.id);
        }
      }}
      className={cn(
        "relative w-44 rounded-xl border bg-white select-none shadow-sm",
        "dark:bg-gray-800 dark:border-gray-700",
        "transition-all duration-150",
        isDragging
          ? "opacity-30 scale-95 shadow-none"
          : isInvalid
          ? "opacity-40 cursor-not-allowed"
          : "cursor-grab active:cursor-grabbing hover:shadow-md",
        isDropTarget
          ? "ring-2 ring-brand-500 shadow-lg shadow-brand-100/50 dark:shadow-brand-900/50 scale-105"
          : "",
        isHighlighted ? "ring-2 ring-yellow-400 shadow-yellow-100/50" : ""
      )}
    >
      {/* Accent strip */}
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-brand-400 to-brand-600" />

      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Initials avatar */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
            {initials(node.full_name)}
          </div>
          {/* Status dot */}
          <span
            className={cn(
              "ml-auto mt-1 size-2 shrink-0 rounded-full",
              node.employment_status === "active"
                ? "bg-green-400"
                : node.employment_status === "on_leave"
                ? "bg-yellow-400"
                : "bg-red-400"
            )}
          />
        </div>

        {/* Name */}
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
          {node.full_name}
        </p>

        {/* Designation */}
        {node.designation && (
          <p className="mt-0.5 line-clamp-1 text-xs leading-tight text-gray-500 dark:text-gray-400">
            {node.designation.title}
          </p>
        )}

        {/* Department badge */}
        {node.department && (
          <span className="mt-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {node.department.name}
          </span>
        )}

        {/* Direct reports count */}
        {node.children.length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            {node.children.length} direct report
            {node.children.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tree branch ──────────────────────────────────────────────────────────────

interface BranchProps {
  nodes: OrgNode[];
  dnd: DndState;
  searchQuery: string;
  onDragStart: (id: number) => void;
  onDragOver: (id: number) => void;
  onDragLeave: () => void;
  onDrop: (employeeId: number, newManagerId: number) => void;
  onDragEnd: () => void;
  onNodeClick: (id: number) => void;
}

function OrgBranch({
  nodes,
  dnd,
  searchQuery,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onNodeClick,
}: BranchProps) {
  const count = nodes.length;

  return (
    <div className="flex">
      {nodes.map((node, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === count - 1;
        const isOnly = count === 1;

        return (
          <div key={node.id} className="relative flex flex-col items-center px-4">
            {/* Horizontal connector bar segment */}
            {!isOnly && (
              <div
                className="absolute top-0 h-px bg-gray-200 dark:bg-gray-600"
                style={{
                  left: isFirst ? "50%" : 0,
                  right: isLast ? "50%" : 0,
                }}
              />
            )}

            {/* Vertical connector from horizontal to card */}
            <div className="h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-600" />

            {/* Node card */}
            <NodeCard
              node={node}
              dnd={dnd}
              searchQuery={searchQuery}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onClick={onNodeClick}
            />

            {/* Children subtree */}
            {node.children.length > 0 && (
              <>
                <div className="h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-600" />
                <OrgBranch
                  nodes={node.children}
                  dnd={dnd}
                  searchQuery={searchQuery}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  onNodeClick={onNodeClick}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const router = useRouter();
  const [roots, setRoots] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [dnd, setDnd] = useState<DndState>(IDLE_DND);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: OrgNode[]; total: number }>("/org-chart")
      .then((res) => setRoots(res.data))
      .catch(() => setError("Failed to load org chart."))
      .finally(() => setLoading(false));
  }, []);

  const handleDragStart = useCallback(
    (id: number) => {
      const node = findNode(roots, id);
      setDnd({
        draggingId: id,
        dropTargetId: null,
        dropToRoot: false,
        descendantIds: node ? getDescendantIds(node) : new Set(),
      });
    },
    [roots]
  );

  const handleDragOver = useCallback((id: number) => {
    setDnd((prev) => ({ ...prev, dropTargetId: id, dropToRoot: false }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDnd((prev) => ({ ...prev, dropTargetId: null }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDnd(IDLE_DND);
  }, []);

  const handleDrop = useCallback(
    async (employeeId: number, newManagerId: number | null) => {
      const snapshot = roots;
      const updated = moveNode(roots, employeeId, newManagerId);
      setRoots(updated);
      setDnd(IDLE_DND);
      setSaving(true);

      try {
        await apiFetch(`/employees/${employeeId}/manager`, {
          method: "PATCH",
          body: JSON.stringify({ manager_id: newManagerId }),
        });
      } catch (err: unknown) {
        setRoots(snapshot);
        const msg =
          err instanceof Error ? err.message : "Failed to update reporting line.";
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [roots]
  );

  const totalEmployees = useMemo(() => countAll(roots), [roots]);
  const isDragging = dnd.draggingId !== null;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            <GitBranch className="size-5 text-brand-600" />
            Organization Chart
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `${totalEmployees} employees`}
            {" · "}
            Drag cards to reorganize reporting lines
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-brand-600 dark:text-brand-400 animate-pulse">
              Saving…
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => Math.min(+(z + 0.15).toFixed(2), 2))}
            title="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => Math.max(+(z - 0.15).toFixed(2), 0.25))}
            title="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-xs text-gray-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Highlight employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {error}
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Drop-to-root zone — only visible while dragging */}
      {isDragging && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDnd((p) => ({ ...p, dropToRoot: true, dropTargetId: null }));
          }}
          onDragLeave={() => setDnd((p) => ({ ...p, dropToRoot: false }))}
          onDrop={(e) => {
            e.preventDefault();
            if (dnd.draggingId !== null) handleDrop(dnd.draggingId, null);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed py-3 text-center text-sm transition-colors",
            dnd.dropToRoot
              ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
              : "border-gray-200 text-gray-400 dark:border-gray-700"
          )}
        >
          <UserMinus className="mx-auto mb-1 size-4" />
          Drop here to remove manager (promote to root level)
        </div>
      )}

      {/* Tree canvas */}
      <div
        className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/30"
        style={{ minHeight: "28rem" }}
      >
        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-gray-400">
            Loading org chart…
          </div>
        ) : roots.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <Users className="size-10 text-gray-300" />
            <p className="font-medium">No employees found</p>
            <p className="text-xs">Add employees to build your org chart.</p>
          </div>
        ) : (
          <div
            className="flex justify-center p-10"
            style={{ minWidth: "max-content" }}
            onDragEnd={handleDragEnd}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
              }}
            >
              <OrgBranch
                nodes={roots}
                dnd={dnd}
                searchQuery={search}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onNodeClick={(id) => router.push(`/employees/${id}`)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">Status:</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-400" />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-yellow-400" />
          On leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400" />
          Terminated
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-gray-400">
          <span className="inline-flex size-3 rounded border-2 border-brand-500" />
          Drag target
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="inline-flex size-3 rounded border-2 border-yellow-400" />
          Search match
        </span>
      </div>
    </div>
  );
}
