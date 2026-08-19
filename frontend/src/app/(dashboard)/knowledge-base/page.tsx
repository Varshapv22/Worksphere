"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  Edit2,
  Eye,
  FileText,
  FolderOpen,
  Layers,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import type { KbArticle, KbCategory, Paginated, PaginationMeta } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ["Policies", "SOPs", "Technical Guides", "FAQs", "Onboarding"];

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, total: 0 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function relativeDate(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

// ─── Article content renderer (basic markdown-like) ──────────────────────────

function ArticleBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="mt-6 mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="mt-5 mb-1.5 text-lg font-semibold text-gray-900 dark:text-gray-100">{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">{line.slice(4)}</h4>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="my-3 list-disc space-y-1 pl-5">
          {items.map((item, j) => <li key={j} className="text-gray-700 dark:text-gray-300">{item}</li>)}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="my-3 list-decimal space-y-1 pl-5">
          {items.map((item, j) => <li key={j} className="text-gray-700 dark:text-gray-300">{item}</li>)}
        </ol>
      );
      continue;
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="my-3 border-l-4 border-brand-300 pl-4 text-gray-600 dark:text-gray-400 italic">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-2 leading-relaxed text-gray-700 dark:text-gray-300">{line}</p>);
    }
    i++;
  }

  return <div className="text-sm">{elements}</div>;
}

// ─── Article form ─────────────────────────────────────────────────────────────

interface ArticleForm {
  title: string;
  category: string;
  customCategory: string;
  body: string;
  tags: string;
  is_published: boolean;
}

