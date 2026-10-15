"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Checkbox,
  DistrictSelect,
  Field,
  TextInput,
  type DivisionGroup,
} from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import { useAccount } from "@/lib/account/client";
import { failureMessage, getJson, sendForm } from "@/lib/community/client";
import {
  CAPTION_MAX,
  EMAIL_MAX,
  isValidEmail,
  NAME_MAX,
  UPLOAD_PHOTOS_MAX,
} from "@/lib/community/rules";
import { appendImages, type PipelineDeps } from "@/lib/media/prepare";
import { ImagePicker, readyImages, type PickedImage } from "./ImagePicker";

export type UploadPlace = { slug: string; name: string; district: string };

type Quota = { limit: number; used: number; remaining: number };
type Errors = Partial<
  Record<"name" | "email" | "district" | "place" | "photos" | "consent", MessageKey>
>;

/**
 * `/upload`: open to everyone. Photos are prepared in the browser (see `ImagePicker`) and only
 * the re-encoded copies are sent, with the name, the optional private email, the district, the
 * optional place and caption. Shows how many upload batches are left today.
 */
export function UploadForm({
  divisions,
  places,
  initialDistrict = "",
  initialPlace = "",
  pipeline,
}: {
  divisions: DivisionGroup[];
  places: UploadPlace[];
  initialDistrict?: string;
  initialPlace?: string;
  pipeline?: PipelineDeps;
}) {
  const t = useT();
  const locale = useLocale();
  const account = useAccount();
  const ids = {
    name: useId(),
    email: useId(),
    district: useId(),
    place: useId(),
    caption: useId(),
  };
  const listId = useId();

  const placeBySlug = useMemo(() => new Map(places.map((p) => [p.slug, p])), [places]);
  const start = placeBySlug.get(initialPlace);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState(start?.district ?? initialDistrict);
  const [placeText, setPlaceText] = useState(start?.name ?? "");
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const shownName = nameTouched ? name : name || (account.user?.name ?? "");

  useEffect(() => {
    let live = true;
    void getJson<Quota>("/api/photos/quota").then((res) => {
      if (live && res.ok) setQuota(res.data);
    });
    return () => {
      live = false;
    };
  }, [done]);

  const districtPlaces = places.filter((p) => p.district === district);
  const matchedPlace = placeText.trim()
    ? districtPlaces.find((p) => p.name.toLowerCase() === placeText.trim().toLowerCase())
    : null;
  const processing = images.some((i) => i.status === "processing");
  const outOfQuota = quota !== null && quota.remaining <= 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFailure(null);
    const ready = readyImages(images);
    const next: Errors = {};
    if (!shownName.trim()) next.name = "upload.needName";
    if (email.trim() && !isValidEmail(email.trim())) next.email = "upload.badEmail";
    if (!district) next.district = "upload.needDistrict";
    if (placeText.trim() && !matchedPlace) next.place = "upload.placeUnknown";
    if (!ready?.length) next.photos = "upload.needPhoto";
    if (!consent) next.consent = "upload.needConsent";
    setErrors(next);
    if (Object.keys(next).length || !ready) return;

    const form = new FormData();
    form.set("name", shownName.trim());
    form.set("email", email.trim());
    form.set("district", district);
    form.set("place", matchedPlace?.slug ?? "");
    form.set("caption", caption.trim());
    form.set("consent", "1");
    appendImages(form, ready);

    setBusy(true);
    const res = await sendForm<{ ids: number[] } & Quota>("/api/photos", form);
    setBusy(false);
    if (res.ok) {
      setDone(res.data.ids.length);
      setQuota({ limit: res.data.limit, used: res.data.used, remaining: res.data.remaining });
      setImages([]);
      setCaption("");
      setConsent(false);
      return;
    }
    const field = res.failure.field;
    if (res.failure.status === 400 && field && field in FIELD_ERRORS) {
      setErrors({ [FIELD_ERRORS[field]!.field]: FIELD_ERRORS[field]!.key });
    } else {
      setFailure(failureMessage(t, res.failure));
    }
  }

  if (done !== null) {
    return (
      <Card as="section" aria-labelledby="upload-done" className="items-start gap-4 p-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-wash text-primary">
          <Icon name="check" size={28} />
        </span>
        <h2 id="upload-done" className="text-h2" tabIndex={-1}>
          {t("upload.doneTitle")}
        </h2>
        <p role="status">{t("upload.doneBody", { count: done })}</p>
        <QuotaLine quota={quota} />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={localePath(locale, "/gallery")} icon="gallery">
            {t("upload.doneGallery")}
          </ButtonLink>
          {quota && quota.remaining > 0 ? (
            <Button variant="secondary" icon="camera" onClick={() => setDone(null)}>
              {t("upload.doneAgain")}
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  const err = (key?: MessageKey) => (key ? t(key, { max: UPLOAD_PHOTOS_MAX }) : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex gap-3 rounded-lg border border-border bg-primary-wash p-4 text-sm">
        <Icon name="shield" size={22} className="mt-0.5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-primary">{t("upload.privacyTitle")}</p>
          <p>{t("upload.privacyBody")}</p>
        </div>
      </div>

      <ImagePicker
        label={t("upload.photos")}
        hint={t("upload.photosHint", { max: UPLOAD_PHOTOS_MAX })}
        max={UPLOAD_PHOTOS_MAX}
        images={images}
        onChange={setImages}
        error={err(errors.photos)}
        pipeline={pipeline}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label={t("upload.name")}
          hint={t("upload.nameHint")}
          error={err(errors.name)}
          htmlFor={ids.name}
        >
          <TextInput
            id={ids.name}
            value={shownName}
            onChange={(e) => {
              setNameTouched(true);
              setName(e.target.value);
            }}
            maxLength={NAME_MAX}
            autoComplete="name"
            required
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${ids.name}-error` : `${ids.name}-hint`}
          />
        </Field>
        <Field
          label={
            <>
              {t("upload.email")}{" "}
              <span className="font-normal text-muted">({t("community.optional")})</span>
            </>
          }
          hint={t("upload.emailHint")}
          error={err(errors.email)}
          htmlFor={ids.email}
        >
          <TextInput
            id={ids.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={EMAIL_MAX}
            autoComplete="email"
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${ids.email}-error` : `${ids.email}-hint`}
          />
        </Field>
        <Field label={t("upload.district")} error={err(errors.district)} htmlFor={ids.district}>
          <DistrictSelect
            id={ids.district}
            divisions={divisions}
            placeholder={t("upload.districtPlaceholder")}
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPlaceText("");
            }}
            required
            aria-invalid={errors.district ? true : undefined}
            aria-describedby={errors.district ? `${ids.district}-error` : undefined}
          />
        </Field>
        <Field
          label={
            <>
              {t("upload.place")}{" "}
              <span className="font-normal text-muted">({t("community.optional")})</span>
            </>
          }
          hint={t("upload.placeHint")}
          error={err(errors.place)}
          htmlFor={ids.place}
        >
          <TextInput
            id={ids.place}
            list={listId}
            value={placeText}
            onChange={(e) => setPlaceText(e.target.value)}
            disabled={!district}
            autoComplete="off"
            icon="pin"
            invalid={Boolean(errors.place)}
            aria-describedby={errors.place ? `${ids.place}-error` : `${ids.place}-hint`}
          />
          <datalist id={listId}>
            {districtPlaces.map((p) => (
              <option key={p.slug} value={p.name} />
            ))}
          </datalist>
        </Field>
        <Field
          label={
            <>
              {t("upload.caption")}{" "}
              <span className="font-normal text-muted">({t("community.optional")})</span>
            </>
          }
          hint={t("upload.captionHint")}
          htmlFor={ids.caption}
          className="md:col-span-2"
        >
          <TextInput
            id={ids.caption}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={CAPTION_MAX}
            aria-describedby={`${ids.caption}-hint`}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1">
        <Checkbox
          label={t("upload.consent")}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-invalid={errors.consent ? true : undefined}
        />
        {errors.consent ? <p className="text-sm text-danger">{t(errors.consent)}</p> : null}
      </div>

      <QuotaLine quota={quota} />
      {failure ? (
        <p role="alert" className="rounded-md bg-surface-2 px-4 py-3 text-sm text-danger">
          {failure}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        icon="upload"
        loading={busy}
        disabled={processing || outOfQuota}
        fullWidth="mobile"
      >
        {t("upload.submit", {
          count: Math.max(1, images.filter((i) => i.status === "ready").length),
        })}
      </Button>
    </form>
  );
}

const FIELD_ERRORS: Record<string, { field: keyof Errors; key: MessageKey }> = {
  name: { field: "name", key: "upload.needName" },
  email: { field: "email", key: "upload.badEmail" },
  district: { field: "district", key: "upload.needDistrict" },
  place: { field: "place", key: "upload.placeUnknown" },
  photo: { field: "photos", key: "upload.needPhoto" },
  consent: { field: "consent", key: "upload.needConsent" },
};

function QuotaLine({ quota }: { quota: Quota | null }) {
  const t = useT();
  if (!quota) return null;
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {quota.remaining > 0
        ? t("upload.quotaLeft", { count: quota.remaining })
        : t("upload.quotaNone", { limit: quota.limit })}
    </p>
  );
}
