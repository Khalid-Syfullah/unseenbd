/**
 * A signed-in visitor's view history: place and district pages they open are recorded in their
 * account (`POST /api/me/history`). Logged-out visitors are not tracked at all.
 */
import { apiFetch, whenAccountReady } from "@/lib/account/client";

export type ViewTarget = { placeId?: number; districtId?: number };

export function recordView(target: ViewTarget): void {
  if (typeof window === "undefined") return;
  const json = target.placeId ? { placeId: target.placeId } : { districtId: target.districtId };
  if (!json.placeId && !json.districtId) return;
  void whenAccountReady().then((state) => {
    if (state.status !== "user") return;
    apiFetch("/api/me/history", { method: "POST", json, keepalive: true }).catch(() => undefined);
  });
}
