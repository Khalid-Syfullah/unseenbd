import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoutPanel } from "@/components/account/LogoutPanel";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getT(lang)("account.logout.title"), robots: { index: false, follow: false } };
}

/** `/logout`: one button that ends the session and clears this browser's copies. */
export default async function LogoutPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getT(lang);
  return (
    <PageContainer className="max-w-[560px]">
      <PageHeader title={t("account.logout.title")} intro={t("account.logout.intro")} />
      <LogoutPanel />
    </PageContainer>
  );
}
