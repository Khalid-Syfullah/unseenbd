"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageSection } from "@/components/discovery/PageHeader";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { useBucket, setBucketStatus } from "@/lib/bucket";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import { formatNumber, formatPercent } from "@/lib/format";

export type BucketPlace = { slug: string; name: string; districtName: string };
export type BucketGroup = { key: string; label: string; places: BucketPlace[] };

/**
 * Every place, grouped by type, each with "Want to see" and "Been there" toggles and an
 * "X of Y ticked" counter (ticked = been there). The marks live in this browser; see
 * `lib/bucket.ts`.
 */
export function BucketList({ groups }: { groups: BucketGroup[] }) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const bucket = useBucket();

  const stats = useMemo(() => {
    let total = 0;
    let been = 0;
    let want = 0;
    const perGroup = new Map<string, number>();
    for (const g of groups) {
      let done = 0;
      for (const p of g.places) {
        total += 1;
        const status = bucket[p.slug];
        if (status === "been") {
          been += 1;
          done += 1;
        } else if (status === "want") want += 1;
      }
      perGroup.set(g.key, done);
    }
    return { total, been, want, perGroup };
  }, [groups, bucket]);

  const percent = stats.total ? Math.round((stats.been / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-raised p-4 shadow-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="num text-h3" role="status" data-testid="bucket-progress">
            {t("bucket.progress", { done: stats.been, total: stats.total })}
          </p>
          <p className="num text-sm text-muted">{t("bucket.wishCount", { count: stats.want })}</p>
        </div>
        <div
          role="progressbar"
          aria-label={t("bucket.title")}
          aria-valuemin={0}
          aria-valuemax={stats.total}
          aria-valuenow={stats.been}
          aria-valuetext={`${formatNumber(stats.been, lang)} / ${formatNumber(stats.total, lang)} (${formatPercent(percent, lang)})`}
          className="h-2 overflow-hidden rounded-pill bg-surface-2"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-[var(--dur-3)] ease-standard"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ChipRow label={t("bucket.jump")}>
        {groups.map((g) => (
          <FilterChip
            key={g.key}
            href={`#kind-${g.key}`}
            count={`${formatNumber(stats.perGroup.get(g.key) ?? 0, lang)}/${formatNumber(g.places.length, lang)}`}
          >
            {g.label}
          </FilterChip>
        ))}
      </ChipRow>

      {groups.map((g) => (
        <PageSection
          key={g.key}
          id={`kind-${g.key}`}
          title={g.label}
          aside={
            <span className="num text-sm text-muted">
              {t("bucket.groupProgress", {
                done: stats.perGroup.get(g.key) ?? 0,
                total: g.places.length,
              })}
            </span>
          }
        >
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-raised">
            {g.places.map((p) => {
              const status = bucket[p.slug];
              return (
                <li
                  key={p.slug}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={localePath(locale, `/place/${p.slug}`)}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm text-muted">{p.districtName}</span>
                  </div>
                  <div className="flex gap-2">
                    <FilterChip
                      icon="bookmark"
                      selected={status === "want"}
                      onClick={() => setBucketStatus(p.slug, "want")}
                    >
                      {t("bucket.want")}
                      <span className="sr-only"> — {p.name}</span>
                    </FilterChip>
                    <FilterChip
                      icon="check"
                      selected={status === "been"}
                      onClick={() => setBucketStatus(p.slug, "been")}
                    >
                      {t("bucket.been")}
                      <span className="sr-only"> — {p.name}</span>
                    </FilterChip>
                  </div>
                </li>
              );
            })}
          </ul>
        </PageSection>
      ))}
    </div>
  );
}
