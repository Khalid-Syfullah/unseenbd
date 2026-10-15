import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { RetryButton } from "@/components/info/RetryButton";
import { ButtonLink } from "@/components/ui/Button";
import { isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getT(lang)("offline.pageTitle"), robots: { index: false, follow: false } };
}

/** `/offline`: what the service worker shows when a page is not saved and the network is down. */
export default async function OfflinePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getT(lang);
  return (
    <PageContainer className="items-start py-16">
      <PageHeader title={t("offline.pageTitle")} intro={t("offline.pageBody")} />
      <div className="flex flex-wrap gap-3">
        <RetryButton label={t("offline.retry")} />
        <ButtonLink href={localePath(lang, "/")} variant="secondary" icon="home">
          {t("notFound.backHome")}
        </ButtonLink>
      </div>
    </PageContainer>
  );
}
