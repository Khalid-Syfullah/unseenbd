/**
 * Database schema (Drizzle ORM, SQLite via better-sqlite3).
 *
 * Kept Postgres-compatible on purpose: only `integer`, `real` and `text` columns (booleans are
 * `integer` 0/1, JSON is `text`, timestamps are ISO-8601 `text` defaulting to CURRENT_TIMESTAMP),
 * no SQLite-only features. Moving to Postgres means swapping `sqlite-core` for `pg-core`.
 *
 * Content tables are filled by `npm run db:seed` from `data/*.json`; the user tables start empty.
 * Migrations live in `drizzle/` (`npm run db:generate` after changing this file).
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  ImageCredit,
  PlaceCover,
  PlaceFromDhaka,
  PlacePhoto,
  PostPhoto,
  RouteBus,
  RouteFlight,
  RouteWater,
  TrainClass,
} from "./json-types";

const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();
const bool = (name: string) => integer(name, { mode: "boolean" });
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/* ------------------------------------------------------------------------------------------ */
/* Content (seeded)                                                                            */
/* ------------------------------------------------------------------------------------------ */

export const divisions = sqliteTable("divisions", {
  slug: text("slug").primaryKey(),
  nameBn: text("name_bn").notNull(),
  nameEn: text("name_en").notNull(),
  /** Display order (by lowest district id: Dhaka, Chattogram, Sylhet, …). */
  position: integer("position").notNull(),
});

export const districts = sqliteTable(
  "districts",
  {
    id: integer("id").primaryKey(),
    slug: text("slug").notNull(),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    division: text("division")
      .notNull()
      .references(() => divisions.slug),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    famousForBn: json<string[]>("famous_for_bn").notNull(),
    famousForEn: json<string[]>("famous_for_en").notNull(),
    communityPhotoCount: integer("community_photo_count").notNull().default(0),
    introBn: text("intro_bn"),
    introEn: text("intro_en"),
    howToReachBn: text("how_to_reach_bn"),
    howToReachEn: text("how_to_reach_en"),
  },
  (t) => [
    uniqueIndex("districts_slug_uq").on(t.slug),
    index("districts_division_idx").on(t.division),
  ],
);

export const kinds = sqliteTable("kinds", {
  key: text("key").primaryKey(),
  labelBn: text("label_bn").notNull(),
  labelEn: text("label_en").notNull(),
  position: integer("position").notNull(),
});

export const months = sqliteTable("months", {
  month: integer("month").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameBn: text("name_bn").notNull(),
  nameEn: text("name_en").notNull(),
  shortEn: text("short_en").notNull(),
});

export const places = sqliteTable(
  "places",
  {
    id: integer("id").primaryKey(),
    slug: text("slug").notNull(),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    /** Position of the place in its district's list (`districts.json` → `places[]`). */
    districtPosition: integer("district_position").notNull().default(0),
    kind: text("kind")
      .notNull()
      .references(() => kinds.key),
    popular: bool("popular").notNull(),
    unseen: bool("unseen").notNull(),
    bestFromMonth: integer("best_from_month").notNull(),
    bestToMonth: integer("best_to_month").notNull(),
    visitHours: real("visit_hours").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    /** Editorial score 0–1000; shown as ★ ⌊stars/100⌋/10. */
    stars: integer("stars").notNull(),
    imageCredit: json<ImageCredit>("image_credit"),
    cover: json<PlaceCover>("cover"),
    photo: json<PlacePhoto>("photo"),
    /** Slugs of nearby places, nearest first. */
    nearby: json<string[]>("nearby").notNull(),
    fromDhaka: json<PlaceFromDhaka>("from_dhaka"),
    descriptionBn: text("description_bn"),
    descriptionEn: text("description_en"),
    howToGetThereBn: text("how_to_get_there_bn"),
    howToGetThereEn: text("how_to_get_there_en"),
    warningsBn: json<string[]>("warnings_bn"),
    warningsEn: json<string[]>("warnings_en"),
    tipsBn: json<string[]>("tips_bn"),
    tipsEn: json<string[]>("tips_en"),
    accessibilityBn: text("accessibility_bn"),
    accessibilityEn: text("accessibility_en"),
    entryFeeBn: text("entry_fee_bn"),
    entryFeeEn: text("entry_fee_en"),
    openingHoursBn: text("opening_hours_bn"),
    openingHoursEn: text("opening_hours_en"),
  },
  (t) => [
    uniqueIndex("places_slug_uq").on(t.slug),
    index("places_district_idx").on(t.districtId),
    index("places_kind_idx").on(t.kind),
  ],
);

