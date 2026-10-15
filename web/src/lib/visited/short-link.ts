/**
 * Asking the server for a short link (`POST /api/share`). The server stores only the district
 * ids and the display name and answers with a 6-character code; `/s/{code}` redirects to the long
 * link.
 */
export const SHARE_ENDPOINT = "/api/share";

export type ShortLinkResult =
  { ok: true; code: string } | { ok: false; reason: "limited" | "error" };

export async function requestShortLink(
  ids: readonly number[],
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShortLinkResult> {
  try {
    const res = await fetchImpl(SHARE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, name }),
    });
    if (res.status === 429) return { ok: false, reason: "limited" };
    if (!res.ok) return { ok: false, reason: "error" };
    const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
    return typeof body?.code === "string"
      ? { ok: true, code: body.code }
      : { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}
