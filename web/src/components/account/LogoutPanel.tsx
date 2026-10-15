"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { signOut } from "@/lib/account/auth";
import { useAccount } from "@/lib/account/client";

/** Sign-out button; afterwards the visitor goes home. */
export function LogoutPanel() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const account = useAccount();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    setBusy(true);
    await signOut();
    setBusy(false);
    setDone(true);
    router.refresh();
  }

  if (done || account.status === "guest") {
    return (
      <Card as="section" className="gap-4 p-6" role="status">
        <p className="text-lg">
          {done ? t("account.logout.done") : t("account.logout.notSignedIn")}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={localePath(locale, "/")} icon="home">
            {t("nav.home")}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/login")} variant="secondary">
            {t("nav.login")}
          </ButtonLink>
        </div>
      </Card>
    );
  }
  return (
    <Card as="section" className="gap-4 p-6">
      {account.status === "user" ? (
        <p>{t("account.signedInAs", { name: account.user.name })}</p>
      ) : null}
      <Button
        variant="primary"
        size="lg"
        loading={busy || account.status === "unknown"}
        onClick={onClick}
      >
        {t("account.logout.button")}
      </Button>
    </Card>
  );
}
