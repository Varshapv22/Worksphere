"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Award,
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock,
  Code2,
  CreditCard,
  Eye,
  FileSearch,
  Info,
  TriangleAlert,
  X,
  Gauge,
  Globe,
  HelpCircle,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Megaphone,
  Menu,
  Network,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/lib/confirm";
import { apiFetch } from "@/lib/api";
import type { ActiveAnnouncement, Module } from "@/lib/types";
import { ModulesContext } from "@/lib/modulesContext";
import { ViewAsEmployeeContext } from "@/lib/viewAsEmployeeContext";
import { Drawer } from "@/components/Drawer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** false = hidden while "View as Employee" preview is on. This is a UI preview only, not a permission check. */
  employeeVisible?: boolean;
}

const tenantNavItems: NavItem[] = [
  { href: "/dashboard",         label: "Dashboard",         icon: LayoutDashboard },
  { href: "/advisor",           label: "AI Advisor",        icon: Sparkles,        employeeVisible: false },
  { href: "/employees",         label: "Employees",         icon: Users },
  { href: "/departments",       label: "Departments",       icon: Network,         employeeVisible: false },
  { href: "/attendance",        label: "Attendance",        icon: Clock },
  { href: "/leave",             label: "Leave",             icon: CalendarDays },
  { href: "/modules",           label: "App Marketplace",   icon: Blocks,          employeeVisible: false },
  { href: "/recruitment",       label: "Resume Parser",     icon: FileSearch,      employeeVisible: false },
  { href: "/skills",            label: "Skills Matrix",     icon: BarChart3 },
  { href: "/knowledge-base",    label: "Knowledge Base",    icon: BookOpen },
  { href: "/recognition",       label: "Recognition",       icon: Award },
  { href: "/ai-assistant",      label: "AI Assistant",      icon: Bot },
  { href: "/career",            label: "Career Roadmap",    icon: TrendingUp },
  { href: "/meetings",          label: "Meetings",          icon: CalendarCheck },
  { href: "/assets",            label: "Assets",            icon: Boxes },
  { href: "/compliance",        label: "Compliance",        icon: ShieldCheck },
  { href: "/analytics",         label: "Analytics",         icon: LineChart,       employeeVisible: false },
  { href: "/payroll-simulator", label: "Payroll Simulator", icon: Wallet,          employeeVisible: false },
  { href: "/payroll-config",    label: "Payroll Config",    icon: Globe,           employeeVisible: false },
  { href: "/developer",         label: "Developer API",     icon: Code2,           employeeVisible: false },
  { href: "/billing",           label: "Billing",           icon: Wallet,          employeeVisible: false },
  { href: "/settings/branding", label: "Branding",          icon: Palette,         employeeVisible: false },
];

const superAdminNavItems: NavItem[] = [
  { href: "/admin",           label: "Platform Dashboard", icon: Gauge },
  { href: "/admin/companies", label: "Companies",          icon: Building2 },
  { href: "/admin/plans",     label: "Plans",              icon: CreditCard },
  { href: "/admin/modules",   label: "Modules",            icon: Blocks },
  { href: "/admin/billing",   label: "Billing",            icon: Wallet },
  { href: "/admin/announcements", label: "Announcements",  icon: Megaphone },
  { href: "/admin/security",  label: "Security",           icon: ShieldCheck },
  { href: "/admin/activity-log", label: "Activity Log",    icon: History },
];

const moduleGatedRoutes: Record<string, string> = {
  "/attendance":        "attendance",
  "/recruitment":       "recruitment",
  "/skills":            "skills-matrix",
  "/knowledge-base":    "knowledge-base",
  "/recognition":       "recognition",
  "/ai-assistant":      "ai-assistant",
  "/career":            "career-roadmap",
  "/meetings":          "meetings",
  "/assets":            "asset-management",
  "/compliance":        "compliance",
  "/analytics":         "analytics",
  "/payroll-simulator": "payroll",
  "/payroll-config":    "payroll",
  "/developer":         "developer-api",
  "/settings/branding": "white-label",
};

