"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Lightbulb,
  Menu,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";
import {
  DEFAULT_CHAPTER_ID,
  MANUAL_GROUPS,
  findChapter,
  type ManualBlock,
  type ManualChapter,
  type ManualGroup,
} from "@/lib/manualData";

const GROUP_ACCENT: Record<string, { text: string; ring: string; bg: string; activeBg: string; dot: string }> = {
  workspace: {
    text: "text-brand-700 dark:text-brand-400",
    ring: "ring-brand-200 dark:ring-brand-900/50",
    bg: "bg-brand-50 dark:bg-brand-900/20",
    activeBg: "bg-brand-50 dark:bg-brand-900/30 border-brand-600 text-brand-700 dark:text-brand-400",
    dot: "bg-brand-600",
  },
  admin: {
    text: "text-indigo-700 dark:text-indigo-400",
    ring: "ring-indigo-200 dark:ring-indigo-900/50",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    activeBg: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-600 text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-600",
  },
  "super-admin": {
    text: "text-purple-700 dark:text-purple-400",
    ring: "ring-purple-200 dark:ring-purple-900/50",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    activeBg: "bg-purple-50 dark:bg-purple-900/30 border-purple-600 text-purple-700 dark:text-purple-400",
    dot: "bg-purple-600",
  },
};

function chapterSearchText(chapter: ManualChapter): string {
  const parts: string[] = [chapter.title, chapter.summary, chapter.audience, chapter.access ?? ""];
  for (const block of chapter.blocks) {
    if (block.kind === "p" || block.kind === "h3") parts.push(block.text);
    else if (block.kind === "callout") parts.push(block.text);
    else if (block.kind === "list" || block.kind === "steps") parts.push(...block.items);
    else if (block.kind === "table") {
      parts.push(...block.headers);
      for (const row of block.rows) parts.push(...row);
    }
  }
  return parts.join(" \n ").toLowerCase();
}

function Block({ block }: { block: ManualBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">{block.text}</p>;
    case "h3":
      return <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{block.text}</h3>;
    case "steps":
      return (
        <ol className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "callout": {
      const toneStyles = {
        tip: { box: "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300", Icon: Lightbulb },
        info: { box: "border-info-100 bg-info-50 text-info-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300", Icon: Info },
        warning: { box: "border-warning-100 bg-warning-50 text-warning-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300", Icon: TriangleAlert },
      } as const;
      const { box, Icon } = toneStyles[block.tone];
      return (
        <div className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm leading-relaxed", box)}>
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{block.text}</span>
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {block.headers.map((h, i) => (
                  <th key={i} className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-gray-600 dark:text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function SidebarContent({
  groups,
  activeId,
  onNavigate,
}: {
  groups: ManualGroup[];
  activeId: string;
  onNavigate?: () => void;
}) {
  if (groups.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No chapters match your search.</p>;
  }
  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group) => {
        const accent = GROUP_ACCENT[group.id];
        return (
          <div key={group.id}>
            <div className="mb-2 px-2">
              <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide", accent.text)}>
                <span className={cn("size-1.5 rounded-full", accent.dot)} />
                {group.label}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {group.chapters.map((chapter) => {
                const Icon = chapter.icon;
                const active = chapter.id === activeId;
                return (
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? accent.activeBg
                        : "border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{chapter.title}</span>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default function ManualPage() {
  const [activeId, setActiveId] = useState(DEFAULT_CHAPTER_ID);
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function syncFromHash() {
      const id = window.location.hash.replace("#", "");
      if (id && findChapter(id)) setActiveId(id);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const flatChapters = useMemo(
    () => MANUAL_GROUPS.flatMap((g) => g.chapters.map((c) => ({ ...c, groupLabel: g.label }))),
    []
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MANUAL_GROUPS;
    return MANUAL_GROUPS.map((g) => ({
      ...g,
      chapters: g.chapters.filter((c) => chapterSearchText(c).includes(q)),
    })).filter((g) => g.chapters.length > 0);
  }, [query]);

  const found = findChapter(activeId);
  const chapter = found?.chapter;
  const group = found?.group;
  const currentIndex = flatChapters.findIndex((c) => c.id === activeId);
  const prevChapter = currentIndex > 0 ? flatChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < flatChapters.length - 1 ? flatChapters[currentIndex + 1] : null;
  const accent = group ? GROUP_ACCENT[group.id] : GROUP_ACCENT.workspace;

  if (!chapter || !group) return null;
  const ChapterIcon = chapter.icon;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
            aria-label="Open chapter list"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Link href="/manual" className="flex items-center gap-2 text-lg font-bold text-brand-700 dark:text-brand-400">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
              W
            </span>
            <span className="hidden sm:inline">WorkSphere</span>
            <span className="hidden text-gray-300 dark:text-gray-600 sm:inline">/</span>
            <span className="truncate text-gray-900 dark:text-gray-100">User Manual</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the manual…"
              className="w-56 rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="hidden rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            Open WorkSphere
          </Link>
        </div>
      </header>

      {/* Mobile search */}
      <div className="border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900 sm:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the manual…"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 pr-2">
            <SidebarContent groups={filteredGroups} activeId={activeId} />
          </div>
        </aside>

        {/* ── Mobile drawer ── */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="fixed inset-0 bg-gray-900/50 animate-[fade-in_0.15s_ease-out]" onClick={() => setMobileNavOpen(false)} />
            <div className="relative flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-4 shadow-xl animate-[drawer-in_0.2s_ease-out] dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Chapters</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                  aria-label="Close"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <SidebarContent groups={filteredGroups} activeId={activeId} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <main className="min-w-0 flex-1 pb-16">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {group.label}
          </div>
          <div className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-6 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", accent.bg, accent.ring)}>
                  <ChapterIcon className={cn("size-5.5", accent.text)} aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">{chapter.title}</h1>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral">{chapter.audience}</Badge>
                    {chapter.access && <Badge variant="warning">{chapter.access}</Badge>}
                  </div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">{chapter.summary}</p>
            </div>

            <div className="flex flex-col gap-5">
              {chapter.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </div>

          {/* Prev / Next */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {prevChapter ? (
              <a
                href={`#${prevChapter.id}`}
                className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
              >
                <ArrowLeft className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Previous</div>
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{prevChapter.title}</div>
                </div>
              </a>
            ) : (
              <div className="flex-1" />
            )}
            {nextChapter && (
              <a
                href={`#${nextChapter.id}`}
                className="flex flex-1 items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-right transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
              >
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Next</div>
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{nextChapter.title}</div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
              </a>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
