import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/* DESIGN.md §4.5 — shared card shell. */

/**
 * The card surface: raised, hairline border, radius 20, light shadow, lifts 2 px on hover
 * (pointer devices only). When it holds a <CardLink>, the focus ring goes round the whole card.
 */
export const CARD =
  "group/card relative flex flex-col overflow-hidden rounded-lg border border-border bg-raised shadow-1 " +
  "transition-[translate,box-shadow] duration-[var(--dur-2)] ease-standard " +
  "has-[[data-card-link]:focus-visible]:outline-3 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-focus";

/** Hover lift, only for cards that are links. */
export const CARD_LIFT = "hover:-translate-y-0.5 hover:shadow-2";

export function Card({
  as: Tag = "article",
  interactive = false,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Lift on hover (the card is one link). */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"article">, "className" | "children">) {
  return (
    <Tag className={cn(CARD, interactive && CARD_LIFT, className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * The card's one link, usually its title. Its hit area stretches over the whole card; buttons
 * inside the card sit above it (`relative z-10`) so they keep their own clicks.
 */
export function CardLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      data-card-link=""
      className={cn(
        "outline-none after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Stat tile: muted label, big serif value, optional delta or subtitle (DESIGN.md §4.5). */
export function StatTile({
  label,
  value,
  sub,
  money = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Currency values use the smaller h1 size so long ৳ amounts fit. */
  money?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(CARD, "gap-1 p-4 md:p-5", className)}>
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("num text-text", money ? "text-h1 font-bold" : "font-display text-display")}>
        {value}
      </p>
      {sub ? <p className="text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

/** Feature card: icon in a 44 px tinted circle, title, one sentence, arrow. */
export function FeatureCard({
  icon,
  title,
  body,
  href,
  headingLevel = 3,
  className,
}: {
  icon: IconName;
  title: string;
  body: string;
  href: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className={cn(CARD, CARD_LIFT, "flex-row items-start gap-4 p-5", className)}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-primary-wash text-on-primary-wash">
        <Icon name={icon} size={22} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Heading className="text-h3">
          <CardLink href={href}>{title}</CardLink>
        </Heading>
        <p className="text-sm text-muted">{body}</p>
      </div>
      <Icon
        name="arrow-right"
        size={20}
        className="mt-1 text-primary transition-transform duration-[var(--dur-2)] ease-standard group-hover/card:translate-x-0.5"
      />
    </article>
  );
}

/** Card grid: 1 column < 480 · 2 ≥ 480 · 3 ≥ 768 · 4 ≥ 1280 (`max={3}` stops at 3). */
export function CardGrid({
  children,
  max = 4,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  max?: 2 | 3 | 4;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-5",
        max >= 3 && "md:grid-cols-3",
        max >= 4 && "xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
