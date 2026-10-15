/**
 * The account sync adapter (MASTER_PROMPT §5.7): installed into a browser store once the visitor
 * signs in.
 *
 * - Changes are queued and folded together (`combine`), then posted after a ~400 ms pause.
 * - The server answers with its whole value, which becomes the local value (with any changes
 *   queued meanwhile laid on top), so every device converges on the account.
 * - Failures (offline, 5xx, 429) keep the changes queued and retry with exponential backoff
 *   (0.5 s, 1 s, 2 s, … up to 30 s).
 * - The queue is flushed with a keepalive request on `pagehide` and when the tab is hidden.
 * - The account is read again when the tab becomes visible or gets focus, and every 30 s while
 *   it is visible, so a change made on another device shows up.
 * - 401 means the session has ended: the adapter stops and calls `onUnauthorized`.
 */
import type { SyncAdapter, SyncTarget } from "@/lib/visited/sync";

export type AccountAdapterOptions<TDelta, TValue> = {
  endpoint: string;
  empty(): TDelta;
  isEmpty(delta: TDelta): boolean;
  /** `a` then `b`, as one change. */
  combine(a: TDelta, b: TDelta): TDelta;
  /** The request body for a change. */
  body(delta: TDelta): unknown;
  /** The account's value from a GET or POST response, or null when it is malformed. */
  parse(json: unknown): TValue | null;
  /** The account's value with queued, unsent changes laid on top. */
  apply(value: TValue, pending: TDelta): TValue;
  /** The CSRF token to send. */
  csrf(): string | null | Promise<string | null>;
  onUnauthorized?(): void;
  /** 403: the CSRF token may be stale; a chance to fetch a new one before the retry. */
  onForbidden?(): void | Promise<void>;
  fetch?: typeof fetch;
  debounceMs?: number;
  pollMs?: number;
  /** Set false in tests to skip window listeners and timers that are not part of the queue. */
  listen?: boolean;
};

export type AccountAdapter<TDelta, TValue> = SyncAdapter<TDelta, TValue> & {
  /** Sends queued changes now. `keepalive` lets the request outlive the page. */
  flush(options?: { keepalive?: boolean }): Promise<void>;
  /** Reads the account's value and adopts it (skipped while changes are waiting). */
  pull(): Promise<void>;
  /** Queued, unsent changes (for tests and the sign-out flush). */
  pending(): TDelta;
  /** Stops timers and listeners. */
  stop(): void;
};

export const RETRY_BASE_MS = 500;
export const RETRY_MAX_MS = 30_000;

export function createAccountAdapter<TDelta, TValue>(
  options: AccountAdapterOptions<TDelta, TValue>,
): AccountAdapter<TDelta, TValue> {
  const {
    endpoint,
    empty,
    isEmpty,
    combine,
    parse,
    apply,
    debounceMs = 400,
    pollMs = 30_000,
    listen = true,
  } = options;
  const doFetch = (...args: Parameters<typeof fetch>) => (options.fetch ?? fetch)(...args);

  let target: SyncTarget<TValue> | null = null;
  let queue: TDelta = empty();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  let attempts = 0;
  let inflight: Promise<void> | null = null;
  let stopped = false;
  let detach: (() => void) | null = null;

  function schedule(ms: number) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, ms);
  }

  function adopt(value: TValue) {
    if (!target || stopped) return;
    target.replace(isEmpty(queue) ? value : apply(value, queue));
  }

  function unauthorized() {
    stop();
    options.onUnauthorized?.();
  }

  async function send(keepalive: boolean): Promise<void> {
    const sending = queue;
    queue = empty();
    let res: Response;
    try {
      const token = await options.csrf();
      res = await doFetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        keepalive,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        body: JSON.stringify(options.body(sending)),
      });
    } catch {
      res = new Response(null, { status: 599 });
    }
    if (res.ok) {
      attempts = 0;
      const value = parse(await res.json().catch(() => null));
      if (value !== null) adopt(value);
      return;
    }
    if (res.status === 401) {
      unauthorized();
      return;
    }
    if (res.status === 400 || res.status === 413 || res.status === 415) return; // never valid
    if (res.status === 403) await options.onForbidden?.();
    // Network error, 403 (stale token), 429 or 5xx: keep the changes and try again later.
    queue = combine(sending, queue);
    attempts += 1;
    schedule(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (attempts - 1)));
  }

  async function flush({ keepalive = false } = {}): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (inflight) {
      await inflight;
      if (!isEmpty(queue) && !stopped) return flush({ keepalive });
      return;
    }
    if (isEmpty(queue) || stopped) return;
    inflight = send(keepalive).finally(() => {
      inflight = null;
    });
    await inflight;
  }

  async function pull(): Promise<void> {
    if (stopped || inflight || !isEmpty(queue)) return;
    try {
      const res = await doFetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      if (res.status === 401) return unauthorized();
      if (!res.ok) return;
      const value = parse(await res.json().catch(() => null));
      if (value !== null && !inflight) adopt(value);
    } catch {
      // offline: try again on the next visibility change or poll
    }
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (poll) clearInterval(poll);
    timer = null;
    poll = null;
    detach?.();
    detach = null;
  }

  return {
    connect(next) {
      target = next;
      stopped = false;
      if (listen && typeof window !== "undefined") {
        const onPageHide = () => void flush({ keepalive: true });
        const onVisibility = () => {
          if (document.visibilityState === "hidden") void flush({ keepalive: true });
          else void pull();
        };
        const onFocus = () => void pull();
        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("focus", onFocus);
        if (pollMs > 0) {
          poll = setInterval(() => {
            if (document.visibilityState === "visible") void pull();
          }, pollMs);
        }
        detach = () => {
          window.removeEventListener("pagehide", onPageHide);
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("focus", onFocus);
        };
      }
      return stop;
    },
    push(delta) {
      if (stopped) return;
      queue = combine(queue, delta);
      schedule(debounceMs);
    },
    flush,
    pull,
    pending: () => queue,
    stop,
  };
}
