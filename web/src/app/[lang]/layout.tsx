import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/fonts";
import { FOUNDATION_COPY } from "@/i18n/foundation-copy";
import { DEFAULT_LOCALE, HTML_LANG, isLocale, LOCALES } from "@/i18n/locales";
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
  const copy = FOUNDATION_COPY[isLocale(lang) ? lang : DEFAULT_LOCALE];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: copy.title, template: `%s · ${SITE_NAME}` },
    description: copy.description,
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
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
