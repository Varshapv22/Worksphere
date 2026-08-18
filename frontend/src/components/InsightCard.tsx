import {
  Award,
  Flame,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";
import type { InsightSeverity, InsightType, WorkforceInsight } from "@/lib/types";

const TYPE_ICON: Record<InsightType, LucideIcon> = {
  burnout: Flame,
  promotion: Award,
  staffing: UserPlus,
  payroll: Wallet,
};

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { badge: "danger" | "warning" | "success" | "info"; accent: string; iconWrap: string; iconColor: string; label: string }
> = {
  critical: {
    badge: "danger",
    accent: "before:bg-danger-600",
    iconWrap: "bg-danger-50 dark:bg-danger-900/30",
    iconColor: "text-danger-600 dark:text-danger-400",
    label: "Critical",
  },
  warning: {
    badge: "warning",
    accent: "before:bg-warning-600",
    iconWrap: "bg-warning-50 dark:bg-warning-900/30",
    iconColor: "text-warning-600 dark:text-warning-400",
    label: "Needs attention",
  },
  opportunity: {
    badge: "success",
    accent: "before:bg-success-600",
    iconWrap: "bg-success-50 dark:bg-success-900/30",
    iconColor: "text-success-600 dark:text-success-400",
    label: "Opportunity",
  },
  info: {
    badge: "info",
    accent: "before:bg-info-600",
    iconWrap: "bg-info-50 dark:bg-info-900/30",
    iconColor: "text-info-600 dark:text-info-400",
    label: "Cost signal",
  },
};

export function InsightCard({ insight }: { insight: WorkforceInsight }) {
  const Icon = TYPE_ICON[insight.type];
  const style = SEVERITY_STYLES[insight.severity];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        "dark:border-gray-700 dark:bg-gray-800",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        style.accent
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              style.iconWrap
            )}
          >
            <Icon className={cn("size-5", style.iconColor)} aria-hidden="true" />
          </span>
          <div>
            <Badge variant={style.badge} dot>
              {style.label}
            </Badge>
            <h3 className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">{insight.metric.label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{insight.metric.value}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">{insight.description}</p>

      {insight.items.length > 0 && (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900/30">
          {insight.items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
                {item.sublabel && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.sublabel}</p>
                )}
              </div>
              <span className="shrink-0 font-semibold text-gray-700 dark:text-gray-300">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
