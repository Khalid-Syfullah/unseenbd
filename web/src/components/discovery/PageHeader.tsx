import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** The centred column (max 1200 px) every discovery page sits in. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page title (the one `h1`) with an optional one-line intro. */
export function PageHeader({
  title,
  intro,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <h1 className="text-h1 text-balance">{title}</h1>
      {intro ? <p className="max-w-[68ch] text-lg text-muted">{intro}</p> : null}
    </header>
  );
}

/** A titled block inside a page. */
export function PageSection({
  id,
  title,
  aside,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  /** Shown at the right of the heading, e.g. a count. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-24 flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-h2 text-balance">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
