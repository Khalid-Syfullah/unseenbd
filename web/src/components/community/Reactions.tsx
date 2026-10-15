"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { failureMessage, react, type Totals } from "@/lib/community/client";
import { setMine, useMine, type ReactionTarget } from "@/lib/community/mine-store";
import { RATING_MAX, RATING_MIN } from "@/lib/community/rules";
import { formatNumber, formatStars, localizeDigits } from "@/lib/format";

/**
 * Like / vote state for one item: the counts (starting from the server-rendered ones), the
 * visitor's own reactions and the calls that change them, with optimistic updates.
 */
export function useReactions(type: ReactionTarget, id: number, initial: Partial<Totals>) {
  const t = useT();
  const toast = useToast();
  const mine = useMine(type, id);
  const [totals, setTotals] = useState<Totals>({
    likes: initial.likes ?? 0,
    votes: initial.votes ?? 0,
    stars: initial.stars ?? null,
    ratings: initial.ratings ?? 0,
  });
  const [busy, setBusy] = useState(false);

  async function toggle(kind: "like" | "vote") {
    if (busy) return;
    const on = !mine[kind];
    const field = kind === "like" ? "likes" : "votes";
    const before = totals;
    setBusy(true);
    setTotals({ ...totals, [field]: Math.max(0, totals[field] + (on ? 1 : -1)) });
    setMine(type, id, { ...mine, [kind]: on });
    const res = await react(type, id, { kind, on });
    setBusy(false);
    if (res.ok) {
      setTotals(res.data.totals);
      setMine(type, id, res.data.mine);
    } else {
      setTotals(before);
      setMine(type, id, mine);
      toast.show(failureMessage(t, res.failure), { tone: "error" });
    }
  }

  async function rate(value: number | null): Promise<boolean> {
    setBusy(true);
    const res = await react(type, id, { kind: "star", value });
    setBusy(false);
    if (res.ok) {
      setTotals(res.data.totals);
      setMine(type, id, res.data.mine);
      return true;
    }
    toast.show(failureMessage(t, res.failure), { tone: "error" });
    return false;
  }

  return { totals, mine, busy, toggle, rate };
}

const PILL =
  "relative inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold tap-target " +
  "transition-colors duration-[var(--dur-1)] ease-standard";

/** ♥ count as a toggle button. */
export function LikeButton({
  count,
  on,
  onToggle,
  className,
}: {
  count: number;
  on: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        PILL,
        on
          ? "border-sun bg-sun/10 text-sun"
          : "border-border-strong bg-raised text-text hover:bg-surface-2",
        className,
      )}
    >
      <Icon name="heart" size={18} />
      <span className="num" aria-hidden>
        {formatNumber(count, lang)}
      </span>
      <span className="sr-only">
        {on ? t("community.unlike") : t("community.like")}, {t("ui.likes", { count })}
      </span>
    </button>
  );
}

/** ▲ count as a toggle button. */
export function VoteButton({
  count,
  on,
  onToggle,
  className,
}: {
  count: number;
  on: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        PILL,
        on
          ? "border-primary bg-primary-wash text-primary"
          : "border-border-strong bg-raised text-text hover:bg-surface-2",
        className,
      )}
    >
      <Icon name="upvote" size={18} />
      <span className="num" aria-hidden>
        {formatNumber(count, lang)}
      </span>
      <span className="sr-only">
        {on ? t("community.unvote") : t("community.vote")}, {t("ui.votes", { count })}
      </span>
    </button>
  );
}

/** ★ x/10 (or "Rate") as a button that opens the rating picker. */
export function RateButton({
  stars,
  mine,
  onRate,
  className,
}: {
  stars: number | null;
  mine: number | null;
  onRate: (value: number | null) => Promise<boolean>;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-pressed={mine !== null}
        onClick={() => setOpen(true)}
        className={cn(
          PILL,
          mine !== null
            ? "border-accent bg-accent-wash text-text"
            : "border-border-strong bg-raised text-text hover:bg-surface-2",
          className,
        )}
      >
        <Icon name="star" size={18} className="text-accent" />
        {stars !== null ? (
          <span className="num">{formatStars(stars, lang).replace("★ ", "")}</span>
        ) : (
          t("community.rate")
        )}
        {stars !== null ? <span className="sr-only">{t("community.rate")}</span> : null}
      </button>
      <RatingDialog
        open={open}
        onClose={() => setOpen(false)}
        mine={mine}
        onRate={async (v) => {
          if (await onRate(v)) setOpen(false);
        }}
      />
    </>
  );
}

/** Pick 1–10 (or take the rating back). */
export function RatingDialog({
  open,
  onClose,
  mine,
  onRate,
}: {
  open: boolean;
  onClose: () => void;
  mine: number | null;
  onRate: (value: number | null) => void;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const values = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("community.rateTitle")}
      description={mine !== null ? t("community.yourRating", { score: mine }) : undefined}
      footer={
        mine !== null ? (
          <Button variant="ghost" onClick={() => onRate(null)}>
            {t("community.removeRating")}
          </Button>
        ) : undefined
      }
    >
      <div role="group" aria-label={t("community.rateTitle")} className="grid grid-cols-5 gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mine === v}
            onClick={() => onRate(v)}
            className={cn(
              "num tap-target relative flex h-12 items-center justify-center rounded-md border text-lg font-semibold",
              mine === v
                ? "border-primary bg-primary text-on-primary"
                : "border-border-strong bg-raised hover:bg-surface-2",
            )}
          >
            {localizeDigits(v, lang)}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
