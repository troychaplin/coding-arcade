// Card data + pack rules for the Pokémon Pack Opener & Master Binder.

const API = "https://api.tcgdex.net/v2/en";

/** Booster packs we offer, with colours for our own pack artwork. */
export type PackSet = {
  id: string;
  name: string;
  year: string;
  /** Tailwind gradient classes for the pack wrapper */
  wrapper: string;
};

export const PACK_SETS: PackSet[] = [
  { id: "base1", name: "Base Set", year: "1999", wrapper: "from-sky to-grape" },
  { id: "sv03.5", name: "151", year: "2023", wrapper: "from-tomato to-tangerine" },
  { id: "swsh1", name: "Sword & Shield", year: "2020", wrapper: "from-sky to-lime" },
  { id: "sv01", name: "Scarlet & Violet", year: "2023", wrapper: "from-bubble to-grape" },
];

export const setLogo = (setId: string) => {
  // Logos live at assets.tcgdex.net/en/<serie>/<set>/logo.webp
  // (webp: Scarlet & Violet has no .png logo)
  const serie = setId.startsWith("base") ? "base" : setId.startsWith("swsh") ? "swsh" : "sv";
  return `https://assets.tcgdex.net/en/${serie}/${setId}/logo.webp`;
};

/** One card as listed in a set (no rarity — the set endpoint doesn't include it). */
export type CardBrief = { id: string; localId: string; name: string; image: string };

/** Full details for one card, fetched when it's pulled. */
export type CardDetail = CardBrief & {
  hp: number | null;
  rarity: string;
  types: string[];
  stage: string | null;
  holoOnly: boolean;
};

/** A set sorted into pack slots by rarity. */
export type SetData = {
  id: string;
  name: string;
  cards: CardBrief[];
  common: string[];
  uncommon: string[];
  rare: string[];
  /** Everything rarer than "Rare": holo, ex/V, illustration, secret… */
  special: string[];
};

const PLAIN_RARITIES = ["Common", "Uncommon", "Rare"];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

const setCache = new Map<string, Promise<SetData>>();

/**
 * Load a set and sort its cards by rarity. The set endpoint has no rarity,
 * so we ask the cards endpoint for the Common, Uncommon and Rare lists
 * (one request each); anything left over is a special card.
 */
export function loadSet(setId: string): Promise<SetData> {
  const cached = setCache.get(setId);
  if (cached) return cached;

  const promise = (async () => {
    const byRarity = (r: string) =>
      getJson<CardBrief[]>(`${API}/cards?set.id=eq:${setId}&rarity=eq:${encodeURIComponent(r)}`);
    const [set, common, uncommon, rare] = await Promise.all([
      getJson<{ id: string; name: string; cards: CardBrief[] }>(`${API}/sets/${setId}`),
      byRarity("Common"),
      byRarity("Uncommon"),
      byRarity("Rare"),
    ]);
    const cards = set.cards
      .filter((c) => c.image)
      .sort((a, b) => cardNumber(a) - cardNumber(b));
    const ids = (list: CardBrief[]) => list.filter((c) => c.image).map((c) => c.id);
    const plain = new Set([...ids(common), ...ids(uncommon), ...ids(rare)]);
    return {
      id: set.id,
      name: set.name,
      cards,
      common: ids(common),
      uncommon: ids(uncommon),
      rare: ids(rare),
      special: cards.map((c) => c.id).filter((id) => !plain.has(id)),
    };
  })();

  setCache.set(setId, promise);
  promise.catch(() => setCache.delete(setId)); // allow a retry after an error
  return promise;
}

function cardNumber(c: CardBrief) {
  const n = parseInt(c.localId, 10);
  return Number.isNaN(n) ? 9999 : n;
}

const cardCache = new Map<string, Promise<CardDetail>>();

export function loadCard(id: string): Promise<CardDetail> {
  const cached = cardCache.get(id);
  if (cached) return cached;
  const promise = getJson<{
    id: string;
    localId: string;
    name: string;
    image: string;
    hp?: number;
    rarity?: string;
    types?: string[];
    stage?: string;
    variants?: { holo?: boolean; normal?: boolean; reverse?: boolean };
  }>(`${API}/cards/${id}`).then((c) => ({
    id: c.id,
    localId: c.localId,
    name: c.name,
    image: c.image,
    hp: c.hp ?? null,
    rarity: c.rarity ?? "Common",
    types: c.types ?? [],
    stage: c.stage ?? null,
    // Old holo rares (Base Set Charizard) are labelled "Rare" but only come in holo.
    holoOnly: Boolean(c.variants?.holo && !c.variants?.normal && !c.variants?.reverse),
  }));
  cardCache.set(id, promise);
  promise.catch(() => cardCache.delete(id));
  return promise;
}

/**
 * Does this card get the holographic foil? Anything rarer than plain Rare,
 * holo-only rares, and big Pokémon with more than 120 HP.
 */
export function isShiny(card: Pick<CardDetail, "rarity" | "holoOnly" | "hp">): boolean {
  return !PLAIN_RARITIES.includes(card.rarity) || card.holoOnly || (card.hp ?? 0) > 120;
}

export const cardImage = (image: string, size: "high.png" | "high.webp" | "low.webp" = "high.png") =>
  `${image}/${size}`;

/* ---------------------------------------------------------------------------
 * Pack rules
 * ------------------------------------------------------------------------- */

function pick(list: string[], avoid: Set<string>): string | null {
  const choices = list.filter((id) => !avoid.has(id));
  const from = choices.length ? choices : list;
  return from.length ? from[Math.floor(Math.random() * from.length)] : null;
}

/**
 * A 5-card pack: 2 commons, 2 uncommons and 1 rare slot. The rare slot is a
 * special card 30% of the time (when the set has them), and kids get a
 * 15% bonus chance of a second rare slot instead of the second uncommon.
 */
export function buildPack(set: SetData): string[] {
  const used = new Set<string>();
  const take = (list: string[]) => {
    const id = pick(list, used);
    if (id) used.add(id);
    return id;
  };
  const rareSlot = () =>
    take(set.special.length && Math.random() < 0.3 ? set.special : set.rare.length ? set.rare : set.special);

  const pack = [
    take(set.common),
    take(set.common),
    take(set.uncommon),
    Math.random() < 0.15 ? rareSlot() : take(set.uncommon),
    rareSlot(),
  ];
  // Fall back to any card if a slot's list was empty.
  return pack.map((id) => id ?? take(set.cards.map((c) => c.id))!).filter(Boolean);
}

/* ---------------------------------------------------------------------------
 * Economy
 * ------------------------------------------------------------------------- */

export const COINS_PER_DUPLICATE = 10;
export const PACK_PRICE = 50;
/** New collectors start with a full stack of free packs */
export const MAX_FREE_PACKS = 10;
/** Every 2 minutes a batch of free packs is released… */
export const FREE_PACK_MS = 2 * 60 * 1000;
/** …5 at a time, up to MAX_FREE_PACKS */
export const PACKS_PER_REFILL = 5;
