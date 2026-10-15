"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusTag, type StatusTone } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import { failureMessage, sendJson } from "@/lib/community/client";
import type { ListingSummary } from "@/server/data/listings";
import { useListingLabel } from "./OwnerListingGrid";

const TONE: Record<ListingSummary["status"], StatusTone> = {
  pending: "info",
  approved: "good",
  rejected: "danger",
};

/** The owner's dashboard: each listing with its status, and edit and delete. */
export function MyListings({ listings }: { listings: ListingSummary[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const label = useListingLabel();
  const [confirm, setConfirm] = useState<ListingSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    const res = await sendJson(`/api/my/listings/${confirm.id}`, undefined, "DELETE");
    setBusy(false);
    if (res.ok) {
      setConfirm(null);
      toast.show(t("myListings.deleted"), { tone: "success" });
      router.refresh();
    } else setError(failureMessage(t, res.failure));
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {listings.map((l) => (
          <li key={l.id}>
            <Card as="div" className="gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag tone={TONE[l.status]}>
                    {t(`myListings.status.${l.status}` as MessageKey)}
                  </StatusTag>
                  <StatusTag tone="neutral">{label(l)}</StatusTag>
                  {l.sponsored ? (
                    <StatusTag tone="sponsored">{t("common.sponsored")}</StatusTag>
                  ) : null}
                </div>
                <h2 className="text-h3">
                  {l.status === "approved" ? (
                    <Link href={localePath(locale, `/listing/${l.id}`)} className="hover:underline">
                      {l.name}
                    </Link>
                  ) : (
                    l.name
                  )}
                </h2>
                <p className="text-sm text-muted">
                  {[l.area, l.district.name].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted">
                  {t(`myListings.note.${l.status}` as MessageKey)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <ButtonLink
                  href={localePath(locale, `/add-listing?edit=${l.id}`)}
                  variant="secondary"
                  size="sm"
                  icon="check"
                  aria-label={`${t("common.edit")}: ${l.name}`}
                >
                  {t("common.edit")}
                </ButtonLink>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="close"
                  aria-label={`${t("common.delete")}: ${l.name}`}
                  onClick={() => setConfirm(l)}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={t("myListings.deleteTitle")}
        description={confirm?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p>{t("myListings.deleteBody")}</p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
