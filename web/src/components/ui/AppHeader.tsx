import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { FACEBOOK_URL } from "@/lib/site";
import { Avatar } from "./Avatar";
import { ButtonLink, IconLink } from "./Button";
import { cn } from "./cn";
import { HeaderShell, MenuButton, ThemeSwitch } from "./HeaderParts";
import { LanguageSelect } from "./LocaleSwitch";

export type HeaderUser = { name: string };

/**
 * App header (DESIGN.md §4.1):
 * `[logo] ……… [Facebook] [theme] [language ▾] [Log in | avatar] [☰]`.
 * Sticky, 56 px (64 px from 1024 px), translucent raised background with blur. Below 360 px only
 * the mark shows. `user` fills the login/avatar slot.
 */
export function AppHeader({
  lang,
  user = null,
  sticky = true,
  className,
}: {
  lang: Locale;
  user?: HeaderUser | null;
  /** Stick to the top of the page (off only for previews). */
  sticky?: boolean;
  className?: string;
}) {
  const t = getT(lang);
  return (
    <HeaderShell sticky={sticky} className={className}>
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1200px] items-center gap-0.5 px-4 sm:gap-1 md:px-6 lg:px-8">
        <Link
          href={localePath(lang, "/")}
          aria-label={t("header.home")}
          className="mr-auto inline-flex min-h-11 shrink-0 items-center"
        >
          <Image
            src="/brand/logo-mark.svg"
            alt=""
            width={32}
            height={32}
            unoptimized
            priority
            className="size-8 min-[360px]:hidden"
          />
          <Image
            src="/brand/logo-horizontal.svg"
            alt=""
            width={102}
            height={28}
            unoptimized
            priority
            className="hidden h-7 w-auto min-[360px]:block dark:hidden"
          />
          <Image
            src="/brand/logo-horizontal-dark.svg"
            alt=""
            width={102}
            height={28}
            unoptimized
            priority
            className="hidden h-7 w-auto dark:min-[360px]:block"
          />
        </Link>

        <IconLink
          href={FACEBOOK_URL}
          icon="facebook"
          label={t("nav.facebook")}
          className="max-sm:hidden"
        />
        <ThemeSwitch />
        <LanguageSelect />
        <div className="mx-0.5 flex shrink-0 items-center sm:mx-1">
          {user ? (
            <Link
              href={localePath(lang, "/profile")}
              className={cn(
                "tap-target relative inline-flex size-10 items-center justify-center rounded-pill",
              )}
            >
              <Avatar name={user.name} />
              <span className="sr-only">{t("header.account", { name: user.name })}</span>
            </Link>
          ) : (
            <ButtonLink href={localePath(lang, "/login")} variant="secondary" size="sm" pill>
              {t("nav.login")}
            </ButtonLink>
          )}
        </div>
        <MenuButton />
      </div>
    </HeaderShell>
  );
}
