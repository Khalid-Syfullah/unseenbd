/**
 * The districts a visitor has ticked, kept in their own browser (localStorage) as a JSON array of
 * district slugs. Nothing is sent to a server. Pages without JavaScript, and the server render,
 * see the empty list.
 */
import { useSyncExternalStore } from "react";

export const VISITED_KEY = "unseenbd.visited";

const EMPTY: readonly string[] = Object.freeze([]);

/** Parse the stored value into a clean list of slugs; anything malformed is an empty list. */
export function parseVisited(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))];
  } catch {
    return [];
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(VISITED_KEY);
  } catch {
    return null; // private window, blocked storage
  }
}

let cachedRaw: string | null | undefined;
let cachedList: readonly string[] = EMPTY;

function getSnapshot(): readonly string[] {
  if (memory) return memory;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    const list = parseVisited(raw);
    cachedList = list.length ? list : EMPTY;
  }
  return cachedList;
}

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

const listeners = new Set<() => void>();
/** Used while storage cannot be written, so the page still reacts to clicks. */
let memory: readonly string[] | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === VISITED_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Marks a district as visited (or clears it) and tells every component that shows the list. */
export function setDistrictVisited(slug: string, visited: boolean) {
  const current = getSnapshot();
  const has = current.includes(slug);
  if (has === visited) return;
  const next = visited ? [...current, slug] : current.filter((s) => s !== slug);
  try {
    if (next.length) window.localStorage.setItem(VISITED_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(VISITED_KEY);
    memory = null;
  } catch {
    memory = next; // storage is blocked; the change lives until the page closes
  }
  for (const listener of listeners) listener();
}

/** The visited district slugs. Empty on the server and during hydration, then the real list. */
export function useVisited(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
