"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { IdCardData } from "./data";

const KEY = "arcade:avatar-factory:squad";
const EVENT = "arcade:squad-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(cards: IdCardData[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    // Storage full or blocked — squad just won't persist this time.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The saved squad, persisted in localStorage and synced across tabs. */
export function useSquad() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");

  const squad = useMemo<IdCardData[]>(() => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Cards saved before rarity existed count as Common.
      return parsed.map((c: IdCardData) => ({ ...c, rarity: c.rarity ?? "common" }));
    } catch {
      return [];
    }
  }, [raw]);

  const add = useCallback(
    (card: IdCardData) => write([card, ...squad]),
    [squad],
  );

  const remove = useCallback(
    (id: string) => write(squad.filter((c) => c.id !== id)),
    [squad],
  );

  const clear = useCallback(() => write([]), []);

  return { squad, add, remove, clear };
}
