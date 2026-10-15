"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import type { DivisionGroup } from "@/components/ui/Form";
import { PostCard } from "@/components/ui/PostCard";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { failureMessage, sendJson } from "@/lib/community/client";
import { POST_COMMENT_MAX } from "@/lib/community/rules";
import { shareOrCopy } from "@/lib/share";
import type { CommunityPost } from "@/server/data/types";
import { CommentThread } from "./CommentThread";
import { PostComposer } from "./PostComposer";
import { RatingDialog, useReactions } from "./Reactions";
import { ReportButton } from "./ReportButton";

const STATUS_TONE = { pending: "info", approved: "good", rejected: "danger" } as const;

/**
 * A post in a feed (home, profile, public profile, post page): the post card with working
 * 👍 likes, ★ ratings (1–10), share and a comments dialog. With `owner`, the author also gets the
 * review status, Edit (the composer in a dialog) and Delete.
 */
export function PostFeedCard({
  post,
  owner = false,
  divisions,
  className,
}: {
  post: CommunityPost;
  owner?: boolean;
  /** Needed for editing (the composer's district select). */
  divisions?: DivisionGroup[];
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const approved = post.status === "approved";
  const { totals, mine, toggle, rate } = useReactions("post", post.id, {
    likes: post.likes,
    stars: post.stars,
    ratings: post.ratings,
  });
  const [dialog, setDialog] = useState<null | "comments" | "rate" | "edit" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const close = () => setDialog(null);
  const postUrl = localePath(locale, `/post/${post.id}`);

  async function share() {
    const result = await shareOrCopy({
      title: t("posts.shareTitle", { name: post.author }),
      url: `${window.location.origin}${postUrl}`,
    });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  async function remove() {
    setBusy(true);
    const res = await sendJson(`/api/posts/${post.id}`, undefined, "DELETE");
    setBusy(false);
    if (res.ok) {
      close();
      toast.show(t("posts.deleted"), { tone: "success" });
      router.refresh();
    } else {
      toast.show(failureMessage(t, res.failure), { tone: "error" });
    }
  }

  const notYet = () => toast.show(t("posts.pendingNote"));

  return (
    <>
      <PostCard
        className={className}
        post={{
          author: post.author,
          authorHref: localePath(locale, `/u/${post.authorHandle}`),
          date: post.createdAt,
          text: post.body,
          photos: post.photos.map((p, i) => ({
            src: p.thumb ?? p.src,
            alt: t("posts.photoAlt", { n: i + 1, name: post.author }),
          })),
          likes: totals.likes,
          liked: mine.like,
          stars: totals.stars ?? undefined,
          myRating: mine.star,
          comments: post.comments,
        }}
        onLike={approved ? () => void toggle("like") : notYet}
        onRate={approved ? () => setDialog("rate") : notYet}
        onShare={approved ? share : notYet}
        onComments={approved ? () => setDialog("comments") : notYet}
        headerExtra={
          owner ? (
            <StatusTag tone={STATUS_TONE[post.status]}>
              {t(`profile.photos.status.${post.status}`)}
            </StatusTag>
          ) : approved ? (
            <ReportButton type="post" id={post.id} compact />
          ) : null
        }
      >
        {owner ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {divisions ? (
              <Button
                variant="secondary"
                size="sm"
                icon="comment"
                onClick={() => setDialog("edit")}
              >
                {t("posts.edit")}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" icon="close" onClick={() => setDialog("delete")}>
              {t("posts.delete")}
            </Button>
          </div>
        ) : null}
      </PostCard>

      <Dialog open={dialog === "comments"} onClose={close} title={t("posts.commentsTitle")}>
        {dialog === "comments" ? (
          <CommentThread
            listUrl={`/api/posts/${post.id}/comments`}
            postUrl={`/api/posts/${post.id}/comments`}
            max={POST_COMMENT_MAX}
            needAccount
            reportType="post_comment"
            labels={{
              empty: t("posts.commentsEmpty"),
              body: t("posts.commentLabel"),
              hint: t("posts.commentHint", { max: POST_COMMENT_MAX }),
              send: t("posts.commentSend"),
              sent: t("community.commentSent"),
              signIn: t("posts.commentSignIn"),
            }}
          />
        ) : null}
      </Dialog>

      <RatingDialog
        open={dialog === "rate"}
        onClose={close}
        mine={mine.star}
        onRate={async (value) => {
          if (await rate(value)) close();
        }}
      />

      {divisions ? (
        <Dialog open={dialog === "edit"} onClose={close} title={t("posts.editTitle")}>
          {dialog === "edit" ? (
            <PostComposer divisions={divisions} post={post} onDone={close} autoFocus />
          ) : null}
        </Dialog>
      ) : null}

      <Dialog
        open={dialog === "delete"}
        onClose={close}
        title={t("posts.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              {t("posts.delete")}
            </Button>
          </>
        }
      >
        <p>{t("posts.deleteBody")}</p>
      </Dialog>
    </>
  );
}
