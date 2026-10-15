"use client";

/**
 * The visitor's own likes, votes and ratings for items on a page, loaded in one batched request
 * (`GET /api/reactions`) however many cards ask. Pages are cached for everyone, so this is how a
 * card knows it was liked. Visitors who never reacted (no hint cookie) and are not signed in cost
 * no request.
 */
import { useEffect, useSyncExternalStore } from "react";
import { hasSignedInHint } from "@/lib/account/client";
import { loadMine, type Mine } from "./client";

export type ReactionTarget = "photo" | "post" | "suggestion";

const NONE: Mine = Object.freeze({ like: false, vote: false, star: null }) as Mine;
const cache = new Map<string, Mine>();
const queued = new Map<ReactionTarget, Set<number>>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

const keyOf = (type: ReactionTarget, id: number) => `${type}:${id}`;

function emit() {
  for (const l of [...listeners]) l();
}

function hasReactedHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(/;\s*/).some((c) => c === "ubd_reacted=1");
}

async function flush() {
  timer = null;
  const batches = [...queued];
  queued.clear();
  for (const [type, ids] of batches) {
    const list = [...ids];
    const mine = await loadMine(type, list);
    for (const id of list) cache.set(keyOf(type, id), mine[id] ?? NONE);
  }
  emit();
}

function request(type: ReactionTarget, id: number) {
  if (cache.has(keyOf(type, id))) return;
  if (!hasSignedInHint() && !hasReactedHint()) {
    cache.set(keyOf(type, id), NONE);
    return;
  }
  let ids = queued.get(type);
  if (!ids) queued.set(type, (ids = new Set()));
  ids.add(id);
  timer ??= setTimeout(() => void flush(), 0);
}

/** Records the result of the visitor's own reaction (so other cards for the item agree). */
export function setMine(type: ReactionTarget, id: number, mine: Mine) {
  cache.set(keyOf(type, id), mine);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The visitor's reactions to one item (all off until loaded). */
export function useMine(type: ReactionTarget, id: number): Mine {
  useEffect(() => {
    request(type, id);
  }, [type, id]);
  return useSyncExternalStore(
    subscribe,
    () => cache.get(keyOf(type, id)) ?? NONE,
    () => NONE,
  );
}

/** For tests. */
export function resetMineForTests() {
  cache.clear();
  queued.clear();
  if (timer) clearTimeout(timer);
  timer = null;
}
