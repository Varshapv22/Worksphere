import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, name, rows = 3, ...rest },
  ref
) {
  const textareaId = id || name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500",
          "dark:focus:border-brand-500 dark:focus:ring-brand-500/20",
          "dark:disabled:bg-gray-800 dark:disabled:text-gray-500",
          error && "border-danger-600 focus:border-danger-600 focus:ring-danger-600/20",
          className
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
});
