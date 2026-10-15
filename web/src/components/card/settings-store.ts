import { useCallback } from "react";
import {
  DEFAULT_SETTINGS,
  parseCardSettings,
  type CardMapKind,
  type CardSettings,
} from "@/lib/card";
import { createLocalStore, type LocalStore } from "@/lib/visited/store";

const stores = new Map<CardMapKind, LocalStore<CardSettings>>();

/** The card maker's saved choices for one map (`unseenbd.card` / `unseenbd.card.world`). */
export function cardSettingsStore(kind: CardMapKind): LocalStore<CardSettings> {
  let store = stores.get(kind);
  if (!store) {
    store = createLocalStore<CardSettings>({
      key: kind === "bangladesh" ? "unseenbd.card" : "unseenbd.card.world",
      empty: DEFAULT_SETTINGS,
      parse: parseCardSettings,
      serialize: (s) => JSON.stringify(s),
    });
    stores.set(kind, store);
  }
  return store;
}

/** The settings and a function that merges a change into them. */
export function useCardSettings(
  kind: CardMapKind,
): [CardSettings, (patch: Partial<CardSettings>) => void] {
  const store = cardSettingsStore(kind);
  const settings = store.use();
  const update = useCallback(
    (patch: Partial<CardSettings>) => store.set({ ...store.get(), ...patch }),
    [store],
  );
  return [settings, update];
}
