"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { arrowTarget } from "@/components/ui/keyboard";
import { useT } from "@/i18n/client";
import { CARD_THEMES, type ThemeKey } from "@/lib/card";

/** Six theme swatches (32 px) with their names, as a radio group. */
export function ThemePicker({
  value,
  onChange,
  bn,
}: {
  value: ThemeKey;
  onChange: (v: ThemeKey) => void;
  bn: boolean;
}) {
  const t = useT();
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    CARD_THEMES.findIndex((th) => th.key === value),
  );

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const next = arrowTarget(e.key, index, CARD_THEMES.length);
    if (next === null) return;
    e.preventDefault();
    onChange(CARD_THEMES[next]!.key);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold">
        {t("card.theme")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {CARD_THEMES.map((theme, i) => {
          const selected = i === index;
          return (
            <button
              key={theme.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(theme.key)}
              className={cn(
                "flex min-h-11 flex-col items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition-colors duration-[var(--dur-1)] ease-standard",
                selected
                  ? "border-primary bg-primary-wash text-on-primary-wash"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span
                aria-hidden
                className="relative size-8 overflow-hidden rounded-pill border border-border-strong"
                style={{ background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
              >
                <span
                  className="absolute right-1 bottom-1 size-3 rounded-pill"
                  style={{ background: theme.visited }}
                />
              </span>
              <span className="flex items-center gap-0.5">
                {selected ? <Icon name="check" size={12} /> : null}
                {bn ? theme.nameBn : theme.nameEn}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