function NavLinks({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href) ||
              // Org Chart is a distinct route reached via the toggle inside
              // the Employees page, but shares this one sidebar entry.
              (item.href === "/employees" && pathname.startsWith("/org-chart"));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, company, loading, logout, impersonating, exitImpersonation } = useAuth();
  const confirm = useConfirm();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [enabledModuleSlugs, setEnabledModuleSlugs] = useState<Set<string> | null>(null);
  const [viewAsEmployee, setViewAsEmployee] = useState(false);
  const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<Set<number>>(new Set());

  const isSuperAdmin = Boolean(user?.is_super_admin);
  const inAdminArea = pathname.startsWith("/admin");
  const canViewAsEmployee = Boolean(
    user?.roles?.includes("company-admin") || user?.roles?.includes("manager")
  );
  // A real plain-employee account (no company-admin/manager role) always
  // gets the restricted, employee-only view of the sidebar — not just when
  // an admin/manager has manually toggled the "View as Employee" preview.
  const isPlainEmployee = !isSuperAdmin && Boolean(user) && !canViewAsEmployee;
  const effectiveEmployeeView = isPlainEmployee || viewAsEmployee;

  async function handleLogout() {
    const ok = await confirm({
      title: "Log out?",
      description: "You'll need to sign in again to access your workspace.",
      confirmLabel: "Log out",
      variant: "danger",
    });
    if (!ok) return;
    await logout();
    router.push("/login");
  }

  useEffect(() => {
    if (isSuperAdmin || !user) return;
    try {
      const raw = localStorage.getItem("dismissedAnnouncementIds");
      if (raw) setDismissedAnnouncementIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore malformed/unavailable storage
    }
    apiFetch<{ data: ActiveAnnouncement[] }>("/announcements/active")
      .then((res) => setAnnouncements(res.data))
      .catch(() => {});
  }, [isSuperAdmin, user]);

  function dismissAnnouncement(id: number) {
    setDismissedAnnouncementIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem("dismissedAnnouncementIds", JSON.stringify([...next]));
      } catch {
        // ignore unavailable storage
      }
      return next;
    });
  }

  useEffect(() => {
    if (isSuperAdmin || !user) return;
    let cancelled = false;
    apiFetch<{ data: Module[] }>("/modules")
      .then((res) => {
        if (cancelled) return;
        setEnabledModuleSlugs(
          new Set(res.data.filter((m) => m.is_enabled).map((m) => m.slug))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSuperAdmin, user, pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (isSuperAdmin && !inAdminArea) router.replace("/admin");
    else if (!isSuperAdmin && inAdminArea) router.replace("/dashboard");
  }, [loading, user, isSuperAdmin, inAdminArea, router]);

  const navItems = (isSuperAdmin ? superAdminNavItems : tenantNavItems).filter((item) => {
    const requiredSlug = moduleGatedRoutes[item.href];
    if (requiredSlug && enabledModuleSlugs && !enabledModuleSlugs.has(requiredSlug)) return false;
    if (effectiveEmployeeView && item.employeeVisible === false) return false;
    return true;
  });

  // Bounces a plain employee (or an admin/manager previewing as one) off an
  // admin-only page reached by direct URL — not just one they got to via a
  // sidebar link that's since disappeared.
  useEffect(() => {
    if (!effectiveEmployeeView) return;
    const stillVisible = navItems.some((item) =>
      item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
    );
    if (!stillVisible) router.replace("/dashboard");
    // navItems is derived fresh each render from stable inputs already in this
    // dependency list, so it's intentionally left out to avoid re-running on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEmployeeView, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user || isSuperAdmin !== inAdminArea) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Redirecting…
      </div>
    );
  }

  return (
    <ModulesContext.Provider value={{ enabledSlugs: isSuperAdmin ? new Set() : enabledModuleSlugs }}>
    <div className="flex min-h-screen bg-surface">
      {/* ── Sidebar ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-1 text-lg font-bold text-brand-700 dark:text-brand-400">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            W
          </span>
          WorkSphere
        </div>
        <NavLinks navItems={navItems} pathname={pathname} />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-danger-50 hover:text-danger-700 dark:text-gray-400 dark:hover:bg-danger-900/30 dark:hover:text-danger-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Logout
        </button>
      </aside>

      {/* ── Mobile drawer ── */}
      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="WorkSphere">
        <NavLinks navItems={navItems} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Logout
        </button>
      </Drawer>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 sm:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">
                {isSuperAdmin ? "WorkSphere Platform" : (company?.name ?? "WorkSphere")}
              </span>
              <div className="hidden sm:block">
                <Breadcrumb />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/manual"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Open the user manual"
              title="User manual"
            >
              <HelpCircle className="size-5" aria-hidden="true" />
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            <UserMenu
              canViewAsEmployee={canViewAsEmployee}
              viewAsEmployee={viewAsEmployee}
              onToggleViewAsEmployee={() => setViewAsEmployee((v) => !v)}
            />
          </div>
        </header>

        {impersonating && (
          <div className="flex items-center justify-between gap-3 border-b border-warning-100 bg-warning-50 px-4 py-2 text-sm text-warning-700 sm:px-6">
            <span className="flex items-center gap-2">
              <Eye className="size-4 shrink-0" aria-hidden="true" />
              Impersonating <span className="font-semibold">{impersonating}</span> — actions you take are logged.
            </span>
            <button
              type="button"
              onClick={async () => {
                await exitImpersonation();
                router.push("/admin");
              }}
              className="shrink-0 font-medium underline-offset-2 hover:underline"
            >
              Exit
            </button>
          </div>
        )}

        {viewAsEmployee && (
          <div className="flex items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300 sm:px-6">
            <span className="flex items-center gap-2">
              <Eye className="size-4 shrink-0" aria-hidden="true" />
              Viewing as Employee — the sidebar only shows what a regular employee sees.
            </span>
            <button
              type="button"
              onClick={() => setViewAsEmployee(false)}
              className="shrink-0 font-medium underline-offset-2 hover:underline"
            >
              Exit
            </button>
          </div>
        )}

        {announcements
          .filter((a) => !dismissedAnnouncementIds.has(a.id))
          .map((a) => {
            const styles =
              a.level === "critical"
                ? "border-danger-200 bg-danger-50 text-danger-800"
                : a.level === "warning"
                  ? "border-warning-100 bg-warning-50 text-warning-700"
                  : "border-info-100 bg-info-50 text-info-700";
            return (
              <div key={a.id} className={cn("flex items-start justify-between gap-3 border-b px-4 py-2.5 text-sm sm:px-6", styles)}>
                <span className="flex items-start gap-2">
                  {a.level === "info" ? (
                    <Info className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>
                    <span className="font-semibold">{a.title}</span> — {a.body}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => dismissAnnouncement(a.id)}
                  className="shrink-0 rounded-sm p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}

        <main className="flex-1 p-4 sm:p-6">
          <ViewAsEmployeeContext.Provider value={viewAsEmployee}>{children}</ViewAsEmployeeContext.Provider>
        </main>
      </div>
    </div>
    </ModulesContext.Provider>
  );
}
