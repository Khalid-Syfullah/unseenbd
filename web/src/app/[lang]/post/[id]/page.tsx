import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostFeedCard } from "@/components/community/PostFeedCard";
import { PageContainer } from "@/components/discovery/PageHeader";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { TextLink } from "@/components/ui/Button";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { idParam } from "@/server/auth/http";
import { getPost } from "@/server/data/community";

type PageProps = { params: Promise<{ lang: string; id: string }> };

export const dynamic = "force-dynamic";

async function load(lang: string, id: string) {
  if (!isLocale(lang)) return null;
  const postId = idParam(id);
  return postId ? getPost(postId, contentLocale(lang)) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, id } = await params;
  const post = await load(lang, id);
  if (!post || !isLocale(lang)) return {};
  const t = getT(lang);
  const title = t("posts.metaTitle", { name: post.author });
  const description = post.body.replace(/\s+/g, " ").slice(0, 155);
  const image = post.photos[0];
  return {
    title,
    description,
    alternates: { canonical: localePath(lang, `/post/${post.id}`) },
    openGraph: {
      title,
      description,
      type: "article",
      images: image ? [{ url: image.src, width: image.width, height: image.height }] : undefined,
    },
  };
}

/** `/post/:id`: one approved traveller post (the link "Share" copies). */
export default async function PostPage({ params }: PageProps) {
  const { lang, id } = await params;
  const post = await load(lang, id);
  if (!post) notFound();
  const locale = lang as Locale;
  const t = getT(locale);
  return (
    <PageContainer className="max-w-[720px]">
      <Breadcrumb
        label={t("photo.breadcrumb")}
        items={[
          { label: t("nav.home"), href: localePath(locale, "/") },
          { label: post.author, href: localePath(locale, `/u/${post.authorHandle}`) },
          { label: t("posts.metaTitle", { name: post.author }) },
        ]}
      />
      <h1 className="sr-only">{t("posts.metaTitle", { name: post.author })}</h1>
      <PostFeedCard post={post} />
      <TextLink href={`${localePath(locale, "/")}#posts`} icon="arrow-left">
        {t("posts.more")}
      </TextLink>
    </PageContainer>
  );
}
