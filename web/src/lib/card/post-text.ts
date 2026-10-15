/**
 * Ready-made post text to go with a card, in four styles (`reference.json` →
 * `share_card.post_text_styles`): short, detailed (every district name), stylish and emoji.
 * Words and hashtags come from the page's message catalog, so they follow the page language.
 */
import type { Translator } from "@/i18n/translate";
import { formatPercent } from "@/lib/format";

export const POST_STYLES = ["short", "detailed", "stylish", "emoji"] as const;
export type PostStyle = (typeof POST_STYLES)[number];

export type PostData = {
  map: "bangladesh" | "world";
  /** "Rahim's Bangladesh" / "My world". */
  title: string;
  /** Districts or countries visited. */
  count: number;
  /** 64 for Bangladesh (unused for the world). */
  total: number;
  /** World: countries on the wish list. */
  wish?: number;
  /** Names of the visited places, in the page's content language, in order. */
  names: readonly string[];
  /** Level title, or "". */
  level?: string;
  /** Hometown name, or "". */
  hometown?: string;
  caption?: string;
  /** Link to the shared map. */
  url: string;
};

const RULE = "━━━━━━━━━━━━";

/** Percent of `count` out of `total`, rounded, in the page's numerals. */
export function percentOf(count: number, total: number, lang: string): string {
  const p = total > 0 ? Math.round((Math.max(0, count) / total) * 100) : 0;
  return formatPercent(Math.min(100, p), lang);
}

/** Builds the post text for one style. Empty lines between blocks; no trailing spaces. */
export function buildPostText(
  style: PostStyle,
  data: PostData,
  t: Translator,
  lang: string,
): string {
  const bd = data.map === "bangladesh";
  const percent = percentOf(data.count, data.total, lang);
  const vars = { count: data.count, total: data.total, percent, url: data.url, title: data.title };
  const tags = t(bd ? "card.post.tagsBd" : "card.post.tagsWorld");
  const list = data.names.join(t("card.post.separator"));
  const level = data.level?.trim() ?? "";
  const home = data.hometown?.trim() ?? "";
  const caption = data.caption?.trim() ?? "";
  const wish = data.wish ?? 0;
  const stat = bd ? t("card.post.bdStat", vars) : t("card.post.worldStat", vars);

  const blocks: string[][] = [];
  switch (style) {
    case "short": {
      blocks.push([bd ? t("card.post.bdShort", vars) : t("card.post.worldShort", vars)]);
      break;
    }
    case "detailed": {
      const head = [bd ? t("card.post.bdHeadline", vars) : t("card.post.worldHeadline", vars)];
      if (!bd && wish) head.push(t("card.post.wishLine", { count: wish }));
      if (level) head.push(t("card.post.level", { level }));
      if (home) head.push(t("card.post.home", { name: home }));
      blocks.push(head);
      if (list) blocks.push([t(bd ? "card.post.bdList" : "card.post.worldList", { list })]);
      if (caption) blocks.push([caption]);
      blocks.push([t("card.post.cta", { url: data.url })]);
      break;
    }
    case "stylish": {
      const body = [`✦ ${data.title} ✦`, RULE, stat];
      if (!bd && wish) body.push(t("card.post.wishLine", { count: wish }));
      if (level) body.push(`★ ${level}`);
      if (home) body.push(`⌂ ${home}`);
      body.push(RULE);
      blocks.push(body);
      if (caption) blocks.push([`“${caption}”`]);
      blocks.push([`↳ ${t("card.post.cta", { url: data.url })}`]);
      break;
    }
    case "emoji": {
      const head = [`${bd ? "🇧🇩" : "🌍"} ${data.title}`, `🗺️ ${stat}`];
      if (!bd && wish) head.push(`✈️ ${t("card.post.wishLine", { count: wish })}`);
      if (level) head.push(`🏅 ${level}`);
      if (home) head.push(`🏠 ${home}`);
      blocks.push(head);
      if (data.names.length) blocks.push([data.names.map((n) => `📍 ${n}`).join(" ")]);
      if (caption) blocks.push([`💬 ${caption}`]);
      blocks.push([`👉 ${t("card.post.cta", { url: data.url })}`]);
      break;
    }
  }
  blocks.push([tags]);
  return blocks
    .map((lines) =>
      lines
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");
}
