import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

interface StatCardProps {
  label: string;
  value: number | string | null;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1.5 h-7 w-14" />
        ) : (
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        )}
      </div>
    </div>
  );
}
