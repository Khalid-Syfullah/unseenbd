"use client";

import { Children, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/**
 * A horizontal, swipeable, snap-scrolling row with previous/next arrows from 768 px. Works with
 * the keyboard and touch; the arrows scroll by most of a screenful.
 */
export function Carousel({
  label,
  previousLabel,
  nextLabel,
  children,
  className,
}: {
  label: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLUListElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={track}
        aria-label={label}
        className="-mx-4 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {Children.map(children, (child) => (
          <li className="w-[68%] shrink-0 snap-start sm:w-[44%] md:w-[30%] lg:w-[23%]">{child}</li>
        ))}
      </ul>
      <IconButton
        icon="arrow-left"
        label={previousLabel}
        onClick={() => scrollBy(-1)}
        className="absolute top-1/2 -left-5 z-10 hidden -translate-y-1/2 rounded-pill border border-border-strong bg-raised shadow-2 md:inline-flex"
      />
      <IconButton
        icon="arrow-right"
        label={nextLabel}
        onClick={() => scrollBy(1)}
        className="absolute top-1/2 -right-5 z-10 hidden -translate-y-1/2 rounded-pill border border-border-strong bg-raised shadow-2 md:inline-flex"
      />
    </div>
  );
}
