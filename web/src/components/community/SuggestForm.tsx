"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DistrictSelect,
  Field,
  Radio,
  SegmentedControl,
  TextArea,
  TextInput,
  type DivisionGroup,
} from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { useAccount } from "@/lib/account/client";
import { failureMessage, sendJson } from "@/lib/community/client";
import {
  NAME_MAX,
  SUGGESTION_BODY_MAX,
  SUGGESTION_NAME_MAX,
  type SuggestionKind,
} from "@/lib/community/rules";

type Tab = "place" | "food";

/**
 * "Add a place from your area" and "Add a famous food or product": one form with two tabs.
 * Suggestions wait for a moderator, then show on the home page with likes, votes and ratings.
 */
export function SuggestForm({
  divisions,
  initialTab = "place",
}: {
  divisions: DivisionGroup[];
  initialTab?: Tab;
}) {
  const t = useT();
  const locale = useLocale();
  const account = useAccount();
  const ids = {
    name: useId(),
    district: useId(),
    body: useId(),
    submitter: useId(),
    kind: useId(),
  };
  const [tab, setTab] = useState<Tab>(initialTab);
  const [foodKind, setFoodKind] = useState<"food" | "product">("food");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [body, setBody] = useState("");
  const [submitter, setSubmitter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const shownSubmitter = submitter ?? account.user?.name ?? "";
  const kind: SuggestionKind = tab === "place" ? "place" : foodKind;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("suggest.needName"));
    if (!district) return setError(t("upload.needDistrict"));
    setBusy(true);
    const res = await sendJson("/api/suggestions", {
      kind,
      name: name.trim(),
      district,
      body: body.trim(),
      submitter: shownSubmitter.trim(),
    });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setError(null);
    } else {
      setError(failureMessage(t, res.failure));
    }
  }

  if (sent) {
    return (
      <Card as="section" aria-labelledby="suggest-done" className="items-start gap-4 p-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-wash text-primary">
          <Icon name="check" size={28} />
        </span>
        <h2 id="suggest-done" className="text-h2">
          {t("upload.doneTitle")}
        </h2>
        <p role="status">{t("suggest.sent")}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            icon="plus"
            onClick={() => {
              setSent(false);
              setName("");
              setBody("");
            }}
          >
            {t("suggest.another")}
          </Button>
          <ButtonLink href={localePath(locale, "/")} variant="secondary" icon="home">
            {t("suggest.home")}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <SegmentedControl<Tab>
        label={t("suggest.tabsLabel")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "place", label: t("suggest.tabPlace"), hint: t("suggest.hintPlace") },
          { value: "food", label: t("suggest.tabFood"), hint: t("suggest.hintFood") },
        ]}
      />
      {tab === "food" ? (
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-sm font-semibold">{t("suggest.kind")}</legend>
          <div className="flex flex-wrap gap-x-6">
            <Radio
              name={ids.kind}
              checked={foodKind === "food"}
              onChange={() => setFoodKind("food")}
              label={t("suggest.kindFood")}
            />
            <Radio
              name={ids.kind}
              checked={foodKind === "product"}
              onChange={() => setFoodKind("product")}
              label={t("suggest.kindProduct")}
            />
          </div>
        </fieldset>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("suggest.name")} htmlFor={ids.name}>
          <TextInput
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              tab === "place" ? t("suggest.namePlacePlaceholder") : t("suggest.nameFoodPlaceholder")
            }
            maxLength={SUGGESTION_NAME_MAX}
            required
          />
        </Field>
        <Field label={t("suggest.district")} htmlFor={ids.district}>
          <DistrictSelect
            id={ids.district}
            divisions={divisions}
            placeholder={t("upload.districtPlaceholder")}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
        </Field>
      </div>
      <Field
        label={
          <>
            {t("suggest.body")}{" "}
            <span className="font-normal text-muted">({t("community.optional")})</span>
          </>
        }
        hint={t("suggest.bodyHint", { max: SUGGESTION_BODY_MAX })}
        htmlFor={ids.body}
      >
        <TextArea
          id={ids.body}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={SUGGESTION_BODY_MAX}
          rows={4}
          counter
          aria-describedby={`${ids.body}-hint`}
        />
      </Field>
      <Field
        label={
          <>
            {t("suggest.submitter")}{" "}
            <span className="font-normal text-muted">({t("community.optional")})</span>
          </>
        }
        hint={t("suggest.submitterHint")}
        htmlFor={ids.submitter}
      >
        <TextInput
          id={ids.submitter}
          value={shownSubmitter}
          onChange={(e) => setSubmitter(e.target.value)}
          maxLength={NAME_MAX}
          autoComplete="name"
          aria-describedby={`${ids.submitter}-hint`}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" icon="plus" loading={busy} fullWidth="mobile">
        {t("suggest.send")}
      </Button>
    </form>
  );
}
