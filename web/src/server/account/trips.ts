/**
 * Saved trips: a planner plan (its inputs, the computed plan and its total) kept in the user's
 * account. Trips are private until their owner makes them shareable; then `/trip/:id` shows them
 * read-only to anyone with the link.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { isBudgetLevel } from "@/lib/planner/constants";
import { MAX_DESTINATIONS, MAX_PEOPLE, MIN_PEOPLE } from "@/lib/planner/constants";
import type { PlanInput } from "@/lib/planner/types";
import { isDistrictId } from "@/lib/visited/districts";
import { getDb } from "../db/client";
import { trips } from "../db/schema";

export const MAX_TRIPS = 100;
export const TITLE_MAX = 120;
/** The stored plan snapshot (days, legs, costs) may be at most this many bytes of JSON. */
export const PLAN_MAX_BYTES = 64 * 1024;

export type TripRow = typeof trips.$inferSelect;

export type TripSummary = {
  id: number;
  title: string;
  totalCost: number | null;
  days: number | null;
  destinations: number[];
  start: number | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string | null;
};

function cleanTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim();
  return [...cleaned].slice(0, TITLE_MAX).join("").trim();
}

/** The planner inputs from a request, or null when they are not a plan. */
export function parsePlanInput(value: unknown): PlanInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isDistrictId(v.start)) return null;
  if (!Array.isArray(v.destinations) || v.destinations.length > MAX_DESTINATIONS) return null;
  if (!v.destinations.every(isDistrictId)) return null;
  const placesRaw = v.places ?? [];
  if (!Array.isArray(placesRaw) || placesRaw.length > 500) return null;
  if (!placesRaw.every((p) => Number.isInteger(p) && (p as number) > 0)) return null;
  const people = Number(v.people);
  if (!Number.isInteger(people) || people < MIN_PEOPLE || people > MAX_PEOPLE) return null;
  if (!isBudgetLevel(v.level)) return null;
  return {
    start: v.start,
    destinations: [...new Set(v.destinations as number[])],
    places: [...new Set(placesRaw as number[])],
    optimize: v.optimize === true,
    returnToStart: v.returnToStart === true,
    people,
    level: v.level,
  };
}

export type CreateTripResult =
  { ok: true; trip: TripRow } | { ok: false; error: "invalid_input" | "too_large" | "too_many" };

export function createTrip(userId: number, body: Record<string, unknown>): CreateTripResult {
  const input = parsePlanInput(body.input);
  if (!input || !input.destinations.length) return { ok: false, error: "invalid_input" };
  const plan =
    body.plan && typeof body.plan === "object" && !Array.isArray(body.plan)
      ? (body.plan as Record<string, unknown>)
      : null;
  if (plan && JSON.stringify(plan).length > PLAN_MAX_BYTES)
    return { ok: false, error: "too_large" };
  const totalCost =
    Number.isInteger(body.totalCost) && (body.totalCost as number) >= 0
      ? Math.min(body.totalCost as number, 1_000_000_000)
      : null;
  const db = getDb();
  const owned =
    db
      .select({ n: sql<number>`count(*)` })
      .from(trips)
      .where(eq(trips.userId, userId))
      .get()?.n ?? 0;
  if (owned >= MAX_TRIPS) return { ok: false, error: "too_many" };
  const trip = db
    .insert(trips)
    .values({
      userId,
      title: cleanTitle(body.title) || null,
      input: input as unknown as Record<string, unknown>,
      plan,
      totalCost,
      isPublic: body.isPublic === true,
    })
    .returning()
    .get();
  return { ok: true, trip };
}

export function summarize(row: TripRow): TripSummary {
  const input = parsePlanInput(row.input);
  const days = Array.isArray((row.plan as { days?: unknown } | null)?.days)
    ? ((row.plan as { days: unknown[] }).days.length ?? null)
    : null;
  return {
    id: row.id,
    title: row.title ?? "",
    totalCost: row.totalCost,
    days,
    destinations: input?.destinations ?? [],
    start: input?.start ?? null,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listTrips(userId: number, { publicOnly = false } = {}): TripSummary[] {
  const where = publicOnly
    ? and(eq(trips.userId, userId), eq(trips.isPublic, true))
    : eq(trips.userId, userId);
  return getDb()
    .select()
    .from(trips)
    .where(where)
    .orderBy(desc(trips.createdAt), desc(trips.id))
    .all()
    .map(summarize);
}

export function getTrip(id: number): TripRow | null {
  return getDb().select().from(trips).where(eq(trips.id, id)).get() ?? null;
}

/** The trip if `viewerId` may see it: its owner always, anyone once it is shareable. */
export function visibleTrip(id: number, viewerId: number | null): TripRow | null {
  const trip = getTrip(id);
  if (!trip) return null;
  return trip.isPublic || trip.userId === viewerId ? trip : null;
}

export type UpdateTripResult = { ok: true; trip: TripRow } | { ok: false; error: "not_found" };

/** Renames a trip or switches its share link on/off (owner only). */
export function updateTrip(
  userId: number,
  id: number,
  patch: { title?: unknown; isPublic?: unknown },
): UpdateTripResult {
  const set: Partial<typeof trips.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.title !== undefined) set.title = cleanTitle(patch.title) || null;
  if (patch.isPublic !== undefined) set.isPublic = patch.isPublic === true;
  const trip = getDb()
    .update(trips)
    .set(set)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning()
    .get();
  return trip ? { ok: true, trip } : { ok: false, error: "not_found" };
}

export function deleteTrip(userId: number, id: number): boolean {
  return (
    getDb()
      .delete(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .run().changes > 0
  );
}

/** Number of trips and the sum of their totals (৳). */
export function tripTotals(userId: number): { count: number; spend: number } {
  const row = getDb()
    .select({
      n: sql<number>`count(*)`,
      spend: sql<number>`coalesce(sum(${trips.totalCost}), 0)`,
    })
    .from(trips)
    .where(eq(trips.userId, userId))
    .get();
  return { count: row?.n ?? 0, spend: row?.spend ?? 0 };
}
