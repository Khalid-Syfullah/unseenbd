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

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === VISITED_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** The visited district slugs. Empty on the server and during hydration, then the real list. */
export function useVisited(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
