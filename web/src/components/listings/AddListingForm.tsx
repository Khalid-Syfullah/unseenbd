"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import {
  DistrictSelect,
  Field,
  Select,
  TextArea,
  TextInput,
  type DivisionGroup,
} from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { PillTabs, panelId, tabId } from "@/components/ui/Navigation";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import { useAccount } from "@/lib/account/client";
import { ImagePicker, readyImages, type PickedImage } from "@/components/community/ImagePicker";
import { failureMessage, getJson, sendForm } from "@/lib/community/client";
import { formatNumber } from "@/lib/format";
import {
  AREA_MAX,
  BUSINESS_CATEGORIES,
  checkListing,
  CONTACT_NAME_MAX,
  DESCRIPTION_MAX,
  LISTING_KINDS,
  NAME_MAX,
  PRICE_ITEM_MAX,
  PRICE_UNIT_MAX,
  SIZE_TIERS,
  type ListingKind,
  type SizeTier,
  type Tier,
} from "@/lib/listings/rules";
import { appendImages, type PipelineDeps } from "@/lib/media/prepare";
import type { ListingDetail } from "@/server/data/listings";

type Quota = { limit: number; used: number; remaining: number };
type PriceRow = { key: number; item: string; amount: string; unit: string };
type FieldError = { field: string; key: MessageKey };

/** The hidden field bots fill in. Must match the server. */
const HONEYPOT = "company_url";

let rowKey = 0;
const newRow = (item = "", amount = "", unit = ""): PriceRow => ({
  key: ++rowKey,
  item,
  amount,
  unit,
});

const FIELD_REASON: Record<string, MessageKey> = {
  phone: "addListing.errPhone",
  whatsapp: "addListing.errPhone",
  socialUrl: "addListing.errUrl",
  prices: "addListing.errPrices",
};

function errorFor(field: string, reason: string): FieldError {
  if (field === "prices" && reason === "too_many") {
    return { field, key: "addListing.errPricesMany" };
  }
  if (field === "photos") return { field, key: "addListing.errPhotos" };
  if (FIELD_REASON[field]) return { field, key: FIELD_REASON[field]! };
  return { field, key: reason === "long" ? "addListing.errTooLong" : "addListing.errRequired" };
}

/**
 * `/add-listing` (DESIGN.md §5.10): kind tabs, size cards, basic info, repeatable price rows,
 * contact, photos (the same browser pipeline as uploads), a hidden honeypot and "Submit for
 * review". With `editing` it edits the owner's own listing (and it goes back to review).
 */
