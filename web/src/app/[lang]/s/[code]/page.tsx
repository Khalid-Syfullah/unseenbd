import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { myBangladeshSharePath } from "@/lib/visited/encode";
import { getShortLink } from "@/server/short-links";

type PageProps = { params: Promise<{ lang: string; code: string }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** `/s/{code}`: a short share link; redirects to the long My Bangladesh link it stands for. */
export default async function ShortLinkPage({ params }: PageProps) {
  const { lang, code } = await params;
  if (!isLocale(lang)) notFound();
  const link = getShortLink(code);
  if (!link) notFound();
  redirect(myBangladeshSharePath(lang, link.ids, link.name));
}
