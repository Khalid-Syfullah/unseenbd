/**
 * A fixed-window rate limiter kept in memory, keyed by client IP. Enough for one server process
 * (the app runs as one Node process behind nginx); a shared store can replace it later without
 * changing callers.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export type RateLimiter = {
  /** Counts one hit for `key`; `ok: false` once `limit` hits fall inside the window. */
  hit(key: string, now?: number): RateLimitResult;
  reset(): void;
};

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /** Stale windows are pruned once this many keys are tracked. */
  maxKeys?: number;
}): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();

  function prune(now: number) {
    for (const [key, w] of windows) if (now - w.start >= windowMs) windows.delete(key);
  }

  return {
    hit(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        if (!w && windows.size >= maxKeys) prune(now);
        w = { start: now, count: 0 };
        windows.set(key, w);
      }
      if (w.count >= limit) {
        return { ok: false, retryAfter: Math.max(1, Math.ceil((w.start + windowMs - now) / 1000)) };
      }
      w.count += 1;
      return { ok: true };
    },
    reset() {
      windows.clear();
    },
  };
}

/**
 * The client's IP: the first `X-Forwarded-For` hop (set by the reverse proxy), then `X-Real-IP`,
 * else "unknown" (all such clients share one bucket).
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : "unknown";
}
