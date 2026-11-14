// Data + rules for Secret Identity Detective.

export const ROSTER_URL =
  "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json";

/** Shape of one hero in the Superhero API (only the fields we use). */
type ApiHero = {
  id: number;
  name: string;
  powerstats: Record<string, number | null>;
  appearance: {
    gender: string | null;
    race: string | null;
    height: string[];
    eyeColor: string | null;
    hairColor: string | null;
  };
  biography: {
    fullName: string | null;
    firstAppearance: string | null;
    publisher: string | null;
    alignment: string | null;
  };
  work: { occupation: string | null; base: string | null };
  connections: { groupAffiliation: string | null; relatives: string | null };
  images: { lg?: string };
};

export type PowerStats = {
  intelligence: number;
  strength: number;
  speed: number;
  durability: number;
  power: number;
  combat: number;
};

/** A cleaned-up hero ready for the game. Missing values are `null`. */
export type Suspect = {
  id: number;
  name: string;
  image: string;
  /** Which world they come from: Marvel, DC, or another universe */
  group: "marvel" | "dc" | "other";
  /** Kid-friendly universe name: "Marvel", "DC", "Star Wars", "Anime & Manga"… */
  universe: string;
  alignment: "good" | "bad" | "neutral";
  gender: string | null;
  race: string | null;
  height: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  occupation: string | null;
  base: string | null;
  groups: string | null;
  relatives: string | null;
  fullName: string | null;
  firstAppearance: string | null;
  stats: PowerStats;
  powerTotal: number;
  /** On the hand-picked list of characters kids know from movies & cartoons */
  kidFamous: boolean;
};

/* ---------------------------------------------------------------------------
 * Categories (which heroes a case can be about)
 * ------------------------------------------------------------------------- */

export type Category = "famous" | "all" | "marvel" | "dc" | "other";

export const CATEGORIES: Record<
  Category,
  { label: string; emoji: string; includes: (s: Suspect) => boolean }
> = {
  famous: { label: "Famous", emoji: "⭐", includes: (s) => s.kidFamous },
  all: { label: "All", emoji: "🌎", includes: () => true },
  dc: { label: "DC", emoji: "🔵", includes: (s) => s.group === "dc" },
  marvel: { label: "Marvel", emoji: "🔴", includes: (s) => s.group === "marvel" },
  other: { label: "Other", emoji: "🌌", includes: (s) => s.group === "other" },
};

/** Portrait blur for each clue (index 0 = clue 1) */
export const BLUR_STEPS = [16, 11, 7, 4, 1.5];

/**
 * How many suspect names to show at each clue. Clue 1 shows none (type your
 * guess), then 8 → 6 → 4 → 2 names to tap, always including the answer.
 */
export const SUSPECT_COUNTS = [0, 8, 6, 4, 2];

/**
 * Characters most kids know from movies, shows and cartoons, by API id.
 * Ids (not names) pick the right version when the API has two with the same
 * name, e.g. Bruce Wayne's Batman (70) and Carol Danvers' Captain Marvel (157).
 */
const KID_FAMOUS_IDS = new Set([
  // Marvel heroes
  620, 346, 149, 659, 332, 107, 313, 106, 157, 226, 30, 708, 697, 251, 714,
  630, 275, 234, 566, 303, 717, 638, 196, 356, 598, 456, 344, 333, 658, 489,
  201, 280, 567, 274, 75, 339, 490, 527, 589, 470, 587, 431, 703,
  // Marvel villains
  579, 687, 655, 414, 680, 423, 299, 225, 480, 237, 479, 395, 556, 701, 412,
  550, 379, 487,
  // DC heroes
  70, 644, 720, 263, 38, 194, 561, 63, 643, 165, 432, 76, 632, 298, 98, 315,
  730, 73, 634,
  // DC villains
  370, 309, 514, 558, 678, 522, 60, 405, 204, 576, 136, 230, 95, 294, 386,
  105, 538,
  // Other universes: Star Wars, The Incredibles, Ninja Turtles, anime & more
  208, 729, 418, 307, 555, 398, 127, 639, 289, 485, 686, 310, 435, 476, 236,
  696, 209, 351, 228, 404, 450, 541, 389,
]);

/* ---------------------------------------------------------------------------
 * Cleaning the API data
 * ------------------------------------------------------------------------- */

/** Turn the API's many ways of saying "unknown" into null. */
function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  if (!v || v === "-" || v === "null" || v === "0 cm" || /^no\s/i.test(v)) {
    return null;
  }
  return v;
}

