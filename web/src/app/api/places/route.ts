import type { NextRequest } from "next/server";
import { parseMonth } from "@/lib/months";
import { badRequest, flag, langOf, positiveInt, staticJson } from "@/server/api";
import { listPlaces, MAX_PAGE_SIZE } from "@/server/data";

/** GET /api/places?district=&kind=&month=&unseen=&q=&page=&pageSize=&lang= */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const page = positiveInt(params.get("page"));
  if (page === null) return badRequest("page must be a positive integer");
  const pageSize = positiveInt(params.get("pageSize"));
  if (pageSize === null || (pageSize !== undefined && pageSize > MAX_PAGE_SIZE)) {
    return badRequest(`pageSize must be 1–${MAX_PAGE_SIZE}`);
  }
  const monthParam = params.get("month");
  const month = monthParam ? parseMonth(monthParam) : null;
  if (monthParam && month === null) return badRequest("month must be 1–12 or a month name");

  const result = await listPlaces({
    district: params.get("district"),
    division: params.get("division"),
    kind: params.get("kind"),
    month,
    unseen: flag(params.get("unseen")),
    q: params.get("q")?.slice(0, 100),
    page,
    pageSize,
    lang: langOf(request),
  });
  return staticJson(result);
}
