// Card data + pack rules for the Pokémon Pack Opener & Master Binder.

const API = "https://api.tcgdex.net/v2/en";

/** A booster pack we offer, with colours for our own pack artwork. */
export type PackSet = {
  id: string;
  name: string;
  /** Small line under the name on the pack: a year or an era */
  subtitle: string;
  /** Logo image, or null (our own packs get an emblem, and a few sets have no logo) */
  logo: string | null;
  /** Tailwind gradient classes for the pack wrapper */
  wrapper: string;
  /** Poké-Coins to buy one (PACK_PRICE when not set) */
  price?: number;
  /** Free packs can't open this one — it has to be bought */
  coinsOnly?: boolean;
};

/** A Pokémon TCG era (TCGdex calls it a "serie") and its booster sets, newest first. */
export type Era = { id: string; name: string; sets: PackSet[] };

/** Id of our special all-energy pack */
export const ENERGY_PACK = "energy";
/** Id of our special all-legendary pack */
export const LEGENDARY_PACK = "legendary";

/**
 * National Pokédex numbers of every legendary and mythical Pokémon
 * (Ultra Beasts and Paradox Pokémon aren't legendary, so they're left out).
 */
export const LEGENDARY_DEX = new Set([
  144, 145, 146, 150, 151, // Kanto
  243, 244, 245, 249, 250, 251, // Johto
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Hoenn
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, // Sinnoh
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, // Unova
  716, 717, 718, 719, 720, 721, // Kalos
  772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800, 801, 802, 807, 808, 809, // Alola
  888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, // Galar
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024, 1025, // Paldea
]);

/** Legends packs can't be opened with free packs, and cost more */
export const LEGENDARY_PRICE = 100;

// TCGdex logo links have no extension; webp works for every era (Scarlet & Violet has no .png)
const logoUrl = (base: string) => `${base}.webp`;
const asset = (path: string) => logoUrl(`https://assets.tcgdex.net/en/${path}/logo`);

/** The sets on the Featured tab, ready before the full catalog loads. */
export const FEATURED: PackSet[] = [
  { id: "base1", name: "Base Set", subtitle: "1999", logo: asset("base/base1"), wrapper: "from-sky to-grape" },
  { id: "sv03.5", name: "151", subtitle: "2023", logo: asset("sv/sv03.5"), wrapper: "from-tomato to-tangerine" },
  { id: "swsh1", name: "Sword & Shield", subtitle: "2020", logo: asset("swsh/swsh1"), wrapper: "from-sky to-lime" },
  { id: "sv01", name: "Scarlet & Violet", subtitle: "2023", logo: asset("sv/sv01"), wrapper: "from-bubble to-grape" },
];

/** Not real sets: every energy card (with artwork) from every era */
export const ENERGY_SET: PackSet = {
  id: ENERGY_PACK,
  name: "Energy Surge",
  subtitle: "All eras",
  logo: null,
  wrapper: "from-sun to-tangerine",
};

/**
 * Every legendary & mythical Pokémon card from every set we offer. Each card
 * goes into its own set's binder page.
 */
export const LEGENDARY_SET: PackSet = {
  id: LEGENDARY_PACK,
  name: "Legends Only",
  subtitle: "All eras",
  logo: null,
  wrapper: "from-ink to-grape",
  price: LEGENDARY_PRICE,
  coinsOnly: true,
};

const WRAPPERS = [
  "from-sky to-grape",
  "from-tomato to-tangerine",
  "from-sky to-lime",
  "from-bubble to-grape",
  "from-lime to-sky",
  "from-tangerine to-bubble",
  "from-grape to-tomato",
  "from-sun to-lime",
];

/** Same colours for a set every time */
function wrapperFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return WRAPPERS[h % WRAPPERS.length];
}

/** Eras that aren't booster sets: Pokémon TCG Pocket (digital), trainer kits, McDonald's, misc */
const SKIP_ERAS = new Set(["tcgp", "tk", "mc", "misc"]);

/** Sets TCGdex has (almost) no card pictures for yet */
const SKIP_SETS = new Set([
  "wp", "sp", "bog", "ex5.5", "exu", "rc", "xya", "sm3.5", "sm7.5", "swsh4.5sv", "cel25cc",
  "swsh9tg", "swsh10tg", "swsh11tg", "swsh12tg", "swsh12.5gg", "sve", "mfb", "mee", "30th-c",
]);

