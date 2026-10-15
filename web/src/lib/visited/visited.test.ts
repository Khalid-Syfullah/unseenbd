import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { districtIdOf } from "./districts";
import {
  getVisitedIds,
  parseVisited,
  replaceVisited,
  setDistrictsVisited,
  setDistrictVisited,
  setVisitedSyncAdapter,
  subscribeVisited,
  useVisited,
  useVisitedIds,
  VISITED_KEY,
  type VisitedSyncAdapter,
} from "./visited";
import { noopSyncAdapter } from "./sync";

/** Simulates another tab writing the key (the `storage` event only fires in other tabs). */
function otherTabWrites(value: string | null) {
  if (value === null) window.localStorage.removeItem(VISITED_KEY);
  else window.localStorage.setItem(VISITED_KEY, value);
  window.dispatchEvent(new StorageEvent("storage", { key: VISITED_KEY, newValue: value }));
}

beforeEach(() => {
  window.localStorage.clear();
  setVisitedSyncAdapter(noopSyncAdapter());
});
afterEach(() => setVisitedSyncAdapter(noopSyncAdapter()));

describe("parseVisited", () => {
  it("reads ids, drops duplicates and sorts", () => {
    expect(parseVisited("[19,1,19,64]")).toEqual([1, 19, 64]);
  });

  it("reads the slugs older versions stored", () => {
    expect(parseVisited('["dhaka","sylhet","dhaka"]')).toEqual([1, 28]);
  });

  it("ignores anything that is not a list of districts", () => {
    expect(parseVisited(null)).toEqual([]);
    expect(parseVisited("")).toEqual([]);
    expect(parseVisited("{not json")).toEqual([]);
    expect(parseVisited('{"a":1}')).toEqual([]);
    expect(parseVisited('["dhaka",3,null,"",0,65,2.5,"nowhere"]')).toEqual([1, 3]);
  });
});

describe("the visited store", () => {
  it("saves ids to localStorage and reads them back", () => {
    setDistrictVisited("coxs-bazar", true);
    setDistrictVisited(1, true);
    expect(getVisitedIds()).toEqual([1, 19]);
    expect(window.localStorage.getItem(VISITED_KEY)).toBe("[1,19]");
    setDistrictVisited("coxs-bazar", false);
    expect(window.localStorage.getItem(VISITED_KEY)).toBe("[1]");
    replaceVisited([]);
    expect(window.localStorage.getItem(VISITED_KEY)).toBeNull();
  });

  it("ticks and clears a whole division", () => {
    setDistrictsVisited([25, 26, 27, 28], true);
    expect(getVisitedIds()).toEqual([25, 26, 27, 28]);
    setDistrictsVisited([25, 26], false);
    expect(getVisitedIds()).toEqual([27, 28]);
  });

  it("ignores unknown districts", () => {
    setDistrictVisited("atlantis", true);
    setDistrictVisited(99, true);
    expect(getVisitedIds()).toEqual([]);
  });

  it("migrates a slug list to ids on the next change", () => {
    window.localStorage.setItem(VISITED_KEY, '["sylhet"]');
    setDistrictVisited("dhaka", true);
    expect(window.localStorage.getItem(VISITED_KEY)).toBe("[1,28]");
  });

  it("follows changes made in another tab", () => {
    const listener = vi.fn();
    const stop = subscribeVisited(listener);
    otherTabWrites("[5,6]");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getVisitedIds()).toEqual([5, 6]);
    // Unrelated keys are ignored.
    window.dispatchEvent(new StorageEvent("storage", { key: "something.else" }));
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it("re-renders hooks on local and cross-tab changes", () => {
    const { result } = renderHook(() => ({ ids: useVisitedIds(), slugs: useVisited() }));
    expect(result.current.ids).toEqual([]);
    act(() => setDistrictVisited("sylhet", true));
    expect(result.current.ids).toEqual([28]);
    expect(result.current.slugs).toEqual(["sylhet"]);
    act(() => otherTabWrites("[1,28]"));
    expect(result.current.slugs).toEqual(["dhaka", "sylhet"]);
    act(() => otherTabWrites(null));
    expect(result.current.ids).toEqual([]);
  });

  it("keeps working in memory when storage refuses writes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    setDistrictVisited("dhaka", true);
    expect(getVisitedIds()).toEqual([1]);
    setItem.mockRestore();
    setDistrictVisited("dhaka", false);
    expect(getVisitedIds()).toEqual([]);
  });
});

describe("the sync adapter", () => {
  it("receives every local change as add/remove lists", () => {
    const push = vi.fn();
    const adapter: VisitedSyncAdapter = { connect: () => undefined, push };
    setVisitedSyncAdapter(adapter);
    setDistrictsVisited([1, 2, 3], true);
    setDistrictVisited(2, false);
    setDistrictVisited(2, false); // no change, nothing pushed
    expect(push.mock.calls).toEqual([[{ add: [1, 2, 3], remove: [] }], [{ add: [], remove: [2] }]]);
  });

  it("can merge the account's ids without pushing them back", () => {
    const push = vi.fn();
    let merge: ((ids: readonly number[]) => void) | undefined;
    const cleanup = vi.fn();
    setVisitedSyncAdapter({
      connect: (target) => {
        merge = target.merge;
        return cleanup;
      },
      push,
    });
    setDistrictVisited(districtIdOf("khulna")!, true);
    push.mockClear();
    merge!([1, 39]);
    expect(getVisitedIds()).toEqual([1, 39]);
    expect(push).not.toHaveBeenCalled();
    setVisitedSyncAdapter(noopSyncAdapter());
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
