import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryShell } from "@/components/community/GalleryShell";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { QueryPagination } from "@/components/discovery/QueryPagination";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { firstParam, pageParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { cleanQuery, listDistrictsByDivision } from "@/server/data";
import { listGallery } from "@/server/data/community";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("gallery.metaTitle"),
    description: t("gallery.metaDescription"),
    alternates: alternatesFor(lang, "/gallery"),
  };
}

/** `/gallery?q=&district=&page=` (DESIGN.md §5.8): approved traveller photos. */
export default async function GalleryPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const query = await searchParams;
  const groups = await listDistrictsByDivision(lang);
  const districts = groups.flatMap((g) => g.districts);
  const districtParam = firstParam(query.district);
  const district = districts.find((d) => d.slug === districtParam) ?? null;
  const q = cleanQuery(firstParam(query.q));
  const gallery = await listGallery({
    district: district?.slug ?? null,
    q,
    page: pageParam(query.page),
    lang,
  });
  const filtered = Boolean(district || q);
  const href = (path: string) => localePath(locale, path);

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={t("gallery.title")} intro={t("gallery.intro")} />
        <ButtonLink
          href={href(district ? `/upload?district=${district.slug}` : "/upload")}
          icon="camera"
          variant="accent"
        >
          {t("gallery.add")}
        </ButtonLink>
      </div>
      <GalleryShell
        divisions={groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        district={district?.slug ?? ""}
        q={q}
      >
        <div className="flex flex-col gap-4">
          <p className="num font-semibold" aria-live="polite">
            {t("gallery.count", { count: gallery.total })}
            {district ? ` · ${district.name}` : null}
          </p>
          {gallery.items.length ? (
            <ul className="columns-2 gap-3 md:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid">
              {gallery.items.map((p) => (
                <li key={p.id}>
                  <PhotoTile
                    photo={{
                      src: p.thumb ?? p.src,
                      alt: p.place
                        ? t("gallery.alt", { place: p.place.name, name: p.uploader })
                        : t("gallery.altDistrict", { district: p.district.name, name: p.uploader }),
                      width: p.width,
                      height: p.height,
                      caption: p.place ? `${p.place.name} · ${p.district.name}` : p.district.name,
                      likes: p.likes,
                      href: href(`/photo/${p.id}`),
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              illustration="upload"
              body={filtered ? t("gallery.emptyFiltered") : t("gallery.empty")}
              action={
                <ButtonLink href={href("/upload")} icon="camera">
                  {t("gallery.add")}
                </ButtonLink>
              }
            />
          )}
          <QueryPagination
            base={href("/gallery")}
            params={{
              ...(q ? { q } : {}),
              ...(district ? { district: district.slug } : {}),
            }}
            page={gallery.page}
            pageCount={gallery.pageCount}
          />
        </div>
      </GalleryShell>
    </PageContainer>
  );
}
