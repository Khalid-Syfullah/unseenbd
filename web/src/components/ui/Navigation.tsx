"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { localizeDigits } from "@/lib/format";
import { cn } from "./cn";
import { Chevron, Icon, type IconName } from "./Icon";
import { arrowTarget } from "./keyboard";

/* DESIGN.md §4.7 */

const PILL =
  "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold whitespace-nowrap tap-target " +
  "transition-[background-color,color] duration-[var(--dur-2)] ease-standard";
const PILL_ON = "bg-tab-active text-on-tab-active";
const PILL_OFF = "bg-surface-2 text-text hover:bg-border";
const PILL_ROW =
  "scrollbar-none fade-x -mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]";

export type PillTab = { id: string; label: ReactNode; icon?: IconName; href?: string };

/** ids for a tab and its panel, so pages can render `<TabPanel>` next to `<PillTabs>`. */
export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Pill tabs (Game hub, Profile). Tabs with `href` render as navigation links (`aria-current`);
 * otherwise as an ARIA tablist with arrow-key navigation, paired with <TabPanel>s by `idPrefix`.
 */
export function PillTabs({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  className,
}: {
  label: string;
  tabs: PillTab[];
  value: string;
  onChange?: (id: string) => void;
  /** Needed for tablist mode, to link tabs and panels. */
  idPrefix?: string;
  className?: string;
}) {
  const fallbackPrefix = useId();
  const prefix = idPrefix ?? fallbackPrefix;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.every((tab) => tab.href)) {
    return (
      <nav aria-label={label} className={className}>
        <ul className={PILL_ROW}>
          {tabs.map((tab) => {
            const active = tab.id === value;
            return (
              <li key={tab.id} className="shrink-0">
                <Link
                  href={tab.href!}
                  aria-current={active ? "page" : undefined}
                  className={cn(PILL, active ? PILL_ON : PILL_OFF)}
                >
                  {tab.icon ? <Icon name={tab.icon} size={18} /> : null}
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === value),
  );

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const next = arrowTarget(e.key, index, tabs.length);
    if (next === null) return;
    e.preventDefault();
    onChange?.(tabs[next]!.id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(PILL_ROW, className)}
    >
      {tabs.map((tab, i) => {
        const active = i === index;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(prefix, tab.id)}
            aria-selected={active}
            aria-controls={panelId(prefix, tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(tab.id)}
            className={cn(PILL, active ? PILL_ON : PILL_OFF)}
          >
            {tab.icon ? <Icon name={tab.icon} size={18} /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel for one pill tab (rendered hidden when not active, so its content stays in HTML). */
export function TabPanel({
  idPrefix,
  id,
  active,
  children,
  className,
}: {
  idPrefix: string;
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, id)}
      aria-labelledby={tabId(idPrefix, id)}
      hidden={!active}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

const PAGE_BUTTON =
  "relative inline-flex h-11 items-center gap-1.5 rounded-md border border-border-strong bg-raised px-4 text-sm font-semibold text-text " +
  "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2";
const PAGE_DISABLED = "pointer-events-none opacity-40";

/**
 * `[← Previous]  1 / 6  [Next →]`, centred, in the page's numerals. Links with `hrefFor`
 * (crawlable, works without JavaScript) or buttons with `onChange`.
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  onChange,
  className,
}: {
  page: number;
  pageCount: number;
  hrefFor?: (page: number) => string;
  onChange?: (page: number) => void;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  if (pageCount <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  function control(target: number, enabled: boolean, rel: "prev" | "next") {
    const content =
      rel === "prev" ? (
        <>
          <Icon name="arrow-left" size={18} />
          {t("common.previous")}
        </>
      ) : (
        <>
          {t("common.next")}
          <Icon name="arrow-right" size={18} />
        </>
      );
    if (hrefFor) {
      return enabled ? (
        <Link href={hrefFor(target)} rel={rel} className={PAGE_BUTTON}>
          {content}
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(PAGE_BUTTON, PAGE_DISABLED)}>
          {content}
        </span>
      );
    }
    return (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => onChange?.(target)}
        className={cn(PAGE_BUTTON, "disabled:pointer-events-none disabled:opacity-40")}
      >
        {content}
      </button>
    );
  }

  return (
    <nav
      aria-label={t("ui.pagination")}
      className={cn("flex items-center justify-center gap-3 sm:gap-5", className)}
    >
      {control(page - 1, hasPrev, "prev")}
      <p className="num min-w-14 text-center text-base font-semibold" aria-live="polite">
        <span className="sr-only">{t("common.pageOf", { page, pages: pageCount })}</span>
        <span aria-hidden>{localizeDigits(`${page} / ${pageCount}`, lang)}</span>
      </p>
      {control(page + 1, hasNext, "next")}
    </nav>
  );
}

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode };

/**
 * Accordion (FAQ): 56 px rows, 600 question, chevron turns 180°. With `single`, opening one
 * closes the others. Closed answers stay in the HTML (`hidden`), for search engines.
 */
export function Accordion({
  items,
  single = false,
  defaultOpen = [],
  headingLevel = 3,
  className,
}: {
  items: AccordionItem[];
  single?: boolean;
  defaultOpen?: string[];
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const prefix = useId();
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const Heading = `h${headingLevel}` as const;

  function toggle(id: string) {
    setOpen((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : single ? [id] : [...current, id],
    );
  }

  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-lg border border-border bg-raised",
        className,
      )}
    >
      {items.map((item) => {
        const expanded = open.includes(item.id);
        const buttonId = `${prefix}-q-${item.id}`;
        const regionId = `${prefix}-a-${item.id}`;
        return (
          <div key={item.id}>
            <Heading className="text-base font-semibold">
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={regionId}
                onClick={() => toggle(item.id)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left font-semibold transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2 focus-visible:-outline-offset-3"
              >
                <span>{item.title}</span>
                <Chevron
                  size={20}
                  className={cn(
                    "text-muted transition-transform duration-[var(--dur-2)] ease-standard",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            </Heading>
            <div
              id={regionId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="px-4 pb-4 text-muted"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
