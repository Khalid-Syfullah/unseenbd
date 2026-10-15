/**
 * A pretend browser for account tests: it keeps cookies like a real one and calls the route
 * handlers directly (no server), so tests can sign in, send CSRF tokens and run two "devices"
 * against the same account.
 */
import { NextRequest, type NextResponse } from "next/server";
import * as authCsrf from "@/app/api/auth/csrf/route";
import * as authGoogle from "@/app/api/auth/google/route";
import * as authLogin from "@/app/api/auth/login/route";
import * as authLogout from "@/app/api/auth/logout/route";
import * as authRegister from "@/app/api/auth/register/route";
import * as me from "@/app/api/me/route";
import * as meHistory from "@/app/api/me/history/route";
import * as mePhotos from "@/app/api/me/photos/route";
import * as meStory from "@/app/api/me/story/route";
import * as meSummary from "@/app/api/me/summary/route";
import * as meSync from "@/app/api/me/sync/route";
import * as meVisited from "@/app/api/me/visited/route";
import * as meWishlist from "@/app/api/me/wishlist/route";
import * as meWorld from "@/app/api/me/world/route";
import * as postsMine from "@/app/api/posts/mine/route";
import * as trips from "@/app/api/trips/route";
import * as tripById from "@/app/api/trips/[id]/route";
import * as users from "@/app/api/users/[handle]/route";
import * as communityApproved from "@/app/api/community/approved/route";
import * as communityQuota from "@/app/api/community/quota/route";
import * as guideSuggestions from "@/app/api/guide-suggestions/route";
import * as guideQuota from "@/app/api/guide-suggestions/quota/route";
import * as photosRoute from "@/app/api/photos/route";
import * as photoById from "@/app/api/photos/[id]/route";
import * as photoComments from "@/app/api/photos/[id]/comments/route";
import * as photoReact from "@/app/api/photos/[id]/react/route";
import * as photosQuota from "@/app/api/photos/quota/route";
import * as postsRoute from "@/app/api/posts/route";
import * as postById from "@/app/api/posts/[id]/route";
import * as postComments from "@/app/api/posts/[id]/comments/route";
import * as postReact from "@/app/api/posts/[id]/react/route";
import * as reactions from "@/app/api/reactions/route";
import * as reportsRoute from "@/app/api/reports/route";
import * as suggestionsRoute from "@/app/api/suggestions/route";
import * as suggestionReact from "@/app/api/suggestions/[id]/react/route";
import * as trendComments from "@/app/api/trend/comments/route";
import * as trendVote from "@/app/api/trend/vote/route";

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse> | NextResponse;
type Module = Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", unknown>>;

const ROUTES: [RegExp, Module, string[]][] = [
  [/^\/api\/auth\/csrf$/, authCsrf, []],
  [/^\/api\/auth\/login$/, authLogin, []],
  [/^\/api\/auth\/register$/, authRegister, []],
  [/^\/api\/auth\/logout$/, authLogout, []],
  [/^\/api\/auth\/google$/, authGoogle, []],
  [/^\/api\/me$/, me, []],
  [/^\/api\/me\/history$/, meHistory, []],
  [/^\/api\/me\/photos$/, mePhotos, []],
  [/^\/api\/me\/story$/, meStory, []],
  [/^\/api\/me\/summary$/, meSummary, []],
  [/^\/api\/me\/sync$/, meSync, []],
  [/^\/api\/me\/visited$/, meVisited, []],
  [/^\/api\/me\/wishlist$/, meWishlist, []],
  [/^\/api\/me\/world$/, meWorld, []],
  [/^\/api\/posts\/mine$/, postsMine, []],
  [/^\/api\/trips$/, trips, []],
  [/^\/api\/trips\/([^/]+)$/, tripById, ["id"]],
  [/^\/api\/users\/([^/]+)$/, users, ["handle"]],
  [/^\/api\/community\/approved$/, communityApproved, []],
  [/^\/api\/community\/quota$/, communityQuota, []],
  [/^\/api\/guide-suggestions$/, guideSuggestions, []],
  [/^\/api\/guide-suggestions\/quota$/, guideQuota, []],
  [/^\/api\/photos$/, photosRoute, []],
  [/^\/api\/photos\/quota$/, photosQuota, []],
  [/^\/api\/photos\/([^/]+)$/, photoById, ["id"]],
  [/^\/api\/photos\/([^/]+)\/comments$/, photoComments, ["id"]],
  [/^\/api\/photos\/([^/]+)\/react$/, photoReact, ["id"]],
  [/^\/api\/posts$/, postsRoute, []],
  [/^\/api\/posts\/([^/]+)$/, postById, ["id"]],
  [/^\/api\/posts\/([^/]+)\/comments$/, postComments, ["id"]],
  [/^\/api\/posts\/([^/]+)\/react$/, postReact, ["id"]],
  [/^\/api\/reactions$/, reactions, []],
  [/^\/api\/reports$/, reportsRoute, []],
  [/^\/api\/suggestions$/, suggestionsRoute, []],
  [/^\/api\/suggestions\/([^/]+)\/react$/, suggestionReact, ["id"]],
  [/^\/api\/trend\/comments$/, trendComments, []],
  [/^\/api\/trend\/vote$/, trendVote, []],
];

