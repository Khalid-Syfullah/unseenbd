/**
 * The moderation queues of the admin screens: photos, posts, comments, suggestions, tips and
 * corrections, listings, listing reviews, reports and leaderboard names. Each queue lists items
 * by a common status (`pending`, `approved`, `rejected`; the tables' own words are mapped) and
 * takes bulk actions: approve, reject and delete (listings also sponsor / unsponsor).
 */
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { removeListing } from "../listings/write";
import { deleteMedia } from "../community/media";
import { getDb } from "../db/client";
import {
  districts,
  guideSuggestions,
  leaderboardEntries,
  likes,
  listingReviews,
  listings,
  photoComments,
  photos,
  places,
  postComments,
  posts,
  reports,
  suggestions,
  trendComments,
  users,
} from "../db/schema";

export type QueueStatus = "pending" | "approved" | "rejected";
export type QueueAction = "approve" | "reject" | "delete" | "sponsor" | "unsponsor";

export const QUEUE_STATUSES: readonly QueueStatus[] = ["pending", "approved", "rejected"];
export const QUEUE_ACTIONS: readonly QueueAction[] = [
  "approve",
  "reject",
  "delete",
  "sponsor",
  "unsponsor",
];

export type QueueItem = {
  id: string;
  title: string;
  body: string | null;
  /** Small facts shown under the text: who, where, when. */
  meta: string[];
  status: QueueStatus;
  image: string | null;
  /** A public page for the item, when it has one. */
  href: string | null;
  createdAt: string;
};

type Listed = { items: QueueItem[]; total: number };

export type Queue = {
  label: string;
  /** What each action means in this queue (absent = not offered). */
  actions: Partial<Record<QueueAction, string>>;
  list(status: QueueStatus, limit: number, offset: number): Listed;
  /** Applies `action` to the ids (strings from the screen); returns how many changed. */
  act(ids: string[], action: QueueAction): number;
};

export const QUEUE_PAGE_SIZE = 20;
const MAX_IDS = 200;

function numbers(ids: string[]): number[] {
  return [...new Set(ids.slice(0, MAX_IDS))]
    .filter((id) => /^\d{1,12}$/.test(id))
    .map(Number)
    .filter((n) => n >= 1);
}

const now = () => new Date().toISOString();
const clip = (value: string | null | undefined, max = 400) =>
  value && value.length > max ? `${value.slice(0, max)}…` : (value ?? null);

function total(table: SQLiteTable, where: SQL | undefined): number {
  return (
    getDb()
      .select({ n: sql<number>`count(*)` })
      .from(table)
      .where(where)
      .get()?.n ?? 0
  );
}

/* -- photos --------------------------------------------------------------------------------- */

function deletePhotoIds(ids: number[]): number {
  const db = getDb();
  const rows = db
    .select({ id: photos.id, src: photos.src, thumb: photos.thumb })
    .from(photos)
    .where(inArray(photos.id, ids))
    .all();
  if (!rows.length) return 0;
  const found = rows.map((r) => r.id);
  db.transaction((tx) => {
    tx.delete(likes)
      .where(and(eq(likes.targetType, "photo"), inArray(likes.targetId, found)))
      .run();
    tx.delete(reports)
      .where(and(eq(reports.targetType, "photo"), inArray(reports.targetId, found)))
      .run();
    tx.delete(photos).where(inArray(photos.id, found)).run();
  });
  deleteMedia(rows.flatMap((r) => [r.src, r.thumb]));
  return rows.length;
}

