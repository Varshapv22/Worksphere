import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, id, name, ...rest },
  ref
) {
  const radioId = id || `${name}-${rest.value}`;

  return (
    <label htmlFor={radioId} className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        ref={ref}
        type="radio"
        id={radioId}
        name={name}
        className={cn(
          "size-4 border-gray-300 text-brand-600 shadow-sm",
          "focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0",
          className
        )}
        {...rest}
      />
      {label}
    </label>
  );
});
