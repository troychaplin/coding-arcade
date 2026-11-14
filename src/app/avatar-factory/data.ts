export type AvatarStyle = "pixel-art" | "bottts" | "adventurer" | "fun-emoji";

export type StyleOption = {
  id: AvatarStyle;
  label: string;
  emoji: string;
  /** Tailwind bg class used for the toggle + card theme */
  color: string;
};

export const STYLES: StyleOption[] = [
  { id: "pixel-art", label: "Pixel Hero", emoji: "👾", color: "bg-sky" },
  { id: "bottts", label: "Robot", emoji: "🤖", color: "bg-lime" },
  { id: "adventurer", label: "Adventurer", emoji: "🗡️", color: "bg-tangerine" },
  { id: "fun-emoji", label: "Weird Monster", emoji: "👹", color: "bg-bubble" },
];

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type RarityInfo = {
  id: Rarity;
  label: string;
  /** Chance out of 100 */
  odds: number;
  /** Power range for this rarity (inclusive) */
  power: [number, number];
  /** Tailwind classes for badge + card frame */
  badge: string;
  frame: string;
  /** Holo overlay class from globals.css, if any */
  holo?: string;
};

/** Rarest last. Odds add up to 100. */
export const RARITIES: RarityInfo[] = [
  {
    id: "common",
    label: "Common",
    odds: 55,
    power: [50, 80],
    badge: "bg-white text-ink",
    frame: "",
  },
  {
    id: "rare",
    label: "Rare",
    odds: 28,
    power: [60, 90],
    badge: "bg-sky text-ink",
    frame: "outline-4 outline-offset-4 outline-sky",
  },
  {
    id: "epic",
    label: "Epic",
    odds: 13,
    power: [75, 98],
    badge: "bg-grape text-white",
    frame: "outline-4 outline-offset-4 outline-grape",
    holo: "holo-epic",
  },
  {
    id: "legendary",
    label: "Legendary",
    odds: 4,
    power: [90, 100],
    badge: "bg-sun text-ink",
    frame: "outline-4 outline-offset-4 outline-sun",
    holo: "holo-legendary",
  },
];

export function rarityInfo(rarity: Rarity | undefined): RarityInfo {
  return RARITIES.find((r) => r.id === rarity) ?? RARITIES[0];
}

export type Stats = {
  rarity: Rarity;
  power: number;
  superpower: string;
  characterClass: string;
};

export type IdCardData = Stats & {
  id: string;
  name: string;
  style: AvatarStyle;
  createdAt: number;
};

export const SUPERPOWERS = [
  "Laser Burp",
  "Teleporting Socks",
  "Infinite Taco Summon",
  "Mega Sneeze",
  "Super Speed (Only Backwards)",
  "Talks to Pigeons",
  "Invisible When Nobody Looks",
  "Turbo Fart Jetpack",
  "Pizza Vision",
  "Unlimited Bubble Gum",
  "Shrink Ray Giggle",
  "Freeze Ray Stare",
  "Rubber Chicken Boomerang",
  "Homework Disintegrator",
];

export const CLASSES = [
  "Legendary Noob",
  "Cosmic Overlord",
  "Captain Chaos",
  "Snack Wizard",
  "Professional Napper",
  "Galactic Goofball",
  "Supreme Button Masher",
  "Duke of Disaster",
  "Rogue Pickle Knight",
  "Grand Master of Oops",
];

const NAME_FIRST = [
  "Captain",
  "Sir",
  "Lady",
  "Mega",
  "Doctor",
  "Baron",
  "Ultra",
  "Lord",
  "Professor",
  "Turbo",
  "Princess",
  "Agent",
];

const NAME_MIDDLE = [
  "Wobble",
  "Snot",
  "Noodle",
  "Pickle",
  "Thunder",
  "Waffle",
  "Goober",
  "Sparkle",
  "Stinky",
  "Fizz",
  "Bonk",
  "Squish",
];

const NAME_LAST = [
  "bottom",
  "beard",
  "face",
  "pants",
  "nugget",
  "toes",
  "muncher",
  "splat",
  "zilla",
  "wiggle",
  "tron",
  "snort",
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomName(): string {
  return `${pick(NAME_FIRST)} ${pick(NAME_MIDDLE)}${pick(NAME_LAST)}`;
}

/** Turn a string into a 32-bit number (FNV-1a hash). */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded random generator (mulberry32): same seed → same numbers. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stats are "baked into" the character: the same name + style always
 * gives the same card, just like DiceBear always draws the same avatar.
 */
export function statsFor(name: string, style: AvatarStyle): Stats {
  const rand = seededRandom(hash(`${name.trim().toLowerCase()}|${style}`));
  const from = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];

  // Spin the rarity wheel: walk the odds until the roll lands.
  let roll = rand() * 100;
  const tier = RARITIES.find((r) => (roll -= r.odds) < 0) ?? RARITIES[0];
  const [min, max] = tier.power;

  return {
    rarity: tier.id,
    power: min + Math.floor(rand() * (max - min + 1)),
    superpower: from(SUPERPOWERS),
    characterClass: from(CLASSES),
  };
}

export function avatarUrl(style: AvatarStyle, name: string): string {
  const seed = encodeURIComponent(name.trim() || "Mystery Hero");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

export function styleOption(style: AvatarStyle): StyleOption {
  return STYLES.find((s) => s.id === style) ?? STYLES[0];
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
