/**
 * Browser helpers for the community API: sending JSON or multipart bodies with the CSRF token,
 * turning error responses into one message, and reading the visitor's own reactions.
 */
import { apiFetch } from "@/lib/account/client";
import type { MessageKey, Translator } from "@/i18n/translate";

export type ApiFailure = {
  status: number;
  error?: string;
  field?: string;
  reason?: string;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

async function result<T>(res: Response): Promise<ApiResult<T>> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (res.ok) return { ok: true, data: body as T };
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    ok: false,
    failure: {
      status: res.status,
      error: typeof b.error === "string" ? b.error : undefined,
      field: typeof b.field === "string" ? b.field : undefined,
      reason: typeof b.reason === "string" ? b.reason : undefined,
    },
  };
}

const NETWORK: ApiResult<never> = { ok: false, failure: { status: 0, error: "network" } };

export async function sendJson<T>(
  url: string,
  json: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<ApiResult<T>> {
  try {
    return await result<T>(await apiFetch(url, { method, json }));
  } catch {
    return NETWORK;
  }
}

export async function sendForm<T>(
  url: string,
  form: FormData,
  method: "POST" | "PATCH" = "POST",
): Promise<ApiResult<T>> {
  try {
    return await result<T>(await apiFetch(url, { method, form }));
  } catch {
    return NETWORK;
  }
}

export async function getJson<T>(url: string): Promise<ApiResult<T>> {
  try {
    return await result<T>(await apiFetch(url));
  } catch {
    return NETWORK;
  }
}

/** One sentence for a failed request (the form shows field errors itself). */
export function failureMessage(t: Translator, failure: ApiFailure): string {
  const key: MessageKey =
    failure.status === 401
      ? "community.errorSignIn"
      : failure.status === 403
        ? "community.errorCsrf"
        : failure.status === 429
          ? failure.error === "quota"
            ? "community.errorQuota"
            : "community.errorRate"
          : failure.status === 413 || failure.status === 415 || failure.error === "image"
            ? "community.errorImage"
            : failure.status === 400
              ? "community.errorField"
              : failure.status === 0
                ? "community.errorNetwork"
                : "community.errorGeneric";
  return t(key);
}

export type Totals = { likes: number; votes: number; stars: number | null; ratings: number };
export type Mine = { like: boolean; vote: boolean; star: number | null };

/** `POST /api/{type}s/:id/react`. */
export function react(
  type: "photo" | "post" | "suggestion",
  id: number,
  body: { kind: "like" | "vote"; on: boolean } | { kind: "star"; value: number | null },
) {
  return sendJson<{ totals: Totals; mine: Mine }>(`/api/${type}s/${id}/react`, body);
}

/** The visitor's own reactions to items on a cached page. */
export async function loadMine(
  type: "photo" | "post" | "suggestion",
  ids: number[],
): Promise<Record<number, Mine>> {
  if (!ids.length) return {};
  const res = await getJson<{ mine: Record<number, Mine> }>(
    `/api/reactions?type=${type}&ids=${ids.join(",")}`,
  );
  return res.ok ? res.data.mine : {};
}