let catalogPromise: Promise<Era[]> | null = null;
let catalog: Era[] | null = null;

/**
 * Every booster set we offer, grouped by era (newest era first). Promos are
 * left out: they're not sold in booster packs.
 */
export function loadCatalog(): Promise<Era[]> {
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    const series = await getJson<{ id: string }[]>(`${API}/series`);
    const details = await Promise.all(
      series
        .filter((s) => !SKIP_ERAS.has(s.id))
        .map((s) =>
          getJson<{
            id: string;
            name: string;
            releaseDate?: string;
            sets: { id: string; name: string; logo?: string; cardCount: { total: number } }[];
          }>(`${API}/series/${s.id}`),
        ),
    );
    const eras = details
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
      .map((d) => ({
        id: d.id,
        name: d.name,
        sets: d.sets
          .filter((s) => !SKIP_SETS.has(s.id) && !/promo/i.test(s.name) && s.cardCount.total > 0)
          .reverse()
          .map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: `${d.name} era`,
            logo: s.logo ? logoUrl(s.logo) : null,
            wrapper: wrapperFor(s.id),
          })),
      }))
      .filter((e) => e.sets.length);
    catalog = eras;
    return eras;
  })();
  catalogPromise.catch(() => (catalogPromise = null));
  return catalogPromise;
}

/** The catalog if it has loaded already (no waiting). */
export const peekCatalog = () => catalog;

/** Find a pack by id among the featured sets, our own packs and the loaded catalog. */
export function findSet(id: string): PackSet | undefined {
  return (
    [...FEATURED, ENERGY_SET, LEGENDARY_SET].find((s) => s.id === id) ??
    catalog?.flatMap((e) => e.sets).find((s) => s.id === id)
  );
}

/** Which set a card belongs to, from its id ("sv03.5-150" is card 150 of sv03.5). */
const setOfBrief = (c: CardBrief) => c.id.slice(0, c.id.length - c.localId.length - 1);

/** One card as listed in a set (no rarity — the set endpoint doesn't include it). */
export type CardBrief = { id: string; localId: string; name: string; image: string };

/** Full details for one card, fetched when it's pulled. */
export type CardDetail = CardBrief & {
  hp: number | null;
  rarity: string;
  types: string[];
  stage: string | null;
  holoOnly: boolean;
  /** "Pokemon", "Trainer" or "Energy" */
  category: string;
  /** The set the card really comes from */
  setId: string;
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
  /** A normal set, our all-energy pack or our all-legendary pack */
  kind: "set" | "energy" | "legendary";
};

const ENERGY_TYPES = ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy"];

/** "Fire Energy" or "Basic Fire Energy" — the plain kind, not special energy. */
export function isBasicEnergy(name: string): boolean {
  return new RegExp(`^(Basic )?(${ENERGY_TYPES.join("|")}) Energy$`).test(name);
}

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

  const promise =
    setId === ENERGY_PACK ? loadEnergy() : setId === LEGENDARY_PACK ? loadLegendary() : (async () => {
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
      kind: "set" as const,
    };
  })();

  setCache.set(setId, promise);
  promise.catch(() => setCache.delete(setId)); // allow a retry after an error
  return promise;
}

/**
 * The Energy pack: every energy card with artwork, from every set. Basic
 * energies are grouped by type, then special energies A–Z.
 */
async function loadEnergy(): Promise<SetData> {
  const all = (await getJson<CardBrief[]>(`${API}/cards?category=eq:Energy`)).filter((c) => c.image);
  const typeOrder = (name: string) => ENERGY_TYPES.findIndex((t) => name.includes(t));
  const basic = all
    .filter((c) => isBasicEnergy(c.name))
    .sort((a, b) => typeOrder(a.name) - typeOrder(b.name) || a.id.localeCompare(b.id));
  const special = all
    .filter((c) => !isBasicEnergy(c.name))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return {
    id: ENERGY_PACK,
    name: "Energy Surge",
    cards: [...basic, ...special],
    common: basic.map((c) => c.id),
    uncommon: [],
    rare: special.map((c) => c.id),
    special: [],
    kind: "energy",
  };
}

/** "a|b|c" asks TCGdex for cards matching any of the Pokédex numbers */
const LEGENDARY_QUERY = `dexId=${[...LEGENDARY_DEX].join("|")}`;

