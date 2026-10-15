"use client";

import { useId, useState, type FormEvent } from "react";
import { useAccount } from "@/lib/account/client";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { failureMessage, sendJson } from "@/lib/community/client";
import { NAME_MAX } from "@/lib/community/rules";
import { formatDate, formatNumber } from "@/lib/format";
import { REVIEW_BODY_MAX } from "@/lib/listings/rules";
import type { ListingReview } from "@/server/data/listings";

/** Approved reviews of a listing and a form to write one (it waits for a moderator). */
export function ListingReviews({
  listingId,
  reviews,
  canReview,
}: {
  listingId: number;
  reviews: ListingReview[];
  canReview: boolean;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const account = useAccount();
  const ids = { name: useId(), rating: useId(), body: useId() };
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownName = touched ? name : name || (account.user?.name ?? "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!shownName.trim()) return setError(t("listing.reviewNeedName"));
    setBusy(true);
    const res = await sendJson(`/api/listings/${listingId}/reviews`, {
      name: shownName.trim(),
      rating: Number(rating),
      body: body.trim(),
    });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setBody("");
    } else setError(failureMessage(t, res.failure));
  }

  return (
    <div className="flex flex-col gap-5">
      {reviews.length ? (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-raised p-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{r.name}</span>
                <span
                  className="num inline-flex items-center gap-1 text-sm font-semibold"
                  aria-label={t("listing.ratingOf", { rating: r.rating })}
                >
                  <Icon name="star" size={16} className="text-accent" />
                  {formatNumber(r.rating, lang)}/{formatNumber(5, lang)}
                </span>
                <span className="text-sm text-muted">{formatDate(r.createdAt, lang)}</span>
              </p>
              {r.body ? <p className="mt-1 whitespace-pre-line">{r.body}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{t("listing.noReviews")}</p>
      )}

      {canReview ? (
        sent ? (
          <p role="status" className="rounded-md bg-primary-wash px-4 py-3 text-on-primary-wash">
            {t("listing.reviewSent")}
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <h3 className="text-h3">{t("listing.writeReview")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("listing.reviewName")} htmlFor={ids.name}>
                <TextInput
                  id={ids.name}
                  value={shownName}
                  maxLength={NAME_MAX}
                  autoComplete="name"
                  onChange={(e) => {
                    setTouched(true);
                    setName(e.target.value);
                  }}
                />
              </Field>
              <Field label={t("listing.reviewRating")} htmlFor={ids.rating}>
                <Select
                  id={ids.rating}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  options={[5, 4, 3, 2, 1].map((n) => ({
                    value: String(n),
                    label: t("listing.ratingOf", { rating: n }),
                  }))}
                />
              </Field>
            </div>
            <Field label={t("listing.reviewBody")} htmlFor={ids.body}>
              <TextArea
                id={ids.body}
                value={body}
                maxLength={REVIEW_BODY_MAX}
                counter
                rows={3}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={busy} icon="comment" fullWidth="mobile">
              {t("listing.reviewSubmit")}
            </Button>
          </form>
        )
      ) : null}
    </div>
  );
}
