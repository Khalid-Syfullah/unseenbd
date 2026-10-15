import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { getMessages } from "@/i18n/messages";

/** Renders `ui` inside the providers the root layout gives every page (i18n and toasts). */
export function renderWithI18n(
  ui: ReactElement,
  { locale = "en", ...options }: { locale?: Locale } & Omit<RenderOptions, "wrapper"> = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale={locale} messages={getMessages(locale)}>
        <ToastProvider>{children}</ToastProvider>
      </I18nProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
