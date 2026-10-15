"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { useT } from "@/i18n/client";
import { EMOJI } from "@/lib/community/rules";

/**
 * "😊 Emoji" button with a small grid of travel-friendly emoji. Choosing one calls `onPick`
 * (the composer inserts it at the cursor). Esc or a click outside closes the grid.
 */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-strong bg-raised px-3 text-sm font-semibold hover:bg-surface-2"
      >
        <span aria-hidden>😊</span>
        {t("posts.emoji")}
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={t("posts.emojiLabel")}
          className="absolute bottom-full left-0 z-30 mb-2 grid w-[min(88vw,336px)] grid-cols-8 gap-1 rounded-lg border border-border bg-raised p-2 shadow-3"
        >
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              aria-label={emoji}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-xl hover:bg-surface-2",
              )}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