function ArticleFormModal({
  open,
  article,
  onClose,
  onSaved,
}: {
  open: boolean;
  article: KbArticle | null;
  onClose: () => void;
  onSaved: (saved: KbArticle) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ArticleForm>({
    title: "",
    category: DEFAULT_CATEGORIES[0],
    customCategory: "",
    body: "",
    tags: "",
    is_published: true,
  });

  useEffect(() => {
    if (article) {
      const isDefault = DEFAULT_CATEGORIES.includes(article.category);
      setForm({
        title: article.title,
        category: isDefault ? article.category : "__custom__",
        customCategory: isDefault ? "" : article.category,
        body: article.body ?? "",
        tags: (article.tags ?? []).join(", "),
        is_published: article.is_published,
      });
    } else {
      setForm({ title: "", category: DEFAULT_CATEGORIES[0], customCategory: "", body: "", tags: "", is_published: true });
    }
  }, [article, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const resolvedCategory = form.category === "__custom__" ? form.customCategory.trim() : form.category;
    const payload = {
      title: form.title.trim(),
      category: resolvedCategory || "General",
      body: form.body,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_published: form.is_published,
    };
    try {
      const res = article
        ? await apiFetch<{ data: KbArticle }>(`/knowledge-base/${article.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch<{ data: KbArticle }>("/knowledge-base", { method: "POST", body: JSON.stringify(payload) });
      toast.success(article ? "Article updated." : "Article created.");
      onSaved(res.data);
    } catch {
      toast.error("Failed to save article.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={article ? "Edit Article" : "New Article"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Remote Work Policy"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">Custom…</option>
            </select>
          </div>
          {form.category === "__custom__" && (
            <Input
              label="Custom category"
              value={form.customCategory}
              onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
              placeholder="e.g. Security"
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Content{" "}
            <span className="font-normal text-gray-400">(supports # headings, - lists, &gt; quotes)</span>
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={14}
            placeholder={"# Introduction\n\nWrite your article content here...\n\n## Section\n\n- Item one\n- Item two"}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          placeholder="e.g. HR, remote, policy"
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Publish immediately
        </label>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{article ? "Save changes" : "Publish article"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [viewArticle, setViewArticle] = useState<KbArticle | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editArticle, setEditArticle] = useState<KbArticle | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (search) params.set("q", search);
      if (activeCategory !== "all") params.set("category", activeCategory);

      const [articlesRes, catsRes] = await Promise.all([
        apiFetch<Paginated<KbArticle>>(`/knowledge-base?${params}`),
        apiFetch<{ data: KbCategory[] }>("/knowledge-base/categories"),
      ]);
      setArticles(articlesRes.data);
      setMeta(articlesRes.meta);
      setCategories(catsRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    const id = setTimeout(loadArticles, 300);
    return () => clearTimeout(id);
  }, [loadArticles]);

  async function handleView(article: KbArticle) {
    setViewLoading(true);
    setViewArticle(article);
    try {
      const res = await apiFetch<{ data: KbArticle }>(`/knowledge-base/${article.id}`);
      setViewArticle(res.data);
    } catch {
      // use the list version
    } finally {
      setViewLoading(false);
    }
  }

  async function handleDelete(article: KbArticle) {
    const ok = await confirm({ title: `Delete "${article.title}"?`, variant: "danger" });
    if (!ok) return;
    setDeleting(article.id);
    try {
      await apiFetch(`/knowledge-base/${article.id}`, { method: "DELETE" });
      toast.success("Article deleted.");
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      if (viewArticle?.id === article.id) setViewArticle(null);
      loadArticles();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(saved: KbArticle) {
    setShowForm(false);
    setEditArticle(null);
    loadArticles();
    if (editArticle?.id === saved.id && viewArticle?.id === saved.id) {
      setViewArticle((prev) => prev ? { ...prev, ...saved } : saved);
    }
  }

  const totalArticles = categories.reduce((s, c) => s + c.count, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Knowledge Base"
        description="Company policies, SOPs, guides, FAQs, and onboarding documents"
        actions={
          <Button onClick={() => { setEditArticle(null); setShowForm(true); }}>
            <Plus className="size-4" />
            New Article
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search articles…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setViewArticle(null); }}
          className="pl-8 pr-8"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Categories</p>
          <nav className="flex flex-col gap-0.5">
            <button
              onClick={() => { setActiveCategory("all"); setViewArticle(null); }}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeCategory === "all"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
              )}
            >
              <span className="flex items-center gap-2">
                <Layers className="size-3.5" />
                All Articles
              </span>
              <span className="text-xs text-gray-400">{totalArticles}</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => { setActiveCategory(cat.name); setViewArticle(null); }}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  activeCategory === cat.name
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
                )}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="size-3.5" />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="text-xs text-gray-400">{cat.count}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {/* Article viewer */}
          {viewArticle && (
            <Card>
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
                <button
                  onClick={() => setViewArticle(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <ChevronLeft className="size-4" />
                  Back to articles
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setEditArticle(viewArticle); setShowForm(true); }}
                  >
                    <Edit2 className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deleting === viewArticle.id}
                    onClick={() => handleDelete(viewArticle)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="pt-5">
                {/* Category + meta */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{viewArticle.category}</Badge>
                  {viewArticle.tags?.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <Tag className="size-2.5" />{t}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{viewArticle.title}</h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {viewArticle.author && <span>by {viewArticle.author.name}</span>}
                  {viewArticle.updated_at && <span>Updated {relativeDate(viewArticle.updated_at)}</span>}
                  <span className="flex items-center gap-1"><Eye className="size-3" />{viewArticle.views} views</span>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
                  {viewLoading ? (
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={cn("h-4 animate-pulse rounded bg-gray-100", i % 3 === 2 ? "w-3/4" : "w-full")} />
                      ))}
                    </div>
                  ) : viewArticle.body ? (
                    <ArticleBody body={viewArticle.body} />
                  ) : (
                    <p className="text-sm text-gray-400">No content.</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Article list */}
          {!viewArticle && (
            <>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                      <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                      <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                      <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
                  <BookOpen className="size-10 text-gray-300" />
                  <div>
                    <p className="font-semibold text-gray-500">
                      {search ? "No articles match your search" : "No articles yet"}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {search ? "Try a different term." : "Create your first knowledge base article."}
                    </p>
                  </div>
                  {!search && (
                    <Button onClick={() => { setEditArticle(null); setShowForm(true); }}>
                      <Plus className="size-4" />
                      Create article
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => handleView(article)}
                      className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="neutral" className="shrink-0">{article.category}</Badge>
                        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                          <Eye className="size-3" />
                          {article.views}
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-brand-700 dark:text-gray-100 dark:group-hover:text-brand-400">
                        {article.title}
                      </h3>

                      {article.excerpt && (
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-gray-400">
                        <span>{article.author?.name ?? "—"}</span>
                        <span>{relativeDate(article.updated_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Article form modal */}
      <ArticleFormModal
        open={showForm}
        article={editArticle}
        onClose={() => { setShowForm(false); setEditArticle(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
