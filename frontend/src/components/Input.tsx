import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, endAdornment, className, id, name, ...rest },
  ref
) {
  const inputId = id || name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500",
            "dark:focus:border-brand-500 dark:focus:ring-brand-500/20",
            "dark:disabled:bg-gray-800 dark:disabled:text-gray-500",
            icon && "pl-9",
            endAdornment && "pr-9",
            error && "border-danger-600 focus:border-danger-600 focus:ring-danger-600/20",
            className
          )}
          {...rest}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500">
            {endAdornment}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
});
