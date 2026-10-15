/**
 * Account sync for the browser stores (MASTER_PROMPT §5.7). The stores always save locally first;
 * an adapter mirrors the changes to the visitor's account.
 *
 * Accounts arrive in phase 13. Until then every store uses `noopSyncAdapter`. The account adapter
 * will: queue adds and removes, debounce ~400 ms, `POST /api/me/visited {add, remove}`, merge the
 * server's ids, retry with exponential backoff and flush on `pagehide` / `visibilitychange`. The
 * stores do not need to change for that: only a different adapter is installed.
 */

/** What a store gives its adapter when the adapter is connected. */
export type SyncTarget<TValue> = {
  /** The local value right now. */
  get(): TValue;
  /**
   * Folds the account's value into the local one (a union: nothing local is lost). Changes made
   * by `merge` are not pushed back to the adapter.
   */
  merge(remote: TValue): void;
};

export interface SyncAdapter<TDelta, TValue> {
  /** Called once when installed in the browser. Returns a cleanup, called when replaced. */
  connect(target: SyncTarget<TValue>): void | (() => void);
  /** A local change to mirror to the account (the adapter batches, retries and flushes). */
  push(delta: TDelta): void;
}

/** Does nothing: the visitor is not signed in (or accounts do not exist yet). */
export function noopSyncAdapter<TDelta, TValue>(): SyncAdapter<TDelta, TValue> {
  return { connect: () => undefined, push: () => undefined };
}

/** Holds a store's current adapter and swaps it safely. */
export function adapterSlot<TDelta, TValue>(target: SyncTarget<TValue>) {
  let adapter: SyncAdapter<TDelta, TValue> = noopSyncAdapter();
  let cleanup: void | (() => void);
  return {
    /** Installs `next` (connecting it in the browser), replacing the previous adapter. */
    install(next: SyncAdapter<TDelta, TValue>) {
      if (typeof cleanup === "function") cleanup();
      adapter = next;
      cleanup = typeof window === "undefined" ? undefined : next.connect(target);
    },
    push(delta: TDelta) {
      adapter.push(delta);
    },
  };
}
