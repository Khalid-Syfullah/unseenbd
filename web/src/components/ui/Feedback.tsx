import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { CARD } from "./Card";

/* DESIGN.md §4.7 — skeletons, empty states. */

/** A grey placeholder block with a shimmer (no shimmer with reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-shimmer rounded-sm shimmer", className)} />;
}

/** Loading stand-in for a place card. Wrap a group of them in an element with `aria-busy`. */
export function PlaceCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn(CARD, className)}>
      <Skeleton className="aspect-[3/2] rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/** Loading stand-in for a list row. */
export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3 p-2", className)}>
      <Skeleton className="size-[72px] shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export type IllustrationName =
  "empty-map" | "game-hub" | "hero-home" | "not-found" | "planner" | "safety" | "upload";

/** Empty state: an illustration (≤ 200 px), one sentence, one action. */
export function EmptyState({
  illustration = "empty-map",
  title,
  body,
  action,
  className,
}: {
  illustration?: IllustrationName | null;
  /** Optional short heading above the sentence. */
  title?: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-raised/60 px-6 py-8 text-center",
        className,
      )}
    >
      {illustration ? (
        <Image
          src={`/illustrations/${illustration}.svg`}
          alt=""
          width={200}
          height={150}
          unoptimized
          className="h-auto w-full max-w-[200px]"
        />
      ) : null}
      {title ? <p className="text-h3">{title}</p> : null}
      <p className="max-w-[44ch] text-muted">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
