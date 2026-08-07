"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSearch,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  Phone,
  Plus,
  Star,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react";
import { apiFetch, ApiError, API_URL, getToken } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { ParsedResume, Paginated, PaginationMeta } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { cn } from "@/lib/cn";

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 rounded-xl"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        <span className="flex-1 font-semibold text-gray-900">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
            {count}
          </span>
        )}
        {open ? (
          <ChevronDown className="size-4 text-gray-400" />
        ) : (
          <ChevronRight className="size-4 text-gray-400" />
        )}
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4">{children}</div>}
    </div>
  );
}

// ─── Parsed resume detail panel ───────────────────────────────────────────────

function ResumeDetailPanel({
  resume,
  onClose,
  onDeleted,
}: {
  resume: ParsedResume;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this parsed resume?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/resumes/${resume.id}`, { method: "DELETE" });
      toast.success("Resume deleted.");
      onDeleted();
    } catch {
      toast.error("Failed to delete resume.");
    } finally {
      setDeleting(false);
    }
  }

  if (resume.status === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{resume.file_name}</h2>
            <p className="text-sm text-gray-500">Uploaded {formatDate(resume.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleDelete}
              isLoading={deleting}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Button variant="secondary" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger-600" />
            <div>
              <p className="font-semibold text-danger-800">Parsing failed</p>
              <p className="mt-0.5 text-sm text-danger-700">{resume.error_message ?? "An unknown error occurred."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{resume.candidate_name ?? "Unknown Candidate"}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{resume.file_name} · Parsed {formatDate(resume.created_at)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={handleDelete} isLoading={deleting}>
            <Trash2 className="size-4" />
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Contact strip */}
      <div className="flex flex-wrap gap-3">
        {resume.email && (
          <a
            href={`mailto:${resume.email}`}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Mail className="size-3.5 text-brand-500" />
            {resume.email}
          </a>
        )}
        {resume.phone && (
          <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
            <Phone className="size-3.5 text-brand-500" />
            {resume.phone}
          </span>
        )}
        {resume.companies.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
            <Building2 className="size-3.5 text-brand-500" />
            {resume.companies.slice(0, 2).join(" · ")}
            {resume.companies.length > 2 && ` +${resume.companies.length - 2} more`}
          </span>
        )}
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 leading-relaxed">
          {resume.summary}
        </div>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <Section icon={<Wrench className="size-4" />} title="Skills" count={resume.skills.length}>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 border border-brand-100"
              >
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <Section icon={<Briefcase className="size-4" />} title="Experience" count={resume.experience.length}>
          <div className="flex flex-col gap-4">
            {resume.experience.map((exp, i) => (
              <div key={i} className="relative pl-5">
                {/* Timeline dot */}
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-brand-400" />
                {i < resume.experience.length - 1 && (
                  <span className="absolute left-[3px] top-4 bottom-0 w-px bg-gray-200" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-gray-900">{exp.title}</span>
                  {exp.duration && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{exp.duration}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-brand-600">{exp.company}</p>
                {exp.description && (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <Section icon={<GraduationCap className="size-4" />} title="Education" count={resume.education.length}>
          <div className="flex flex-col gap-3">
            {resume.education.map((edu, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{edu.degree}</p>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  {(edu.year || edu.gpa) && (
                    <div className="mt-1 flex gap-2">
                      {edu.year && <span className="text-xs text-gray-400">{edu.year}</span>}
                      {edu.gpa && <span className="text-xs font-medium text-brand-600">GPA: {edu.gpa}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {resume.projects.length > 0 && (
        <Section icon={<Layers className="size-4" />} title="Projects" count={resume.projects.length} defaultOpen={false}>
          <div className="flex flex-col gap-3">
            {resume.projects.map((project, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold text-gray-900">{project.name}</p>
                {project.description && (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{project.description}</p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.technologies.map((tech, ti) => (
                      <span key={ti} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <Section icon={<Star className="size-4" />} title="Certifications" count={resume.certifications.length} defaultOpen={false}>
          <div className="flex flex-col gap-2">
            {resume.certifications.map((cert, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                <CheckCircle2 className="size-4 shrink-0 text-success-500" />
                <span className="text-sm text-gray-800">{cert}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────

function UploadZone({ onParsed }: { onParsed: (resume: ParsedResume) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10 MB.");
      return;
    }

    setUploading(true);
    setProgress("Uploading resume…");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProgress("Extracting text from PDF…");
      const token = getToken();
      const res = await fetch(`${API_URL}/resumes/parse`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const body = await res.json();
      if (!res.ok) {
        throw new ApiError(res.status, body);
      }

      setProgress(null);
      const parsed = body.data as ParsedResume;
      if (parsed.status === "failed") {
        toast.error(`Parsing failed: ${parsed.error_message ?? "Unknown error."}`);
      } else {
        toast.success(`Resume parsed — ${parsed.candidate_name ?? file.name}`);
      }
      onParsed(parsed);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all",
        dragging
          ? "border-brand-500 bg-brand-50"
          : "border-gray-200 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/40",
        uploading && "pointer-events-none opacity-70"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <>
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-100">
            <Loader2 className="size-8 animate-spin text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">AI is parsing your resume…</p>
            <p className="mt-1 text-sm text-gray-500">{progress}</p>
          </div>
          <div className="flex gap-2">
            <span className="size-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
            <span className="size-2 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
            <span className="size-2 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            "flex size-16 items-center justify-center rounded-2xl transition-colors",
            dragging ? "bg-brand-200" : "bg-white border border-gray-200 group-hover:border-brand-300 group-hover:bg-brand-50"
          )}>
            <Upload className={cn("size-7 transition-colors", dragging ? "text-brand-600" : "text-gray-400 group-hover:text-brand-500")} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Drop your PDF resume here</p>
            <p className="mt-1 text-sm text-gray-500">
              or{" "}
              <span className="text-brand-600 underline underline-offset-2">browse files</span>
              {" "}· PDF only · max 10 MB
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["Name", "Skills", "Experience", "Education", "Projects", "Certifications"].map((tag) => (
              <span key={tag} className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Resume list row ──────────────────────────────────────────────────────────

function ResumeRow({
  resume,
  selected,
  onClick,
}: {
  resume: ParsedResume;
  selected: boolean;
  onClick: () => void;
}) {
  const statusConfig = {
    completed: { icon: CheckCircle2, color: "text-success-600", bg: "bg-success-50", label: "Parsed" },
    processing: { icon: Loader2, color: "text-brand-600 animate-spin", bg: "bg-brand-50", label: "Processing" },
    failed: { icon: AlertCircle, color: "text-danger-600", bg: "bg-danger-50", label: "Failed" },
  }[resume.status];

  const Icon = statusConfig.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 text-left rounded-lg transition-colors border",
        selected
          ? "border-brand-300 bg-brand-50"
          : "border-transparent hover:bg-gray-50"
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", statusConfig.bg)}>
        <Icon className={cn("size-4", statusConfig.color)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">
          {resume.candidate_name ?? resume.file_name}
        </p>
        <p className="truncate text-xs text-gray-500">
          {resume.email ?? resume.file_name} · {formatDate(resume.created_at)}
        </p>
      </div>
      {resume.skills.length > 0 && (
        <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
          {resume.skills.length} skills
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-gray-300" />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const [resumes, setResumes] = useState<ParsedResume[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParsedResume | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Paginated<ParsedResume>>(`/resumes?page=${page}`);
      setResumes(res.data);
      setMeta(res.meta);
    } catch {
      // silent — the empty state handles it
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  function handleParsed(resume: ParsedResume) {
    setShowUpload(false);
    setResumes((prev) => [resume, ...prev]);
    setMeta((m) => ({ ...m, total: m.total + 1 }));
    setSelected(resume);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Resume Parser"
        description="Upload candidate PDFs and let AI extract structured data instantly"
        actions={
          <Button onClick={() => { setShowUpload((s) => !s); setSelected(null); }}>
            <Plus className="size-4" aria-hidden="true" />
            Parse resume
          </Button>
        }
      />

      {/* Upload zone (toggled) */}
      {showUpload && (
        <Card>
          <UploadZone onParsed={handleParsed} />
        </Card>
      )}

      {/* Empty state when nothing exists yet */}
      {!loading && resumes.length === 0 && !showUpload && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-50">
              <FileSearch className="size-8 text-brand-500" />
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-900">No resumes parsed yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Upload a PDF and AI will extract the candidate&apos;s name, skills, experience, education, and more.
              </p>
            </div>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="size-4" />
              Upload your first resume
            </Button>
          </div>
        </Card>
      )}

      {/* Two-column layout: list + detail */}
      {(resumes.length > 0 || loading) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          {/* Left: list */}
          <Card className="h-fit">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Parsed Resumes</h3>
              <span className="text-xs text-gray-400">{meta.total} total</span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 rounded-lg border border-transparent px-4 py-3">
                    <div className="size-9 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse" />
                      <div className="h-3 w-48 rounded bg-gray-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {resumes.map((r) => (
                  <ResumeRow
                    key={r.id}
                    resume={r}
                    selected={selected?.id === r.id}
                    onClick={() => { setSelected(r); setShowUpload(false); }}
                  />
                ))}
              </div>
            )}

            {meta.last_page > 1 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <Pagination meta={meta} onPageChange={setPage} />
              </div>
            )}
          </Card>

          {/* Right: detail */}
          <div>
            {selected ? (
              <Card>
                <ResumeDetailPanel
                  key={selected.id}
                  resume={selected}
                  onClose={() => setSelected(null)}
                  onDeleted={() => {
                    setSelected(null);
                    setResumes((prev) => prev.filter((r) => r.id !== selected.id));
                    setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
                  }}
                />
              </Card>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                <FileText className="size-10 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-500">Select a resume to view details</p>
                  <p className="text-sm text-gray-400">Click any resume from the list on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature highlights when empty */}
      {!loading && resumes.length === 0 && !showUpload && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: User, label: "Candidate Info", desc: "Name, email, phone extracted automatically" },
            { icon: Wrench, label: "Skills Detection", desc: "All technical and soft skills identified" },
            { icon: Briefcase, label: "Work Experience", desc: "Job titles, companies, durations parsed" },
            { icon: GraduationCap, label: "Education", desc: "Degrees, institutions, and graduation years" },
            { icon: Layers, label: "Projects", desc: "Side projects with tech stacks extracted" },
            { icon: Star, label: "Certifications", desc: "Professional certifications listed clearly" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="size-4 text-brand-600" />
              </span>
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