/**
 * The Legendary pack: every legendary and mythical Pokémon card with artwork,
 * from every set we offer, sorted A–Z so each Pokémon's cards sit together. Plain
 * Common/Uncommon/Rare cards fill most slots; ex, V, GX, illustration rares
 * and friends are the special pulls.
 */
async function loadLegendary(): Promise<SetData> {
  const byRarity = (r: string) =>
    getJson<CardBrief[]>(`${API}/cards?${LEGENDARY_QUERY}&rarity=eq:${encodeURIComponent(r)}`);
  const [eras, all, ...plainLists] = await Promise.all([
    loadCatalog(),
    getJson<CardBrief[]>(`${API}/cards?${LEGENDARY_QUERY}`),
    byRarity("Common"),
    byRarity("Uncommon"),
    byRarity("Rare"),
  ]);
  // Only cards from sets we offer, so every card has a binder page to go to
  const offered = new Set([...FEATURED, ...eras.flatMap((e) => e.sets)].map((s) => s.id));
  const cards = all
    .filter((c) => c.image && offered.has(setOfBrief(c)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const plain = new Set(plainLists.flat().map((c) => c.id));
  return {
    id: LEGENDARY_PACK,
    name: "Legends Only",
    cards,
    common: [],
    uncommon: [],
    rare: cards.map((c) => c.id).filter((id) => plain.has(id)),
    special: cards.map((c) => c.id).filter((id) => !plain.has(id)),
    kind: "legendary",
  };
}

/** Extra labels for the binder filters: which cards are legendary, Trainers or Energy. */
export type SetTags = { legendary: Set<string>; trainer: Set<string>; energy: Set<string> };

const tagCache = new Map<string, Promise<SetTags>>();

export function loadSetTags(setId: string): Promise<SetTags> {
  const cached = tagCache.get(setId);
  if (cached) return cached;
  const promise =
    setId === ENERGY_PACK
      ? loadSet(setId).then((s) => ({
          legendary: new Set<string>(),
          trainer: new Set<string>(),
          energy: new Set(s.cards.map((c) => c.id)),
        }))
      : (async () => {
          const ids = async (query: string) =>
            new Set((await getJson<CardBrief[]>(`${API}/cards?set.id=eq:${setId}&${query}`)).map((c) => c.id));
          const [legendary, trainer, energy] = await Promise.all([
            ids(LEGENDARY_QUERY),
            ids("category=eq:Trainer"),
            ids("category=eq:Energy"),
          ]);
          return { legendary, trainer, energy };
        })();
  tagCache.set(setId, promise);
  promise.catch(() => tagCache.delete(setId));
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
    category?: string;
    set?: { id: string };
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
    category: c.category ?? "Pokemon",
    setId: c.set?.id ?? c.id.slice(0, c.id.length - c.localId.length - 1),
    // Old holo rares (Base Set Charizard) are labelled "Rare" but only come in holo.
    holoOnly: Boolean(c.variants?.holo && !c.variants?.normal && !c.variants?.reverse),
  }));
  cardCache.set(id, promise);
  promise.catch(() => cardCache.delete(id));
  return promise;
}

/**
 * Does this card get the holographic foil? Anything rarer than plain Rare,
 * holo-only rares, big Pokémon with more than 120 HP, and special energies.
 */
export function isShiny(
  card: Pick<CardDetail, "rarity" | "holoOnly" | "hp" | "name" | "category">,
): boolean {
  // Energies: special energy shines, basic energy doesn't (whatever the rarity says)
  if (card.category === "Energy") return !isBasicEnergy(card.name);
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
  // Energy pack: 3 basic energies, 1 special energy, and a 50/50 last slot.
  if (set.kind === "energy") {
    const pack = [
      take(set.common),
      take(set.common),
      take(set.common),
      take(set.rare),
      take(Math.random() < 0.5 ? set.rare : set.common),
    ];
    return pack.map((id) => id ?? take(set.cards.map((c) => c.id))!).filter(Boolean);
  }
  // Legendary pack: 3 regular legendaries, 1 special one, and a 50/50 last slot.
  if (set.kind === "legendary") {
    const pack = [
      take(set.rare),
      take(set.rare),
      take(set.rare),
      take(set.special),
      take(Math.random() < 0.5 ? set.special : set.rare),
    ];
    return pack.map((id) => id ?? take(set.cards.map((c) => c.id))!).filter(Boolean);
  }

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