/**
 * Shorten a long API list into a few kid-sized items: "Avengers, Illuminati,
 * Stark Resilient; formerly S.H.I.E.L.D., ..." → "Avengers, Illuminati, Stark
 * Resilient". Drops "formerly ..." parts, notes in brackets and "deceased".
 */
export function kidList(text: string | null, max = 3, keepNotes = false): string | null {
  if (!text) return null;
  const items = text
    // Keep helpful notes like "(son)" for family; drop the rest.
    .replace(/\([^)]*\)/g, (m) =>
      keepNotes && !/deceased|allegedly|presumed|estranged/i.test(m) ? m : "",
    )
    .split(/[;,]/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .map((p) => (/^mobile\b/i.test(p) ? "Always on the move 🚀" : p))
    .filter(
      (p) =>
        p &&
        !/^(formerly|former|currently unrevealed|unrevealed|unnamed|unborn)\b/i.test(p),
    )
    // Once a list says "formerly", the rest is old news.
    .reduce<string[]>((acc, p) => {
      if (acc.includes("__stop__")) return acc;
      const cut = p.split(/\bformerly\b/i)[0].trim();
      if (cut) acc.push(cut);
      if (cut !== p) acc.push("__stop__");
      return acc;
    }, [])
    .filter((p) => p !== "__stop__");
  return items.length ? items.slice(0, max).join(", ") : null;
}

/**
 * The API has a data error: for about 50 heroes the publisher field holds an
 * alter-ego name (Thor's says "Rune King Thor", Superman's "Superman Prime
 * One-Million"). These heroes are put back with their real publisher.
 */
const DC_FIXES = new Set([
  "Batgirl", "Batgirl VI", "Batman II", "Flash II", "Flash III", "Flash IV",
  "Huntress", "Impulse", "Misfit", "Nightwing", "Oracle", "Red Hood",
  "Red Robin", "Robin", "Robin II", "Robin III", "Spectre", "Superman",
]);
const MARVEL_FIXES = new Set([
  "Angel", "Angel Salvadore", "Ant-Man", "Anti-Venom", "Archangel", "Atlas",
  "Boom-Boom", "Box IV", "Captain Marvel", "Deadpool", "Evil Deadpool",
  "Hawkeye", "Jean Grey", "Jessica Jones", "Kang", "Luke Cage", "Meltdown",
  "Ms Marvel II", "Phoenix", "Ronin", "Scarlet Spider", "Scorpion",
  "She-Thing", "Tempest", "Thor", "Toxin", "Venom", "Venom III", "Venompool",
  "Vindicator", "Vision", "Warpath", "Yellowjacket",
]);

/**
 * Friendly names for publishers outside Marvel & DC. The API names the
 * company or creator ("George Lucas", "Shueisha"); kids know the franchise.
 */
const UNIVERSE_NAMES: Record<string, string> = {
  "George Lucas": "Lucasfilm (Star Wars & more)",
  Shueisha: "Anime & Manga",
  "IDW Publishing": "IDW Comics",
  "Sony Pictures": "Sony movies",
  "Universal Studios": "Universal movies",
  "J. K. Rowling": "Wizarding World",
  "J. R. R. Tolkien": "Middle-earth",
  Microsoft: "Halo (video game)",
  Rebellion: "2000 AD comics",
  "Titan Books": "Spy novels",
};

/**
 * Grown-up TV dramas young kids won't know (NBC's Heroes, SyFy's Alphas,
 * ABC's No Ordinary Family) — left out of the game entirely.
 */
const LEFT_OUT_PUBLISHERS = new Set(["NBC - Heroes", "SyFy", "ABC Studios"]);

function universeOf(publisher: string | null): string {
  if (!publisher) return "Movies & TV";
  if (publisher === "Marvel Comics") return "Marvel";
  if (publisher === "DC Comics") return "DC";
  return UNIVERSE_NAMES[publisher] ?? publisher;
}

function publisherOf(h: ApiHero): string | null {
  const p = h.biography.publisher;
  if (p === "Marvel Comics" || p === "DC Comics") return p;
  if (DC_FIXES.has(h.name)) return "DC Comics";
  if (MARVEL_FIXES.has(h.name)) return "Marvel Comics";
  return p;
}

const titleCase = (v: string | null) =>
  v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : null;

