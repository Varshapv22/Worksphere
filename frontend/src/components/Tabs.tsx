"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/60"
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              isActive
                ? "bg-white text-brand-700 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {item.label}
            {item.badge !== undefined && item.badge !== 0 && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
