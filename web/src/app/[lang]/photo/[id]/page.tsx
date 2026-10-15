import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentThread } from "@/components/community/CommentThread";
import { PhotoActions } from "@/components/community/PhotoActions";
import { PageContainer, PageSection } from "@/components/discovery/PageHeader";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { TextLink } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { PHOTO_COMMENT_MAX } from "@/lib/community/rules";
import { formatDate } from "@/lib/format";
import { idParam } from "@/server/auth/http";
import { getPhoto, listDistrictPhotos, listPhotoComments } from "@/server/data/community";
import { getDistrictRef } from "@/server/data";

type PageProps = { params: Promise<{ lang: string; id: string }> };

export const dynamic = "force-dynamic";

async function load(lang: string, id: string) {
  if (!isLocale(lang)) return null;
  const photoId = idParam(id);
  return photoId ? getPhoto(photoId, contentLocale(lang)) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, id } = await params;
  const photo = await load(lang, id);
  if (!photo || !isLocale(lang)) return {};
  const t = getT(lang);
  const place = photo.place?.name ?? photo.district.name;
  const title = t("photo.metaTitle", { place, name: photo.uploader });
  const description = t("photo.metaDescription", { place, district: photo.district.name });
  return {
    title,
    description,
    alternates: { canonical: localePath(lang, `/photo/${photo.id}`) },
    openGraph: {
      title,
      description,
      images: [{ url: photo.src, width: photo.width, height: photo.height, alt: title }],
    },
  };
}

/** `/photo/:id` (FEATURES.md §6.2): one approved traveller photo with likes and comments. */
export default async function PhotoPage({ params }: PageProps) {
  const { lang: param, id } = await params;
  const photo = await load(param, id);
  if (!photo) notFound();
  const locale = param as Locale;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const href = (path: string) => localePath(locale, path);
  const [comments, district] = await Promise.all([
    listPhotoComments(photo.id),
    getDistrictRef(photo.district.slug, lang),
  ]);
  const sameDistrict = district
    ? (await listDistrictPhotos(district.id, lang, 7)).filter((p) => p.id !== photo.id).slice(0, 6)
    : [];
  const title = photo.caption ?? photo.place?.name ?? photo.district.name;
  const alt = photo.place
    ? t("gallery.alt", { place: photo.place.name, name: photo.uploader })
    : t("gallery.altDistrict", { district: photo.district.name, name: photo.uploader });

  return (
    <PageContainer>
      <Breadcrumb
        label={t("photo.breadcrumb")}
        items={[
          { label: t("gallery.title"), href: href("/gallery") },
          { label: photo.district.name, href: href(`/gallery?district=${photo.district.slug}`) },
          { label: title },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <figure className="-mx-4 flex flex-col gap-2 md:mx-0">
          <div className="overflow-hidden bg-surface-2 md:rounded-lg">
            <Image
              src={photo.src}
              alt={alt}
              width={photo.width}
              height={photo.height}
              unoptimized
              priority
              className="mx-auto block h-auto max-h-[80vh] w-auto max-w-full object-contain"
            />
          </div>
          <figcaption className="px-4 text-sm text-muted md:px-0">
            {t("photo.by", { name: photo.uploader })}
          </figcaption>
        </figure>

        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-2">
            <h1 className="text-h1 text-balance">{title}</h1>
            <p className="text-muted">
              {t("photo.by", { name: photo.uploader })}
              <span aria-hidden> · </span>
              <time dateTime={photo.createdAt}>
                {t("photo.added", { date: formatDate(photo.createdAt.slice(0, 10), lang) })}
              </time>
            </p>
          </header>
          <dl className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-sm text-muted">{t("photo.district")}</dt>
              <dd>
                <FilterChip href={href(`/gallery?district=${photo.district.slug}`)}>
                  {photo.district.name}
                </FilterChip>
              </dd>
            </div>
            {photo.place ? (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-sm text-muted">{t("photo.place")}</dt>
                <dd>
                  <Link
                    href={href(`/place/${photo.place.slug}`)}
                    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    <Icon name="pin" size={16} />
                    {photo.place.name}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
          <PhotoActions id={photo.id} likes={photo.likes} title={title} />
          <div className="flex flex-col gap-1">
            {photo.place ? (
              <TextLink href={href(`/place/${photo.place.slug}`)} trailingIcon="arrow-right">
                {t("photo.aboutPlace", { place: photo.place.name })}
              </TextLink>
            ) : null}
            <TextLink href={href(`/district/${photo.district.slug}`)} trailingIcon="arrow-right">
              {t("photo.aboutDistrict", { district: photo.district.name })}
            </TextLink>
          </div>
        </div>
      </div>

      <PageSection id="comments" title={t("photo.comments")}>
        <div className="max-w-[720px]">
          <CommentThread
            listUrl={`/api/photos/${photo.id}/comments`}
            postUrl={`/api/photos/${photo.id}/comments`}
            max={PHOTO_COMMENT_MAX}
            needName
            initial={comments}
            reportType="photo_comment"
            labels={{
              empty: t("photo.commentsEmpty"),
              body: t("photo.commentBody"),
              hint: t("photo.commentHint", { max: PHOTO_COMMENT_MAX }),
              send: t("photo.commentSend"),
              sent: t("community.commentSent"),
            }}
          />
        </div>
      </PageSection>

      {sameDistrict.length ? (
        <PageSection
          id="more"
          title={t("photo.more", { district: photo.district.name })}
          aside={
            <TextLink
              href={href(`/gallery?district=${photo.district.slug}`)}
              trailingIcon="arrow-right"
            >
              {t("common.seeAll")}
            </TextLink>
          }
        >
          <ul className="columns-2 gap-3 md:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid">
            {sameDistrict.map((p) => (
              <li key={p.id}>
                <PhotoTile
                  photo={{
                    src: p.thumb ?? p.src,
                    alt: p.place
                      ? t("gallery.alt", { place: p.place.name, name: p.uploader })
                      : t("gallery.altDistrict", { district: p.district.name, name: p.uploader }),
                    width: p.width,
                    height: p.height,
                    caption: p.place?.name ?? p.district.name,
                    likes: p.likes,
                    href: href(`/photo/${p.id}`),
                  }}
                />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
