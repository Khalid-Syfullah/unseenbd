/** District data the My Bangladesh components need, built on the server by the page. */
export type MyDistrict = {
  id: number;
  slug: string;
  /** Name in the page's content language. */
  name: string;
  /** Both names, for searching in either language. */
  nameBn: string;
  nameEn: string;
};

export type MyDivision = { slug: string; name: string; districts: MyDistrict[] };

/** Lower-case text without diacritics or punctuation, for forgiving search. */
export function searchKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}
