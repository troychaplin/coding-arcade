"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  COINS_PER_DUPLICATE,
  FREE_PACK_MS,
  MAX_FREE_PACKS,
  PACKS_PER_REFILL,
  PACK_PRICE,
  ENERGY_PACK,
  isShiny,
  type CardDetail,
} from "./data";

const KEY = "arcade:poke-collector:v1";
const EVENT = "arcade:poke-collector-change";

export type OwnedCard = {
  count: number;
  name: string;
  image: string;
  setId: string;
  rarity: string;
  shiny: boolean;
  /** Energy cards also count toward the Energy binder page */
  isEnergy?: boolean;
};

export type Collection = {
  cards: Record<string, OwnedCard>;
  coins: number;
  /** Free packs saved up at `refillFrom` (see freePacksAt) */
  freePacks: number;
  /** When the current free-pack timer started (null when full) */
  refillFrom: number | null;
  packsOpened: number;
  lastSet: string | null;
};

const EMPTY: Collection = {
  cards: {},
  coins: 0,
  freePacks: MAX_FREE_PACKS,
  refillFrom: null,
  packsOpened: 0,
  lastSet: null,
};

/** What a pulled card turned out to be */
export type PullResult = { id: string; isNew: boolean; coins: number };

/* ---------------------------------------------------------------------------
 * Free-pack timer
 * ------------------------------------------------------------------------- */

/** Free packs available at time `now`, and when the next one arrives. */
export function freePacksAt(c: Collection, now: number) {
  if (c.refillFrom == null || c.freePacks >= MAX_FREE_PACKS) {
    return { available: Math.min(c.freePacks, MAX_FREE_PACKS), nextAt: null as number | null };
  }
  const refills = Math.floor((now - c.refillFrom) / FREE_PACK_MS);
  const available = Math.min(MAX_FREE_PACKS, c.freePacks + refills * PACKS_PER_REFILL);
  const nextAt =
    available >= MAX_FREE_PACKS ? null : c.refillFrom + (refills + 1) * FREE_PACK_MS;
  return { available, nextAt };
}

/** Bank earned packs into `freePacks` and move the timer forward. */
function settle(c: Collection, now: number): Collection {
  if (c.refillFrom == null) return c;
  const refills = Math.floor((now - c.refillFrom) / FREE_PACK_MS);
  const freePacks = Math.min(MAX_FREE_PACKS, c.freePacks + refills * PACKS_PER_REFILL);
  return {
    ...c,
    freePacks,
    refillFrom: freePacks >= MAX_FREE_PACKS ? null : c.refillFrom + refills * FREE_PACK_MS,
  };
}

/* ---------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------- */

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
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): Collection {
  try {
    if (!raw) return EMPTY;
    const c: Collection = { ...EMPTY, ...JSON.parse(raw) };
    // Early Legends Only pulls were filed under "legendary" — move them to their own set
    for (const [id, card] of Object.entries(c.cards)) {
      if (card.setId === "legendary") card.setId = id.slice(0, id.lastIndexOf("-"));
    }
    if (c.lastSet === "legendary") c.lastSet = null;
    return c;
  } catch {
    return EMPTY;
  }
}

function write(c: Collection) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Storage full or blocked — the binder just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

/* ---------------------------------------------------------------------------
 * Hook
 * ------------------------------------------------------------------------- */

/** The Master Binder: owned cards, Poké-Coins and free packs, in localStorage. */
export function useCollection() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const collection = useMemo(() => parse(raw), [raw]);

  /**
   * Pay for a pack (free pack first, otherwise coins). Returns false if the
   * player can't afford it. Always reads the latest saved state.
   */
  const payForPack = useCallback((how: "free" | "coins", price: number = PACK_PRICE): boolean => {
    const now = Date.now();
    const c = settle(parse(readRaw()), now);
    if (how === "free") {
      if (c.freePacks <= 0) return false;
      write({
        ...c,
        freePacks: c.freePacks - 1,
        refillFrom: c.refillFrom ?? now, // start the timer if we were full
      });
      return true;
    }
    if (c.coins < price) return false;
    write({ ...c, coins: c.coins - price });
    return true;
  }, []);

  /**
   * Put a pack's cards in the binder. Duplicates (already owned, or twice in
   * the same pack) become Poké-Coins.
   */
  const addPack = useCallback((packId: string, cards: CardDetail[]): PullResult[] => {
    const c = parse(readRaw());
    const owned = { ...c.cards };
    let coins = c.coins;
    const results = cards.map((card) => {
      const existing = owned[card.id];
      if (existing) {
        owned[card.id] = { ...existing, count: existing.count + 1 };
        coins += COINS_PER_DUPLICATE;
        return { id: card.id, isNew: false, coins: COINS_PER_DUPLICATE };
      }
      owned[card.id] = {
        count: 1,
        name: card.name,
        image: card.image,
        // Cards go into their own set's binder page (Energy Surge energies keep their own page)
        setId: packId === ENERGY_PACK ? packId : card.setId,
        rarity: card.rarity,
        shiny: isShiny(card),
        isEnergy: card.category === "Energy",
      };
      return { id: card.id, isNew: true, coins: 0 };
    });
    write({ ...c, cards: owned, coins, packsOpened: c.packsOpened + 1, lastSet: packId === ENERGY_PACK ? packId : (cards.at(-1)?.setId ?? packId) });
    return results;
  }, []);

  return { collection, payForPack, addPack };
}