const photoQueue: Queue = {
  label: "Photos",
  actions: { approve: "Approve", reject: "Reject", delete: "Delete" },
  list(status, limit, offset) {
    const where = eq(photos.status, status);
    const rows = getDb()
      .select({ p: photos, d: districts, pl: places })
      .from(photos)
      .innerJoin(districts, eq(photos.districtId, districts.id))
      .leftJoin(places, eq(photos.placeId, places.id))
      .where(where)
      .orderBy(desc(photos.createdAt), desc(photos.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(photos, where),
      items: rows.map(({ p, d, pl }) => ({
        id: String(p.id),
        title: p.caption || "(no caption)",
        body: null,
        meta: [
          `by ${p.uploaderName}`,
          ...(p.uploaderEmail ? [p.uploaderEmail] : []),
          [d.nameEn, pl?.nameEn].filter(Boolean).join(" · "),
          p.createdAt,
        ],
        status: p.status,
        image: p.thumb ?? p.src,
        href: p.status === "approved" ? `/photo/${p.id}` : null,
        createdAt: p.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    if (action === "delete") return deletePhotoIds(list);
    if (action !== "approve" && action !== "reject") return 0;
    return getDb()
      .update(photos)
      .set({ status: action === "approve" ? "approved" : "rejected", reviewedAt: now() })
      .where(inArray(photos.id, list))
      .run().changes;
  },
};

/* -- posts ---------------------------------------------------------------------------------- */

function deletePostIds(ids: number[]): number {
  const db = getDb();
  const rows = db.select().from(posts).where(inArray(posts.id, ids)).all();
  if (!rows.length) return 0;
  const found = rows.map((r) => r.id);
  db.transaction((tx) => {
    tx.delete(likes)
      .where(and(eq(likes.targetType, "post"), inArray(likes.targetId, found)))
      .run();
    tx.delete(reports)
      .where(and(eq(reports.targetType, "post"), inArray(reports.targetId, found)))
      .run();
    tx.delete(posts).where(inArray(posts.id, found)).run();
  });
  deleteMedia(rows.flatMap((r) => (r.photos ?? []).flatMap((p) => [p.src, p.thumb])));
  return rows.length;
}

const postQueue: Queue = {
  label: "Posts",
  actions: { approve: "Approve", reject: "Reject", delete: "Delete" },
  list(status, limit, offset) {
    const where = eq(posts.status, status);
    const rows = getDb()
      .select({ p: posts, u: users })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(posts, where),
      items: rows.map(({ p, u }) => ({
        id: String(p.id),
        title: `Post by ${u.name} (@${u.handle})`,
        body: clip(p.body, 600),
        meta: [`${(p.photos ?? []).length} photo(s)`, p.createdAt],
        status: p.status,
        image: p.photos?.[0]?.thumb ?? p.photos?.[0]?.src ?? null,
        href: p.status === "approved" ? `/post/${p.id}` : null,
        createdAt: p.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    if (action === "delete") return deletePostIds(list);
    if (action !== "approve" && action !== "reject") return 0;
    return getDb()
      .update(posts)
      .set({ status: action === "approve" ? "approved" : "rejected", updatedAt: now() })
      .where(inArray(posts.id, list))
      .run().changes;
  },
};

/* -- comments (photos, posts, trending) ----------------------------------------------------- */

const COMMENT_STATUS = { pending: "pending", approved: "visible", rejected: "hidden" } as const;
const fromComment = (s: string): QueueStatus =>
  s === "visible" ? "approved" : s === "hidden" ? "rejected" : "pending";

type CommentRow = {
  id: string;
  kind: string;
  name: string;
  body: string;
  status: string;
  createdAt: string;
  context: string;
};

function commentRows(status: QueueStatus): CommentRow[] {
  const db = getDb();
  const s = COMMENT_STATUS[status];
  const photo = db
    .select()
    .from(photoComments)
    .where(eq(photoComments.status, s))
    .all()
    .map((c) => ({
      id: `photo:${c.id}`,
      kind: "Photo comment",
      name: c.name,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      context: `photo #${c.photoId}`,
    }));
  const post = db
    .select({ c: postComments, u: users })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .where(eq(postComments.status, s))
    .all()
    .map(({ c, u }) => ({
      id: `post:${c.id}`,
      kind: "Post comment",
      name: u.name,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      context: `post #${c.postId}`,
    }));
  const trend = db
    .select({ c: trendComments, p: places })
    .from(trendComments)
    .innerJoin(places, eq(trendComments.placeId, places.id))
    .where(eq(trendComments.status, s))
    .all()
    .map(({ c, p }) => ({
      id: `trend:${c.id}`,
      kind: "Trending comment",
      name: c.name,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      context: p.nameEn,
    }));
  return [...photo, ...post, ...trend].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}

const commentQueue: Queue = {
  label: "Comments",
  actions: { approve: "Show", reject: "Hide", delete: "Delete" },
  list(status, limit, offset) {
    const all = commentRows(status);
    return {
      total: all.length,
      items: all.slice(offset, offset + limit).map((c) => ({
        id: c.id,
        title: `${c.kind} by ${c.name}`,
        body: c.body,
        meta: [c.context, c.createdAt],
        status: fromComment(c.status),
        image: null,
        href: null,
        createdAt: c.createdAt,
      })),
    };
  },
  act(ids, action) {
    const db = getDb();
    let changed = 0;
    const byKind: Record<string, number[]> = { photo: [], post: [], trend: [] };
    for (const id of [...new Set(ids.slice(0, MAX_IDS))]) {
      const m = /^(photo|post|trend):(\d{1,12})$/.exec(id);
      if (m) byKind[m[1]!]!.push(Number(m[2]));
    }
    const value = action === "approve" ? "visible" : "hidden";
    if (action !== "approve" && action !== "reject" && action !== "delete") return 0;
    const tables = [
      ["photo", photoComments],
      ["post", postComments],
      ["trend", trendComments],
    ] as const;
    for (const [kind, table] of tables) {
      const list = byKind[kind]!;
      if (!list.length) continue;
      changed +=
        action === "delete"
          ? db.delete(table).where(inArray(table.id, list)).run().changes
          : db.update(table).set({ status: value }).where(inArray(table.id, list)).run().changes;
    }
    return changed;
  },
};

/* -- suggestions ---------------------------------------------------------------------------- */

const suggestionQueue: Queue = {
  label: "Suggestions",
  actions: { approve: "Approve", reject: "Reject", delete: "Delete" },
  list(status, limit, offset) {
    const where = eq(suggestions.status, status);
    const rows = getDb()
      .select({ s: suggestions, d: districts })
      .from(suggestions)
      .leftJoin(districts, eq(suggestions.districtId, districts.id))
      .where(where)
      .orderBy(desc(suggestions.createdAt), desc(suggestions.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(suggestions, where),
      items: rows.map(({ s, d }) => ({
        id: String(s.id),
        title: `${s.kind}: ${s.name}`,
        body: s.body,
        meta: [
          s.submitterName ? `by ${s.submitterName}` : "anonymous",
          d?.nameEn ?? "",
          s.createdAt,
        ].filter(Boolean),
        status: s.status,
        image: null,
        href: null,
        createdAt: s.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    const db = getDb();
    if (action === "delete") {
      db.delete(likes)
        .where(and(eq(likes.targetType, "suggestion"), inArray(likes.targetId, list)))
        .run();
      return db.delete(suggestions).where(inArray(suggestions.id, list)).run().changes;
    }
    if (action !== "approve" && action !== "reject") return 0;
    return db
      .update(suggestions)
      .set({ status: action === "approve" ? "approved" : "rejected" })
      .where(inArray(suggestions.id, list))
      .run().changes;
  },
};

/* -- tips and corrections ------------------------------------------------------------------- */

const TIP_STATUS = { pending: "new", approved: "done", rejected: "dismissed" } as const;
const fromTip = (s: string): QueueStatus =>
  s === "done" ? "approved" : s === "dismissed" ? "rejected" : "pending";

const tipQueue: Queue = {
  label: "Tips and corrections",
  actions: { approve: "Mark done", reject: "Dismiss", delete: "Delete" },
  list(status, limit, offset) {
    const where = eq(guideSuggestions.status, TIP_STATUS[status]);
    const rows = getDb()
      .select({ g: guideSuggestions, p: places, d: districts })
      .from(guideSuggestions)
      .leftJoin(places, eq(guideSuggestions.placeId, places.id))
      .leftJoin(districts, eq(guideSuggestions.districtId, districts.id))
      .where(where)
      .orderBy(desc(guideSuggestions.createdAt), desc(guideSuggestions.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(guideSuggestions, where),
      items: rows.map(({ g, p, d }) => ({
        id: String(g.id),
        title: `${g.kind}: ${p?.nameEn ?? d?.nameEn ?? "general"}`,
        body: g.body,
        meta: [g.name ? `from ${g.name}` : "anonymous", ...(g.email ? [g.email] : []), g.createdAt],
        status: fromTip(g.status),
        image: null,
        href: p ? `/place/${p.slug}` : d ? `/district/${d.slug}` : null,
        createdAt: g.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    const db = getDb();
    if (action === "delete") {
      return db.delete(guideSuggestions).where(inArray(guideSuggestions.id, list)).run().changes;
    }
    if (action !== "approve" && action !== "reject") return 0;
    return db
      .update(guideSuggestions)
      .set({ status: action === "approve" ? "done" : "dismissed" })
      .where(inArray(guideSuggestions.id, list))
      .run().changes;
  },
};

/* -- listings and their reviews ------------------------------------------------------------- */

const listingQueue: Queue = {
  label: "Listings",
  actions: {
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    sponsor: "Mark sponsored",
    unsponsor: "Remove sponsored",
  },
  list(status, limit, offset) {
    const where = eq(listings.status, status);
    const rows = getDb()
      .select({ l: listings, d: districts })
      .from(listings)
      .innerJoin(districts, eq(listings.districtId, districts.id))
      .where(where)
      .orderBy(desc(listings.createdAt), desc(listings.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(listings, where),
      items: rows.map(({ l, d }) => ({
        id: String(l.id),
        title: `${l.name}${l.sponsored ? " (sponsored)" : ""}`,
        body: clip(l.description, 500),
        meta: [
          `${l.kind}${l.category ? ` / ${l.category}` : ""} · ${l.sizeTier}`,
          [l.area, d.nameEn].filter(Boolean).join(", "),
          [l.contactName, l.phone].filter(Boolean).join(" · "),
          l.createdAt,
        ],
        status: l.status,
        image: null,
        href: `/listing/${l.id}`,
        createdAt: l.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    if (action === "delete") return list.filter((id) => removeListing(id)).length;
    const db = getDb();
    if (action === "sponsor" || action === "unsponsor") {
      return db
        .update(listings)
        .set({ sponsored: action === "sponsor" })
        .where(inArray(listings.id, list))
        .run().changes;
    }
    return db
      .update(listings)
      .set({ status: action === "approve" ? "approved" : "rejected" })
      .where(inArray(listings.id, list))
      .run().changes;
  },
};

const listingReviewQueue: Queue = {
  label: "Listing reviews",
  actions: { approve: "Approve", reject: "Reject", delete: "Delete" },
  list(status, limit, offset) {
    const where = eq(listingReviews.status, status);
    const rows = getDb()
      .select({ r: listingReviews, l: listings })
      .from(listingReviews)
      .innerJoin(listings, eq(listingReviews.listingId, listings.id))
      .where(where)
      .orderBy(desc(listingReviews.createdAt), desc(listingReviews.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(listingReviews, where),
      items: rows.map(({ r, l }) => ({
        id: String(r.id),
        title: `${"★".repeat(r.rating)} on ${l.name}`,
        body: r.body,
        meta: [`by ${r.name}`, r.createdAt],
        status: r.status,
        image: null,
        href: `/listing/${l.id}`,
        createdAt: r.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    const db = getDb();
    if (action === "delete") {
      return db.delete(listingReviews).where(inArray(listingReviews.id, list)).run().changes;
    }
    if (action !== "approve" && action !== "reject") return 0;
    return db
      .update(listingReviews)
      .set({ status: action === "approve" ? "approved" : "rejected" })
      .where(inArray(listingReviews.id, list))
      .run().changes;
  },
};

/* -- reports -------------------------------------------------------------------------------- */

const REPORT_STATUS = { pending: "open", approved: "resolved", rejected: "dismissed" } as const;
const fromReport = (s: string): QueueStatus =>
  s === "resolved" ? "approved" : s === "dismissed" ? "rejected" : "pending";

/** Hides the reported thing (rejected photo/post, hidden comment). */
function takeDown(type: string, id: number): void {
  const db = getDb();
  if (type === "photo") {
    db.update(photos).set({ status: "rejected", reviewedAt: now() }).where(eq(photos.id, id)).run();
  } else if (type === "post") {
    db.update(posts).set({ status: "rejected", updatedAt: now() }).where(eq(posts.id, id)).run();
  } else if (type === "photo_comment") {
    db.update(photoComments).set({ status: "hidden" }).where(eq(photoComments.id, id)).run();
  } else if (type === "post_comment") {
    db.update(postComments).set({ status: "hidden" }).where(eq(postComments.id, id)).run();
  }
}

function reportPreview(type: string, id: number): { text: string | null; image: string | null } {
  const db = getDb();
  if (type === "photo") {
    const p = db.select().from(photos).where(eq(photos.id, id)).get();
    return { text: p?.caption ?? null, image: p ? (p.thumb ?? p.src) : null };
  }
  if (type === "post") {
    const p = db.select().from(posts).where(eq(posts.id, id)).get();
    return { text: clip(p?.body), image: p?.photos?.[0]?.thumb ?? p?.photos?.[0]?.src ?? null };
  }
  if (type === "photo_comment") {
    return {
      text: db.select().from(photoComments).where(eq(photoComments.id, id)).get()?.body ?? null,
      image: null,
    };
  }
  return {
    text: db.select().from(postComments).where(eq(postComments.id, id)).get()?.body ?? null,
    image: null,
  };
}

const reportQueue: Queue = {
  label: "Reports",
  actions: { approve: "Take down and resolve", reject: "Dismiss", delete: "Delete report" },
  list(status, limit, offset) {
    const where = eq(reports.status, REPORT_STATUS[status]);
    const rows = getDb()
      .select()
      .from(reports)
      .where(where)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(reports, where),
      items: rows.map((r) => {
        const preview = reportPreview(r.targetType, r.targetId);
        return {
          id: String(r.id),
          title: `${r.targetType.replace("_", " ")} #${r.targetId}: ${r.reason}`,
          body:
            [r.note, preview.text && `Reported: ${preview.text}`].filter(Boolean).join("\n") ||
            null,
          meta: [r.createdAt],
          status: fromReport(r.status),
          image: preview.image,
          href:
            r.targetType === "photo"
              ? `/photo/${r.targetId}`
              : r.targetType === "post"
                ? `/post/${r.targetId}`
                : null,
          createdAt: r.createdAt,
        };
      }),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    const db = getDb();
    const rows = db.select().from(reports).where(inArray(reports.id, list)).all();
    if (action === "delete") {
      return db.delete(reports).where(inArray(reports.id, list)).run().changes;
    }
    if (action === "approve") {
      for (const r of rows) takeDown(r.targetType, r.targetId);
    } else if (action !== "reject") {
      return 0;
    }
    return db
      .update(reports)
      .set({ status: action === "approve" ? "resolved" : "dismissed" })
      .where(inArray(reports.id, list))
      .run().changes;
  },
};

/* -- leaderboard names ---------------------------------------------------------------------- */

const leaderboardQueue: Queue = {
  label: "Leaderboard names",
  actions: { approve: "Approve name", reject: "Hide name", delete: "Delete" },
  list(status, limit, offset) {
    // A name is either waiting (not approved) or approved; there is no separate rejected state.
    if (status === "rejected") return { items: [], total: 0 };
    const where = eq(leaderboardEntries.approved, status === "approved");
    const rows = getDb()
      .select()
      .from(leaderboardEntries)
      .where(where)
      .orderBy(desc(leaderboardEntries.createdAt), desc(leaderboardEntries.id))
      .limit(limit)
      .offset(offset)
      .all();
    return {
      total: total(leaderboardEntries, where),
      items: rows.map((e) => ({
        id: String(e.id),
        title: `${e.name} — ${e.score}`,
        body: null,
        meta: [e.game, e.seed ?? "", e.createdAt].filter(Boolean),
        status: e.approved ? "approved" : "pending",
        image: null,
        href: null,
        createdAt: e.createdAt,
      })),
    };
  },
  act(ids, action) {
    const list = numbers(ids);
    if (!list.length) return 0;
    const db = getDb();
    if (action === "delete") {
      return db.delete(leaderboardEntries).where(inArray(leaderboardEntries.id, list)).run()
        .changes;
    }
    if (action !== "approve" && action !== "reject") return 0;
    return db
      .update(leaderboardEntries)
      .set({ approved: action === "approve" })
      .where(inArray(leaderboardEntries.id, list))
      .run().changes;
  },
};

export const QUEUES = {
  photos: photoQueue,
  posts: postQueue,
  comments: commentQueue,
  suggestions: suggestionQueue,
  "guide-suggestions": tipQueue,
  listings: listingQueue,
  "listing-reviews": listingReviewQueue,
  reports: reportQueue,
  leaderboard: leaderboardQueue,
} as const satisfies Record<string, Queue>;

export type QueueName = keyof typeof QUEUES;
export const QUEUE_NAMES = Object.keys(QUEUES) as QueueName[];

/** `community` is the name the API surface uses for posts and their comments. */
const ALIASES: Record<string, QueueName> = { community: "posts", tips: "guide-suggestions" };

export function queueByName(name: string): { name: QueueName; queue: Queue } | null {
  const key = (ALIASES[name] ?? name) as QueueName;
  return key in QUEUES ? { name: key, queue: QUEUES[key] } : null;
}

/** Items waiting for a decision in each queue, for the tab badges. */
export function pendingCounts(): Record<QueueName, number> {
  const out = {} as Record<QueueName, number>;
  for (const name of QUEUE_NAMES) out[name] = QUEUES[name].list("pending", 1, 0).total;
  return out;
}
