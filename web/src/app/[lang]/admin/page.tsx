import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { isLocale } from "@/i18n/locales";
import { dhakaDay } from "@/lib/community/season";
import { currentSession } from "@/server/auth/current";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string }> };

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * `/admin`: moderation queues, editorial stars and daily stats. Only admins can see it; for
 * everybody else (signed out or a normal user) the page does not exist (404).
 */
export default async function AdminPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const session = await currentSession();
  if (!session || session.user.role !== "admin") notFound();
  return (
    <PageContainer>
      <PageHeader
        title="Admin"
        intro="Review what visitors send, set editorial stars and read the daily numbers."
      />
      <AdminConsole today={dhakaDay()} locale={lang} />
    </PageContainer>
  );
}
