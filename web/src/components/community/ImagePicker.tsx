"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, IconButton, Spinner } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import { formatNumber } from "@/lib/format";
import {
  prepareImage,
  PrepareImageError,
  type PipelineDeps,
  type PreparedImage,
} from "@/lib/media/prepare";

export type PickedImage = {
  id: string;
  name: string;
  status: "processing" | "ready" | "error";
  prepared?: PreparedImage;
  preview?: string;
  error?: MessageKey;
};

const ERROR_KEY: Record<string, MessageKey> = {
  not_image: "upload.errNotImage",
  too_large: "upload.errTooLarge",
  decode: "upload.errDecode",
  encode: "upload.errEncode",
};

function formatBytes(bytes: number, lang: string): string {
  return bytes >= 1024 * 1024
    ? `${formatNumber(bytes / (1024 * 1024), lang, { maxDecimals: 1 })} MB`
    : `${formatNumber(Math.max(1, Math.round(bytes / 1024)), lang)} KB`;
}

let counter = 0;

/**
 * Picks photos and prepares each one in the browser (shrink, re-encode, thumbnail; see
 * `src/lib/media/prepare.ts`) as soon as it is chosen, showing a preview of the result. Only
 * the prepared copies are ever handed to the form.
 */
export function ImagePicker({
  label,
  hint,
  max,
  images,
  onChange,
  existing = 0,
  error,
  pipeline,
}: {
  label: string;
  hint?: string;
  max: number;
  images: PickedImage[];
  onChange: (update: (images: PickedImage[]) => PickedImage[]) => void;
  /** Photos already attached (when editing a post); they count towards `max`. */
  existing?: number;
  error?: string | null;
  /** For tests: replaces the canvas pipeline. */
  pipeline?: PipelineDeps;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [note, setNote] = useState<string | null>(null);
  const room = max - existing - images.length;
  const previews = useRef(new Set<string>());

  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  function choose(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setNote(list.length > room ? t("upload.tooMany", { max }) : null);
    const picked = list.slice(0, Math.max(0, room)).map<PickedImage>((file) => ({
      id: `img-${++counter}`,
      name: file.name || t("upload.photoFallback"),
      status: "processing",
    }));
    onChange((current) => [...current, ...picked]);
    picked.forEach((item, i) => {
      const file = list[i]!;
      prepareImage(file, pipeline)
        .then((prepared) => {
          let preview: string | undefined;
          try {
            preview = URL.createObjectURL(prepared.thumb);
            previews.current.add(preview);
          } catch {
            preview = undefined;
          }
          onChange((current) =>
            current.map((x) =>
              x.id === item.id ? { ...x, status: "ready", prepared, preview } : x,
            ),
          );
        })
        .catch((e: unknown) => {
          const code = e instanceof PrepareImageError ? e.code : "encode";
          onChange((current) =>
            current.map((x) =>
              x.id === item.id
                ? { ...x, status: "error", error: ERROR_KEY[code] ?? "upload.errEncode" }
                : x,
            ),
          );
        });
    });
  }

  function remove(item: PickedImage) {
    if (item.preview) {
      URL.revokeObjectURL(item.preview);
      previews.current.delete(item.preview);
    }
    onChange((current) => current.filter((x) => x.id !== item.id));
  }

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">{label}</legend>
      {hint ? (
        <p id={hintId} className="-mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((item) => (
            <li
              key={item.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-md border bg-raised",
                item.status === "error" ? "border-danger" : "border-border",
              )}
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-surface-2">
                {item.status === "processing" ? (
                  <span className="flex flex-col items-center gap-2 p-2 text-center text-sm text-muted">
                    <Spinner size={20} />
                    {t("upload.processing", { name: item.name })}
                  </span>
                ) : item.status === "ready" && item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  <img
                    src={item.preview}
                    alt={t("upload.preview", { name: item.name })}
                    className="size-full object-cover"
                  />
                ) : item.status === "error" ? (
                  <Icon name="flag" size={28} className="text-danger" />
                ) : null}
                <IconButton
                  icon="close"
                  label={t("upload.remove", { name: item.name })}
                  onClick={() => remove(item)}
                  className="absolute top-1 right-1 bg-raised/90 shadow-1"
                />
              </div>
              <p
                className={cn(
                  "px-2 py-1.5 text-xs",
                  item.status === "error" ? "text-danger" : "text-muted",
                )}
                role={item.status === "error" ? "alert" : undefined}
              >
                {item.status === "error"
                  ? t(item.error ?? "upload.errEncode", { name: item.name })
                  : item.status === "ready" && item.prepared
                    ? t("upload.ready", {
                        width: item.prepared.width,
                        height: item.prepared.height,
                        size: formatBytes(item.prepared.photo.size, lang),
                      })
                    : item.name}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple={room > 1}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          choose(e.target.files);
          e.target.value = "";
        }}
      />
      {room > 0 ? (
        <Button
          variant="secondary"
          icon="camera"
          className="w-fit"
          aria-describedby={
            [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined
          }
          onClick={() => inputRef.current?.click()}
        >
          {images.length || existing ? t("upload.addMore") : t("upload.choose")}
        </Button>
      ) : null}
      {note ? (
        <p className="text-sm text-muted" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** The prepared photos of a picker, once every one is ready (null while any is still working). */
export function readyImages(images: PickedImage[]): PreparedImage[] | null {
  if (images.some((i) => i.status === "processing")) return null;
  return images.flatMap((i) => (i.status === "ready" && i.prepared ? [i.prepared] : []));
}
