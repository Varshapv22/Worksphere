import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, name, ...rest },
  ref
) {
  const checkboxId = id || name;

  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        name={name}
        className={cn(
          "size-4 rounded border-gray-300 text-brand-600 shadow-sm",
          "focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0",
          className
        )}
        {...rest}
      />
      {label}
    </label>
  );
});
