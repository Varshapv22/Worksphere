"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Drawer } from "@/components/Drawer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/advisor", label: "AI Advisor", icon: Sparkles },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/departments", label: "Departments", icon: Network },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leave", label: "Leave", icon: CalendarDays },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-transparent text-gray-600 hover:bg-gray-100"
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, company, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-4 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-1 text-lg font-bold text-brand-700">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            W
          </span>
          WorkSphere
        </div>
        <NavLinks pathname={pathname} />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-danger-50 hover:text-danger-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Logout
        </button>
      </aside>

      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="WorkSphere">
        <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Logout
        </button>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 sm:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <span className="block truncate font-semibold text-gray-900">
                {company?.name ?? "WorkSphere"}
              </span>
              <div className="hidden sm:block">
                <Breadcrumb />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">{user.name}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(user.name)}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
