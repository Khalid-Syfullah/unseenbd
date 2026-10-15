"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./locales";
import { createTranslator, type Messages, type Translator } from "./translate";

type I18nValue = { locale: Locale; t: Translator };

const I18nContext = createContext<I18nValue | null>(null);

/** Gives client components the current locale and its catalog. Set once in the root layout. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(locale, messages) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT() and useLocale() need an <I18nProvider> above them");
  return value;
}

/** The `t()` function in client components. */
export function useT(): Translator {
  return useI18n().t;
}

/** The current interface locale in client components. */
export function useLocale(): Locale {
  return useI18n().locale;
}
