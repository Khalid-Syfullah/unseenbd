"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { failureMessage, getJson, sendJson } from "@/lib/community/client";
import { TREND_COMMENT_MAX } from "@/lib/community/rules";
import { seasonOf } from "@/lib/community/season";
import { formatNumber, localizeDigits } from "@/lib/format";
import { CommentThread } from "./CommentThread";

type VoteState = { votes: number; voted: boolean };

/**
 * "Add to trending" on a place page: one vote per visitor per season (account, or this device
 * when logged out). Voting opens a small dialog with the season's rule, a way to take the vote
 * back, and the "why go now?" comments.
 */
export function TrendButton({
  slug,
  name,
  initialVotes,
  className,
}: {
  slug: string;
  name: string;
  initialVotes: number;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const toast = useToast();
  const [state, setState] = useState<VoteState>({ votes: initialVotes, voted: false });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const season = seasonOf();
  const seasonName = t(`trend.season.${season.season}`, {
    year: localizeDigits(String(season.year), lang),
  });

  useEffect(() => {
    let live = true;
    void getJson<VoteState>(`/api/trend/vote?place=${encodeURIComponent(slug)}`).then((res) => {
      if (live && res.ok) setState({ votes: res.data.votes, voted: res.data.voted });
    });
    return () => {
      live = false;
    };
  }, [slug]);

  async function vote(on: boolean) {
    setBusy(true);
    const res = await sendJson<VoteState>("/api/trend/vote", { place: slug, on });
    setBusy(false);
    if (res.ok) {
      setState({ votes: res.data.votes, voted: res.data.voted });
      return true;
    }
    toast.show(failureMessage(t, res.failure), { tone: "error" });
    return false;
  }

  async function onClick() {
    if (!state.voted && !(await vote(true))) return;
    setOpen(true);
  }

  const count = formatNumber(state.votes, lang);
  return (
    <>
      <Button
        variant={state.voted ? "primary" : "secondary"}
        icon="upvote"
        aria-pressed={state.voted}
        loading={busy && !open}
        onClick={onClick}
        className={className}
      >
        {state.voted ? t("place.trendVoted", { count }) : t("place.trendAdd", { count })}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("trend.dialogTitle", { season: seasonName })}
        description={t("trend.rule")}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-lg bg-primary-wash p-4">
            <p role="status" className="font-semibold text-primary">
              {state.voted
                ? t("trend.voted", { place: name })
                : t("trend.notVoted", { place: name })}
            </p>
            <p className="num text-sm">{t("ui.votes", { count: state.votes })}</p>
            <Button
              variant={state.voted ? "ghost" : "primary"}
              size="sm"
              icon="upvote"
              loading={busy}
              onClick={() => void vote(!state.voted)}
              className="self-start"
            >
              {state.voted ? t("trend.unvote") : t("trend.vote")}
            </Button>
          </div>
          <section aria-labelledby={`trend-comments-${slug}`} className="flex flex-col gap-3">
            <h3 id={`trend-comments-${slug}`} className="text-h3">
              {t("trend.commentsTitle")}
            </h3>
            <CommentThread
              listUrl={`/api/trend/comments?ref=${encodeURIComponent(slug)}`}
              postUrl="/api/trend/comments"
              extra={{ ref: slug }}
              max={TREND_COMMENT_MAX}
              needName
              labels={{
                empty: t("trend.commentsEmpty"),
                body: t("trend.commentBody"),
                hint: t("trend.commentHint", { max: TREND_COMMENT_MAX }),
                send: t("trend.commentSend"),
                sent: t("community.commentSent"),
              }}
            />
          </section>
        </div>
      </Dialog>
    </>
  );
}
