"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import type { Employee, Paginated, PaginationMeta, Recognition, RecognitionBadge } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const badgeColorMap: Record<string, string> = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700",
  blue:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700",
  green:  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700",
  brand:  "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-700",
  red:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700",
  teal:   "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-700",
};

function badgeClass(color: string) {
  return badgeColorMap[color] ?? badgeColorMap.brand;
}

// ─── Badge showcase card ──────────────────────────────────────────────────────

function BadgeCard({ badge, selected, onClick }: { badge: RecognitionBadge; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
        onClick ? "cursor-pointer hover:shadow-md" : "cursor-default",
        selected
          ? "border-brand-400 bg-brand-50 ring-2 ring-brand-300 dark:bg-brand-900/20"
          : onClick
          ? "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800"
          : cn("border", badgeClass(badge.color))
      )}
    >
      <span className="text-3xl leading-none">{badge.emoji}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{badge.name}</p>
        {badge.description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-snug">{badge.description}</p>
        )}
      </div>
    </button>
  );
}

// ─── Recognition card ────────────────────────────────────────────────────────

function RecognitionCard({
  recognition,
  onDelete,
  deleting,
}: {
  recognition: Recognition;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const emp = recognition.employee;
  const badge = recognition.badge;
  const awarder = recognition.awarded_by;

  return (
    <div className="group flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Avatar */}
      <div className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
      )}>
        {emp ? initials(emp.full_name) : "?"}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {emp?.full_name ?? "Unknown"}
          </span>
          <span className="text-gray-400">received</span>
          {badge && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
              badgeClass(badge.color)
            )}>
              {badge.emoji} {badge.name}
            </span>
          )}
        </div>

        {emp?.designation && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{emp.designation}</p>
        )}

        {recognition.message && (
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 italic leading-relaxed dark:bg-gray-700/50 dark:text-gray-300">
            &ldquo;{recognition.message}&rdquo;
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          {awarder && <span>from <span className="font-medium text-gray-600 dark:text-gray-300">{awarder.name}</span></span>}
          <span>·</span>
          <span>{timeAgo(recognition.created_at)}</span>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(recognition.id)}
        disabled={deleting}
        className="ml-auto shrink-0 self-start rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
        title="Remove recognition"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </div>
  );
}

// ─── Award modal ─────────────────────────────────────────────────────────────

function AwardModal({
  open,
  badges,
  onClose,
  onAwarded,
}: {
  open: boolean;
  badges: RecognitionBadge[];
  onClose: () => void;
  onAwarded: (r: Recognition) => void;
}) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | "">("");
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedEmployee("");
    setSelectedBadge(null);
    setMessage("");
    setEmpSearch("");
    setEmpLoading(true);
    apiFetch<{ data: Employee[] }>("/employees?per_page=500")
      .then((res) => setEmployees(res.data))
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, [open]);

  const filteredEmployees = empSearch
    ? employees.filter((e) => e.full_name.toLowerCase().includes(empSearch.toLowerCase()))
    : employees;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee || !selectedBadge) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Recognition }>("/recognitions", {
        method: "POST",
        body: JSON.stringify({ employee_id: selectedEmployee, badge_id: selectedBadge, message: message.trim() || null }),
      });
      toast.success("Recognition awarded!");
      onAwarded(res.data);
    } catch {
      toast.error("Failed to award recognition.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Award Recognition" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Employee picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Select Employee
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {empLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-400">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No employees found.</p>
            ) : (
              filteredEmployees.slice(0, 50).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmployee(emp.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    selectedEmployee === emp.id
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                    {initials(emp.full_name)}
                  </span>
                  <span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{emp.full_name}</span>
                    {emp.designation && (
                      <span className="ml-1.5 text-xs text-gray-400">{emp.designation.title}</span>
                    )}
                  </span>
                  {selectedEmployee === emp.id && <ChevronRight className="ml-auto size-4 text-brand-500" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Badge picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Choose a Badge
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {badges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                selected={selectedBadge === badge.id}
                onClick={() => setSelectedBadge(badge.id === selectedBadge ? null : badge.id)}
              />
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Message <span className="font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why does this person deserve this badge? Share what they did…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="text-right text-xs text-gray-400">{message.length}/500</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            isLoading={saving}
            disabled={!selectedEmployee || !selectedBadge}
          >
            <Award className="size-4" />
            Award Recognition
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecognitionPage() {
  const toast = useToast();
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [badges, setBadges] = useState<RecognitionBadge[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAward, setShowAward] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, badgeRes] = await Promise.all([
        apiFetch<Paginated<Recognition>>(`/recognitions?page=${page}`),
        apiFetch<{ data: RecognitionBadge[] }>("/badges"),
      ]);
      setRecognitions(recRes.data);
      setMeta(recRes.meta);
      setBadges(badgeRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: number) {
    if (!confirm("Remove this recognition?")) return;
    setDeleting(id);
    try {
      await apiFetch(`/recognitions/${id}`, { method: "DELETE" });
      setRecognitions((prev) => prev.filter((r) => r.id !== id));
      setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
      toast.success("Recognition removed.");
    } catch {
      toast.error("Failed to remove.");
    } finally {
      setDeleting(null);
    }
  }

  function handleAwarded(r: Recognition) {
    setShowAward(false);
    setRecognitions((prev) => [r, ...prev]);
    setMeta((m) => ({ ...m, total: m.total + 1 }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employee Recognition"
        description="Celebrate achievements and award badges across the team"
        actions={
          <Button onClick={() => setShowAward(true)}>
            <Award className="size-4" />
            Award Recognition
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Recognitions", value: meta.total, icon: Trophy },
          { label: "Badges Available", value: badges.length, icon: Award },
          { label: "This Month", value: "—", icon: Users },
          { label: "Recognition Culture", value: meta.total > 0 ? "🔥 Active" : "💤 Quiet", icon: null },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="size-4 text-brand-500" />}
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loading ? "—" : value}</span>
          </div>
        ))}
      </div>

      {/* Badge showcase */}
      {badges.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Available Badges</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center",
                  badgeClass(badge.color)
                )}
              >
                <span className="text-2xl leading-none">{badge.emoji}</span>
                <span className="text-xs font-semibold leading-snug">{badge.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recognition feed */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Recognition Feed
            {!loading && <span className="ml-2 text-sm font-normal text-gray-400">{meta.total} total</span>}
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="size-11 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-8 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : recognitions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
            <Trophy className="size-12 text-gray-300" />
            <div>
              <p className="font-semibold text-gray-500">No recognitions yet</p>
              <p className="mt-1 text-sm text-gray-400">Be the first to celebrate a teammate&apos;s achievement.</p>
            </div>
            <Button onClick={() => setShowAward(true)}>
              <Award className="size-4" />
              Award first recognition
            </Button>
          </div>
        ) : (
          <>
            {recognitions.map((r) => (
              <RecognitionCard
                key={r.id}
                recognition={r}
                onDelete={handleDelete}
                deleting={deleting === r.id}
              />
            ))}
            {meta.last_page > 1 && (
              <Pagination meta={meta} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      <AwardModal
        open={showAward}
        badges={badges}
        onClose={() => setShowAward(false)}
        onAwarded={handleAwarded}
      />
    </div>
  );
}
