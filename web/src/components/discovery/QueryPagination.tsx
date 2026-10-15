"use client";

import { Pagination } from "@/components/ui/Navigation";

/**
 * Crawlable previous / next links for a list whose page is in the URL (`?page=`). The page keeps
 * every other query value (filters) and drops `page` when it is 1.
 */
export function QueryPagination({
  base,
  params,
  page,
  pageCount,
  className,
}: {
  /** The page's own public path, with the locale. */
  base: string;
  /** Query values to keep, without `page`. */
  params?: Record<string, string>;
  page: number;
  pageCount: number;
  className?: string;
}) {
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      className={className}
      hrefFor={(target) => {
        const query = new URLSearchParams(params);
        if (target > 1) query.set("page", String(target));
        const text = query.toString();
        return text ? `${base}?${text}` : base;
      }}
    />
  );
}
