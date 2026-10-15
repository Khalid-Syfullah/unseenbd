import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/fonts";
import { I18nProvider } from "@/i18n/client";
import { DEFAULT_LOCALE, HTML_LANG, isLocale, LOCALES } from "@/i18n/locales";
import { getMessages, getT } from "@/i18n/messages";
import { SITE_NAME, SITE_URL, THEME_COLOR } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "../globals.css";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

// Only the locales in LOCALES exist; anything else is unmatched and gets global-not-found.tsx.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { lang } = await params;
  const t = getT(isLocale(lang) ? lang : DEFAULT_LOCALE);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("meta.title"), template: `%s · ${SITE_NAME}` },
    description: t("meta.description"),
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps) {
  // dynamicParams = false already 404s unknown locales, so no notFound() here (the root layout
  // has no not-found boundary above it).
  const { lang: param } = await params;
  const lang = isLocale(param) ? param : DEFAULT_LOCALE;

  return (
    // data-theme / data-theme-pref are set by THEME_SCRIPT before React hydrates.
    <html lang={HTML_LANG[lang]} dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-text antialiased">
        <I18nProvider locale={lang} messages={getMessages(lang)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
