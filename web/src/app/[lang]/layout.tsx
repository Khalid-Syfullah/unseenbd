import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AccountProvider } from "@/components/account/AccountProvider";
import { VisitCounter } from "@/components/VisitCounter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Footer } from "@/components/ui/Footer";
import { TabBar } from "@/components/ui/TabBar";
import { ToastProvider } from "@/components/ui/Toast";
import { fontVariables } from "@/fonts";
import { I18nProvider } from "@/i18n/client";
import { DEFAULT_LOCALE, HTML_LANG, isLocale, LOCALES } from "@/i18n/locales";
import { getMessages, getT } from "@/i18n/messages";
import { SITE_NAME, SITE_URL, THEME_COLOR } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { listDivisions, toLang } from "@/server/data";
import "../globals.css";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

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
  // Only the locales in LOCALES exist; anything else gets global-not-found.tsx. (Not
  // `dynamicParams = false`: that would also stop pages below, such as computed routes, from
  // rendering params that were not prebuilt.)
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const lang = param;
  const t = getT(lang);
  const divisions = await listDivisions(toLang(lang));

  return (
    // data-theme / data-theme-pref are set by THEME_SCRIPT before React hydrates.
    <html lang={HTML_LANG[lang]} dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-text antialiased">
        <I18nProvider locale={lang} messages={getMessages(lang)}>
          <ToastProvider>
            <AccountProvider />
            <VisitCounter />
            <a
              href="#main"
              className="fixed top-2 left-2 z-[90] -translate-y-[200%] rounded-md bg-raised px-4 py-3 font-semibold text-primary shadow-3 transition-transform duration-[var(--dur-2)] ease-standard focus-visible:translate-y-0 print:hidden"
            >
              {t("common.skipToContent")}
            </a>
            {/* Bottom padding keeps the end of every page clear of the fixed tab bar. */}
            <div className="flex min-h-dvh flex-col pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] print:min-h-0 print:pb-0">
              <AppHeader lang={lang} className="print:hidden" />
              <main id="main" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
              <div className="print:hidden">
                <Footer lang={lang} divisions={divisions} />
              </div>
            </div>
            <div className="print:hidden">
              <TabBar />
            </div>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
