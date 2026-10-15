"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { MyDivision } from "@/components/my-map/types";
import { Button, IconButton } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Field, SegmentedControl, Select, Switch, TextInput } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { arrowTarget } from "@/components/ui/keyboard";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import {
  buildPostText,
  CARD_SIZES,
  CARD_THEMES,
  canShareFiles,
  canvasToPng,
  downloadBlob,
  ensureCardFonts,
  exportName,
  imageFromFile,
  layoutFor,
  loadGeo,
  loadImage,
  loadImageMap,
  MAX_CAPTION,
  MAX_TRIP_NOTE,
  MAX_TRIP_PINS,
  percentOf,
  POST_STYLES,
  recordCanvas,
  renderCard,
  shareFile,
  spinFrame,
  tiltFrame,
  VIDEO_SECONDS,
  videoFormat,
  type CardAssets,
  type CardFonts,
  type CardGeo,
  type CardInput,
  type CardSizeKey,
  type CardType,
  type FillMode,
  type LabelSize,
  type PostStyle,
  type RenderEnv,
  type ThemeKey,
  type TripPin,
  type VideoFormat,
} from "@/lib/card";
import { formatDate, formatNumber, localizeDigits } from "@/lib/format";
import { copyText } from "@/lib/share";
import {
  cleanName,
  districtSlugOf,
  levelIndex,
  myBangladeshSharePath,
  nextLevel,
  TOTAL_DISTRICTS,
  useMemoryPins,
  useShareName,
  useStory,
  useVisitedIds,
  useWorldMarks,
  worldSharePath,
  type Level,
} from "@/lib/visited";
import { useCardSettings } from "./settings-store";

export type CardMakerProps =
  | {
      map: "bangladesh";
      divisions: MyDivision[];
      levels: Level[];
      /** Place cover URL by district slug, for "district photos". */
      covers: Record<string, string>;
    }
  | { map: "world" };

const EMPTY_COVERS: Record<string, string> = {};
const LOGO_SRC = "/brand/logo-mark.svg";

/** Preview width caps, so tall cards stay on screen. */
const PREVIEW_MAX: Record<CardSizeKey, string> = {
  link: "max-w-full",
  post: "max-w-[440px]",
  square: "max-w-[520px]",
  story: "max-w-[340px]",
};

const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "conic-gradient(var(--surface-2) 25%, var(--bg-raised) 0 50%, var(--surface-2) 0 75%, var(--bg-raised) 0)",
  backgroundSize: "20px 20px",
};

/**
 * The share-card maker (DESIGN.md §4.11): a live canvas preview with a checkerboard frame and a
 * panel of labelled controls: type, theme, size, photo, caption, hometown, names, fill, zoom and
 * trip pins; then PNG / video exports and ready-made post text. My World passes `map="world"`
 * and gets the world map with the same themes and sizes.
 */
