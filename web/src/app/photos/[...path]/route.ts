import { readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { photosDir } from "@/server/paths";

export const dynamic = "force-dynamic";

const NAME = /^[a-z0-9][a-z0-9-]*\.webp$/;

/**
 * `GET /photos/{w640|w1200}/{slug}.webp`: a Wikimedia Commons place photo made by
 * `npm run photos` (kept in `PHOTOS_DIR`, default `web/storage/photos/`). Only those two folders
 * and plain slug file names are served. Files change only when the script is re-run, so they
 * are cached for a week and revalidated after that.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const [size, name] = path;
  const missing = () =>
    new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  if (path.length !== 2 || (size !== "w640" && size !== "w1200") || !NAME.test(name ?? "")) {
    return missing();
  }
  const root = resolve(photosDir());
  const file = resolve(join(root, size, name));
  if (!file.startsWith(root + sep)) return missing();
  try {
    if (!statSync(file).isFile()) return missing();
    const data = readFileSync(file);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return missing();
  }
}
