import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type Crumb = { label: ReactNode; href?: string };

/** Breadcrumb trail; the last item is the current page. */
export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="inline-flex items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="tap-target relative inline-flex min-h-6 items-center text-primary underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-text" : ""}>
                  {item.label}
                </span>
              )}
              {last ? null : <Icon name="arrow-right" size={14} className="text-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