export function CardMaker(props: CardMakerProps) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const toast = useToast();
  const uid = useId();
  const map = props.map;
  const bd = map === "bangladesh";
  const divisions = bd ? props.divisions : null;
  const levels = bd ? props.levels : null;
  const covers = bd ? props.covers : EMPTY_COVERS;

  const [settings, update] = useCardSettings(map);
  const name = cleanName(useShareName());

  /* -- the visitor's data ---------------------------------------------------------------------- */
  const districtIds = useVisitedIds();
  const story = useStory();
  const marks = useWorldMarks();
  const memoryPins = useMemoryPins();

  const visitedKeys = useMemo(() => {
    if (bd) return districtIds.map(districtSlugOf).filter((s): s is string => Boolean(s));
    return Object.keys(marks).filter((k) => marks[k] === "visited");
  }, [bd, districtIds, marks]);
  const wishKeys = useMemo(
    () => (bd ? [] : Object.keys(marks).filter((k) => marks[k] === "wish")),
    [bd, marks],
  );
  const count = visitedKeys.length;
  const type: CardType = bd ? settings.type : "map";

  const hometown = useMemo(() => {
    if (!bd) return null;
    if (settings.hometown === "auto") return story.birth ? districtSlugOf(story.birth) : null;
    return settings.hometown || null;
  }, [bd, settings.hometown, story.birth]);

  const pins: TripPin[] = useMemo(() => {
    if (bd) return [...settings.pins];
    if (!settings.showMemories) return [];
    return memoryPins
      .slice(0, MAX_TRIP_PINS)
      .map((p) => ({ region: p.country, date: p.date, note: p.note }));
  }, [bd, settings.pins, settings.showMemories, memoryPins]);

  /* -- engine: geometry, fonts, images ---------------------------------------------------------- */
  const [geo, setGeo] = useState<CardGeo | null>(null);
  const [fonts, setFonts] = useState<CardFonts | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([loadGeo(map), ensureCardFonts()])
      .then(([g, f]) => {
        if (!live) return;
        setGeo(g);
        setFonts(f);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [map]);

  const regionNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of geo?.regions ?? []) out[r.key] = lang === "bn" ? r.nameBn : r.nameEn;
    // District names from the database win (they are the site's own spelling).
    for (const d of divisions ?? []) for (const x of d.districts) out[x.slug] = x.name;
    return out;
  }, [geo, divisions, lang]);

  const levelIdx = levels ? levelIndex(count, levels) : -1;
  const level = levels && levelIdx >= 0 ? levels[levelIdx]! : null;
  const next = levels ? nextLevel(count, levels) : null;
  const badgeSrc = levels?.length ? (level ?? levels[0]!).badge : "";

  const stampList = type === "passport" ? visitedKeys.join(",") : "";
  const coverList =
    bd && type === "map" && settings.fill === "photos"
      ? visitedKeys.filter((k) => covers[k]).join(",")
      : "";
  const [assets, setAssets] = useState<CardAssets>({});
  useEffect(() => {
    let live = true;
    const split = (s: string) => (s ? s.split(",") : []);
    Promise.all([
      loadImage(LOGO_SRC),
      badgeSrc ? loadImage(badgeSrc) : Promise.resolve(null),
      loadImageMap(split(stampList).map((k) => [k, `/stamps/${k}.svg`] as [string, string])),
      loadImageMap(split(coverList).map((k) => [k, covers[k]!] as [string, string])),
    ]).then(([logo, badge, stamps, coverImages]) => {
      if (live) setAssets({ logo, badge, stamps, covers: coverImages });
    });
    return () => {
      live = false;
    };
  }, [badgeSrc, stampList, coverList, covers]);

  /* -- the visitor's photo (never leaves the tab) ---------------------------------------------- */
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => {
      if (photo?.src.startsWith("blob:")) URL.revokeObjectURL(photo.src);
    };
  }, [photo]);

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await imageFromFile(file));
    } catch {
      toast.show(t("card.photoError"), { tone: "error" });
    }
  }

  /* -- the card input --------------------------------------------------------------------------- */
  const n = (v: number) => formatNumber(v, locale);
  const host = typeof window === "undefined" ? "" : window.location.host;
  const pagePath = localePath(locale, bd ? "/my-bangladesh" : "/world");

  const input: CardInput = useMemo(() => {
    const percent = percentOf(count, TOTAL_DISTRICTS, locale);
    const title = bd
      ? name
        ? t("card.draw.titleNamed", { name })
        : t("card.draw.titleAnon")
      : name
        ? t("card.draw.worldNamed", { name })
        : t("card.draw.worldAnon");
    let countLabel: string;
    if (!bd) {
      countLabel = t("card.draw.countriesSeen", { count });
      if (wishKeys.length)
        countLabel += ` · ${t("card.draw.wishShort", { count: wishKeys.length })}`;
    } else if (type === "passport") {
      countLabel = t("card.draw.passportLabel", { percent });
    } else {
      countLabel = t("card.draw.districtsSeen", { percent });
    }
    const prevMin = level?.min ?? 0;
    const progress = next ? (count - prevMin) / Math.max(1, next.min - prevMin) : 1;
    return {
      map,
      type,
      theme: settings.theme,
      size: settings.size,
      visitedIds: visitedKeys,
      wishIds: wishKeys,
      name,
      caption: settings.caption,
      hometown,
      labelSize: settings.labelSize,
      options: {
        colouredDistricts: settings.fill === "coloured",
        districtPhotos: bd && settings.fill === "photos",
        zoomHometown: bd && settings.zoomHometown,
      },
      pins: type === "map" ? pins : [],
      photo,
      progress,
      levelReached: level !== null,
      lang: locale,
      url: `${host}${pagePath}`,
      text: {
        title,
        count: bd
          ? `${formatNumber(count, locale)} / ${formatNumber(TOTAL_DISTRICTS, locale)}`
          : formatNumber(count, locale),
        countLabel,
        home:
          hometown && regionNames[hometown]
            ? t("card.draw.home", { name: regionNames[hometown]! })
            : "",
        levelTitle: level?.title ?? t("card.draw.levelNone"),
        levelNext: next
          ? t("card.draw.levelNext", { count: next.min - count, title: next.title })
          : t("card.draw.levelTop"),
        passportNote: t("card.draw.passportNote"),
        passportMore: t("card.draw.passportMore"),
        passportEmpty: t("card.draw.passportEmpty"),
        regionNames,
      },
    };
  }, [
    t,
    bd,
    map,
    type,
    name,
    count,
    locale,
    wishKeys,
    level,
    next,
    settings,
    visitedKeys,
    hometown,
    pins,
    photo,
    host,
    pagePath,
    regionNames,
  ]);

  const env: RenderEnv | null = useMemo(
    () => (geo && fonts ? { geo, fonts, assets } : null),
    [geo, fonts, assets],
  );
  const layout = useMemo(() => layoutFor(input, geo), [input, geo]);

  /* -- drawing ---------------------------------------------------------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recording, setRecording] = useState<{ kind: "3d" | "360"; t: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !env || recording) return;
    renderCard(canvas, input, env);
  }, [input, env, recording]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* -- exports ---------------------------------------------------------------------------------- */
  const [video, setVideo] = useState<VideoFormat | null>(null);
  const [fileShare, setFileShare] = useState(false);
  useEffect(() => {
    // Feature detection needs the browser; it runs once after mount.
    setVideo(videoFormat());
    setFileShare(canShareFiles());
  }, []);

  const baseName = [bd ? "bangladesh" : "world", type, settings.size];
  const busy = recording !== null;

  async function pngBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas || !env) return null;
    renderCard(canvas, input, env);
    return canvasToPng(canvas);
  }

  async function savePng() {
    try {
      const blob = await pngBlob();
      if (!blob) return;
      const file = exportName(baseName, "png");
      downloadBlob(blob, file);
      toast.show(t("card.saved", { file }), { tone: "success" });
    } catch {
      toast.show(t("card.exportFailed"), { tone: "error" });
    }
  }

  async function sharePng() {
    try {
      const blob = await pngBlob();
      if (!blob) return;
      const result = await shareFile(blob, exportName(baseName, "png"), postText);
      if (result === "failed" || result === "unsupported") {
        toast.show(t("card.exportFailed"), { tone: "error" });
      }
    } catch {
      toast.show(t("card.exportFailed"), { tone: "error" });
    }
  }

  async function record(kind: "3d" | "360") {
    const canvas = canvasRef.current;
    if (!canvas || !env || !video || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const cache = {};
    setRecording({ kind, t: 0 });
    let last = 0;
    try {
      const blob = await recordCanvas(canvas, {
        format: video,
        signal: controller.signal,
        draw: (time) =>
          renderCard(canvas, input, env, kind === "3d" ? tiltFrame(time) : spinFrame(time), cache),
        onProgress: (time) => {
          // Update the countdown a few times a second, not every frame.
          if (time - last > 0.05 || time >= 1) {
            last = time;
            setRecording({ kind, t: time });
          }
        },
      });
      const file = exportName([...baseName, kind === "3d" ? "3d" : "360"], video.extension);
      downloadBlob(blob, file);
      toast.show(t("card.saved", { file }), { tone: "success" });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.show(t("card.exportFailed"), { tone: "error" });
      }
    } finally {
      abortRef.current = null;
      setRecording(null);
    }
  }

  /* -- post text -------------------------------------------------------------------------------- */
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const path = bd
      ? myBangladeshSharePath(locale, districtIds, name)
      : worldSharePath(locale, marks, name);
    return new URL(path, window.location.origin).toString();
  }, [bd, locale, districtIds, marks, name]);

  const generated = useMemo(
    () =>
      buildPostText(
        settings.postStyle,
        {
          map,
          title: input.text.title,
          count,
          total: TOTAL_DISTRICTS,
          wish: wishKeys.length,
          names: visitedKeys.map((k) => regionNames[k] ?? k),
          level: bd ? (level?.title ?? "") : "",
          hometown: hometown ? (regionNames[hometown] ?? "") : "",
          caption: settings.caption,
          url: shareUrl,
        },
        t,
        locale,
      ),
    [
      settings.postStyle,
      settings.caption,
      map,
      input.text.title,
      count,
      wishKeys,
      visitedKeys,
      regionNames,
      bd,
      level,
      hometown,
      shareUrl,
      t,
      locale,
    ],
  );
  // The visitor may edit the text; a new card or style starts again from the generated text.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const postText = edit && edit.base === generated ? edit.text : generated;

  async function copyPost() {
    const ok = await copyText(postText);
    toast.show(ok ? t("card.copied") : t("common.somethingWrong"), {
      tone: ok ? "success" : "error",
    });
  }

  /* -- trip pins (Bangladesh) ------------------------------------------------------------------- */
  const [pinDistrict, setPinDistrict] = useState("");
  const [pinDate, setPinDate] = useState("");
  const [pinNote, setPinNote] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  function addTripPin(e: FormEvent) {
    e.preventDefault();
    if (!pinDistrict) {
      setPinError(t("card.pinNeedDistrict"));
      return;
    }
    if (settings.pins.length >= MAX_TRIP_PINS) {
      setPinError(t("card.pinsFull"));
      return;
    }
    update({
      pins: [
        ...settings.pins,
        { region: pinDistrict, date: pinDate, note: pinNote.trim().slice(0, MAX_TRIP_NOTE) },
      ],
    });
    setPinError(null);
    setPinNote("");
    setPinDate("");
  }

  const districtGroups = useMemo(
    () =>
      (divisions ?? []).map((d) => ({
        label: d.name,
        options: d.districts.map((x) => ({ value: x.slug, label: x.name })),
      })),
    [divisions],
  );

  /* -- view ------------------------------------------------------------------------------------- */
  const size = CARD_SIZES[settings.size];
  const sizeLabel: Record<CardSizeKey, string> = {
    link: t("card.sizeLink"),
    post: t("card.sizePost"),
    square: t("card.sizeSquare"),
    story: t("card.sizeStory"),
  };
  const fillHints: Record<FillMode, string> = {
    theme: t("card.fillThemeHint"),
    coloured: t(bd ? "card.fillColouredHint" : "card.worldColouredHint"),
    photos: t("card.fillPhotosHint"),
  };
  const secondsLeft = recording ? Math.max(0, Math.ceil(VIDEO_SECONDS * (1 - recording.t))) : 0;
  const pinsCut = type === "map" && pins.length > layout.pinRows;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t(bd ? "card.intro" : "card.worldIntro")}</p>
      {count === 0 ? (
        <p className="text-sm font-semibold">{t(bd ? "card.emptyBd" : "card.emptyWorld")}</p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Preview */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <div
            className="flex justify-center rounded-lg border border-border p-3 sm:p-4"
            style={CHECKERBOARD}
          >
            <div className={cn("relative w-full", PREVIEW_MAX[settings.size])}>
              <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                role="img"
                aria-label={t("card.previewAlt", { title: input.text.title })}
                className="block h-auto w-full rounded-sm shadow-2"
                style={{ aspectRatio: `${size.w} / ${size.h}` }}
              />
              {!env ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-raised/80">
                  <p role="status" className="text-sm font-semibold text-muted">
                    {failed ? t("common.somethingWrong") : t("card.drawing")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <p className="num text-center text-xs text-subtle">
            {sizeLabel[settings.size]} · {localizeDigits(size.ratio, locale)} · {n(size.w)} ×{" "}
            {n(size.h)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5">
          <fieldset disabled={busy} className={cn(CARD, "m-0 min-w-0 gap-5 p-4 md:p-5")}>
            <legend className="sr-only">{t("card.controls")}</legend>

            {bd ? (
              <SegmentedControl<CardType>
                label={t("card.type")}
                value={type}
                onChange={(v) => update({ type: v })}
                options={[
                  { value: "map", label: t("card.typeMap") },
                  { value: "level", label: t("card.typeLevel") },
                  { value: "passport", label: t("card.typePassport") },
                ]}
              />
            ) : null}

            <ThemePicker
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              bn={lang === "bn"}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t("card.size")}</span>
              <SegmentedControl<CardSizeKey>
                label={t("card.size")}
                value={settings.size}
                onChange={(v) => update({ size: v })}
                options={(Object.keys(CARD_SIZES) as CardSizeKey[]).map((k) => ({
                  value: k,
                  label: localizeDigits(CARD_SIZES[k].ratio, locale),
                  hint: `${sizeLabel[k]} · ${n(CARD_SIZES[k].w)} × ${n(CARD_SIZES[k].h)}`,
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t("card.photo")}</span>
              <div className="flex flex-wrap items-center gap-3">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
                  <img
                    src={photo.src}
                    alt=""
                    className="size-11 rounded-pill border border-border object-cover"
                  />
                ) : null}
                <Button
                  variant="secondary"
                  icon="camera"
                  onClick={() => photoInput.current?.click()}
                >
                  {t("card.photoAdd")}
                </Button>
                {photo ? (
                  <Button variant="ghost" icon="close" onClick={() => setPhoto(null)}>
                    {t("card.photoRemove")}
                  </Button>
                ) : null}
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t("card.photoAdd")}
                  onChange={onPhoto}
                />
              </div>
              <p className="text-sm text-muted">{t("card.photoNote")}</p>
            </div>

            <Field label={t("card.caption")} htmlFor={`${uid}-caption`}>
              <TextInput
                id={`${uid}-caption`}
                value={settings.caption}
                maxLength={MAX_CAPTION}
                placeholder={t("card.captionPlaceholder")}
                onChange={(e) => update({ caption: e.target.value.slice(0, MAX_CAPTION) })}
              />
            </Field>

            {bd ? (
              <Field label={t("card.hometown")} htmlFor={`${uid}-home`}>
                <Select
                  id={`${uid}-home`}
                  value={hometown ?? ""}
                  placeholder={t("card.hometownNone")}
                  groups={districtGroups}
                  onChange={(e) => update({ hometown: e.target.value })}
                />
              </Field>
            ) : null}

            {type === "map" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">
                    {t(bd ? "card.names" : "card.worldNames")}
                  </span>
                  <SegmentedControl<LabelSize>
                    label={t(bd ? "card.names" : "card.worldNames")}
                    value={settings.labelSize}
                    onChange={(v) => update({ labelSize: v })}
                    options={[
                      { value: "hidden", label: t("card.namesHidden") },
                      { value: "small", label: t("card.namesSmall") },
                      { value: "medium", label: t("card.namesMedium") },
                      { value: "large", label: t("card.namesLarge") },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">
                    {t(bd ? "card.fill" : "card.worldFill")}
                  </span>
                  <SegmentedControl<FillMode>
                    label={t(bd ? "card.fill" : "card.worldFill")}
                    value={bd || settings.fill !== "photos" ? settings.fill : "theme"}
                    onChange={(v) => update({ fill: v })}
                    options={[
                      { value: "theme", label: t("card.fillTheme"), hint: fillHints.theme },
                      {
                        value: "coloured",
                        label: t("card.fillColoured"),
                        hint: fillHints.coloured,
                      },
                      ...(bd
                        ? [
                            {
                              value: "photos" as const,
                              label: t("card.fillPhotos"),
                              hint: fillHints.photos,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                {bd ? (
                  <div className="flex flex-col">
                    <Switch
                      checked={settings.zoomHometown && hometown !== null}
                      disabled={hometown === null}
                      onChange={(v) => update({ zoomHometown: v })}
                      label={t("card.zoom")}
                    />
                    {hometown === null ? (
                      <p className="text-sm text-muted">{t("card.zoomHint")}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <Switch
                      checked={settings.showMemories}
                      onChange={(v) => update({ showMemories: v })}
                      label={t("card.showMemories")}
                    />
                    <p className="text-sm text-muted">{t("card.memoriesHint")}</p>
                  </div>
                )}
              </>
            ) : null}
          </fieldset>

          {bd && type === "map" ? (
            <section aria-labelledby={`${uid}-pins`} className={cn(CARD, "gap-4 p-4 md:p-5")}>
              <h3 id={`${uid}-pins`} className="text-h3">
                {t("card.pins")}
              </h3>
              <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
                <legend className="sr-only">{t("card.pins")}</legend>
                <p className="text-sm text-muted">{t("card.pinsIntro", { max: MAX_TRIP_PINS })}</p>
                <form onSubmit={addTripPin} noValidate className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("card.pinDistrict")} htmlFor={`${uid}-pin`} error={pinError}>
                    <Select
                      id={`${uid}-pin`}
                      value={pinDistrict}
                      placeholder={t("card.pinDistrict")}
                      groups={districtGroups}
                      aria-invalid={pinError ? true : undefined}
                      aria-describedby={pinError ? `${uid}-pin-error` : undefined}
                      onChange={(e) => {
                        setPinDistrict(e.target.value);
                        setPinError(null);
                      }}
                    />
                  </Field>
                  <Field label={t("card.pinDate")} htmlFor={`${uid}-pin-date`}>
                    <TextInput
                      id={`${uid}-pin-date`}
                      type="date"
                      value={pinDate}
                      onChange={(e) => setPinDate(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={t("card.pinNote")}
                    htmlFor={`${uid}-pin-note`}
                    className="sm:col-span-2"
                  >
                    <TextInput
                      id={`${uid}-pin-note`}
                      value={pinNote}
                      maxLength={MAX_TRIP_NOTE}
                      placeholder={t("card.pinNotePlaceholder")}
                      onChange={(e) => setPinNote(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="secondary"
                    icon="pin"
                    className="w-full sm:w-auto sm:justify-self-start"
                    disabled={settings.pins.length >= MAX_TRIP_PINS}
                  >
                    {t("card.pinAdd")}
                  </Button>
                </form>
                {settings.pins.length ? (
                  <ol className="flex flex-col gap-2">
                    {settings.pins.map((pin, i) => (
                      <li
                        key={`${pin.region}-${pin.date}-${i}`}
                        className="flex items-start gap-3 rounded-md border border-border bg-sunken p-3"
                      >
                        <span className="num flex size-7 shrink-0 items-center justify-center rounded-pill bg-text text-sm font-bold text-bg">
                          {n(i + 1)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-semibold">
                            {regionNames[pin.region] ?? pin.region}
                            {pin.date ? (
                              <span className="num font-normal text-muted">
                                {" · "}
                                {formatDate(pin.date, locale)}
                              </span>
                            ) : null}
                          </span>
                          {pin.note ? (
                            <span className="text-sm break-words">{pin.note}</span>
                          ) : null}
                        </span>
                        <IconButton
                          icon="close"
                          label={t("card.pinRemove", { number: i + 1 })}
                          onClick={() => update({ pins: settings.pins.filter((_, j) => j !== i) })}
                        />
                      </li>
                    ))}
                  </ol>
                ) : null}
                {pinsCut ? <p className="text-sm text-muted">{t("card.pinsHidden")}</p> : null}
              </fieldset>
            </section>
          ) : null}

          <section aria-labelledby={`${uid}-export`} className={cn(CARD, "gap-4 p-4 md:p-5")}>
            <h3 id={`${uid}-export`} className="text-h3">
              {t("card.export")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button icon="gallery" onClick={savePng} disabled={!env || busy}>
                {t("card.png")}
              </Button>
              {fileShare ? (
                <Button variant="secondary" icon="share" onClick={sharePng} disabled={!env || busy}>
                  {t("card.sharePng")}
                </Button>
              ) : null}
              {video ? (
                <>
                  <Button
                    variant="secondary"
                    icon="camera"
                    onClick={() => record("3d")}
                    disabled={!env || busy}
                    loading={recording?.kind === "3d"}
                  >
                    {t("card.video3d", { format: video.label })}
                  </Button>
                  <Button
                    variant="secondary"
                    icon="world"
                    onClick={() => record("360")}
                    disabled={!env || busy}
                    loading={recording?.kind === "360"}
                  >
                    {t("card.video360")}
                  </Button>
                </>
              ) : null}
            </div>
            {recording ? (
              <div className="flex flex-wrap items-center gap-3">
                <p role="status" aria-live="polite" className="num text-sm font-semibold">
                  {t("card.recording", { seconds: secondsLeft })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="close"
                  onClick={() => abortRef.current?.abort()}
                >
                  {t("card.cancel")}
                </Button>
              </div>
            ) : null}
            <p className="text-sm text-muted">{video ? t("card.videoNote") : t("card.noVideo")}</p>
          </section>

          <section aria-labelledby={`${uid}-post`} className={cn(CARD, "gap-4 p-4 md:p-5")}>
            <h3 id={`${uid}-post`} className="text-h3">
              {t("card.postText")}
            </h3>
            <Field label={t("card.postStyle")} htmlFor={`${uid}-style`}>
              <Select
                id={`${uid}-style`}
                value={settings.postStyle}
                onChange={(e) => update({ postStyle: e.target.value as PostStyle })}
                options={POST_STYLES.map((s) => ({ value: s, label: t(STYLE_LABEL[s]) }))}
              />
            </Field>
            <Field label={t("card.postLabel")} htmlFor={`${uid}-text`}>
              <textarea
                id={`${uid}-text`}
                value={postText}
                rows={8}
                onChange={(e) => setEdit({ base: generated, text: e.target.value })}
                className="min-h-40 w-full rounded-sm border border-border-strong bg-sunken p-3 text-base text-text focus-visible:border-focus"
              />
            </Field>
            <Button icon="copy" variant="secondary" className="w-full sm:w-fit" onClick={copyPost}>
              {t("card.copy")}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

const STYLE_LABEL = {
  short: "card.styleShort",
  detailed: "card.styleDetailed",
  stylish: "card.styleStylish",
  emoji: "card.styleEmoji",
} as const;

/** Six theme swatches (32 px) with their names, as a radio group. */
function ThemePicker({
  value,
  onChange,
  bn,
}: {
  value: ThemeKey;
  onChange: (v: ThemeKey) => void;
  bn: boolean;
}) {
  const t = useT();
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    CARD_THEMES.findIndex((th) => th.key === value),
  );

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const next = arrowTarget(e.key, index, CARD_THEMES.length);
    if (next === null) return;
    e.preventDefault();
    onChange(CARD_THEMES[next]!.key);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold">
        {t("card.theme")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {CARD_THEMES.map((theme, i) => {
          const selected = i === index;
          return (
            <button
              key={theme.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(theme.key)}
              className={cn(
                "flex min-h-11 flex-col items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition-colors duration-[var(--dur-1)] ease-standard",
                selected
                  ? "border-primary bg-primary-wash text-primary"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span
                aria-hidden
                className="relative size-8 overflow-hidden rounded-pill border border-border-strong"
                style={{ background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
              >
                <span
                  className="absolute right-1 bottom-1 size-3 rounded-pill"
                  style={{ background: theme.visited }}
                />
              </span>
              <span className="flex items-center gap-0.5">
                {selected ? <Icon name="check" size={12} /> : null}
                {bn ? theme.nameBn : theme.nameEn}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
