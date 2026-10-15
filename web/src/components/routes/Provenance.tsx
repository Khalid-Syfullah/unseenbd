import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatDate } from "@/lib/format";
import { StatusTag, type StatusTone } from "@/components/ui/Chip";
import type { Confidence } from "@/server/db/json-types";
import { cn } from "@/components/ui/cn";

const TONE: Record<Confidence, StatusTone> = { high: "good", medium: "info", low: "danger" };

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The "as of" date, a confidence chip and the source links every fare or timetable block shows. */
export function Provenance({
  locale,
  asOf,
  confidence,
  sources,
  className,
}: {
  locale: Locale;
  asOf: string | null;
  confidence?: Confidence | null;
  sources: string[];
  className?: string;
}) {
  const t = getT(locale);
  const unique = [...new Set(sources)];
  return (
    <footer className={cn("flex flex-col gap-2 border-t border-border pt-3 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {asOf ? (
          <span className="num text-muted">
            {t("common.asOf", { date: formatDate(asOf, locale) })}
          </span>
        ) : null}
        {confidence ? (
          <StatusTag tone={TONE[confidence]}>{t(`confidence.${confidence}`)}</StatusTag>
        ) : null}
      </div>
      {unique.length ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-muted">
          <span>{t("common.sources")}:</span>
          {unique.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {host(url)}
            </a>
          ))}
        </p>
      ) : null}
    </footer>
  );
}
