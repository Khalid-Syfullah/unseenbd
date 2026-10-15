import { NotFoundView } from "@/components/info/NotFoundView";
import { listDistricts } from "@/server/data";

/**
 * 404 for `notFound()` inside a page (FEATURES.md §1.10). The locale is not known on the server
 * here, so both name lists go to the client view, which picks the page language.
 */
export default async function NotFound() {
  const [bn, en] = await Promise.all([listDistricts("bn"), listDistricts("en")]);
  const pick = (rows: typeof bn) => rows.map((d) => ({ slug: d.slug, name: d.name }));
  return <NotFoundView districts={{ bn: pick(bn), en: pick(en) }} />;
}
