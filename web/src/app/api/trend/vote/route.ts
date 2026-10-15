import { seasonOf } from "@/lib/community/season";
import { fail, ok, readJson } from "@/server/auth/http";
import { DAILY } from "@/lib/community/rules";
import {
  community,
  deviceActor,
  invalid,
  quotaExceeded,
  rememberDevice,
} from "@/server/community/http";
import { placeOf } from "@/server/community/submissions";
import { hasVoted, setVote } from "@/server/community/trend";
import { getTrendVotes } from "@/server/data/catalog";

/** `GET /api/trend/vote?place=slug` → `{votes, voted, season}` for this season. */
export const GET = community(async (visitor, request) => {
  const slug = request.nextUrl.searchParams.get("place") ?? "";
  const place = placeOf(slug);
  if (!place) return fail(404, "not_found");
  const season = seasonOf();
  return ok({
    votes: await getTrendVotes(slug),
    voted: hasVoted(place.id, season.key, visitor.actor),
    season: season.key,
  });
});

/**
 * `POST /api/trend/vote {place, on}` → `{votes, voted, season}`. One vote per visitor (account,
 * or device when logged out) per place per season; `on: false` takes it back.
 */
export const POST = community(async (visitor, request) => {
  const read = await readJson(request, 1024);
  if (!read.ok) return read.response;
  const slug = typeof read.body.place === "string" ? read.body.place : "";
  const place = placeOf(slug);
  if (!place) return invalid("place");
  const on = read.body.on === undefined ? true : read.body.on === true;
  const device = deviceActor(visitor);
  if (!device) return quotaExceeded(DAILY.devices);
  const { actor, newDevice } = device;
  const season = seasonOf();
  setVote(place.id, actor, on, season);
  return rememberDevice(
    ok({ votes: await getTrendVotes(slug), voted: on, season: season.key }),
    newDevice,
  );
});