export function toSuspects(data: ApiHero[]): Suspect[] {
  const out: Suspect[] = [];
  for (const h of data) {
    const publisher = publisherOf(h);
    const alignment = h.biography.alignment;
    const image = h.images?.lg;
    if (!image || !/^https?:\/\//.test(image)) continue;
    if (alignment !== "good" && alignment !== "bad" && alignment !== "neutral") continue;
    if (publisher && LEFT_OUT_PUBLISHERS.has(publisher)) continue;

    const s = {
      gender: clean(h.appearance.gender),
      race: clean(h.appearance.race),
      height: clean(h.appearance.height?.[0]),
      occupation: clean(h.work.occupation),
      base: clean(h.work.base),
      groups: clean(h.connections.groupAffiliation),
      relatives: clean(h.connections.relatives),
    };
    // Need at least 3 real clue fields across appearance, work and connections.
    if (Object.values(s).filter(Boolean).length < 3) continue;

    const stat = (k: keyof PowerStats) => h.powerstats[k] ?? 0;
    const stats: PowerStats = {
      intelligence: stat("intelligence"),
      strength: stat("strength"),
      speed: stat("speed"),
      durability: stat("durability"),
      power: stat("power"),
      combat: stat("combat"),
    };
    const heightCm = clean(h.appearance.height?.[1]);

    out.push({
      id: h.id,
      name: h.name,
      image,
      group:
        publisher === "Marvel Comics" ? "marvel" : publisher === "DC Comics" ? "dc" : "other",
      universe: universeOf(publisher),
      alignment,
      gender: s.gender,
      race: s.race,
      height: s.height && heightCm ? `${s.height}" (${heightCm})` : s.height,
      hairColor: titleCase(clean(h.appearance.hairColor)),
      eyeColor: titleCase(clean(h.appearance.eyeColor)),
      occupation: s.occupation,
      base: s.base,
      groups: s.groups,
      relatives: s.relatives,
      fullName: clean(h.biography.fullName),
      firstAppearance: clean(h.biography.firstAppearance),
      stats,
      powerTotal: Object.values(stats).reduce((a, b) => a + b, 0),
      kidFamous: KID_FAMOUS_IDS.has(h.id),
    });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Guessing helpers
 * ------------------------------------------------------------------------- */

/** Lowercase and drop spaces, hyphens and punctuation: "Spider Man" = "spider-man". */
export function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Hero names for the typing autocomplete, best matches first. */
export function suggest(names: string[], query: string, limit = 8): string[] {
  const q = normalize(query);
  if (!q) return [];
  const exact: string[] = [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of names) {
    const n = normalize(name);
    if (n === q) exact.push(name);
    else if (n.startsWith(q)) starts.push(name);
    else if (n.includes(q)) contains.push(name);
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}

/**
 * The suspect names to show for a clue: the answer plus decoys, shuffled.
 * The list only ever shrinks: decoys come from the previous list when there is
 * one (so names don't jump around), and wrong guesses are never shown again.
 */
export function suspectList(
  secret: Suspect,
  pool: Suspect[],
  previous: string[],
  ruledOut: string[],
  count: number,
): string[] {
  if (count <= 0) return [];
  const isAnswer = (n: string) => normalize(n) === normalize(secret.name);
  const source = previous.length ? previous : [...new Set(pool.map((s) => s.name))];
  const decoys = source.filter((n) => !isAnswer(n) && !ruledOut.includes(n));

  const picks: string[] = [];
  while (picks.length < count - 1 && decoys.length) {
    picks.push(decoys.splice(Math.floor(Math.random() * decoys.length), 1)[0]);
  }
  // Shrinking an existing list: keep the names in the same order.
  if (previous.length) {
    return previous.filter((n) => isAnswer(n) || picks.includes(n));
  }
  const list = [...picks, secret.name];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Replace the hero's codename with [REDACTED] so a clue can't give it away.
 * "Batgirl IV" also hides "Batgirl", "Spider-Man" also hides "Spider Man" and
 * "Spiderman", and the rest of the word goes too ("Abominations", "Hulkbuster").
 */
export function redact(text: string, name: string): string {
  const base = name
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s+(?:I|II|III|IV|V|VI)$/i, "");
  const words = base.split(/[\s-]+/).filter(Boolean);
  if (!words.length) return text;
  // Letters may be split by dots too: "MODOK" also hides "M.O.D.O.K."
  const escapeChar = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const SHORT_FORMS: Record<string, string> = {
    mister: "(?:mister|mr\\.?)",
    doctor: "(?:doctor|dr\\.?)",
  };
  const wordPattern = (w: string) =>
    SHORT_FORMS[w.toLowerCase()] ??
    w.replace(/\./g, "").split("").map(escapeChar).join("\\.?");
  const pattern = new RegExp(
    `(?<![A-Za-z])${words.map(wordPattern).join("[\\s-]?")}\\.?[A-Za-z']*`,
    "gi",
  );
  return text.replace(pattern, "[REDACTED]");
}

/** "Spider-Man" → "S _ _ _ _ _ - M _ _" (first letter of each word shown) */
export function namePuzzle(name: string): string {
  return name
    .split("")
    .map((ch, i, all) => {
      if (!/[A-Za-z0-9]/.test(ch)) return ch === " " ? "   " : ` ${ch} `;
      const startOfWord = i === 0 || !/[A-Za-z0-9]/.test(all[i - 1]);
      return startOfWord ? ch.toUpperCase() : "_";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------------------------------------------------------------------
 * Clues
 * ------------------------------------------------------------------------- */

export type ClueRow = { label: string; value: string };
export type Clue = {
  title: string;
  emoji: string;
  points: number;
  rows: ClueRow[];
  /** Power bars (clue 1) */
  stats?: PowerStats;
  /** Letter puzzle (clue 5) */
  puzzle?: string;
};

export const STAT_LABELS: { key: keyof PowerStats; label: string; emoji: string }[] = [
  { key: "strength", label: "Strength", emoji: "💪" },
  { key: "speed", label: "Speed", emoji: "⚡" },
  { key: "intelligence", label: "Brains", emoji: "🧠" },
  { key: "durability", label: "Toughness", emoji: "🛡️" },
  { key: "power", label: "Powers", emoji: "✨" },
  { key: "combat", label: "Fighting", emoji: "🥊" },
];

const show = (v: string | null) => v ?? "Classified";

/**
 * The 5 clues, from broad to "you've got this!". Built for younger detectives:
 * power bars and looks first, then hideout & team, then the real name and
 * family, and finally a letter puzzle of the hero name.
 * `reveal` turns off redaction (for the end-of-round dossier).
 */
export function cluesFor(s: Suspect, reveal = false): Clue[] {
  const hide = (v: string | null) =>
    v == null ? "Classified" : reveal ? v : redact(v, s.name);

  // Some characters' real name IS their hero name (Groot, Thanos, Harley Quinn).
  const realNameGivesItAway =
    s.fullName != null &&
    (normalize(s.fullName).includes(normalize(s.name)) ||
      normalize(s.name).includes(normalize(s.fullName)));
  const realName =
    s.fullName == null
      ? "Classified"
      : realNameGivesItAway && !reveal
        ? "Same as their hero name! 🤫"
        : s.fullName;

  return [
    {
      title: "Hero File",
      emoji: "🦸",
      points: 500,
      rows: [
        {
          label: "Hero or Villain?",
          value:
            s.alignment === "good"
              ? "Hero 😇"
              : s.alignment === "bad"
                ? "Villain 😈"
                : "Anti-hero 😏 (a bit of both!)",
        },
        { label: "Universe", value: s.universe },
        { label: "Gender", value: show(s.gender) },
      ],
      stats: s.stats,
    },
    {
      title: "Looks",
      emoji: "👀",
      points: 400,
      rows: [
        { label: "Species", value: hide(s.race) },
        { label: "Hair", value: show(s.hairColor) },
        { label: "Eyes", value: show(s.eyeColor) },
        { label: "Height", value: show(s.height) },
      ],
    },
    {
      title: "Hideout & Team",
      emoji: "🏙️",
      points: 300,
      rows: [
        { label: "Hideout", value: hide(kidList(s.base, 3)) },
        { label: "Teams", value: hide(kidList(s.groups, 3)) },
      ],
    },
    {
      title: "Secret Identity",
      emoji: "🪪",
      points: 200,
      rows: [
        { label: "Real Name", value: realName },
        { label: "Family & Friends", value: hide(kidList(s.relatives, 3, true)) },
      ],
    },
    {
      title: "Name Puzzle",
      emoji: "🔤",
      points: 100,
      rows: [
        {
          label: "Letters",
          value: `${s.name.replace(/[^A-Za-z0-9]/g, "").length} letters`,
        },
      ],
      puzzle: namePuzzle(s.name),
    },
  ];
}
