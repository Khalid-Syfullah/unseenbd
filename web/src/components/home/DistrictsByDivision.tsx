"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useT } from "@/i18n/client";
import { useVisited } from "@/lib/visited";

export type DivisionLinks = {
  slug: string;
  name: string;
  districts: { slug: string; name: string; href: string }[];
};

/**
 * The 64 districts grouped by division, as links. A district this visitor has ticked gets a
 * solid underline (and "visited" for screen readers); the others a dotted one. The server
 * render has all of them dotted; the browser fills in the visited ones.
 */
export function DistrictsByDivision({ divisions }: { divisions: DivisionLinks[] }) {
  const t = useT();
  const visited = new Set(useVisited());

  return (
    <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {divisions.map((division) => (
        <div key={division.slug} className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h3 text-primary">{division.name}</h3>
          <ul className="flex flex-wrap gap-x-4 lg:flex-col lg:gap-x-0">
            {division.districts.map((d) => {
              const isVisited = visited.has(d.slug);
              return (
                <li key={d.slug}>
                  <Link
                    href={d.href}
                    className={cn(
                      "inline-flex min-h-11 items-center underline decoration-2 underline-offset-[6px] hover:text-primary",
                      isVisited
                        ? "decoration-primary decoration-solid"
                        : "decoration-subtle decoration-dotted",
                    )}
                  >
                    {d.name}
                    {isVisited ? (
                      <span className="sr-only"> ({t("home.districts.visited")})</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
