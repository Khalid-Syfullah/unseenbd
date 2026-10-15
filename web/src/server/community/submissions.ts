/**
 * The smaller visitor submissions: place / food / product suggestions, tips and corrections
 * (private to moderators), trending comments and reports. All start `pending` / `new` / `open`.
 */
import { and, eq } from "drizzle-orm";
import type { ReportReason, SuggestionKind, TipKind } from "@/lib/community/rules";
import { seasonOf } from "@/lib/community/season";
import { getDb } from "../db/client";
import {
  districts,
  guideSuggestions,
  photoComments,
  photos,
  places,
  postComments,
  posts,
  reports,
  suggestions,
  trendComments,
} from "../db/schema";

export function districtIdOf(slug: string): number | null {
  return (
    getDb().select({ id: districts.id }).from(districts).where(eq(districts.slug, slug)).get()
      ?.id ?? null
  );
}

export function placeOf(slug: string): { id: number; districtId: number } | null {
  return (
    getDb()
      .select({ id: places.id, districtId: places.districtId })
      .from(places)
      .where(eq(places.slug, slug))
      .get() ?? null
  );
}

export function createSuggestion(input: {
  kind: SuggestionKind;
  name: string;
  districtId: number;
  body: string | null;
  submitterName: string | null;
  userId: number | null;
  ipHash: string;
}): number {
  return getDb()
    .insert(suggestions)
    .values({ ...input, status: "pending" })
    .returning({ id: suggestions.id })
    .get().id;
}

export function createGuideSuggestion(input: {
  kind: TipKind;
  placeId: number | null;
  districtId: number | null;
  body: string;
  name: string | null;
  email: string | null;
  userId: number | null;
  ipHash: string;
}): number {
  return getDb()
    .insert(guideSuggestions)
    .values({ ...input, status: "new" })
    .returning({ id: guideSuggestions.id })
    .get().id;
}

export function addTrendComment(input: {
  placeId: number;
  name: string;
  body: string;
  userId: number | null;
  ipHash: string;
}): number {
  return getDb()
    .insert(trendComments)
    .values({ ...input, season: seasonOf().key, status: "pending" })
    .returning({ id: trendComments.id })
    .get().id;
}

export const REPORT_TARGETS = ["photo", "post", "photo_comment", "post_comment"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/** True when the reported thing exists and is public (only public things can be reported). */
export function reportable(type: ReportTarget, id: number): boolean {
  const db = getDb();
  switch (type) {
    case "photo":
      return Boolean(
        db
          .select({ id: photos.id })
          .from(photos)
          .where(and(eq(photos.id, id), eq(photos.status, "approved")))
          .get(),
      );
    case "post":
      return Boolean(
        db
          .select({ id: posts.id })
          .from(posts)
          .where(and(eq(posts.id, id), eq(posts.status, "approved")))
          .get(),
      );
    case "photo_comment":
      return Boolean(
        db
          .select({ id: photoComments.id })
          .from(photoComments)
          .where(and(eq(photoComments.id, id), eq(photoComments.status, "visible")))
          .get(),
      );
    case "post_comment":
      return Boolean(
        db
          .select({ id: postComments.id })
          .from(postComments)
          .where(and(eq(postComments.id, id), eq(postComments.status, "visible")))
          .get(),
      );
  }
}

/**
 * Files a report. A visitor reporting the same thing twice updates their open report instead of
 * adding another.
 */
export function createReport(input: {
  targetType: ReportTarget;
  targetId: number;
  reason: ReportReason;
  note: string | null;
  reporter: string;
}): number {
  const db = getDb();
  const existing = db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.targetType, input.targetType),
        eq(reports.targetId, input.targetId),
        eq(reports.reporter, input.reporter),
        eq(reports.status, "open"),
      ),
    )
    .get();
  if (existing) {
    db.update(reports)
      .set({ reason: input.reason, note: input.note })
      .where(eq(reports.id, existing.id))
      .run();
    return existing.id;
  }
  return db
    .insert(reports)
    .values({ ...input, status: "open" })
    .returning({ id: reports.id })
    .get().id;
}
