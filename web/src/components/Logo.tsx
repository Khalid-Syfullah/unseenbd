import Image from "next/image";
import type { ContentLocale } from "@/i18n/locales";

type Props = {
  lang: ContentLocale;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * The horizontal Unseen BD lockup (mark + wordmark + tagline in `lang`), from assets/brand.
 * Both the light and the dark file are rendered; CSS shows the one for the current theme.
 */
export function Logo({ lang, alt, className = "", priority = false }: Props) {
  const base = `/brand/logo-horizontal-${lang}`;
  const common = { width: 584, height: 160, unoptimized: true, priority } as const;
  return (
    <span className={`inline-block ${className}`}>
      <Image
        {...common}
        src={`${base}.svg`}
        alt={alt}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        {...common}
        src={`${base}-dark.svg`}
        alt={alt}
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}
