"use client";

import { useEffect } from "react";
import { Info, Megaphone, OctagonAlert, TriangleAlert, X } from "lucide-react";
import type { ActiveAnnouncement, AnnouncementLevel } from "@/lib/types";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

type QueuedAnnouncement = ActiveAnnouncement & { dismissKey: string };

interface AnnouncementPosterProps {
  /** Undismissed announcements still queued, in display order. Only the first is shown. */
  announcements: QueuedAnnouncement[];
  /** Total undismissed count when this queue started, for the "1 of N" counter. */
  totalCount: number;
  onDismiss: (dismissKey: string) => void;
}

const LEVEL_STYLES: Record<
  AnnouncementLevel,
  { header: string; icon: typeof Info; badge: string; ring: string }
> = {
  info: {
    header: "from-sky-500 to-blue-600",
    icon: Info,
    badge: "bg-sky-400/20 text-sky-50",
    ring: "ring-sky-200 dark:ring-sky-900/50",
  },
  warning: {
    header: "from-amber-400 to-orange-500",
    icon: TriangleAlert,
    badge: "bg-amber-300/25 text-amber-50",
    ring: "ring-amber-200 dark:ring-amber-900/50",
  },
  critical: {
    header: "from-rose-500 to-red-600",
    icon: OctagonAlert,
    badge: "bg-rose-300/25 text-rose-50",
    ring: "ring-rose-200 dark:ring-rose-900/50",
  },
};

export function AnnouncementPoster({ announcements, totalCount, onDismiss }: AnnouncementPosterProps) {
  const current = announcements[0];

  useEffect(() => {
    if (!current) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss(current.dismissKey);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.dismissKey]);

  if (!current) return null;

  const position = totalCount - announcements.length + 1;
  const hasMore = announcements.length > 1;
  const { header, icon: Icon, badge, ring } = LEVEL_STYLES[current.level];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 animate-[fade-in_0.15s_ease-out]"
      onClick={() => onDismiss(current.dismissKey)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-poster-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 animate-[modal-in_0.15s_ease-out] dark:bg-gray-800",
          ring
        )}
      >
        <div className={cn("relative bg-gradient-to-br px-6 pb-8 pt-6 text-white", header)}>
          <div
            className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => onDismiss(current.dismissKey)}
            className="absolute right-4 top-4 z-10 rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss announcement"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="relative flex flex-col items-center gap-3 text-center">
            <span className={cn("flex size-14 items-center justify-center rounded-2xl", badge)}>
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
              <Megaphone className="size-3.5" aria-hidden="true" />
              Announcement{hasMore ? ` · ${position} of ${totalCount}` : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5 text-center">
            <h2 id="announcement-poster-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {current.title}
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">{current.body}</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button onClick={() => onDismiss(current.dismissKey)} size="lg" className="w-full rounded-full">
              {hasMore ? "Next announcement" : "Got it, thanks"}
            </Button>
            {hasMore && (
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {Array.from({ length: totalCount }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      i < position ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
