/**
 * Saving a planner trip to the visitor's account (`POST /api/trips`). Accounts arrive in phase 13:
 * until then the API answers 401 and the planner shows "sign in to save"; only the server side has
 * to change then.
 */
import type { Plan } from "@/lib/planner/types";

export const TRIPS_ENDPOINT = "/api/trips";

export type TripPayload = {
  title: string;
  input: Record<string, unknown>;
  plan: Record<string, unknown>;
  totalCost: number;
};

/** The body sent to `/api/trips`: the inputs, the computed plan and its total. */
export function tripPayload(plan: Plan, title: string): TripPayload {
  const { input, ...rest } = plan;
  return {
    title,
    input: { ...input },
    plan: { ...rest },
    totalCost: plan.costs.total,
  };
}

export type SaveResult = { ok: true; id: number | null } | { ok: false; reason: "auth" | "error" };

/** Posts the trip. `auth` means the visitor is not signed in. */
export async function saveTrip(
  payload: TripPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<SaveResult> {
  try {
    const res = await fetchImpl(TRIPS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (!res.ok) return { ok: false, reason: "error" };
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
    return { ok: true, id: typeof body?.id === "number" ? body.id : null };
  } catch {
    return { ok: false, reason: "error" };
  }
}
