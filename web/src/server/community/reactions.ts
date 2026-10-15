/**
 * Likes, ▲ votes and ★ ratings on community items, one per visitor (account or device) per
 * item and kind, kept in `likes`. The item rows carry the running totals (`likes`, `votes`,
 * `rating_sum`, `rating_count`) so lists never have to count. Only approved items can be rated.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { RATING_MAX, RATING_MIN } from "@/lib/community/rules";
import { getDb } from "../db/client";
import { likes, photos, posts, suggestions } from "../db/schema";

export type TargetType = "photo" | "post" | "suggestion";
export type ReactionKind = "like" | "vote" | "star";

const TABLE_NAMES = { photo: "photos", post: "posts", suggestion: "suggestions" } as const;
type Counter = "likes" | "votes" | "rating_sum" | "rating_count";

/** Which reactions each item type takes. */
export const ALLOWED: Record<TargetType, readonly ReactionKind[]> = {
  photo: ["like"],
  post: ["like", "star"],
  suggestion: ["like", "vote", "star"],
};

export type ReactionTotals = {
  likes: number;
  votes: number;
  /** 0–1000 (★ x/10), or null when unrated. */
  stars: number | null;
  ratings: number;
};

export type MyReactions = { like: boolean; vote: boolean; star: number | null };

function exists(type: TargetType, id: number): boolean {
  const db = getDb();
  if (type === "photo") {
    return Boolean(
      db
        .select({ id: photos.id })
        .from(photos)
        .where(and(eq(photos.id, id), eq(photos.status, "approved"), eq(photos.isPublic, true)))
        .get(),
    );
  }
  if (type === "post") {
    return Boolean(
      db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, id), eq(posts.status, "approved")))
        .get(),
    );
  }
  return Boolean(
    db
      .select({ id: suggestions.id })
      .from(suggestions)
      .where(and(eq(suggestions.id, id), eq(suggestions.status, "approved")))
      .get(),
  );
}

export function totals(type: TargetType, id: number): ReactionTotals {
  const db = getDb();
  if (type === "photo") {
    const row = db.select({ likes: photos.likes }).from(photos).where(eq(photos.id, id)).get();
    return { likes: row?.likes ?? 0, votes: 0, stars: null, ratings: 0 };
  }
  if (type === "post") {
    const row = db.select().from(posts).where(eq(posts.id, id)).get();
    return {
      likes: row?.likes ?? 0,
      votes: 0,
      stars: row && row.ratingCount ? Math.round((row.ratingSum / row.ratingCount) * 100) : null,
      ratings: row?.ratingCount ?? 0,
    };
  }
  const row = db.select().from(suggestions).where(eq(suggestions.id, id)).get();
  return {
    likes: row?.likes ?? 0,
    votes: row?.votes ?? 0,
    stars: row && row.ratingCount ? Math.round((row.ratingSum / row.ratingCount) * 100) : null,
    ratings: row?.ratingCount ?? 0,
  };
}

/** The visitor's own reactions to a set of items. */
export function myReactions(
  type: TargetType,
  ids: number[],
  actor: string | null,
): Record<number, MyReactions> {
  const out: Record<number, MyReactions> = {};
  for (const id of ids) out[id] = { like: false, vote: false, star: null };
  if (!actor || !ids.length) return out;
  const rows = getDb()
    .select()
    .from(likes)
    .where(and(eq(likes.targetType, type), inArray(likes.targetId, ids), eq(likes.actor, actor)))
    .all();
  for (const r of rows) {
    const mine = out[r.targetId];
    if (!mine) continue;
    if (r.kind === "like") mine.like = true;
    else if (r.kind === "vote") mine.vote = true;
    else mine.star = r.value;
  }
  return out;
}

export type ReactResult =
  | { ok: true; totals: ReactionTotals; mine: MyReactions }
  | { ok: false; reason: "not_found" | "not_allowed" | "bad_value" };

/**
 * Sets one reaction. `like` and `vote` take `on: boolean`; `star` takes `value` 1–10 (or null to
 * take the rating back). Idempotent: liking twice leaves one like.
 */
export function react(
  type: TargetType,
  id: number,
  actor: string,
  kind: ReactionKind,
  { on = true, value = null }: { on?: boolean; value?: number | null } = {},
): ReactResult {
  if (!ALLOWED[type].includes(kind)) return { ok: false, reason: "not_allowed" };
  if (kind === "star" && value !== null) {
    if (!Number.isInteger(value) || value < RATING_MIN || value > RATING_MAX) {
      return { ok: false, reason: "bad_value" };
    }
  }
  if (!exists(type, id)) return { ok: false, reason: "not_found" };

  getDb().transaction((tx) => {
    const where = and(
      eq(likes.targetType, type),
      eq(likes.targetId, id),
      eq(likes.actor, actor),
      eq(likes.kind, kind),
    );
    const existing = tx.select().from(likes).where(where).get();
    const bump = (changes: Partial<Record<Counter, number>>) => {
      const sets = Object.entries(changes).map(([column, delta]) => {
        const c = sql.identifier(column);
        return sql`${c} = case when ${c} + ${delta} < 0 then 0 else ${c} + ${delta} end`;
      });
      tx.run(
        sql`update ${sql.identifier(TABLE_NAMES[type])} set ${sql.join(sets, sql`, `)} where id = ${id}`,
      );
    };
    if (kind === "star") {
      if (value === null) {
        if (!existing) return;
        tx.delete(likes).where(where).run();
        bump({ rating_sum: -existing.value, rating_count: -1 });
      } else if (existing) {
        tx.update(likes).set({ value }).where(where).run();
        bump({ rating_sum: value - existing.value });
      } else {
        tx.insert(likes).values({ targetType: type, targetId: id, actor, kind, value }).run();
        bump({ rating_sum: value, rating_count: 1 });
      }
      return;
    }
    const counter: Counter = kind === "like" ? "likes" : "votes";
    if (on && !existing) {
      tx.insert(likes).values({ targetType: type, targetId: id, actor, kind, value: 1 }).run();
      bump({ [counter]: 1 });
    } else if (!on && existing) {
      tx.delete(likes).where(where).run();
      bump({ [counter]: -1 });
    }
  });
  return { ok: true, totals: totals(type, id), mine: myReactions(type, [id], actor)[id]! };
}