export function AddListingForm({
  divisions,
  tiers,
  initialKind,
  editing,
  pipeline,
}: {
  divisions: DivisionGroup[];
  tiers: Tier[];
  initialKind: ListingKind;
  editing?: ListingDetail;
  pipeline?: PipelineDeps;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const account = useAccount();
  const prefix = useId();
  const ids = {
    category: useId(),
    name: useId(),
    district: useId(),
    area: useId(),
    description: useId(),
    contactName: useId(),
    phone: useId(),
    whatsapp: useId(),
    socialUrl: useId(),
  };

  const [kind, setKind] = useState<ListingKind>(editing?.kind ?? initialKind);
  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [size, setSize] = useState<SizeTier>(editing?.sizeTier ?? "small");
  const [name, setName] = useState(editing?.name ?? "");
  const [district, setDistrict] = useState(editing?.district.slug ?? "");
  const [area, setArea] = useState(editing?.area ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [contactName, setContactName] = useState(editing?.contactName ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(editing?.whatsapp ?? "");
  const [socialUrl, setSocialUrl] = useState(editing?.socialUrl ?? "");
  const [prices, setPrices] = useState<PriceRow[]>(
    editing?.prices.length
      ? editing.prices.map((p) => newRow(p.item, String(p.amount), p.unit ?? ""))
      : [newRow()],
  );
  const [kept, setKept] = useState(editing?.photos ?? []);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState<FieldError | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [done, setDone] = useState(false);

  const tier = tiers.find((x) => x.size === size) ?? tiers[0]!;
  const lang = locale === "bn" ? "bn" : "en";

  useEffect(() => {
    if (editing) return;
    let live = true;
    void getJson<Quota>("/api/listings/quota").then((res) => {
      if (live && res.ok) setQuota(res.data);
    });
    return () => {
      live = false;
    };
  }, [editing, done]);

  const processing = images.some((i) => i.status === "processing");
  const outOfQuota = !editing && quota !== null && quota.remaining <= 0;
  const err = (field: string) => (error?.field === field ? t(error.key, errVars(tier)) : undefined);

  function errVars(x: Tier) {
    return { max: x.maxPrices, min: x.minPhotos, photos: x.maxPhotos };
  }

  function updateRow(key: number, patch: Partial<PriceRow>) {
    setPrices((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFailure(null);
    const checked = checkListing(
      {
        kind,
        category,
        sizeTier: size,
        name,
        district,
        area,
        description,
        contactName,
        phone,
        whatsapp,
        socialUrl,
        prices: prices.map(({ item, amount, unit }) => ({ item, amount, unit })),
      },
      tiers,
    );
    if (!checked.ok) {
      setError(errorFor(checked.field, checked.reason));
      document.getElementById(ids[checked.field as keyof typeof ids] ?? "")?.focus();
      return;
    }
    const ready = readyImages(images);
    if (!ready) return;
    const photoCount = kept.length + ready.length;
    if (photoCount < tier.minPhotos || photoCount > tier.maxPhotos) {
      setError(errorFor("photos", "invalid"));
      return;
    }
    setError(null);

    const v = checked.value;
    const form = new FormData();
    form.set("kind", v.kind);
    form.set("category", v.category ?? "");
    form.set("sizeTier", v.sizeTier);
    form.set("name", v.name);
    form.set("district", v.district);
    form.set("area", v.area);
    form.set("description", v.description);
    form.set("contactName", v.contactName);
    form.set("phone", v.phone);
    form.set("whatsapp", v.whatsapp);
    form.set("socialUrl", v.socialUrl);
    form.set("prices", JSON.stringify(v.prices));
    form.set(
      HONEYPOT,
      (document.getElementById(`${prefix}-hp`) as HTMLInputElement | null)?.value ?? "",
    );
    if (editing) form.set("keep", JSON.stringify(kept.map((p) => p.src)));
    appendImages(form, ready);

    setBusy(true);
    const res = await sendForm<{ id: number } & Quota>(
      editing ? `/api/my/listings/${editing.id}` : "/api/listings",
      form,
      editing ? "PATCH" : "POST",
    );
    setBusy(false);
    if (res.ok) {
      if (editing) {
        toast.show(t("addListing.saved"), { tone: "success" });
        router.push(localePath(locale, "/my-listings"));
        router.refresh();
      } else {
        setQuota({ limit: res.data.limit, used: res.data.used, remaining: res.data.remaining });
        setDone(true);
      }
      return;
    }
    const field = res.failure.field;
    if (res.failure.status === 400 && field) {
      setError(errorFor(field, res.failure.reason ?? "invalid"));
    } else {
      setFailure(failureMessage(t, res.failure));
    }
  }

  if (done) {
    return (
      <Card as="section" aria-labelledby={`${prefix}-done`} className="items-start gap-4 p-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-wash text-primary">
          <Icon name="check" size={28} />
        </span>
        <h2 id={`${prefix}-done`} className="text-h2" tabIndex={-1}>
          {t("addListing.doneTitle")}
        </h2>
        <p role="status">{t("addListing.doneBody")}</p>
        <div className="flex flex-wrap gap-3">
          {account.user ? (
            <ButtonLink href={localePath(locale, "/my-listings")} icon="shopping">
              {t("addListing.doneMine")}
            </ButtonLink>
          ) : (
            <ButtonLink href={localePath(locale, "/login")} icon="user">
              {t("addListing.doneSignIn")}
            </ButtonLink>
          )}
          {quota && quota.remaining > 0 ? (
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                setDone(false);
                setName("");
                setDescription("");
                setPrices([newRow()]);
                setImages([]);
              }}
            >
              {t("addListing.doneAnother")}
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  const money = (n: number) => formatNumber(n, lang);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {/* Honeypot: invisible to people; bots fill it in and are quietly ignored. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input id={`${prefix}-hp`} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <PillTabs
        label={t("addListing.kindLabel")}
        idPrefix={prefix}
        value={kind}
        onChange={(id) => {
          if (!editing) setKind(id as ListingKind);
        }}
        tabs={LISTING_KINDS.map((k) => ({
          id: k,
          label: t(`listings.kind.${k}` as MessageKey),
          icon: k === "business" ? "bed" : k === "food" ? "food" : "shopping",
        }))}
      />

      <div
        role="tabpanel"
        id={panelId(prefix, kind)}
        aria-labelledby={tabId(prefix, kind)}
        className="flex flex-col gap-8"
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="text-h3">{t("addListing.tierTitle")}</legend>
          <p className="text-sm text-muted">{t("addListing.tierHint")}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {SIZE_TIERS.map((s) => {
              const x = tiers.find((tt) => tt.size === s)!;
              const selected = s === size;
              return (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                    selected ? "border-primary bg-primary-wash" : "border-border bg-raised",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name={`${prefix}-tier`}
                      value={s}
                      checked={selected}
                      onChange={() => setSize(s)}
                      className="size-5 shrink-0 cursor-pointer appearance-none rounded-pill border-[1.5px] border-border-strong bg-raised checked:border-[6px] checked:border-primary"
                    />
                    {t(`addListing.tier.${s}` as MessageKey)}
                  </span>
                  <span className="text-sm text-muted">
                    {t(`addListing.tierExample.${s}` as MessageKey)}
                  </span>
                  <span className="num text-sm">
                    {t("addListing.tierLimits", {
                      prices: x.maxPrices,
                      min: x.minPhotos,
                      max: x.maxPhotos,
                    })}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <section aria-labelledby={`${prefix}-basic`} className="flex flex-col gap-4">
          <h2 id={`${prefix}-basic`} className="text-h3">
            {t("addListing.basicTitle")}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {kind === "business" ? (
              <Field
                label={t("addListing.category")}
                error={err("category")}
                htmlFor={ids.category}
              >
                <Select
                  id={ids.category}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t("addListing.categoryPlaceholder")}
                  options={BUSINESS_CATEGORIES.map((c) => ({
                    value: c,
                    label: t(`listings.category.${c}` as MessageKey),
                  }))}
                  aria-invalid={error?.field === "category" ? true : undefined}
                />
              </Field>
            ) : null}
            <Field label={t("addListing.name")} error={err("name")} htmlFor={ids.name}>
              <TextInput
                id={ids.name}
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                invalid={error?.field === "name"}
              />
            </Field>
            <Field label={t("addListing.district")} error={err("district")} htmlFor={ids.district}>
              <DistrictSelect
                id={ids.district}
                divisions={divisions}
                placeholder={t("upload.districtPlaceholder")}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                aria-invalid={error?.field === "district" ? true : undefined}
              />
            </Field>
            <Field
              label={t("addListing.area")}
              hint={t("addListing.areaHint")}
              error={err("area")}
              htmlFor={ids.area}
            >
              <TextInput
                id={ids.area}
                value={area}
                maxLength={AREA_MAX}
                onChange={(e) => setArea(e.target.value)}
                icon="pin"
              />
            </Field>
            <Field
              label={t("addListing.description")}
              error={err("description")}
              htmlFor={ids.description}
              className="md:col-span-2"
            >
              <TextArea
                id={ids.description}
                value={description}
                maxLength={DESCRIPTION_MAX}
                counter
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                invalid={error?.field === "description"}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby={`${prefix}-prices`} className="flex flex-col gap-3">
          <h2 id={`${prefix}-prices`} className="text-h3">
            {t("addListing.pricesTitle")}
          </h2>
          <p className="text-sm text-muted">
            {t("addListing.pricesHint", { max: tier.maxPrices })}
          </p>
          <ul className="flex flex-col gap-3">
            {prices.map((row, i) => (
              <li
                key={row.key}
                className="grid grid-cols-[1fr_auto] gap-2 md:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <TextInput
                  aria-label={`${t("addListing.priceItem")} ${money(i + 1)}`}
                  placeholder={t("addListing.priceItem")}
                  value={row.item}
                  maxLength={PRICE_ITEM_MAX}
                  onChange={(e) => updateRow(row.key, { item: e.target.value })}
                  className="col-span-1"
                />
                <IconButton
                  icon="close"
                  label={t("addListing.removePrice", { n: i + 1 })}
                  onClick={() =>
                    setPrices((rows) =>
                      rows.length > 1 ? rows.filter((r) => r.key !== row.key) : [newRow()],
                    )
                  }
                  className="md:order-last"
                />
                <TextInput
                  aria-label={`${t("addListing.priceAmount")} ${money(i + 1)}`}
                  placeholder={t("addListing.priceAmount")}
                  value={row.amount}
                  inputMode="numeric"
                  onChange={(e) =>
                    updateRow(row.key, { amount: e.target.value.replace(/\D/g, "").slice(0, 8) })
                  }
                />
                <TextInput
                  aria-label={`${t("addListing.priceUnit")} ${money(i + 1)}`}
                  placeholder={t("addListing.priceUnit")}
                  value={row.unit}
                  maxLength={PRICE_UNIT_MAX}
                  onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                />
              </li>
            ))}
          </ul>
          {error?.field === "prices" ? (
            <p role="alert" className="text-sm text-danger">
              {err("prices")}
            </p>
          ) : null}
          <Button
            variant="secondary"
            icon="plus"
            className="w-fit"
            disabled={prices.length >= tier.maxPrices}
            onClick={() => setPrices((rows) => [...rows, newRow()])}
          >
            {t("addListing.addPrice")}
          </Button>
        </section>

        <section aria-labelledby={`${prefix}-contact`} className="flex flex-col gap-4">
          <h2 id={`${prefix}-contact`} className="text-h3">
            {t("addListing.contactTitle")}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={t("addListing.contactName")}
              error={err("contactName")}
              htmlFor={ids.contactName}
            >
              <TextInput
                id={ids.contactName}
                value={contactName}
                maxLength={CONTACT_NAME_MAX}
                autoComplete="name"
                onChange={(e) => setContactName(e.target.value)}
                invalid={error?.field === "contactName"}
              />
            </Field>
            <Field
              label={t("addListing.phone")}
              hint={t("addListing.phoneHint")}
              error={err("phone")}
              htmlFor={ids.phone}
            >
              <TextInput
                id={ids.phone}
                type="tel"
                value={phone}
                inputMode="tel"
                autoComplete="tel"
                onChange={(e) => setPhone(e.target.value)}
                icon="phone"
                invalid={error?.field === "phone"}
              />
            </Field>
            <Field
              label={`${t("addListing.whatsapp")} (${t("community.optional")})`}
              error={err("whatsapp")}
              htmlFor={ids.whatsapp}
            >
              <TextInput
                id={ids.whatsapp}
                type="tel"
                value={whatsapp}
                inputMode="tel"
                onChange={(e) => setWhatsapp(e.target.value)}
                icon="whatsapp"
                invalid={error?.field === "whatsapp"}
              />
            </Field>
            <Field
              label={`${t("addListing.social")} (${t("community.optional")})`}
              hint={t("addListing.socialHint")}
              error={err("socialUrl")}
              htmlFor={ids.socialUrl}
            >
              <TextInput
                id={ids.socialUrl}
                type="url"
                value={socialUrl}
                inputMode="url"
                onChange={(e) => setSocialUrl(e.target.value)}
                icon="external"
                invalid={error?.field === "socialUrl"}
              />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          {kept.length ? (
            <ul className="flex flex-wrap gap-2" aria-label={t("addListing.keptPhotos")}>
              {kept.map((p, i) => (
                <li
                  key={p.src}
                  className="relative size-24 overflow-hidden rounded-md bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- stored upload thumbnail */}
                  <img src={p.thumb ?? p.src} alt="" className="size-full object-cover" />
                  <IconButton
                    icon="close"
                    label={t("addListing.removePhoto", { n: i + 1 })}
                    onClick={() => setKept((list) => list.filter((x) => x.src !== p.src))}
                    className="absolute top-1 right-1 bg-raised/90 shadow-1"
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <ImagePicker
            label={t("addListing.photos")}
            hint={t("addListing.photosHint", { min: tier.minPhotos, max: tier.maxPhotos })}
            max={tier.maxPhotos}
            existing={kept.length}
            images={images}
            onChange={setImages}
            error={err("photos")}
            pipeline={pipeline}
          />
        </section>
      </div>

      {!editing && !account.user ? (
        <p className="text-sm text-muted">{t("addListing.guestNote")}</p>
      ) : null}
      {quota && !editing ? (
        <p className="text-sm text-muted" aria-live="polite">
          {quota.remaining > 0
            ? t("addListing.quotaLeft", { count: quota.remaining })
            : t("addListing.quotaNone", { limit: quota.limit })}
        </p>
      ) : null}
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
        {editing ? t("addListing.save") : t("addListing.submit")}
      </Button>
      <p className="text-sm text-muted">{t("addListing.reviewNote")}</p>
    </form>
  );
}