/**
 * Encodes a FormData by hand (any FormData/Blob implementation, jsdom's included), the way a
 * browser sends it.
 */
export async function encodeMultipart(
  form: FormData,
): Promise<{ body: Uint8Array; contentType: string }> {
  const boundary = `----ubdtest${Math.random().toString(16).slice(2)}`;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") {
      parts.push(
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n`),
        enc.encode(value),
        enc.encode("\r\n"),
      );
    } else {
      const blob = value as Blob & { name?: string };
      parts.push(
        enc.encode(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${blob.name ?? "blob"}"\r\n` +
            `Content-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`,
        ),
        new Uint8Array(await blob.arrayBuffer()),
        enc.encode("\r\n"),
      );
    }
  }
  parts.push(enc.encode(`--${boundary}--\r\n`));
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    body.set(p, at);
    at += p.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

let ipCounter = 0;
export function freshIp(): string {
  ipCounter += 1;
  return `198.18.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export type CallOptions = {
  json?: unknown;
  /** A multipart body (uploads). */
  form?: FormData;
  /** Send this CSRF token (`false`: none; default: the one this browser holds). */
  csrf?: string | false;
  headers?: Record<string, string>;
};

export class TestBrowser {
  cookies = new Map<string, string>();
  /** The CSRF token from the last sign-in or `/api/auth/csrf`. */
  csrf: string | null = null;

  constructor(public ip: string = freshIp()) {}

  cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private absorb(res: Response) {
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(/;\s*/);
      const eq = pair!.indexOf("=");
      const name = pair!.slice(0, eq);
      const value = decodeURIComponent(pair!.slice(eq + 1));
      const expired = attrs.some(
        (a) =>
          /^max-age=0$/i.test(a) ||
          (/^expires=/i.test(a) && new Date(a.slice(8)).getTime() <= Date.now()),
      );
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  /** Calls the route handler for `method path` like a fetch from this browser would. */
  async call(method: string, path: string, options: CallOptions = {}): Promise<Response> {
    const url = new URL(path, "http://localhost");
    const route = ROUTES.find(([re]) => re.test(url.pathname));
    if (!route) throw new Error(`no route for ${path}`);
    const [re, mod, names] = route;
    const handler = (mod as Record<string, Handler | undefined>)[method];
    if (!handler) return new Response(null, { status: 405 });
    const match = re.exec(url.pathname)!;
    const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(match[i + 1]!)]));

    const headers = new Headers(options.headers);
    headers.set("x-forwarded-for", this.ip);
    headers.set("host", "localhost");
    if (this.cookies.size) headers.set("cookie", this.cookieHeader());
    const token = options.csrf === undefined ? this.csrf : options.csrf;
    if (token) headers.set("x-csrf-token", token);
    let body: BodyInit | undefined;
    if (options.json !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.json);
    } else if (options.form) {
      const encoded = await encodeMultipart(options.form);
      headers.set("content-type", encoded.contentType);
      headers.set("content-length", String(encoded.body.length));
      body = encoded.body as BodyInit;
    }
    const req = new NextRequest(url, { method, headers, body });
    const res = await handler(req, { params: Promise.resolve(params) });
    this.absorb(res);
    return res;
  }

  /** `fetch` for client code (adapters, sign-in helpers): same cookies, real handlers. */
  fetch: typeof fetch = async (input, init = {}) => {
    const path =
      typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const headers = new Headers(init.headers);
    const json = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const extra: Record<string, string> = {};
    headers.forEach((v, k) => {
      if (k !== "x-csrf-token" && k !== "content-type") extra[k] = v;
    });
    return this.call((init.method ?? "GET").toUpperCase(), path, {
      json,
      form:
        init.body && typeof init.body === "object" && "entries" in init.body
          ? (init.body as FormData)
          : undefined,
      csrf: headers.get("x-csrf-token") ?? false,
      headers: extra,
    });
  };

  async getCsrf(): Promise<string> {
    const res = await this.call("GET", "/api/auth/csrf");
    const body = (await res.json()) as { csrfToken: string };
    this.csrf = body.csrfToken;
    return body.csrfToken;
  }

  async register(email: string, password = "correct horse battery", name = "Test Traveller") {
    await this.getCsrf();
    const res = await this.call("POST", "/api/auth/register", { json: { email, password, name } });
    if (res.ok) this.csrf = ((await res.clone().json()) as { csrfToken: string }).csrfToken;
    return res;
  }

  async login(email: string, password = "correct horse battery") {
    await this.getCsrf();
    const res = await this.call("POST", "/api/auth/login", { json: { email, password } });
    if (res.ok) this.csrf = ((await res.clone().json()) as { csrfToken: string }).csrfToken;
    return res;
  }
}

let emailCounter = 0;
export function freshEmail(): string {
  emailCounter += 1;
  return `traveller${emailCounter}.${Date.now()}@example.com`;
}
