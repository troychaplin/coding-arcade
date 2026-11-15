"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { BookOpen, Coins, Crown, Gift, LoaderCircle, PackageOpen, RotateCcw, ShieldAlert, Wand2 } from "lucide-react";
import {
  ENERGY_SET,
  FEATURED,
  LEGENDARY_SET,
  PACKS_PER_REFILL,
  PACK_PRICE,
  buildPack,
  findSet,
  cardImage,
  isShiny,
  loadCard,
  loadSet,
  type CardDetail,
  type PackSet,
} from "./data";
import { CardFace, FlipCard, SetLogo, ShinyTag, prefersReducedMotion } from "./PokeCard";
import { freePacksNow } from "./PokeCollector";
import SetPicker, { useCatalog } from "./SetPicker";
import type { Collection, PullResult } from "./useCollection";

type Phase = "select" | "loading" | "tearing" | "reveal";
type Pack = { setId: string; cards: CardDetail[]; results: PullResult[] };

export default function PackOpening({
  collection,
  now,
  payForPack,
  addPack,
}: {
  collection: Collection;
  now: number;
  payForPack: (how: "free" | "coins", price: number) => boolean;
  addPack: (setId: string, cards: CardDetail[]) => PullResult[];
}) {
  const [setId, setSetId] = useState("sv03.5");
  const [phase, setPhase] = useState<Phase>("select");
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  /** Bumped to bring the pack back after it's been torn away */
  const [packKey, setPackKey] = useState(0);
  /** Which key started the current opening (for its spinner) */
  const [opening, setOpening] = useState({ coins: false });

  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<Animation | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    shakeRef.current?.cancel();
  }, []);

  useCatalog(); // re-render once the full set list arrives, so findSet sees it
  const chosen = findSet(setId) ?? FEATURED[1];
  const price = chosen.price ?? PACK_PRICE;
  const { available } = freePacksNow(collection, now);
  const canFree = !chosen.coinsOnly && available > 0;
  const canBuy = collection.coins >= price;
  const busy = phase === "loading" || phase === "tearing";

  async function rip(how: "free" | "coins") {
    if (phase !== "select") return;
    if (how === "free" ? !canFree : !canBuy) return;
    setError(null);
    setOpening({ coins: how === "coins" });
    setPhase("loading");
    // Wiggle the pack while the cards load
    if (!prefersReducedMotion()) {
      shakeRef.current = bodyRef.current?.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-4deg) scale(1.02)" },
          { transform: "rotate(4deg) scale(1.02)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 380, iterations: Infinity },
      ) ?? null;
    }

    try {
      const set = await loadSet(setId);
      const ids = buildPack(set);
      const cards = await Promise.all(ids.map(loadCard));
      // Start downloading the artwork during the tear animation
      cards.forEach((c) => {
        const img = new Image();
        img.src = cardImage(c.image);
      });

      // Only charge once the pack actually loaded
      if (!payForPack(how, price)) throw new Error("Not enough packs or coins");
      const results = addPack(setId, cards);
      setPack({ setId, cards, results });
      setFlipped(cards.map(() => false));
      tear();
    } catch {
      shakeRef.current?.cancel();
      setPhase("select");
      setError("Oh no! The card factory didn't answer. Check the internet and try again.");
    }
  }

  /** Rip the wrapper: the top flies off, the pack drops away, cards slide out. */
  function tear() {
    shakeRef.current?.cancel();
    setPhase("tearing");
    if (!prefersReducedMotion()) {
      topRef.current?.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: "translate(40px, -140px) rotate(28deg)", opacity: 0 },
        ],
        { duration: 650, easing: "cubic-bezier(0.3, 1.4, 0.6, 1)", fill: "forwards" },
      );
      bodyRef.current?.animate(
        [
          { transform: "translateY(0) scale(1)", opacity: 1 },
          { transform: "translateY(-12px) scale(1.05)", opacity: 1, offset: 0.35 },
          { transform: "translateY(120px) scale(0.85)", opacity: 0 },
        ],
        { duration: 800, delay: 250, easing: "ease-in", fill: "forwards" },
      );
    }
    timer.current = setTimeout(() => {
      setPhase("reveal");
      setPackKey((k) => k + 1); // the opened wrapper comes back, dimmed, while the cards are out
    }, prefersReducedMotion() ? 50 : 1000);
  }

  function flip(i: number) {
    setFlipped((f) => f.map((v, j) => (j === i ? true : v)));
  }

  function backToPacks() {
    setPack(null);
    setFlipped([]);
    setPhase("select");
    setPackKey((k) => k + 1); // bring the (torn-away) pack back
  }

  /** Picking another set mid-reveal goes straight back to choosing (the cards are saved) */
  function chooseSet(id: string) {
    if (phase === "reveal") backToPacks();
    setSetId(id);
  }

  const revealing = phase === "reveal" && pack !== null;
  const allFlipped = revealing && flipped.every(Boolean);
  const newCount = pack?.results.filter((r) => r.isNew).length ?? 0;
  const coinsEarned = pack?.results.reduce((sum, r) => sum + r.coins, 0) ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 font-display text-2xl">Choose a booster pack</h2>
        <SetPicker
          value={setId}
          onChange={chooseSet}
          specials={[ENERGY_SET, LEGENDARY_SET]}
          disabled={busy}
          variant="pack"
          label="Booster pack"
        />
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        {/* The pack (drawn full size, shown at two-thirds) */}
        <div className="relative mx-auto h-64 w-[9.6rem]">
          <div
            key={packKey}
            className={`absolute left-0 top-0 h-[25rem] w-60 origin-top-left scale-[0.64] transition-opacity duration-500 ${
              revealing ? "opacity-35 grayscale-[0.4]" : ""
            }`}
          >
            <div ref={bodyRef} className="absolute inset-0">
              <PackArt set={chosen} topRef={topRef} />
            </div>
          </div>
        </div>

        {/* Keys and what's happening */}
        <div className="flex flex-col gap-3">
          <p className="font-semibold">
            {chosen.id === LEGENDARY_SET.id ? (
              <>
                Every card is a <strong>legendary or mythical Pokémon</strong>, from any set, and it
                goes into that set&apos;s page in your binder. 👑
              </>
            ) : (
              <>
                Every pack has <strong>5 cards</strong>, including at least one rare. Holo cards shine
                when you move over them! ✨
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!revealing ? (
              <>
                {!chosen.coinsOnly && (
                  <button
                    type="button"
                    onClick={() => rip("free")}
                    disabled={busy || !canFree}
                    className="dex-key bg-[linear-gradient(#f2526a,#c81d36)] text-[#fff]"
                  >
                    {phase !== "select" && !opening.coins ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <PackageOpen className="size-5" strokeWidth={2.5} />
                    )}
                    Open pack
                    <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs tabular-nums">{available} free</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => rip("coins")}
                  disabled={busy || !canBuy}
                  className="dex-key bg-[linear-gradient(#ffd25a,#e9a400)] text-[#10131c]"
                >
                  {phase !== "select" && opening.coins ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <Coins className="size-5" strokeWidth={2.5} />
                  )}
                  Buy pack
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs tabular-nums">{price} 🪙</span>
                </button>
              </>
            ) : !allFlipped ? (
              <button
                type="button"
                onClick={() => setFlipped(pack.cards.map(() => true))}
                className="dex-key bg-[linear-gradient(#3e4860,#232a3b)] text-[#fff]"
              >
                <Wand2 className="size-5" /> Flip all
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToPacks}
                  autoFocus
                  className="dex-key bg-[linear-gradient(#f2526a,#c81d36)] text-[#fff]"
                >
                  <RotateCcw className="size-5" /> Open another pack
                </button>
                <Link href="/binder" className="dex-key bg-[linear-gradient(#3e4860,#232a3b)] text-[#fff]">
                  <BookOpen className="size-5" /> See my binder
                </Link>
              </>
            )}
          </div>

          {/* One short line about what to do next */}
          <p className="flex items-center gap-2 text-sm font-semibold text-ink/70" role="status">
            {revealing ? (
              allFlipped ? (
                <span className="text-ink">
                  🎉{" "}
                  {newCount > 0
                    ? `${newCount} new card${newCount === 1 ? "" : "s"} for your binder!`
                    : "No new cards this time…"}
                  {coinsEarned > 0 && ` +${coinsEarned} Poké-Coins from duplicates 🪙`}
                </span>
              ) : (
                "Tap each card on the table to flip it."
              )
            ) : chosen.coinsOnly ? (
              <>
                <Crown className="size-4 shrink-0 text-grape" /> {chosen.name} packs can&apos;t use free
                packs. Buy one with Poké-Coins
                {!canBuy && ` (you have ${collection.coins})`}.
              </>
            ) : available > 0 ? (
              <>
                <Gift className="size-4 shrink-0" /> Opening uses a free pack. Buying uses {price} Poké-Coins
                {!canBuy && ` (you have ${collection.coins})`}.
              </>
            ) : (
              <>
                <Gift className="size-4 shrink-0" /> No free packs right now, {PACKS_PER_REFILL} more are on
                their way!
              </>
            )}
          </p>

          {error && (
            <p role="alert" className="chunky-sm flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-tomato">
              <ShieldAlert className="size-5 shrink-0" /> {error}
            </p>
          )}
        </div>
      </div>

      {/* The card table: five spaces the pack is dealt into */}
      <div className="dex-table px-4 pb-5 pt-5 sm:px-6">
        <ul className="flex flex-wrap justify-center gap-3 sm:grid sm:grid-cols-5 sm:gap-4">
          {Array.from({ length: 5 }, (_, i) => {
            const card = revealing && pack ? pack.cards[i] : undefined;
            const result = revealing && pack ? pack.results[i] : undefined;
            return card && result ? (
              <RevealSlot
                key={`${card.id}-${i}`}
                index={i}
                card={card}
                result={result}
                flipped={flipped[i]}
                onFlip={() => flip(i)}
                className="w-[30%] sm:w-auto"
              />
            ) : (
              <li key={`empty-${i}`} className="w-[30%] sm:w-auto">
                <div
                  className={`grid aspect-[63/88] place-items-center rounded-xl border-2 border-dashed border-[#e9edf7]/20 bg-[#fff]/[0.03] ${
                    busy ? "animate-pulse" : ""
                  }`}
                >
                  <span className="font-display text-2xl text-[#e9edf7]/20">{i + 1}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {!revealing && (
          <p className="mt-4 text-center text-sm font-semibold text-ink/50">
            {busy ? "Dealing your cards…" : "Your 5 cards land here."}
          </p>
        )}
      </div>
    </section>
  );
}

/** Our own booster pack artwork: foil wrapper, crimped top, the set's logo. */
function PackArt({
  set,
  topRef,
}: {
  set: PackSet;
  topRef: RefObject<HTMLDivElement | null>;
}) {
  const crimp = {
    backgroundImage:
      "repeating-linear-gradient(90deg, rgb(255 255 255 / 0.55) 0 4px, rgb(0 0 0 / 0.15) 4px 8px)",
  };
  return (
    <div className="relative h-full w-full">
      {/* Top strip that rips off */}
      <div
        ref={topRef}
        className={`chunky-sm absolute inset-x-0 top-0 z-10 h-12 rounded-t-2xl bg-gradient-to-br ${set.wrapper}`}
      >
        <div className="absolute inset-x-0 top-0 h-4 rounded-t-xl" style={crimp} />
        <p className="absolute inset-x-0 bottom-1 text-center font-display text-[11px] tracking-widest text-white">
          ✂ TEAR HERE ✂
        </p>
      </div>
      {/* Pack body */}
      <div
        className={`chunky absolute inset-x-0 bottom-0 top-11 flex flex-col items-center justify-between overflow-hidden rounded-b-2xl bg-gradient-to-br px-4 pb-5 pt-6 ${set.wrapper}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.7) 45%, transparent 60%), repeating-radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.18) 0 6px, transparent 6px 14px)",
          }}
        />
        <span className="relative grid h-24 w-full place-items-center rounded-2xl border-[3px] border-[#10131c] bg-[#fff] p-3">
          <SetLogo set={set} alt={`${set.name} logo`} className="h-[4.5rem]" large />
        </span>
        <div className="relative text-center text-white [text-shadow:2px_2px_0_#10131c]">
          <p className="font-display text-2xl leading-tight">{set.name}</p>
          <p className="font-display text-xs tracking-widest">BOOSTER PACK · {set.subtitle}</p>
        </div>
        <span className="relative rounded-full border-[3px] border-ink bg-sun px-4 py-1 font-display text-sm">
          5 CARDS
        </span>
        <div className="absolute inset-x-0 bottom-0 h-3" style={crimp} />
      </div>
    </div>
  );
}

function RevealSlot({
  index,
  card,
  result,
  flipped,
  onFlip,
  className = "",
}: {
  index: number;
  card: CardDetail;
  result: PullResult;
  flipped: boolean;
  onFlip: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const shiny = isShiny(card);

  // Slide each card out of the pack, one after another
  useEffect(() => {
    if (prefersReducedMotion()) return;
    ref.current?.animate(
      [
        { transform: "translateY(-90px) scale(0.6) rotate(-8deg)", opacity: 0 },
        { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1 },
      ],
      { duration: 450, delay: index * 110, easing: "cubic-bezier(0.3, 1.4, 0.6, 1)", fill: "backwards" },
    );
  }, [index]);

  return (
    <li ref={ref} className={`flex flex-col items-center gap-2 ${className}`}>
      <div className={`w-full rounded-xl ${flipped && shiny ? "shadow-[0_0_24px_6px_rgb(255_210_63/0.8)]" : ""}`}>
        <FlipCard
          flipped={flipped}
          onFlip={onFlip}
          label={card.name}
          front={<CardFace src={cardImage(card.image)} alt={card.name} shiny={shiny} />}
        />
      </div>
      {flipped && (
        <div className="flex animate-card-in flex-col items-center gap-1 text-center">
          <p className="font-display text-sm leading-tight">{card.name}</p>
          <p className="text-xs font-semibold text-ink/60">{card.rarity}</p>
          <div className="flex flex-wrap justify-center gap-1">
            {result.isNew ? (
              <span className="rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold">NEW!</span>
            ) : (
              <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[11px] font-bold">
                Duplicate +{result.coins} 🪙
              </span>
            )}
            {shiny && <ShinyTag />}
          </div>
        </div>
      )}
    </li>
  );
}
