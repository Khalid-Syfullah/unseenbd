"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/Form";
import { useLocale, useT } from "@/i18n/client";
import { localePath, type Locale } from "@/i18n/locales";
import {
  registerAccount,
  signInWithGoogleCredential,
  signInWithPassword,
  type AuthError,
  type AuthResult,
} from "@/lib/account/auth";
import { useAccount } from "@/lib/account/client";
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/account/rules";

export type AuthMode = "login" | "register";

/** Where to go after signing in: the requested page, or the profile in the user's language. */
function destination(next: string | null, fallbackLocale: Locale, userLocale: Locale | null) {
  return next ?? localePath(userLocale ?? fallbackLocale, "/profile");
}

/**
 * Sign-in and sign-up form: Google Identity Services (only when `googleClientId` is set; its
 * script loads on this page and nowhere else) and email + password. After signing in, what this
 * browser saved while logged out is merged into the account, then the visitor goes to `next`.
 */
export function AuthForm({
  mode,
  googleClientId,
  next,
}: {
  mode: AuthMode;
  googleClientId: string | null;
  /** A path on this site (already checked on the server), or null for the profile. */
  next: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const account = useAccount();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [done, setDone] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function finish(result: AuthResult) {
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    setDone(true);
    router.replace(destination(next, locale, result.user.locale));
    router.refresh();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setError(null);
    const result =
      mode === "login"
        ? await signInWithPassword(email, password)
        : await registerAccount({ name: String(data.get("name") ?? ""), email, password });
    await finish(result);
  }

  async function onGoogle(credential: string) {
    setBusy(true);
    setError(null);
    await finish(await signInWithGoogleCredential(credential));
  }

  if (account.status === "user" && !busy && !done) {
    return (
      <Card as="section" className="gap-4 p-6">
        <p className="text-lg">{t("account.signedInAs", { name: account.user.name })}</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={localePath(locale, "/profile")} icon="user">
            {t("account.goProfile")}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/logout")} variant="secondary">
            {t("account.logout.button")}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <Card as="section" className="gap-5 p-5 sm:p-6" aria-busy={busy || undefined}>
      {error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md bg-danger/10 px-4 py-3 text-sm font-semibold text-danger outline-none"
        >
          {t(`account.errors.${error}`)}
        </p>
      ) : null}

      {googleClientId ? (
        <>
          <GoogleButton clientId={googleClientId} locale={locale} onCredential={onGoogle} />
          <p className="flex items-center gap-3 text-sm text-muted" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            {t("account.or")}
            <span className="h-px flex-1 bg-border" />
          </p>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
        {mode === "register" ? (
          <Field label={t("account.name")} htmlFor={`${id}-name`}>
            <TextInput
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              required
              maxLength={NAME_MAX}
              icon="user"
            />
          </Field>
        ) : null}
        <Field label={t("account.email")} htmlFor={`${id}-email`}>
          <TextInput
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
          />
        </Field>
        <Field
          label={t("account.password")}
          htmlFor={`${id}-password`}
          hint={mode === "register" ? t("account.passwordHint", { min: PASSWORD_MIN }) : undefined}
        >
          <TextInput
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? PASSWORD_MIN : undefined}
            maxLength={PASSWORD_MAX}
            aria-describedby={mode === "register" ? `${id}-password-hint` : undefined}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {mode === "login" ? t("account.submitLogin") : t("account.submitRegister")}
        </Button>
      </form>

      <p className="text-sm text-muted">{t("account.keepsLocal")}</p>
      <p className="text-sm">
        {mode === "login" ? t("account.noAccount") : t("account.haveAccount")}{" "}
        <Link
          href={`${localePath(locale, mode === "login" ? "/register" : "/login")}${nextQuery}`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {mode === "login" ? t("account.registerLink") : t("account.loginLink")}
        </Link>
      </p>
    </Card>
  );
}

type GoogleId = {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
  }): void;
  renderButton(
    el: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with";
      shape?: "rectangular" | "pill";
      width?: number;
      locale?: string;
    },
  ): void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export const GSI_SRC = "https://accounts.google.com/gsi/client";

/** The official "Sign in with Google" button, rendered by Google Identity Services. */
function GoogleButton({
  clientId,
  locale,
  onCredential,
}: {
  clientId: string;
  locale: Locale;
  onCredential: (credential: string) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const gsi = window.google?.accounts?.id;
    if (!ready || !gsi || !ref.current) return;
    gsi.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) callback.current(response.credential);
      },
      ux_mode: "popup",
      context: "signin",
      itp_support: true,
    });
    gsi.renderButton(ref.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: Math.min(400, ref.current.clientWidth || 320),
      locale: locale === "bn" ? "bn" : locale,
    });
  }, [ready, clientId, locale]);

  return (
    <div className="flex min-h-11 flex-col items-center justify-center">
      <Script
        src={GSI_SRC}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={ref} className="flex w-full justify-center" />
      {failed ? <p className="text-sm text-muted">{t("account.googleUnavailable")}</p> : null}
    </div>
  );
}
