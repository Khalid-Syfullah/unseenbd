"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Radio, TextArea, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { useAccount } from "@/lib/account/client";
import { failureMessage, sendJson } from "@/lib/community/client";
import {
  EMAIL_MAX,
  isValidEmail,
  NAME_MAX,
  TIP_BODY_MAX,
  TIP_KINDS,
  type TipKind,
} from "@/lib/community/rules";

export type TipTarget = { place: string } | { district: string };

/**
 * "Send a tip or correction" / "Write an experience or warning": a private message to the
 * editors about a place or district (`guide_suggestions`). Nothing here is published as it is.
 */
export function TipDialog({
  open,
  onClose,
  target,
  about,
  initialKind = "tip",
}: {
  open: boolean;
  onClose: () => void;
  target: TipTarget;
  /** Name of the place or district, for the description. */
  about: string;
  initialKind?: TipKind;
}) {
  const t = useT();
  const toast = useToast();
  const account = useAccount();
  const ids = { kind: useId(), body: useId(), name: useId(), email: useId() };
  const [kind, setKind] = useState<TipKind>(initialKind);
  const [body, setBody] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shownName = name ?? account.user?.name ?? "";

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!body.trim()) {
      setError(t("tips.needBody"));
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setError(t("upload.badEmail"));
      return;
    }
    setBusy(true);
    const res = await sendJson("/api/guide-suggestions", {
      ...target,
      kind,
      body: body.trim(),
      name: shownName.trim(),
      email: email.trim(),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setError(null);
      onClose();
      toast.show(t("tips.sent"), { tone: "success" });
    } else {
      setError(failureMessage(t, res.failure));
    }
  }

  const formId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        kind === "experience" || kind === "warning" ? t("tips.titleExperience") : t("tips.title")
      }
      description={t("tips.about", { name: about })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} icon="flag" loading={busy}>
            {t("tips.send")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t("tips.intro")}</p>
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-sm font-semibold">{t("tips.kind")}</legend>
          <div className="grid grid-cols-2 gap-x-4">
            {TIP_KINDS.map((k) => (
              <Radio
                key={k}
                name={ids.kind}
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                label={t(`tips.kinds.${k}`)}
              />
            ))}
          </div>
        </fieldset>
        <Field
          label={t("tips.body")}
          hint={t("tips.bodyHint", { max: TIP_BODY_MAX })}
          htmlFor={ids.body}
        >
          <TextArea
            id={ids.body}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={TIP_BODY_MAX}
            rows={5}
            counter
            required
            aria-describedby={`${ids.body}-hint`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={
              <>
                {t("tips.name")}{" "}
                <span className="font-normal text-muted">({t("community.optional")})</span>
              </>
            }
            htmlFor={ids.name}
          >
            <TextInput
              id={ids.name}
              value={shownName}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="name"
            />
          </Field>
          <Field
            label={
              <>
                {t("tips.email")}{" "}
                <span className="font-normal text-muted">({t("community.optional")})</span>
              </>
            }
            hint={t("tips.emailHint")}
            htmlFor={ids.email}
          >
            <TextInput
              id={ids.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={EMAIL_MAX}
              autoComplete="email"
              aria-describedby={`${ids.email}-hint`}
            />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
