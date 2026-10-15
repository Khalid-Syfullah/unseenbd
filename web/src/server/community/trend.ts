/**
 * Trending votes: one vote per visitor (account, or device when logged out) per place per
 * season. The ranking for a season is the live votes plus, during the season it was taken in,
 * the seeded snapshot from `data/curation.json` (so the list is not empty on day one).
 */
import { and, count, eq } from "drizzle-orm";
import { seasonOf, type SeasonInfo } from "@/lib/community/season";
import { getDb } from "../db/client";
import { trendComments, trendVotes } from "../db/schema";

/**
 * The seeded trending snapshot was taken in October 2026 (FEATURES.md); its numbers count
 * towards that season only.
 */
export const SNAPSHOT_YEAR = 2026;

export function snapshotSeason(month: number | null): string | null {
  if (!month) return null;
  return seasonOf(new Date(Date.UTC(SNAPSHOT_YEAR, month - 1, 15))).key;
}

/** Live votes per place id in a season. */
export function liveVotes(season: string): Map<number, number> {
  return new Map(
    getDb()
      .select({ placeId: trendVotes.placeId, n: count() })
      .from(trendVotes)
      .where(eq(trendVotes.season, season))
      .groupBy(trendVotes.placeId)
      .all()
      .map((r) => [r.placeId, r.n]),
  );
}

/** Approved trending comments per place id written in a season. */
export function liveComments(season: string): Map<number, number> {
  return new Map(
    getDb()
      .select({ placeId: trendComments.placeId, n: count() })
      .from(trendComments)
      .where(and(eq(trendComments.season, season), eq(trendComments.status, "visible")))
      .groupBy(trendComments.placeId)
      .all()
      .map((r) => [r.placeId, r.n]),
  );
}

export function placeVotes(placeId: number, season: string): number {
  return (
    getDb()
      .select({ n: count() })
      .from(trendVotes)
      .where(and(eq(trendVotes.placeId, placeId), eq(trendVotes.season, season)))
      .get()?.n ?? 0
  );
}

export function hasVoted(placeId: number, season: string, voter: string | null): boolean {
  if (!voter) return false;
  return Boolean(
    getDb()
      .select({ v: trendVotes.voter })
      .from(trendVotes)
      .where(
        and(
          eq(trendVotes.placeId, placeId),
          eq(trendVotes.season, season),
          eq(trendVotes.voter, voter),
        ),
      )
      .get(),
  );
}

/**
 * Adds (or, with `on: false`, takes back) the visitor's vote for this season. Voting twice
 * changes nothing: the primary key (place, season, voter) allows one row.
 */
export function setVote(
  placeId: number,
  voter: string,
  on: boolean,
  season: SeasonInfo = seasonOf(),
): void {
  const db = getDb();
  if (on) {
    db.insert(trendVotes)
      .values({ placeId, season: season.key, voter })
      .onConflictDoNothing()
      .run();
  } else {
    db.delete(trendVotes)
      .where(
        and(
          eq(trendVotes.placeId, placeId),
          eq(trendVotes.season, season.key),
          eq(trendVotes.voter, voter),
        ),
      )
      .run();
  }
}
