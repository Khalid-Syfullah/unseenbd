import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { isLocale, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { safeNextPath } from "@/lib/account/rules";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { googleClientId } from "@/server/auth/config";
import { AuthForm, type AuthMode } from "./AuthForm";

export type AuthPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function authMetadata(
  { params }: Pick<AuthPageProps, "params">,
  mode: AuthMode,
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t(`account.${mode}.title`),
    description: t(`account.${mode}.metaDescription`),
    alternates: alternatesFor(lang, `/${mode}`),
    robots: { index: false, follow: true },
  };
}

/** `/login` and `/register`: the same page with the form in the other mode. */
export async function AuthPage({ params, searchParams }: AuthPageProps, mode: AuthMode) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const t = getT(locale);
  const query = await searchParams;
  const next = safeNextPath(firstParam(query.next), "") || null;
  return (
    <PageContainer className="max-w-[560px]">
      <PageHeader title={t(`account.${mode}.title`)} intro={t(`account.${mode}.intro`)} />
      <AuthForm mode={mode} googleClientId={googleClientId()} next={next} />
      <p className="text-sm text-muted">{t("account.privacy")}</p>
    </PageContainer>
  );
}