export const routes = sqliteTable(
  "routes",
  {
    slug: text("slug").primaryKey(),
    fromDistrictId: integer("from_district_id")
      .notNull()
      .references(() => districts.id),
    toDistrictId: integer("to_district_id")
      .notNull()
      .references(() => districts.id),
    roadKm: real("road_km").notNull(),
    bus: json<RouteBus>("bus"),
    /** Train slugs from → to, and back. */
    trains: json<string[]>("trains").notNull(),
    trainsBack: json<string[]>("trains_back").notNull(),
    waterBn: json<RouteWater[]>("water_bn").notNull(),
    waterEn: json<RouteWater[]>("water_en").notNull(),
    flightBn: json<RouteFlight>("flight_bn"),
    flightEn: json<RouteFlight>("flight_en"),
    placesAtDestination: json<string[]>("places_at_destination").notNull(),
  },
  (t) => [
    uniqueIndex("routes_pair_uq").on(t.fromDistrictId, t.toDistrictId),
    index("routes_to_idx").on(t.toDistrictId),
  ],
);

export const routesFromDhaka = sqliteTable("routes_from_dhaka", {
  toDistrictId: integer("to_district_id")
    .primaryKey()
    .references(() => districts.id),
  roadKm: real("road_km").notNull(),
  busHours: json<[number, number]>("bus_hours"),
  busFareFromBdt: integer("bus_fare_from_bdt"),
  directTrains: integer("direct_trains").notNull(),
});

export const trains = sqliteTable(
  "trains",
  {
    slug: text("slug").primaryKey(),
    no: integer("no").notNull(),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    /** Weekly off day, 0 = Sunday … 6 = Saturday; null = runs every day. */
    offDay: integer("off_day"),
    fromBn: text("from_bn").notNull(),
    fromEn: text("from_en").notNull(),
    fromDistrictId: integer("from_district_id")
      .notNull()
      .references(() => districts.id),
    toBn: text("to_bn").notNull(),
    toEn: text("to_en").notNull(),
    toDistrictId: integer("to_district_id")
      .notNull()
      .references(() => districts.id),
    /** "HH:MM", 24-hour. */
    dep: text("dep").notNull(),
    arr: text("arr").notNull(),
    minutes: integer("minutes").notNull(),
    classes: json<TrainClass[]>("classes"),
    timetable: text("timetable"),
    confidence: text("confidence").notNull(),
    asOf: text("as_of").notNull(),
    sources: json<string[]>("sources").notNull(),
    returnTrain: text("return_train"),
  },
  (t) => [uniqueIndex("trains_no_uq").on(t.no)],
);

export const trainStops = sqliteTable(
  "train_stops",
  {
    trainSlug: text("train_slug")
      .notNull()
      .references(() => trains.slug, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    stationBn: text("station_bn").notNull(),
    stationEn: text("station_en").notNull(),
    districtId: integer("district_id").references(() => districts.id),
    arr: text("arr"),
    dep: text("dep"),
    /** Minutes since the train left its first station. */
    minutes: integer("minutes"),
  },
  (t) => [
    primaryKey({ columns: [t.trainSlug, t.position] }),
    index("train_stops_district_idx").on(t.districtId),
  ],
);

export const trainFares = sqliteTable(
  "train_fares",
  {
    trainSlug: text("train_slug")
      .notNull()
      .references(() => trains.slug, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** Station names in Bengali, as in `trains.json`. */
    fromStation: text("from_station").notNull(),
    toStation: text("to_station").notNull(),
    cls: text("cls").$type<TrainClass>().notNull(),
    fare: integer("fare").notNull(),
  },
  (t) => [primaryKey({ columns: [t.trainSlug, t.position] })],
);

/** Editorial lists: `popular` (24), `unseen` (127) and the `trending` snapshot. */
export const curation = sqliteTable(
  "curation",
  {
    list: text("list").$type<"popular" | "unseen" | "trending">().notNull(),
    position: integer("position").notNull(),
    placeSlug: text("place_slug")
      .notNull()
      .references(() => places.slug),
    votes: integer("votes"),
    likes: integer("likes"),
    comments: integer("comments"),
    stars: integer("stars"),
    /** Month the trending snapshot was taken in. */
    month: integer("month"),
  },
  (t) => [primaryKey({ columns: [t.list, t.position] })],
);

/** Directory snapshot: hotels, resorts, restaurants and shopping. */
export const directory = sqliteTable(
  "directory",
  {
    id: integer("id").primaryKey(),
    section: text("section").$type<"hotels" | "resorts" | "restaurants" | "shopping">().notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    categoryBn: text("category_bn"),
    areaBn: text("area_bn"),
    rating: real("rating"),
    reviews: integer("reviews"),
  },
  (t) => [uniqueIndex("directory_section_pos_uq").on(t.section, t.position)],
);

/** Static reference blocks from `reference.json` (one row per top-level key). */
export const reference = sqliteTable("reference", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
});

/* ------------------------------------------------------------------------------------------ */
/* User-generated (start empty)                                                                */
/* ------------------------------------------------------------------------------------------ */

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey(),
    email: text("email"),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    avatar: text("avatar"),
    role: text("role").$type<"user" | "admin">().notNull().default("user"),
    /** District of birth, upbringing, study, work and favourite ("My Bangladesh story"). */
    story: json<Record<string, number | null>>("story"),
    /** When each story field last changed (ms since epoch), for last-write-wins sync. */
    storyTimes: json<Record<string, number>>("story_times"),
    /** Preferred interface language (a locale) and theme (`light` | `dark` | `system`). */
    locale: text("locale"),
    theme: text("theme"),
    /** Show the visited-districts map on the public profile (`/u/:handle`). */
    publicMap: bool("public_map").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: text("updated_at"),
    deletedAt: text("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_handle_uq").on(t.handle),
    uniqueIndex("users_google_uq").on(t.googleSub),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the token itself only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfToken: text("csrf_token").notNull(),
    createdAt: createdAt(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const visited = sqliteTable(
  "visited",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.districtId] })],
);

