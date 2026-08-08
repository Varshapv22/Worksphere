"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Users,
  BookOpen,
  Pencil,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import type { CareerTrack, CareerStep, Employee } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ step, index, completed }: { step: CareerStep; index: number; completed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      completed
        ? "border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
          completed
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-gray-300 text-gray-400 dark:border-gray-600"
        )}>
          {completed ? <CheckCircle2 className="size-4" /> : index + 1}
        </div>
        <span className={cn("flex-1 font-medium text-sm", completed ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-gray-100")}>
          {step.title}
        </span>
        {(step.description || step.skills_required.length > 0 || step.resources.length > 0) && (
          expanded ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 ml-10 space-y-3">
          {step.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
          )}
          {step.skills_required.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Skills Required</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills_required.map((s, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {step.resources.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Resources</p>
              <ul className="space-y-1">
                {step.resources.map((r, i) => (
                  <li key={i}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      <BookOpen className="size-3.5" />
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Track card ────────────────────────────────────────────────────────────────

function TrackCard({
  track,
  onDelete,
  onEnroll,
}: {
  track: CareerTrack;
  onDelete: (id: number) => void;
  onEnroll: (track: CareerTrack) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
          <TrendingUp className="size-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{track.title}</h3>
              <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">
                <Target className="inline size-3.5 mr-1" />
                {track.target_role}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => onEnroll(track)}>
                <Users className="size-3.5" /> Enroll
              </Button>
              <button
                type="button"
                onClick={() => onDelete(track.id)}
                className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          {track.description && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{track.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-400">{track.steps.length} steps</span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-brand-600 hover:underline dark:text-brand-400"
            >
              {expanded ? "Hide steps" : "View steps"}
            </button>
          </div>
        </div>
      </div>

      {expanded && track.steps.length > 0 && (
        <div className="mt-4 space-y-2">
          {track.steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} completed={false} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Create Track Modal ────────────────────────────────────────────────────────

type StepForm = { title: string; description: string; skills_required: string; };

function CreateTrackModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (track: CareerTrack) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([{ title: "", description: "", skills_required: "" }]);
  const [saving, setSaving] = useState(false);

  function addStep() {
    setSteps((s) => [...s, { title: "", description: "", skills_required: "" }]);
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof StepForm, value: string) {
    setSteps((s) => s.map((step, idx) => idx === i ? { ...step, [field]: value } : step));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !targetRole) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: CareerTrack }>("/career-tracks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          target_role: targetRole,
          steps: steps.filter((s) => s.title).map((s) => ({
            title: s.title,
            description: s.description || null,
            skills_required: s.skills_required
              ? s.skills_required.split(",").map((x) => x.trim()).filter(Boolean)
              : [],
          })),
        }),
      });
      toast.success("Career track created!");
      onCreated(res.data);
      setTitle(""); setDescription(""); setTargetRole("");
      setSteps([{ title: "", description: "", skills_required: "" }]);
    } catch {
      toast.error("Failed to create track.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Career Track" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Track Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g. PHP Developer Path"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target Role *</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g. Senior Developer"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Steps</label>
            <button type="button" onClick={addStep} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
              + Add Step
            </button>
          </div>
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {steps.map((step, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 relative">
                <div className="flex gap-3 items-start">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-700 mt-1">{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input
                      value={step.title}
                      onChange={(e) => updateStep(i, "title", e.target.value)}
                      placeholder="Step title"
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      value={step.skills_required}
                      onChange={(e) => updateStep(i, "skills_required", e.target.value)}
                      placeholder="Skills (comma separated)"
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-500">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!title || !targetRole}>
            <Plus className="size-4" /> Create Track
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Enroll Modal ──────────────────────────────────────────────────────────────

function EnrollModal({
  open,
  track,
  onClose,
}: {
  open: boolean;
  track: CareerTrack | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ data: Employee[] }>("/employees?per_page=500")
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, [open]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !track) return;
    setSaving(true);
    try {
      await apiFetch(`/career-tracks/${track.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({ employee_id: selected }),
      });
      toast.success("Employee enrolled!");
      onClose();
      setSelected("");
    } catch {
      toast.error("Failed to enroll.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Enroll in: ${track?.title ?? ""}`}>
      <form onSubmit={handleEnroll} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Select Employee</label>
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value) || "")}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Choose employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!selected}>Enroll</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CareerPage() {
  const toast = useToast();
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<CareerTrack | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: CareerTrack[] }>("/career-tracks");
      setTracks(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this career track?")) return;
    try {
      await apiFetch(`/career-tracks/${id}`, { method: "DELETE" });
      setTracks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Track deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Career Roadmap"
        description="Define career paths and track employee progression toward their goals"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> New Track
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Career Tracks", value: tracks.length, icon: TrendingUp },
          { label: "Total Steps", value: tracks.reduce((a, t) => a + t.steps.length, 0), icon: CheckCircle2 },
          { label: "Unique Roles", value: new Set(tracks.map((t) => t.target_role)).size, icon: Target },
          { label: "Active Paths", value: tracks.filter((t) => t.is_active).length, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-brand-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loading ? "—" : value}</span>
          </div>
        ))}
      </div>

      {/* Tracks */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
          <TrendingUp className="size-12 text-gray-300" />
          <div>
            <p className="font-semibold text-gray-500">No career tracks yet</p>
            <p className="mt-1 text-sm text-gray-400">Create a roadmap to guide your team's growth.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> Create First Track
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onDelete={handleDelete}
              onEnroll={(t) => setEnrollTarget(t)}
            />
          ))}
        </div>
      )}

      <CreateTrackModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(t) => { setTracks((prev) => [t, ...prev]); setShowCreate(false); }}
      />
      <EnrollModal
        open={!!enrollTarget}
        track={enrollTarget}
        onClose={() => setEnrollTarget(null)}
      />
    </div>
  );
}
