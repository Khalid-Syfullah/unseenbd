import type { NextRequest } from "next/server";
import { getPublicProfile } from "@/server/account/profile";
import { toLang } from "@/server/data/lang";
import { fail, ok } from "@/server/auth/http";

type Ctx = { params: Promise<{ handle: string }> };

/**
 * `GET /api/users/:handle?lang=` → the public profile: name, handle, join date, shareable trips,
 * approved public photos, approved posts and (only if the user allows it) visited districts.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle, toLang(request.nextUrl.searchParams.get("lang")));
  if (!profile) return fail(404, "not_found");
  return ok(profile);
}
