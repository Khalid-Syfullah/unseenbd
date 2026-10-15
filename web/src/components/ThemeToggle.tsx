"use client";

import { useSyncExternalStore } from "react";
import { getThemePref, setThemePref, THEME_PREFS, type ThemePref } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-pref"],
  });
  return () => observer.disconnect();
}

type Props = {
  label: string;
  labels: Record<ThemePref, string>;
};

/** Light / dark / system switch. The current preference comes from <html data-theme-pref>. */
export function ThemeToggle({ label, labels }: Props) {
  const current = useSyncExternalStore(subscribe, getThemePref, () => null);

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex w-fit gap-1 rounded-pill border border-border bg-surface-2 p-1"
    >
      {THEME_PREFS.map((pref) => {
        const active = current === pref;
        return (
          <button
            key={pref}
            type="button"
            aria-pressed={active}
            onClick={() => setThemePref(pref)}
            className={`min-h-11 min-w-11 rounded-pill px-4 text-sm font-semibold transition-colors duration-[var(--dur-1)] ease-standard ${
              active
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-primary-wash hover:text-text"
            }`}
          >
            {labels[pref]}
          </button>
        );
      })}
    </div>
  );
}
