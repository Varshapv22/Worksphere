"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

type ConfirmVariant = "danger" | "primary";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" (red) for destructive/high-impact actions, "primary" (brand) for routine ones. Defaults to "danger". */
  variant?: ConfirmVariant;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState(options);
    });
  }, []);

  function settle(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={state !== null} onClose={() => settle(false)} size="sm">
        {state && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span
                className={
                  state.variant === "primary"
                    ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                    : "flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400"
                }
              >
                <TriangleAlert className="size-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{state.title}</h2>
                {state.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{state.description}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
              <Button type="button" variant="secondary" onClick={() => settle(false)}>
                {state.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={state.variant === "primary" ? "primary" : "danger"}
                onClick={() => settle(true)}
              >
                {state.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
