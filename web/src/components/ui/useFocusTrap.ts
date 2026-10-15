"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Elements inside `container` that Tab can reach, in order. */
export function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden], [inert], [aria-hidden='true']") && el.tabIndex >= 0,
  );
}

/** Open layers (dialogs, sheets, menus), newest last: only the top one handles Tab and Esc. */
const stack: symbol[] = [];
let scrollLocks = 0;
let savedOverflow = "";

/**
 * While `active`: moves focus into `ref` (to `initialFocus`, else the first focusable element,
 * else the container), keeps Tab and Shift+Tab inside it, calls `onEscape` on Esc, and locks page
 * scrolling. When it ends, focus goes back to where it was.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  {
    onEscape,
    initialFocus,
    lockScroll = true,
  }: {
    onEscape?: () => void;
    initialFocus?: RefObject<HTMLElement | null>;
    lockScroll?: boolean;
  } = {},
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const id = Symbol("layer");
    stack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const target = initialFocus?.current ?? focusableIn(container)[0] ?? container;
    target.focus();

    if (lockScroll) {
      if (scrollLocks === 0) {
        savedOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      scrollLocks++;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id || !container) return;
      if (e.key === "Escape") {
        if (onEscapeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusableIn(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current);
      if (e.shiftKey && (current === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (lockScroll) {
        scrollLocks--;
        if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
      }
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [active, ref, initialFocus, lockScroll]);
}
