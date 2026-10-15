"use client";

import { useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import { IconButton } from "./Button";
import { cn } from "./cn";
import { useFocusTrap } from "./useFocusTrap";

/* DESIGN.md §4.7 — dialog on desktop, bottom sheet on mobile; focus trapped, Esc closes. */

const noop = () => () => {};
/** True once mounted in the browser (portals need `document.body`). */
function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function Portal({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Visually hide the title (it still names the dialog). */
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row at the bottom (buttons). */
  footer?: ReactNode;
  className?: string;
};

/**
 * Modal dialog. Below 768 px it is a bottom sheet (grab handle, radius 28 on top, max 90vh);
 * from 768 px a centred 560 px dialog. Close button top right, focus trapped, Esc and a click on
 * the backdrop close it, focus returns to the opener.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, open, { onEscape: onClose });

  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-60 flex items-end justify-center md:items-center md:p-6">
        <div
          aria-hidden
          className="absolute inset-0 animate-fade-in bg-overlay"
          onClick={onClose}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            "relative flex max-h-[90vh] w-full animate-sheet-up flex-col rounded-t-xl bg-raised text-text shadow-3 outline-none",
            "md:max-w-[560px] md:animate-dialog-in md:rounded-xl",
            className,
          )}
        >
          <span
            aria-hidden
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-pill bg-border-strong md:hidden"
          />
          <div className="flex items-start justify-between gap-3 px-5 pt-2 md:pt-5">
            <div className="flex min-w-0 flex-col gap-1 pt-1.5">
              <h2 id={titleId} className={hideTitle ? "sr-only" : "text-h3"}>
                {title}
              </h2>
              {description ? (
                <p id={descId} className="text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton icon="close" label={t("common.close")} onClick={onClose} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end md:pb-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}

/**
 * Side sheet from the right (the header menu on phones). On wide screens pass `dropdownFrom` to
 * turn it into a 360 px dropdown panel under the header instead.
 */
export function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  children,
  dropdownFrom = false,
  id,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  hideTitle?: boolean;
  children: ReactNode;
  /** ≥ 768 px: a dropdown panel under the header instead of a sheet. */
  dropdownFrom?: boolean;
  id?: string;
  className?: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, { onEscape: onClose });

  if (!open) return null;
  return (
    <Portal>
      <div className={cn("fixed inset-0 z-60", dropdownFrom && "md:z-50")}>
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 animate-fade-in bg-overlay",
            dropdownFrom && "md:bg-transparent",
          )}
          onClick={onClose}
        />
        <div
          ref={ref}
          id={id}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(88vw,360px)] animate-sheet-left flex-col bg-raised text-text shadow-3 outline-none",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            dropdownFrom &&
              "md:inset-y-auto md:top-[calc(var(--header-h)+4px)] md:right-6 md:max-h-[calc(100dvh-var(--header-h)-24px)] md:w-[360px] md:animate-drop-in md:rounded-lg md:border md:border-border md:pt-0 md:pb-0 lg:right-8",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border py-2 pr-2 pl-5">
            <h2 id={titleId} className={hideTitle ? "sr-only" : "text-base font-semibold"}>
              {title}
            </h2>
            <IconButton icon="close" label={t("common.close")} onClick={onClose} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
