import type { NextRequest, NextResponse } from "next/server";
import { fail, ok, readJson } from "../auth/http";
import { DAILY } from "@/lib/community/rules";
import { deviceActor, quotaExceeded, rememberDevice, type Visitor } from "./http";
import { react, type ReactionKind, type TargetType } from "./reactions";

const KINDS = new Set<ReactionKind>(["like", "vote", "star"]);

/**
 * The shared body of the `/react` endpoints: `{kind: "like" | "vote", on: boolean}` or
 * `{kind: "star", value: 1–10 | null}` → `{totals, mine}`. Logged-out visitors get a device id
 * cookie the first time.
 */
export async function handleReact(
  type: TargetType,
  id: number | null,
  visitor: Visitor,
  request: NextRequest,
): Promise<NextResponse> {
  if (!id) return fail(404, "not_found");
  const read = await readJson(request, 1024);
  if (!read.ok) return read.response;
  const kind = read.body.kind as ReactionKind;
  if (!KINDS.has(kind)) return fail(400, "invalid", "kind");
  const on = read.body.on === undefined ? true : read.body.on === true;
  const value = read.body.value === null ? null : Number(read.body.value);
  const device = deviceActor(visitor);
  if (!device) return quotaExceeded(DAILY.devices);
  const { actor, newDevice } = device;
  const result = react(type, id, actor, kind, { on, value: kind === "star" ? value : null });
  if (!result.ok) {
    return result.reason === "not_found"
      ? fail(404, "not_found")
      : fail(400, "invalid", result.reason);
  }
  return rememberDevice(ok({ totals: result.totals, mine: result.mine }), newDevice);
}
