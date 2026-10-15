"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { Field, TextArea, TextInput } from "@/components/ui/Form";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import { useAccount } from "@/lib/account/client";
import { failureMessage, getJson, sendJson } from "@/lib/community/client";
import { NAME_MAX } from "@/lib/community/rules";
import { formatDate } from "@/lib/format";
import { ReportButton } from "./ReportButton";

export type ThreadComment = { id: number; name: string; body: string; createdAt: string };

export type ThreadLabels = {
  empty: string;
  body: string;
  hint: string;
  send: string;
  sent: string;
  signIn?: string;
};

/**
 * A comment list with a form under it. Comments are plain text; new ones wait for a moderator,
 * so after sending the visitor sees a "thanks, after review" note instead of their comment.
 * `needName` asks for a display name (open threads); `needAccount` asks to sign in instead.
 */
export function CommentThread({
  listUrl,
  postUrl,
  extra,
  max,
  needName = false,
  needAccount = false,
  initial,
  labels,
  reportType,
}: {
  listUrl: string;
  postUrl: string;
  /** Extra fields for the POST body (e.g. `{ref: slug}`). */
  extra?: Record<string, unknown>;
  max: number;
  needName?: boolean;
  needAccount?: boolean;
  initial?: ThreadComment[];
  labels: ThreadLabels;
  reportType?: "photo_comment" | "post_comment";
}) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const account = useAccount();
  const nameId = useId();
  const bodyId = useId();
  const [comments, setComments] = useState<ThreadComment[] | null>(initial ?? null);
  const [name, setName] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (initial) return;
    let live = true;
    void getJson<{ comments: ThreadComment[] }>(listUrl).then((res) => {
      if (live) setComments(res.ok ? res.data.comments : []);
    });
    return () => {
      live = false;
    };
  }, [listUrl, initial]);

  const shownName = name ?? account.user?.name ?? "";
  const signedOut = needAccount && account.status !== "user";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || (needName && !shownName.trim())) {
      setStatus({ tone: "error", text: t("community.errorField") });
      return;
    }
    setBusy(true);
    const res = await sendJson(postUrl, {
      ...extra,
      body: body.trim(),
      ...(needName ? { name: shownName.trim() } : {}),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setStatus({ tone: "ok", text: labels.sent });
    } else {
      setStatus({ tone: "error", text: failureMessage(t, res.failure) });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {comments === null ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-4/5" />
        </div>
      ) : comments.length ? (
        <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-raised">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">{c.name}</span>
                <span className="flex items-center gap-1">
                  <time dateTime={c.createdAt} className="text-sm text-muted">
                    {formatDate(c.createdAt.slice(0, 10), lang)}
                  </time>
                  {reportType ? <ReportButton type={reportType} id={c.id} compact /> : null}
                </span>
              </div>
              <p className="break-words whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">{labels.empty}</p>
      )}

      {signedOut ? (
        account.status === "unknown" ? null : (
          <p className="text-sm">
            <Link
              href={`${localePath(locale, "/login")}?next=${encodeURIComponent(
                typeof window === "undefined" ? localePath(locale, "/") : window.location.pathname,
              )}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {labels.signIn ?? t("community.errorSignIn")}
            </Link>
          </p>
        )
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          {needName ? (
            <Field label={t("comments.name")} htmlFor={nameId}>
              <TextInput
                id={nameId}
                value={shownName}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                autoComplete="name"
                required
              />
            </Field>
          ) : null}
          <Field label={labels.body} hint={labels.hint} htmlFor={bodyId}>
            <TextArea
              id={bodyId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={max}
              rows={3}
              counter
              required
              aria-describedby={`${bodyId}-hint`}
            />
          </Field>
          {status ? (
            <p
              role={status.tone === "error" ? "alert" : "status"}
              className={
                status.tone === "error" ? "text-sm text-danger" : "text-sm text-success-text"
              }
            >
              {status.text}
            </p>
          ) : null}
          <Button type="submit" loading={busy} icon="comment" className="w-fit">
            {labels.send}
          </Button>
        </form>
      )}
    </div>
  );
}
