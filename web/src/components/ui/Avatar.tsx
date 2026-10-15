import { cn } from "./cn";

/** First letter of a name (handles Bengali grapheme clusters and emoji). */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (typeof Intl.Segmenter === "function") {
    for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      trimmed,
    )) {
      return segment.toLocaleUpperCase();
    }
  }
  return Array.from(trimmed)[0]!.toLocaleUpperCase();
}

const SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-14 text-xl" } as const;

/** Round avatar with the person's initial on the accent colour (36 px by default). */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill bg-accent font-semibold text-on-accent select-none",
        SIZES[size],
        className,
      )}
    >
      {initialOf(name)}
    </span>
  );
}
