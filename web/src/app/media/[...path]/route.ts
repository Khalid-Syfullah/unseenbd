import { NextResponse, type NextRequest } from "next/server";
import { readMedia } from "@/server/community/media";

export const dynamic = "force-dynamic";

/**
 * `GET /media/{yyyy}/{mm}/{file}`: an uploaded photo or thumbnail from `MEDIA_DIR`. Names are
 * random and never reused, so browsers and proxies may keep them for a year.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const file = readMedia(path);
  if (!file) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}
