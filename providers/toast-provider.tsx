"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils/cx";

export type ToastTone = "success" | "error" | "neutral";

export type ToastAction = {
  label: string;
  onAction: () => void | Promise<void>;
};

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  action?: ToastAction;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4500;
const UNDO_DURATION_MS = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const durationMs =
        input.durationMs ??
        (input.action ? UNDO_DURATION_MS : DEFAULT_DURATION_MS);
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "neutral",
        durationMs,
        action: input.action,
      };

      setToasts((prev) => [...prev.slice(-3), item]);

      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(id), durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  const latest = toasts[toasts.length - 1] ?? null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
      >
        <span className="sr-only" role="status">
          {latest
            ? `${latest.tone === "error" ? "Error: " : ""}${latest.title}${
                latest.description ? `. ${latest.description}` : ""
              }`
            : ""}
        </span>
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cx(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-primary p-3 shadow-lg ring-1 ring-inset",
              item.tone === "success" && "border-success_subtle ring-success_subtle",
              item.tone === "error" && "border-error_subtle ring-error_subtle",
              item.tone === "neutral" && "border-secondary ring-secondary",
            )}
            role={item.tone === "error" ? "alert" : "status"}
          >
            <div className="min-w-0 flex-1">
              <p
                className={cx(
                  "text-sm font-semibold",
                  item.tone === "success" && "text-success-primary",
                  item.tone === "error" && "text-error-primary",
                  item.tone === "neutral" && "text-primary",
                )}
              >
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-0.5 text-sm text-tertiary">{item.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {item.action ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="min-h-11 px-2"
                  onClick={() => {
                    void item.action?.onAction();
                    dismiss(item.id);
                  }}
                >
                  {item.action.label}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 px-2"
                aria-label="Dismiss notification"
                onClick={() => dismiss(item.id)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
