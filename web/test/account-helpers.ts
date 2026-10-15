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
];

let ipCounter = 0;
export function freshIp(): string {
  ipCounter += 1;
  return `198.18.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export type CallOptions = {
  json?: unknown;
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
    let body: string | undefined;
    if (options.json !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.json);
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