export const wishlist = sqliteTable(
  "wishlist",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id),
    /** "want" (want to see) or "been" (been there). */
    status: text("status").$type<"want" | "been">().notNull().default("want"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.placeId] })],
);

/** "My World" marks: a country the user has been to or wants to visit. */
export const worldMarks = sqliteTable(
  "world_marks",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** ISO 3166-1 alpha-2 code, or the map's slug for shapes without one. */
    country: text("country").notNull(),
    mark: text("mark").$type<"visited" | "wish">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.country] })],
);

export const viewHistory = sqliteTable(
  "view_history",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: integer("place_id").references(() => places.id),
    districtId: integer("district_id").references(() => districts.id),
    viewedAt: text("viewed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("view_history_user_idx").on(t.userId, t.viewedAt)],
);

export const trips = sqliteTable(
  "trips",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    /** Planner inputs (start, destinations, toggles, travellers, level). */
    input: json<Record<string, unknown>>("input").notNull(),
    /** Computed plan (days, legs, costs) at save time. */
    plan: json<Record<string, unknown>>("plan"),
    totalCost: integer("total_cost"),
    isPublic: bool("is_public").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: text("updated_at"),
  },
  (t) => [index("trips_user_idx").on(t.userId)],
);

export const photos = sqliteTable(
  "photos",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    uploaderName: text("uploader_name").notNull(),
    /** Private, for moderators only. */
    uploaderEmail: text("uploader_email"),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    placeId: integer("place_id").references(() => places.id),
    caption: text("caption"),
    src: text("src").notNull(),
    /** Small copy for grids (≤ 640 px), made in the browser next to the full image. */
    thumb: text("thumb"),
    width: integer("width"),
    height: integer("height"),
    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    isPublic: bool("is_public").notNull().default(true),
    likes: integer("likes").notNull().default(0),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
    reviewedAt: text("reviewed_at"),
  },
  (t) => [
    index("photos_status_idx").on(t.status, t.createdAt),
    index("photos_district_idx").on(t.districtId),
  ],
);

export const photoComments = sqliteTable(
  "photo_comments",
  {
    id: integer("id").primaryKey(),
    photoId: integer("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    body: text("body").notNull(),
    /** New comments are `pending`; a moderator makes them `visible` (or `hidden`). */
    status: text("status").$type<"pending" | "visible" | "hidden">().notNull().default("visible"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("photo_comments_photo_idx").on(t.photoId)],
);

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    photos: json<PostPhoto[]>("photos"),
    districtId: integer("district_id").references(() => districts.id),
    placeId: integer("place_id").references(() => places.id),
    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    likes: integer("likes").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: text("updated_at"),
  },
  (t) => [
    index("posts_status_idx").on(t.status, t.createdAt),
    index("posts_user_idx").on(t.userId),
  ],
);

export const postComments = sqliteTable(
  "post_comments",
  {
    id: integer("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** New comments are `pending` until a moderator approves (`visible`) or hides them. */
    status: text("status").$type<"pending" | "visible" | "hidden">().notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId)],
);

/** Likes and ★ ratings on any target (photo, post, suggestion, listing, …). */
export const likes = sqliteTable(
  "likes",
  {
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    /** User id, or a hashed device id for logged-out likes. */
    actor: text("actor").notNull(),
    kind: text("kind").$type<"like" | "vote" | "star">().notNull().default("like"),
    value: integer("value").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.targetType, t.targetId, t.actor, t.kind] })],
);

