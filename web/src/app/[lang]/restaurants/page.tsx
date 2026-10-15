import { directoryMetadata, renderDirectoryPage } from "@/components/directory/DirectoryPageView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string }> };

export const generateMetadata = ({ params }: PageProps) => directoryMetadata(params, "restaurants");

/** `/restaurants` (FEATURES.md §7): the seeded directory plus approved owner listings. */
export default async function Page({ params }: PageProps) {
  return await renderDirectoryPage({ params, page: "restaurants" });
}
