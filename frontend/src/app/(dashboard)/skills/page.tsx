"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Settings2,
  Star,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Department, Paginated, Skill, SkillMatrix, SkillMatrixEmployee } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

// ─── Star rating widget ───────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  const colorClass =
    active >= 5
      ? "text-amber-500"
      : active >= 4
      ? "text-amber-400"
      : active >= 3
      ? "text-yellow-400"
      : active >= 2
      ? "text-yellow-300"
      : active >= 1
      ? "text-gray-400"
      : "text-gray-200";

  return (
    <div
      className={cn("flex items-center gap-0.5", !readonly && "cursor-pointer")}
      onMouseLeave={() => !readonly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n === value ? 0 : n)}
          onMouseEnter={() => !readonly && setHover(n)}
          className={cn(
            "transition-transform focus-visible:outline-none",
            !readonly && "hover:scale-110"
          )}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "size-4 transition-colors",
              n <= active ? colorClass : "text-gray-200",
              n <= active && "fill-current"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Proficiency label ────────────────────────────────────────────────────────

const proficiencyLabel: Record<number, { label: string; variant: "neutral" | "info" | "warning" | "success" | "brand" }> = {
  1: { label: "Beginner", variant: "neutral" },
  2: { label: "Basic", variant: "info" },
  3: { label: "Intermediate", variant: "warning" },
  4: { label: "Advanced", variant: "brand" },
  5: { label: "Expert", variant: "success" },
};

// ─── Manage Skills Modal ──────────────────────────────────────────────────────

