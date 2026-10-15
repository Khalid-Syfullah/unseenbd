import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/* DESIGN.md §4.4 */

export const KINDS = [
  "beach",
  "island",
  "hill",
  "waterfall",
  "forest",
  "river",
  "tea",
  "heritage",
  "spiritual",
  "city",
  "village",
] as const;
export type Kind = (typeof KINDS)[number];

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

const CHIP =
  "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border-[1.5px] px-3.5 text-sm font-semibold whitespace-nowrap tap-target " +
  "transition-[background-color,border-color,color] duration-[var(--dur-1)] ease-standard " +
  "disabled:pointer-events-none disabled:opacity-50";
const CHIP_OFF = "border-transparent bg-surface-2 text-text hover:border-border-strong";
const CHIP_ON = "border-primary bg-primary-wash text-on-primary-wash";

type ChipContentProps = { icon?: IconName; count?: ReactNode; children: ReactNode };

function ChipContent({ icon, count, children }: ChipContentProps) {
  return (
    <>
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
      {count !== undefined && count !== null ? (
        <span className="num font-normal text-muted">{count}</span>
      ) : null}
    </>
  );
}

type FilterChipBase = ChipContentProps & { selected?: boolean; className?: string };

export type FilterChipProps =
  | (FilterChipBase & { href: string; scroll?: boolean })
  | (FilterChipBase &
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined });

/**
 * A filter chip. With `href` it is a link (`aria-current` when selected); otherwise a toggle
 * button (`aria-pressed`).
 */
export function FilterChip({
  selected = false,
  icon,
  count,
  children,
  className,
  ...props
}: FilterChipProps) {
  const classes = cn(CHIP, selected ? CHIP_ON : CHIP_OFF, className);
  const content = (
    <ChipContent icon={icon} count={count}>
      {children}
    </ChipContent>
  );
  if (props.href !== undefined) {
    const { href, scroll } = props as { href: string; scroll?: boolean };
    return (
      <Link
        href={href}
        scroll={scroll}
        aria-current={selected ? "true" : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }
  const { type = "button", ...rest } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} aria-pressed={selected} className={classes} {...rest}>
      {content}
    </button>
  );
}

/**
 * A row of chips: scrolls sideways with faded edges on mobile (bleeding to the screen edge),
 * wraps from 768 px.
 */
export function ChipRow({
  label,
  children,
  className,
}: {
  /** Names the group for screen readers. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 scrollbar-none flex gap-2 overflow-x-auto fade-x px-4 py-1.5",
        "md:mx-0 md:flex-wrap md:overflow-visible md:[mask-image:none] md:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Place-type badge: 24 px, the type's colour at 14 % over the surface, icon 14 + label.
 * The text is the type colour pulled towards the text colour so it stays readable in both themes.
 */
export function KindBadge({
  kind,
  label,
  className,
}: {
  kind: Kind;
  label: string;
  className?: string;
}) {
  return (
    <span
      style={{ "--kind": `var(--color-kind-${kind})` } as CSSProperties}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-xs px-2 text-xs font-semibold whitespace-nowrap",
        "bg-[color-mix(in_srgb,var(--kind)_14%,var(--bg-raised))] text-[color-mix(in_srgb,var(--kind)_68%,var(--text))]",
        className,
      )}
    >
      <Icon name={`kinds/${kind}`} size={14} />
      {label}
    </span>
  );
}

export type StatusTone = "sponsored" | "good" | "new" | "info" | "danger" | "neutral";

const TONES: Record<StatusTone, string> = {
  sponsored: "bg-accent-wash text-on-accent-wash",
  good: "bg-primary-wash text-on-primary-wash",
  new: "bg-raised text-text border border-border",
  info: "bg-surface-2 text-info-text",
  danger: "bg-surface-2 text-danger",
  neutral: "bg-surface-2 text-muted",
};

/** Small status tag: "Sponsored", "Good this month", "New" (with a red dot), … */
export function StatusTag({
  tone,
  children,
  icon,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-xs px-2 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {tone === "new" ? <span aria-hidden className="size-2 rounded-pill bg-sun" /> : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

/** A "new" dot on its own (e.g. on a tab or avatar). */
export function NewDot({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block size-2 rounded-pill bg-sun", className)}
    />
  );
}

/** My Bangladesh district toggle: 36 px pill, filled with ✓ when visited. */
export function DistrictChip({
  visited,
  children,
  className,
  type = "button",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  visited: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      aria-pressed={visited}
      className={cn(
        CHIP,
        visited
          ? "border-transparent bg-primary text-on-primary hover:bg-primary-hover"
          : "border-transparent bg-surface-2 text-text hover:border-border-strong",
        className,
      )}
      {...rest}
    >
      {visited ? <Icon name="check" size={16} /> : null}
      {children}
    </button>
  );
}
