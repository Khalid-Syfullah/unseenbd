"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, SegmentedControl, Select, Switch, TextInput } from "@/components/ui/Form";
import type { IconName } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { LOCALE_NAMES, LOCALES, isLocale, localePath, type Locale } from "@/i18n/locales";
import { signOut, updateAccountUser } from "@/lib/account/auth";
import { apiFetch, setGuest, type AccountUser } from "@/lib/account/client";
import { HANDLE_MAX, NAME_MAX, normalizeHandle } from "@/lib/account/rules";
import { clearLocalCopies, forgetMerged } from "@/lib/account/sync";
import { copyText } from "@/lib/share";
import { setThemePref, THEME_PREFS, type ThemePref } from "@/lib/theme";

/** "Sign out" in the profile header. */
export function SignOutButton() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.replace(localePath(locale, "/"));
        router.refresh();
      }}
    >
      {t("account.logout.button")}
    </Button>
  );
}

/**
 * A button that asks for confirmation in a dialog, then calls the API (`method url`), shows
 * `done` as a toast and reloads the page's server data.
 */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  done,
  url,
  method = "DELETE",
  variant = "secondary",
  icon,
  size = "sm",
}: {
  label: ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  done: string;
  url: string;
  method?: "DELETE" | "POST" | "PATCH";
  variant?: ButtonVariant;
  icon?: IconName;
  size?: "sm" | "md";
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await apiFetch(url, { method });
      if (!res.ok) throw new Error(String(res.status));
      toast.show(done, { tone: "success" });
      setOpen(false);
      router.refresh();
    } catch {
      toast.show(t("common.somethingWrong"), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} icon={icon} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy} onClick={confirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <p>{body}</p>
      </Dialog>
    </>
  );
}

/** Share switch and copy-link for one saved trip. */
export function TripShare({ id, isPublic }: { id: number; isPublic: boolean }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: boolean) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/trips/${id}`, { method: "PATCH", json: { isPublic: next } });
      if (!res.ok) throw new Error(String(res.status));
      if (next) {
        const url = new URL(localePath(locale, `/trip/${id}`), window.location.origin).toString();
        await copyText(url);
        toast.show(t("profile.trips.shared"), { tone: "success" });
      } else {
        toast.show(t("profile.trips.stopped"));
      }
      router.refresh();
    } catch {
      toast.show(t("common.somethingWrong"), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return isPublic ? (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon="copy"
        onClick={async () => {
          const url = new URL(localePath(locale, `/trip/${id}`), window.location.origin);
          if (await copyText(url.toString()))
            toast.show(t("common.linkCopied"), { tone: "success" });
        }}
      >
        {t("common.copyLink")}
      </Button>
      <Button variant="ghost" size="sm" loading={busy} onClick={() => set(false)}>
        {t("profile.trips.stopSharing")}
      </Button>
    </>
  ) : (
    <Button variant="secondary" size="sm" icon="share" loading={busy} onClick={() => set(true)}>
      {t("profile.trips.share")}
    </Button>
  );
}

type SettingsError = "invalid_name" | "invalid_handle" | "handle_taken" | "error";

/** Name, @handle, language, theme and the public-map switch. */
export function SettingsForm({ user }: { user: AccountUser }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [language, setLanguage] = useState<Locale>(user.locale ?? locale);
  const [theme, setTheme] = useState<ThemePref>(user.theme ?? "system");
  const [publicMap, setPublicMap] = useState(user.publicMap);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SettingsError | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        json: { name, handle: normalizeHandle(handle), locale: language, theme, publicMap },
      });
      const body = (await res.json().catch(() => null)) as {
        user?: AccountUser;
        error?: string;
      } | null;
      if (!res.ok || !body?.user) {
        const known: SettingsError[] = ["invalid_name", "invalid_handle", "handle_taken"];
        setError(known.find((k) => k === body?.error) ?? "error");
        return;
      }
      updateAccountUser(body.user);
      setThemePref(theme);
      toast.show(t("profile.settings.saved"), { tone: "success" });
      if (language !== locale) router.replace(localePath(language, "/profile?tab=settings"));
      router.refresh();
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }

  const themeLabel = (p: ThemePref) =>
    t(p === "system" ? "profile.settings.themeSystem" : `theme.${p}`);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field
        label={t("account.name")}
        htmlFor={`${id}-name`}
        error={error === "invalid_name" ? t("profile.settings.errors.invalid_name") : undefined}
      >
        <TextInput
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          required
          autoComplete="name"
          invalid={error === "invalid_name"}
        />
      </Field>
      <Field
        label={t("profile.settings.handle")}
        htmlFor={`${id}-handle`}
        hint={t("profile.settings.handleHint")}
        error={
          error === "invalid_handle" || error === "handle_taken"
            ? t(`profile.settings.errors.${error}`)
            : undefined
        }
      >
        <TextInput
          id={`${id}-handle`}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          maxLength={HANDLE_MAX + 1}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          invalid={error === "invalid_handle" || error === "handle_taken"}
          aria-describedby={`${id}-handle-hint`}
        />
      </Field>
      <Field label={t("language.label")} htmlFor={`${id}-language`}>
        <Select
          id={`${id}-language`}
          value={language}
          onChange={(e) => isLocale(e.target.value) && setLanguage(e.target.value)}
          options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
        />
      </Field>
      <SegmentedControl
        label={t("theme.label")}
        options={THEME_PREFS.map((p) => ({ value: p, label: themeLabel(p) }))}
        value={theme}
        onChange={setTheme}
      />
      <Switch checked={publicMap} onChange={setPublicMap} label={t("profile.settings.publicMap")} />
      {error === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {t("common.somethingWrong")}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={busy}>
          {t("profile.settings.save")}
        </Button>
      </div>
    </form>
  );
}

/** "Delete my account": type your @handle, then everything goes. */
export function DeleteAccount({ handle }: { handle: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = normalizeHandle(typed) === handle;

  async function confirm() {
    setBusy(true);
    try {
      const res = await apiFetch("/api/me", { method: "DELETE", json: { confirm: typed } });
      if (!res.ok) throw new Error(String(res.status));
      forgetMerged();
      clearLocalCopies();
      setGuest();
      toast.show(t("profile.settings.deleted"), { tone: "success" });
      router.replace(localePath(locale, "/"));
      router.refresh();
    } catch {
      toast.show(t("common.somethingWrong"), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("profile.settings.deleteAccount")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("profile.settings.deleteAccount")}
        description={t("profile.settings.deleteAccountBody")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy} disabled={!matches} onClick={confirm}>
              {t("profile.settings.deleteConfirmButton")}
            </Button>
          </>
        }
      >
        <Field
          label={t("profile.settings.deleteConfirmLabel", { handle })}
          htmlFor={`${id}-confirm`}
        >
          <TextInput
            id={`${id}-confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
      </Dialog>
    </>
  );
}
