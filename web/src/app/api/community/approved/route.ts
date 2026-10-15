import { NextResponse } from "next/server";
import { idParam } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { countApprovedSuggestions, listApprovedSuggestions } from "@/server/data/community";
import { toLang } from "@/server/data/lang";

const PAGE_SIZE = 10;

/** `GET /api/community/approved?page=&lang=` → approved visitor suggestions, newest first. */
export const GET = community(async (_visitor, request) => {
  const params = request.nextUrl.searchParams;
  const total = await countApprovedSuggestions();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(idParam(params.get("page")) ?? 1, pageCount);
  const items = await listApprovedSuggestions(
    toLang(params.get("lang")),
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE,
  );
  return NextResponse.json(
    { items, total, page, pageCount },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
});
