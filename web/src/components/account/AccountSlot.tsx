"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { useAccount } from "@/lib/account/client";

/**
 * The header's login/avatar slot (DESIGN.md §4.1): "Log in" for visitors, the 36 px avatar with
 * the user's initial (linking to the profile) once signed in.
 */
export function AccountSlot() {
  const t = useT();
  const locale = useLocale();
  const account = useAccount();
  if (account.status === "user") {
    return (
      <Link
        href={localePath(locale, "/profile")}
        className="tap-target relative inline-flex size-10 items-center justify-center rounded-pill"
      >
        <Avatar name={account.user.name} />
        <span className="sr-only">{t("header.account", { name: account.user.name })}</span>
      </Link>
    );
  }
  return (
    <ButtonLink
      href={localePath(locale, "/login")}
      variant="secondary"
      size="sm"
      pill
      reloadDocument
    >
      {t("nav.login")}
    </ButtonLink>
  );
}
