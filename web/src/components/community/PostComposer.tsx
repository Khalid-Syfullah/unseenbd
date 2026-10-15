"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { DistrictSelect, Field, TextArea, type DivisionGroup } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { failureMessage, getJson, sendForm } from "@/lib/community/client";
import { POST_MAX, POST_PHOTOS_MAX } from "@/lib/community/rules";
import { appendImages, type PipelineDeps } from "@/lib/media/prepare";
import type { PostPhoto } from "@/server/db/json-types";
import { EmojiPicker } from "./EmojiPicker";
import { ImagePicker, readyImages, type PickedImage } from "./ImagePicker";

export type EditablePost = {
  id: number;
  body: string;
  photos: PostPhoto[];
  district: { slug: string } | null;
};

type Quota = { limit: number; used: number; remaining: number };

/**
 * Write or edit a post (signed-in users): text with an emoji picker, an optional district, and
 * up to four photos prepared in the browser like uploads. New and edited posts wait for review.
 */
export function PostComposer({
  divisions,
  post,
  onDone,
  autoFocus = false,
  pipeline,
}: {
  divisions: DivisionGroup[];
  /** Editing this post (otherwise a new one). */
  post?: EditablePost;
  onDone?: () => void;
  autoFocus?: boolean;
  pipeline?: PipelineDeps;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const bodyId = useId();
  const districtId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(post?.body ?? "");
  const [district, setDistrict] = useState(post?.district?.slug ?? "");
  const [kept, setKept] = useState<PostPhoto[]>(post?.photos ?? []);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (post) return;
    let live = true;
    void getJson<{ posts: Quota | null }>("/api/community/quota").then((res) => {
      if (live && res.ok) setQuota(res.data.posts);
    });
    return () => {
      live = false;
    };
  }, [post]);

  function insert(emoji: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = (body.slice(0, start) + emoji + body.slice(end)).slice(0, POST_MAX);
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      const at = Math.min(next.length, start + emoji.length);
      el?.setSelectionRange(at, at);
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ready = readyImages(images);
    if (!body.trim()) {
      setError(t("posts.needBody"));
      textRef.current?.focus();
      return;
    }
    if (!ready) return;
    const form = new FormData();
    form.set("body", body.trim());
    form.set("district", district);
    if (post) form.set("keep", JSON.stringify(kept.map((p) => p.src)));
    appendImages(form, ready);
    setBusy(true);
    const res = await sendForm(
      post ? `/api/posts/${post.id}` : "/api/posts",
      form,
      post ? "PATCH" : "POST",
    );
    setBusy(false);
    if (!res.ok) {
      setError(failureMessage(t, res.failure));
      return;
    }
    toast.show(post ? t("posts.saved") : t("posts.sent"), { tone: "success" });
    if (!post) {
      setBody("");
      setImages([]);
      setDistrict("");
    }
    router.refresh();
    onDone?.();
  }

  const processing = images.some((i) => i.status === "processing");
  const outOfQuota = !post && quota !== null && quota.remaining <= 0;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={t("posts.body")} htmlFor={bodyId}>
        <TextArea
          ref={textRef}
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("posts.bodyPlaceholder")}
          maxLength={POST_MAX}
          rows={5}
          counter
          required
          invalid={Boolean(error && !body.trim())}
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <EmojiPicker onPick={insert} />
        <div className="min-w-56 flex-1">
          <label htmlFor={districtId} className="mb-1.5 block text-sm font-semibold">
            {t("posts.district")}{" "}
            <span className="font-normal text-muted">({t("community.optional")})</span>
          </label>
          <DistrictSelect
            id={districtId}
            divisions={divisions}
            placeholder={t("posts.districtNone")}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>
      </div>

      {kept.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("posts.keptPhotos")}>
          {kept.map((p, i) => (
            <li key={p.src} className="relative size-24 overflow-hidden rounded-md bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- user upload thumbnail */}
              <img
                src={p.thumb ?? p.src}
                alt={t("posts.keptPhoto", { n: i + 1 })}
                className="size-full object-cover"
              />
              <IconButton
                icon="close"
                label={t("posts.removePhoto", { n: i + 1 })}
                onClick={() => setKept((list) => list.filter((x) => x.src !== p.src))}
                className="absolute top-1 right-1 bg-raised/90 shadow-1"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <ImagePicker
        label={t("posts.photos")}
        hint={t("posts.photosHint", { max: POST_PHOTOS_MAX })}
        max={POST_PHOTOS_MAX}
        existing={kept.length}
        images={images}
        onChange={setImages}
        pipeline={pipeline}
      />

      {quota && !post ? (
        <p className="text-sm text-muted">
          {quota.remaining > 0
            ? t("posts.quotaLeft", { count: quota.remaining })
            : t("posts.quotaNone")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          icon={post ? "check" : "comment"}
          loading={busy}
          disabled={processing || outOfQuota}
        >
          {post ? t("posts.save") : t("posts.publish")}
        </Button>
        {onDone && post ? (
          <Button variant="secondary" onClick={onDone}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted">{t("posts.reviewNote")}</p>
    </form>
  );
}
