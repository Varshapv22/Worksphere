"use client";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "group relative flex h-8 w-[3.75rem] shrink-0 items-center rounded-full p-1 transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        isDark
          ? "bg-slate-700 shadow-inner shadow-slate-900/50"
          : "bg-amber-100 shadow-inner shadow-amber-200/80"
      )}
    >
      {/* Track icons */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
        {/* Sun (left) */}
        <SunIcon active={!isDark} />
        {/* Moon (right) */}
        <MoonIcon active={isDark} />
      </span>

      {/* Sliding thumb */}
      <span
        className={cn(
          "relative z-10 flex size-6 items-center justify-center rounded-full shadow-md transition-all duration-500",
          isDark
            ? "translate-x-[1.75rem] bg-slate-900"
            : "translate-x-0 bg-white"
        )}
      >
        {/* Icon inside thumb — spins on change */}
        <span
          key={theme}
          className="animate-[spin-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {isDark ? (
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 fill-slate-300 stroke-slate-300"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 fill-amber-400 stroke-amber-500"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2"  x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="4.22" y1="4.22"  x2="6.34" y2="6.34" />
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
              <line x1="2"  y1="12" x2="5"  y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}

function SunIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-3.5 transition-all duration-300",
        active
          ? "fill-amber-400 stroke-amber-500 opacity-100 scale-100"
          : "fill-slate-400 stroke-slate-400 opacity-30 scale-75"
      )}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22"  x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-3.5 transition-all duration-300",
        active
          ? "fill-slate-200 stroke-slate-300 opacity-100 scale-100"
          : "fill-amber-300 stroke-amber-400 opacity-30 scale-75"
      )}
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
