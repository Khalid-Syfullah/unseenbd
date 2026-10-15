/**
 * A small value kept in the visitor's own browser (localStorage) that React components can read
 * with a hook. Every store here works the same way:
 *
 * - the value is parsed from one localStorage key and cached until the raw string changes;
 * - writes notify every subscriber in this tab, and the `storage` event brings changes made in
 *   other tabs (so two open tabs stay in step);
 * - when storage is blocked (private window, full quota) the value lives in memory until the page
 *   closes, so the page still reacts to clicks;
 * - the server render and hydration see `empty`, then the saved value.
 */
import { useSyncExternalStore } from "react";

export type LocalStore<T> = {
  readonly key: string;
  /** The current value (the `empty` value on the server). */
  get(): T;
  /** Replaces the value, saves it and tells every subscriber. */
  set(next: T): void;
  /** Calls `listener` after any change, in this tab or another one. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** The value in a component; re-renders on change. */
  use(): T;
};

export type LocalStoreOptions<T> = {
  key: string;
  /** Returned on the server, during hydration and when nothing is saved. Keep it frozen. */
  empty: T;
  /** Reads the stored string; must never throw (bad data is `empty`). */
  parse(raw: string): T;
  /** The string to store, or `null` to remove the key (an empty value). */
  serialize(value: T): string | null;
};

export function createLocalStore<T>({
  key,
  empty,
  parse,
  serialize,
}: LocalStoreOptions<T>): LocalStore<T> {
  let cachedRaw: string | null | undefined;
  let cached: T = empty;
  /** Set while storage refuses writes. */
  let memory: { value: T } | null = null;
  const listeners = new Set<() => void>();

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function get(): T {
    if (typeof window === "undefined") return empty;
    if (memory) return memory.value;
    const raw = readRaw();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = raw === null ? empty : parse(raw);
    }
    return cached;
  }

  function notify() {
    for (const listener of [...listeners]) listener();
  }

  function set(next: T) {
    const raw = serialize(next);
    try {
      if (raw === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
      memory = null;
    } catch {
      memory = { value: next };
    }
    notify();
  }

  let detach: (() => void) | null = null;

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (!detach && typeof window !== "undefined") {
      const onStorage = (e: StorageEvent) => {
        // `key === null` means another tab cleared all storage.
        if (e.key !== null && e.key !== key) return;
        memory = null;
        notify();
      };
      window.addEventListener("storage", onStorage);
      detach = () => window.removeEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && detach) {
        detach();
        detach = null;
      }
    };
  }

  const getServerSnapshot = () => empty;

  function use(): T {
    return useSyncExternalStore(subscribe, get, getServerSnapshot);
  }

  return { key, get, set, subscribe, use };
}

/** Parses JSON, or `undefined` when the text is not JSON. */
export function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
