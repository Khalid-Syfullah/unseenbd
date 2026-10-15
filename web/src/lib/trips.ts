/**
 * Saving a planner trip to the visitor's account (`POST /api/trips`). Logged out, nothing is
 * sent and the planner asks the visitor to sign in.
 */
import { apiFetch, whenAccountReady } from "@/lib/account/client";
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

/** Saves the trip. `auth` means the visitor is not signed in. */
export async function saveTrip(payload: TripPayload): Promise<SaveResult> {
  const account = await whenAccountReady();
  if (account.status !== "user") return { ok: false, reason: "auth" };
  try {
    const res = await apiFetch(TRIPS_ENDPOINT, { method: "POST", json: payload });
    if (res.status === 401) return { ok: false, reason: "auth" };
    if (!res.ok) return { ok: false, reason: "error" };
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
    return { ok: true, id: typeof body?.id === "number" ? body.id : null };
  } catch {
    return { ok: false, reason: "error" };
  }
}
