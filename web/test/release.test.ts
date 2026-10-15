// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health, HEAD as healthHead } from "@/app/api/health/route";
import { DAILY } from "@/lib/community/rules";
import { GLOBAL_LIMIT_PER_MINUTE, middleware } from "@/middleware";
import { sessionSecret } from "@/server/auth/config";
import { readTextCapped } from "@/server/body";
import { newDeviceToken, validDeviceToken } from "@/server/community/http";
import { checkHealth } from "@/server/health";
import { formatLine, log } from "@/server/log";
import {
  contentSecurityPolicy,
  GOOGLE_IDENTITY,
  PERMISSIONS_POLICY,
  securityHeaderRules,
  securityHeaders,
} from "@/server/security-headers";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name!, values];
    }),
  );
}

describe("security headers", () => {
  it("allow only this origin, with no framing and no plugins", () => {
    const d = directives(contentSecurityPolicy());
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("frame-src")).toEqual(["'none'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("script-src")).not.toContain("'unsafe-eval'");
    // No other origin anywhere in the default policy.
    expect(contentSecurityPolicy()).not.toMatch(/https?:/);
  });

  it("add Google Identity Services only where sign-in shows it", () => {
    const d = directives(contentSecurityPolicy({ googleIdentity: true }));
    expect(d.get("script-src")).toContain(`${GOOGLE_IDENTITY}client`);
    expect(d.get("frame-src")).toEqual([GOOGLE_IDENTITY]);
    const rules = securityHeaderRules();
    expect(rules[0]!.source).toBe("/:path*");
    expect(JSON.stringify(rules[0]!.headers)).not.toContain("accounts.google.com");
    const signIn = rules.filter((r) => JSON.stringify(r.headers).includes("accounts.google.com"));
    expect(signIn.map((r) => r.source)).toEqual([
      "/login",
      "/register",
      "/:lang(en|zh|fr|de|it|ja)/login",
      "/:lang(en|zh|fr|de|it|ja)/register",
    ]);
  });

  it("allow eval and the hot-reload socket only in development", () => {
    const d = directives(contentSecurityPolicy({ dev: true }));
    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(d.get("connect-src")).toContain("ws:");
  });

  it("set HSTS, referrer, permissions (geolocation on self only) and framing headers", () => {
    const headers = Object.fromEntries(securityHeaders().map((h) => [h.key, h.value]));
    expect(headers["Strict-Transport-Security"]).toMatch(/^max-age=\d{8}; includeSubDomains$/);
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Permissions-Policy"]).toBe(PERMISSIONS_POLICY);
    expect(PERMISSIONS_POLICY).toContain("geolocation=(self)");
    expect(PERMISSIONS_POLICY).toContain("camera=()");
    expect(PERMISSIONS_POLICY).toContain("microphone=()");
  });
});

describe("health", () => {
  it("reports the version and a reachable, seeded database", async () => {
    const report = checkHealth();
    expect(report.status).toBe("ok");
    expect(report.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(report.db).toMatchObject({ ok: true, places: 257 });

    const res = await health();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(((await res.json()) as { status: string }).status).toBe("ok");
    expect((await healthHead()).status).toBe(200);
  });
});

describe("structured logs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it("writes one JSON object per line, errors with their message", () => {
    const line = formatLine(
      "error",
      "boom",
      { path: "/x", error: new Error("bad"), skip: undefined },
      new Date(0),
    );
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({
      time: "1970-01-01T00:00:00.000Z",
      level: "error",
      msg: "boom",
      path: "/x",
      error: { name: "Error", message: "bad" },
    });
    expect(entry).not.toHaveProperty("skip");
    expect(line).not.toContain("\n");
  });

  it("filters by LOG_LEVEL and sends warnings and errors to stderr", () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.env.LOG_LEVEL = "warn";
    log("info", "hidden");
    log("warn", "shown");
    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(1);
    expect(String(err.mock.calls[0]![0])).toContain('"msg":"shown"');
  });
});

describe("request bodies", () => {
  const body = (text: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/x", { method: "POST", body: text, headers });

  it("reads a body under the cap", async () => {
    expect(await readTextCapped(body("hello"), 10)).toBe("hello");
  });

  it("refuses a declared length over the cap before reading", async () => {
    expect(await readTextCapped(body("hi", { "content-length": "99999" }), 10)).toBeNull();
  });

  it("stops reading a streamed body once it passes the cap", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(4096));
      },
    });
    const req = new Request("http://localhost/x", {
      method: "POST",
      body: stream,
      // @ts-expect-error Node's fetch needs this for a streamed body.
      duplex: "half",
    });
    expect(await readTextCapped(req, 10_000)).toBeNull();
  });
});

describe("anonymous device ids", () => {
  it("are signed, so a client cannot make up new ones", () => {
    const token = newDeviceToken();
    expect(validDeviceToken(token)).toBe(true);
    const [random] = token.split(".");
    expect(validDeviceToken(`${random}.0000000000000000`)).toBe(false);
    expect(validDeviceToken("a".repeat(32))).toBe(false);
    expect(DAILY.devices).toBeGreaterThan(0);
  });
});

describe("session secret", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("falls back to the development secret only in development and tests", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(sessionSecret()).toMatch(/development/);
    vi.stubEnv("NODE_ENV", "production");
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/);
    vi.stubEnv("NODE_ENV", "staging");
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/);
  });
});

describe("global rate limit", () => {
  it("answers 429 after the per-minute limit, except for the health check", () => {
    const req = (path: string) =>
      new NextRequest(new URL(path, "http://localhost"), {
        headers: { "x-real-ip": "192.0.2.77" },
      });
    for (let i = 0; i < GLOBAL_LIMIT_PER_MINUTE; i++) {
      expect(middleware(req("/api/places")).status).not.toBe(429);
    }
    const limited = middleware(req("/api/places"));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(middleware(req("/en/explore")).status).toBe(429);
    expect(middleware(req("/api/health")).status).not.toBe(429);
    // Another client is unaffected.
    const other = new NextRequest(new URL("/api/places", "http://localhost"), {
      headers: { "x-real-ip": "192.0.2.78" },
    });
    expect(middleware(other).status).not.toBe(429);
  });
});