function ManageSkillsModal({
  open,
  onClose,
  skills,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  skills: Skill[];
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      await apiFetch("/skills", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), category: category.trim() || null }),
      });
      setName("");
      setCategory("");
      toast.success(`Skill "${name.trim()}" added.`);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add skill.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(skill: Skill) {
    setDeletingId(skill.id);
    try {
      await apiFetch(`/skills/${skill.id}`, { method: "DELETE" });
      toast.success(`"${skill.name}" removed.`);
      onRefresh();
    } catch {
      toast.error("Failed to delete skill.");
    } finally {
      setDeletingId(null);
    }
  }

  // Group skills by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const key = s.category ?? "Uncategorized";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} title="Manage Skills" description="Add or remove skills tracked across your company" size="md">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          name="skill_name"
          placeholder="Skill name (e.g. React)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          name="skill_category"
          placeholder="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-36"
        />
        <Button type="submit" isLoading={adding} disabled={!name.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}

      <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-gray-100">
        {skills.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No skills yet. Add your first one above.</p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {cat}
              </div>
              {items.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between gap-2 border-t border-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-800">{skill.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(skill)}
                    disabled={deletingId === skill.id}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40"
                    aria-label={`Delete ${skill.name}`}
                  >
                    {deletingId === skill.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

// ─── Skill search panel (find employees by skill) ─────────────────────────────

function SkillSearchPanel({ matrix }: { matrix: SkillMatrix | null }) {
  const [selectedSkill, setSelectedSkill] = useState<number | "">("");
  const [minLevel, setMinLevel] = useState<number>(1);

  if (!matrix || matrix.skills.length === 0) return null;

  const results =
    selectedSkill !== ""
      ? matrix.employees.filter(
          (e) => (e.skill_map[selectedSkill] ?? 0) >= minLevel
        )
      : [];

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-4 text-brand-500" />
        <h3 className="font-semibold text-gray-900">Find experts by skill</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select
            label="Skill"
            id="skill_search"
            value={String(selectedSkill)}
            onChange={(e) => setSelectedSkill(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select a skill…</option>
            {matrix.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            label="Minimum level"
            id="min_level"
            value={String(minLevel)}
            onChange={(e) => setMinLevel(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} star{n !== 1 ? "s" : ""} ({proficiencyLabel[n]?.label})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {selectedSkill !== "" && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400">No employees found at this level.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {results.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {e.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.full_name}</p>
                    {e.department && (
                      <p className="text-xs text-gray-400">{e.department}</p>
                    )}
                  </div>
                  <StarRating value={e.skill_map[selectedSkill] ?? 0} readonly />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Matrix table ─────────────────────────────────────────────────────────────

function MatrixTable({
  matrix,
  onRatingChange,
  saving,
}: {
  matrix: SkillMatrix;
  onRatingChange: (employeeId: number, skillId: number, proficiency: number) => void;
  saving: Record<number, boolean>;
}) {
  const { skills, employees } = matrix;

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Users className="size-10 text-gray-200" />
        <p className="text-sm text-gray-400">No active employees found for the selected filters.</p>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <BarChart3 className="size-10 text-gray-200" />
        <p className="text-sm text-gray-400">
          No skills defined yet. Click <strong>Manage Skills</strong> to add some.
        </p>
      </div>
    );
  }

  // Group skills by category for sticky header grouping
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const key = s.category ?? "General";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          {/* Category row */}
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="sticky left-0 z-10 min-w-[180px] bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400" />
            {Object.entries(grouped).map(([cat, items]) => (
              <th
                key={cat}
                colSpan={items.length}
                className="border-l border-gray-100 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-brand-600"
              >
                <span className="flex items-center justify-center gap-1">
                  <Tag className="size-3" />
                  {cat}
                </span>
              </th>
            ))}
          </tr>
          {/* Skill name row */}
          <tr className="border-b border-gray-200 bg-white">
            <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-500">
              Employee
            </th>
            {skills.map((skill) => (
              <th
                key={skill.id}
                className="border-l border-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap"
              >
                {skill.name}
              </th>
            ))}
            <th className="border-l border-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-400">
              Coverage
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, ei) => {
            const filled = skills.filter((s) => (emp.skill_map[s.id] ?? 0) > 0).length;
            const pct = Math.round((filled / skills.length) * 100);
            const isSaving = saving[emp.id];

            return (
              <tr
                key={emp.id}
                className={cn(
                  "border-b border-gray-50 transition-colors",
                  ei % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  "hover:bg-brand-50/30"
                )}
              >
                {/* Employee name */}
                <td className={cn(
                  "sticky left-0 z-10 px-4 py-3",
                  ei % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  "hover:bg-brand-50/30"
                )}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {emp.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{emp.full_name}</p>
                      {emp.department && (
                        <p className="truncate text-xs text-gray-400">{emp.department}</p>
                      )}
                    </div>
                    {isSaving && <Loader2 className="size-3.5 shrink-0 animate-spin text-brand-400" />}
                  </div>
                </td>

                {/* Star ratings per skill */}
                {skills.map((skill) => {
                  const proficiency = emp.skill_map[skill.id] ?? 0;
                  return (
                    <td key={skill.id} className="border-l border-gray-50 px-3 py-3 text-center">
                      <div className="flex justify-center">
                        <StarRating
                          value={proficiency}
                          onChange={(v) => onRatingChange(emp.id, skill.id, v)}
                        />
                      </div>
                    </td>
                  );
                })}

                {/* Coverage % */}
                <td className="border-l border-gray-100 px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "text-xs font-semibold",
                      pct >= 80 ? "text-success-600" : pct >= 50 ? "text-warning-600" : "text-gray-400"
                    )}>
                      {pct}%
                    </span>
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 80 ? "bg-success-500" : pct >= 50 ? "bg-warning-400" : "bg-gray-300"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Footer summary row */}
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td className="sticky left-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
              Skill coverage
            </td>
            {skills.map((skill) => {
              const count = employees.filter((e) => (e.skill_map[skill.id] ?? 0) > 0).length;
              const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
              return (
                <td key={skill.id} className="border-l border-gray-100 px-3 py-2 text-center">
                  <span className={cn(
                    "text-xs font-semibold",
                    pct >= 80 ? "text-success-600" : pct >= 50 ? "text-warning-600" : "text-gray-400"
                  )}>
                    {count}/{employees.length}
                  </span>
                </td>
              );
            })}
            <td className="border-l border-gray-100" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const toast = useToast();
  const [matrix, setMatrix] = useState<SkillMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  // Debounce search
  const searchRef = useRef(search);
  searchRef.current = search;

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set("department_id", departmentId);
      if (search) params.set("search", search);
      const data = await apiFetch<SkillMatrix>(`/skills/matrix?${params}`);
      setMatrix(data);
    } catch {
      toast.error("Failed to load skills matrix.");
    } finally {
      setLoading(false);
    }
  }, [departmentId, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiFetch<Paginated<Department>>("/departments?page=1")
      .then((r) => setDepartments(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  async function handleRatingChange(employeeId: number, skillId: number, proficiency: number) {
    // Optimistic update
    setMatrix((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === employeeId
            ? { ...e, skill_map: { ...e.skill_map, [skillId]: proficiency } }
            : e
        ),
      };
    });

    setSaving((s) => ({ ...s, [employeeId]: true }));
    try {
      await apiFetch(`/skills/matrix/${employeeId}`, {
        method: "POST",
        body: JSON.stringify({ ratings: [{ skill_id: skillId, proficiency }] }),
      });
    } catch {
      toast.error("Failed to save rating. Please try again.");
      // Revert — reload matrix
      loadMatrix();
    } finally {
      setSaving((s) => ({ ...s, [employeeId]: false }));
    }
  }

  const skillCount = matrix?.skills.length ?? 0;
  const employeeCount = matrix?.employees.length ?? 0;
  const totalRatings = matrix?.employees.reduce(
    (acc, e) => acc + Object.values(e.skill_map).filter((v) => v > 0).length,
    0
  ) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Skills Matrix"
        description="Track proficiency across your workforce and find experts instantly"
        actions={
          <Button onClick={() => setManageOpen(true)} variant="secondary">
            <Settings2 className="size-4" />
            Manage Skills
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Skills tracked", value: skillCount, icon: BarChart3, color: "text-brand-600 bg-brand-50" },
          { label: "Employees", value: employeeCount, icon: Users, color: "text-indigo-600 bg-indigo-50" },
          { label: "Ratings logged", value: totalRatings, icon: Star, color: "text-amber-600 bg-amber-50" },
          {
            label: "Matrix coverage",
            value: skillCount > 0 && employeeCount > 0
              ? `${Math.round((totalRatings / (skillCount * employeeCount)) * 100)}%`
              : "—",
            icon: Check,
            color: "text-success-600 bg-success-50",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", color)}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? "…" : value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skill expert finder */}
      {!loading && <SkillSearchPanel matrix={matrix} />}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search employees"
            name="search"
            icon={<Search className="size-4" />}
            placeholder="Filter by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-52">
          <Select
            label="Department"
            id="dept_filter"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Matrix */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading matrix…</span>
          </div>
        ) : (
          <>
            {matrix && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">
                  Showing <strong>{employeeCount}</strong> employee{employeeCount !== 1 ? "s" : ""} ×{" "}
                  <strong>{skillCount}</strong> skill{skillCount !== 1 ? "s" : ""}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="flex items-center gap-1 text-gray-400">
                      <StarRating value={n} readonly />
                      <span>{proficiencyLabel[n].label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <MatrixTable
              matrix={matrix ?? { skills: [], employees: [] }}
              onRatingChange={handleRatingChange}
              saving={saving}
            />
          </>
        )}
      </Card>

      <ManageSkillsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        skills={matrix?.skills ?? []}
        onRefresh={loadMatrix}
      />
    </div>
  );
}