export const reports = sqliteTable(
  "reports",
  {
    id: integer("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    reason: text("reason").notNull(),
    /** Optional free-text note from the reporter. */
    note: text("note"),
    /** Who reported: `u:<user id>` or a hashed device id. */
    reporter: text("reporter"),
    status: text("status").$type<"open" | "resolved" | "dismissed">().notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("reports_status_idx").on(t.status)],
);

/** Visitor suggestions of new places and famous foods/products. */
export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey(),
    kind: text("kind").$type<"place" | "food" | "product">().notNull(),
    name: text("name").notNull(),
    districtId: integer("district_id").references(() => districts.id),
    body: text("body"),
    submitterName: text("submitter_name"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    likes: integer("likes").notNull().default(0),
    votes: integer("votes").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("suggestions_status_idx").on(t.status, t.createdAt)],
);

/** Tips and corrections sent from place and district pages (private to admins). */
export const guideSuggestions = sqliteTable(
  "guide_suggestions",
  {
    id: integer("id").primaryKey(),
    placeId: integer("place_id").references(() => places.id),
    districtId: integer("district_id").references(() => districts.id),
    kind: text("kind").$type<"tip" | "correction" | "experience" | "warning">().notNull(),
    body: text("body").notNull(),
    name: text("name"),
    email: text("email"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").$type<"new" | "done" | "dismissed">().notNull().default("new"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("guide_suggestions_status_idx").on(t.status)],
);

export const trendVotes = sqliteTable(
  "trend_votes",
  {
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id),
    /** Season key, e.g. "2026-winter". */
    season: text("season").notNull(),
    /** User id or hashed device id. */
    voter: text("voter").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.season, t.voter] })],
);

export const trendComments = sqliteTable(
  "trend_comments",
  {
    id: integer("id").primaryKey(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    body: text("body").notNull(),
    /** Season key the comment was written in (see `src/lib/community/season.ts`). */
    season: text("season"),
    /** New comments are `pending`; a moderator makes them `visible` (or `hidden`). */
    status: text("status").$type<"pending" | "visible" | "hidden">().notNull().default("visible"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("trend_comments_place_idx").on(t.placeId)],
);

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").$type<"business" | "food" | "product">().notNull(),
    /** hotel, resort, restaurant, … */
    category: text("category"),
    sizeTier: text("size_tier").$type<"small" | "medium" | "large">().notNull(),
    name: text("name").notNull(),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    area: text("area"),
    description: text("description"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    socialUrl: text("social_url"),
    contactName: text("contact_name"),
    sponsored: bool("sponsored").notNull().default(false),
    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
    updatedAt: text("updated_at"),
  },
  (t) => [
    index("listings_status_idx").on(t.status, t.createdAt),
    index("listings_district_idx").on(t.districtId),
  ],
);

export const listingPrices = sqliteTable(
  "listing_prices",
  {
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    item: text("item").notNull(),
    amount: integer("amount").notNull(),
    unit: text("unit"),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.position] })],
);

export const listingPhotos = sqliteTable(
  "listing_photos",
  {
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    src: text("src").notNull(),
    width: integer("width"),
    height: integer("height"),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.position] })],
);

export const listingReviews = sqliteTable(
  "listing_reviews",
  {
    id: integer("id").primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    rating: integer("rating").notNull(),
    body: text("body"),
    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index("listing_reviews_listing_idx").on(t.listingId)],
);

export const leaderboardEntries = sqliteTable(
  "leaderboard_entries",
  {
    id: integer("id").primaryKey(),
    game: text("game").notNull(),
    name: text("name").notNull(),
    score: integer("score").notNull(),
    approved: bool("approved").notNull().default(false),
    /** Daily seed the round was played with. */
    seed: text("seed"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("leaderboard_game_idx").on(t.game, t.approved, t.score)],
);

/** Short share links: district ids and an optional display name, nothing else. */
export const shortLinks = sqliteTable("short_links", {
  code: text("code").primaryKey(),
  districtIds: json<number[]>("district_ids").notNull(),
  name: text("name"),
  createdAt: createdAt(),
});

/**
 * Daily quotas for open submissions (photo batches per IP, posts per user, …). `key` is a hashed
 * IP or `u:<user id>`; `day` is the date in Bangladesh time. Rows older than a week are pruned.
 */
export const quotaHits = sqliteTable(
  "quota_hits",
  {
    day: text("day").notNull(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.scope, t.key] })],
);

/** Traffic as daily aggregates only (no per-visitor rows). */
export const dailyStats = sqliteTable(
  "daily_stats",
  {
    day: text("day").notNull(),
    metric: text("metric").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.metric] })],
);

/** Content tables written by the seed, in insert order (parents first). */
export const CONTENT_TABLES = [
  "divisions",
  "districts",
  "kinds",
  "months",
  "places",
  "routes",
  "routes_from_dhaka",
  "trains",
  "train_stops",
  "train_fares",
  "curation",
  "directory",
  "reference",
] as const;
