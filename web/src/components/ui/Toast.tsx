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
import { useT } from "@/i18n/client";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/* DESIGN.md §4.7 — one toast at a time, above the tab bar, 4 s. */

export type ToastTone = "neutral" | "success" | "error";
export type ToastOptions = { tone?: ToastTone; duration?: number };
type ToastState = { id: number; message: string; tone: ToastTone; duration: number };

type ToastApi = { show: (message: string, options?: ToastOptions) => void; dismiss: () => void };

const ToastContext = createContext<ToastApi | null>(null);

export const TOAST_MS = 4000;

const TONE_ICON: Record<ToastTone, IconName | null> = {
  neutral: null,
  success: "check",
  error: "flag",
};

/** Provides `useToast()` and renders the toast region (once, in the root layout). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    counter.current += 1;
    setToast({
      id: counter.current,
      message,
      tone: options.tone ?? "neutral",
      duration: options.duration ?? TOAST_MS,
    });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const icon = toast ? TONE_ICON[toast.tone] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-label={t("ui.notifications")}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+12px)] z-80 flex justify-center px-4"
      >
        {toast ? (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex max-w-[480px] animate-drop-in items-center gap-3 rounded-md bg-text py-2 pr-2 pl-4 text-sm font-semibold text-bg shadow-3",
            )}
          >
            {icon ? <Icon name={icon} size={18} /> : null}
            <span className="py-1.5">{toast.message}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("ui.dismiss")}
              className="tap-target relative inline-flex size-9 shrink-0 items-center justify-center rounded-sm hover:bg-bg/15"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

const fallback: ToastApi = { show: () => {}, dismiss: () => {} };

/** `const toast = useToast(); toast.show("Link copied", { tone: "success" })`. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? fallback;
}
