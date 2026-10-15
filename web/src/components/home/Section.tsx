import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * A home-page block: centred column (max 1200 px, 16/24/32 px gutters), a heading, an optional
 * one-line intro and an optional action at the right ("See all →").
 */
export function Section({
  id,
  title,
  intro,
  action,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-10 lg:px-8", className)}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-h1 text-balance">
            {title}
          </h2>
          {intro ? <p className="text-muted">{intro}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
