// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccountAdapter, RETRY_BASE_MS } from "@/lib/account/adapter";
import {
  combineVisited,
  emptyVisitedDelta,
  isEmptyVisitedDelta,
  mergeStory,
  unionBucket,
  unionWorld,
  type StoryState,
  type VisitedDelta,
} from "@/lib/account/merge";
import { bucketAdapter, storyAdapter, visitedAdapter, worldAdapter } from "@/lib/account/sync";
import type { SyncTarget } from "@/lib/visited/sync";
import { resetAuthLimits } from "@/server/auth/limits";
import { accountLimiter } from "@/server/auth/http";
import { freshEmail, TestBrowser } from "./account-helpers";

beforeEach(() => {
  resetAuthLimits();
  accountLimiter.reset();
});

/** A store's sync target kept in memory (what a browser tab's localStorage would hold). */
function memoryTarget<V>(initial: V) {
  const box = { value: initial };
  const target: SyncTarget<V> = {
    get: () => box.value,
    merge: (v) => {
      box.value = v;
    },
    replace: (v) => {
      box.value = v;
    },
  };
  return { box, target };
}

/** Signs a new "device" into `email`. */
async function device(email: string) {
  const browser = new TestBrowser();
  const res = await browser.login(email);
  expect(res.status).toBe(200);
  const deps = {
    fetch: browser.fetch,
    csrf: () => browser.csrf,
    listen: false,
    onUnauthorized: () => undefined,
  };
  return { browser, deps };
}

describe("merge rules", () => {
  it("unions sets, the further state winning", () => {
    expect(unionBucket({ a: "want", b: "been" }, { a: "been", b: "want", c: "want" })).toEqual({
      a: "been",
      b: "been",
      c: "want",
    });
    expect(unionWorld({ NP: "wish" }, { NP: "visited", IN: "wish" })).toEqual({
      NP: "visited",
      IN: "wish",
    });
  });

  it("keeps the newest story answer, including a newer clear", () => {
    const a: StoryState = { values: { birth: 1, work: 2 }, times: { birth: 10, work: 10 } };
    const b: StoryState = { values: { birth: 5, work: null }, times: { birth: 5, work: 20 } };
    expect(mergeStory(a, b)).toEqual({
      values: { birth: 1, work: null },
      times: { birth: 10, work: 20 },
    });
  });

  it("folds queued visited changes in order", () => {
    let d: VisitedDelta = emptyVisitedDelta();
    d = combineVisited(d, { add: [1, 2], remove: [] });
    d = combineVisited(d, { add: [], remove: [2] });
    d = combineVisited(d, { add: [3], remove: [] });
    expect(d).toEqual({ add: [1, 3], remove: [2] });
    expect(isEmptyVisitedDelta(combineVisited(d, { add: [], remove: [] }))).toBe(false);
  });
});

describe("two browsers on one account", () => {
  it("stay in sync for districts, bucket list, world map and story", async () => {
    const email = freshEmail();
    expect((await new TestBrowser().register(email)).status).toBe(201);
    const laptop = await device(email);
    const phone = await device(email);

    const laptopVisited = memoryTarget<readonly number[]>([]);
    const phoneVisited = memoryTarget<readonly number[]>([]);
    const a = visitedAdapter(laptop.deps);
    const b = visitedAdapter(phone.deps);
    a.connect(laptopVisited.target);
    b.connect(phoneVisited.target);

    // The laptop ticks three districts.
    laptopVisited.box.value = [1, 19, 28];
    a.push({ add: [1, 19, 28], remove: [] });
    await a.flush();
    expect(laptopVisited.box.value).toEqual([1, 19, 28]);

    // The phone picks them up when it looks again (tab shown, focus or the 30 s poll).
    await b.pull();
    expect(phoneVisited.box.value).toEqual([1, 19, 28]);

    // The phone clears one and adds another; the laptop sees both changes, removals included.
    phoneVisited.box.value = [1, 28, 64];
    b.push({ add: [64], remove: [19] });
    await b.flush();
    await a.pull();
    expect(laptopVisited.box.value).toEqual([1, 28, 64]);

    // Bucket list, world marks and the story ride the same way.
    const lb = memoryTarget<Readonly<Record<string, "want" | "been">>>({});
    const pb = memoryTarget<Readonly<Record<string, "want" | "been">>>({});
    const ab = bucketAdapter(laptop.deps);
    const bb = bucketAdapter(phone.deps);
    ab.connect(lb.target);
    bb.connect(pb.target);
    ab.push({ set: { "sajek-valley": "want", "nilgiri-hill": "been" }, clear: [] });
    await ab.flush();
    bb.push({ set: { "sajek-valley": "been" }, clear: ["nilgiri-hill"] });
    await bb.flush();
    await ab.pull();
    expect(lb.box.value).toEqual({ "sajek-valley": "been" });

    const lw = memoryTarget<Readonly<Record<string, "visited" | "wish">>>({});
    const pw = memoryTarget<Readonly<Record<string, "visited" | "wish">>>({});
    const aw = worldAdapter(laptop.deps);
    const bw = worldAdapter(phone.deps);
    aw.connect(lw.target);
    bw.connect(pw.target);
    aw.push({ set: { NP: "wish", JP: "visited" }, clear: [] });
    await aw.flush();
    await bw.pull();
    expect(pw.box.value).toEqual({ NP: "wish", JP: "visited" });

    const ls = memoryTarget<StoryState>({ values: {}, times: {} });
    const ps = memoryTarget<StoryState>({ values: {}, times: {} });
    const as = storyAdapter(laptop.deps);
    const bs = storyAdapter(phone.deps);
    as.connect(ls.target);
    bs.connect(ps.target);
    as.push({ values: { birth: 1 }, times: { birth: 1000 } });
    await as.flush();
    // An older answer from the phone does not overwrite the laptop's newer one.
    bs.push({ values: { birth: 2, work: 19 }, times: { birth: 500, work: 2000 } });
    await bs.flush();
    expect(ps.box.value.values).toEqual({ birth: 1, work: 19 });
    await as.pull();
    expect(ls.box.value.values).toEqual({ birth: 1, work: 19 });
  });

  it("stops and reports when the session has ended", async () => {
    const email = freshEmail();
    expect((await new TestBrowser().register(email)).status).toBe(201);
    const { browser, deps } = await device(email);
    const ended = vi.fn();
    const target = memoryTarget<readonly number[]>([]);
    const adapter = visitedAdapter({ ...deps, onUnauthorized: ended });
    adapter.connect(target.target);
    await browser.call("POST", "/api/auth/logout");
    adapter.push({ add: [5], remove: [] });
    await adapter.flush();
    expect(ended).toHaveBeenCalledOnce();
    adapter.push({ add: [6], remove: [] });
    expect(isEmptyVisitedDelta(adapter.pending())).toBe(true);
  });
});

