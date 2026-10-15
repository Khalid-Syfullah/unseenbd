"use client";

import { useState, type ReactNode } from "react";
import { Pagination } from "@/components/ui/Navigation";

/**
 * Pages through server-rendered items without leaving the page: only the current page's items
 * are shown, with the standard `← Previous  1 / 6  Next →` control below.
 */
export function PagedList({
  items,
  pageSize,
  className,
}: {
  items: ReactNode[];
  pageSize: number;
  /** Classes for the element that holds one page of items (a grid or a list). */
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = items.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="flex flex-col gap-5">
      <div className={className}>{slice}</div>
      <Pagination page={current} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