describe("the adapter queue", () => {
  afterEach(() => vi.useRealTimers());

  function fakeServer() {
    let ids: number[] = [];
    let failures = 0;
    const calls: { method: string; body: unknown }[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, body });
      if (failures > 0) {
        failures -= 1;
        throw new TypeError("network down");
      }
      if (method === "POST") {
        const d = body as VisitedDelta;
        ids = [...new Set([...ids, ...d.add])].filter((id) => !d.remove.includes(id)).sort();
      }
      return new Response(JSON.stringify({ ids }), { status: 200 });
    }) as unknown as typeof fetch;
    return {
      fetchImpl,
      calls,
      fail: (n: number) => {
        failures = n;
      },
    };
  }

  function adapterFor(server: ReturnType<typeof fakeServer>) {
    return createAccountAdapter<VisitedDelta, readonly number[]>({
      endpoint: "/api/me/visited",
      empty: emptyVisitedDelta,
      isEmpty: isEmptyVisitedDelta,
      combine: combineVisited,
      body: (d) => d,
      parse: (json) => (json as { ids: number[] }).ids,
      apply: (ids, d) => [...new Set([...ids, ...d.add])].filter((id) => !d.remove.includes(id)),
      csrf: () => "token",
      fetch: server.fetchImpl,
      listen: false,
    });
  }

  it("debounces changes into one request after ~400 ms", async () => {
    vi.useFakeTimers();
    const server = fakeServer();
    const target = memoryTarget<readonly number[]>([]);
    const adapter = adapterFor(server);
    adapter.connect(target.target);
    adapter.push({ add: [1], remove: [] });
    await vi.advanceTimersByTimeAsync(200);
    adapter.push({ add: [2], remove: [] });
    adapter.push({ add: [], remove: [1] });
    await vi.advanceTimersByTimeAsync(399);
    expect(server.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.calls).toEqual([{ method: "POST", body: { add: [2], remove: [1] } }]);
    expect(target.box.value).toEqual([2]);
  });

  it("retries with exponential backoff and keeps changes made meanwhile", async () => {
    vi.useFakeTimers();
    const server = fakeServer();
    const target = memoryTarget<readonly number[]>([]);
    const adapter = adapterFor(server);
    adapter.connect(target.target);
    server.fail(2);
    adapter.push({ add: [7], remove: [] });
    await vi.advanceTimersByTimeAsync(400); // first try: fails
    expect(server.calls).toHaveLength(1);
    adapter.push({ add: [8], remove: [] }); // queued while offline
    await vi.advanceTimersByTimeAsync(400); // the debounce re-arms the timer: second try, fails
    expect(server.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(RETRY_BASE_MS * 2 - 1);
    expect(server.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1); // third try after 1 s: succeeds
    expect(server.calls).toHaveLength(3);
    expect(server.calls[2]!.body).toEqual({ add: [7, 8], remove: [] });
    expect(target.box.value).toEqual([7, 8]);
    expect(isEmptyVisitedDelta(adapter.pending())).toBe(true);
  });

  it("flushes at once on demand (pagehide) with keepalive", async () => {
    const server = fakeServer();
    const target = memoryTarget<readonly number[]>([]);
    const adapter = adapterFor(server);
    adapter.connect(target.target);
    adapter.push({ add: [3], remove: [] });
    await adapter.flush({ keepalive: true });
    expect(server.calls).toHaveLength(1);
    const init = (server.fetchImpl as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock
      .calls[0]![1];
    expect(init.keepalive).toBe(true);
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("token");
  });
});
