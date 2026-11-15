"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, LoaderCircle, PackageOpen, RotateCcw, ShieldAlert, Sparkles, X } from "lucide-react";
import {
  ENERGY_PACK,
  ENERGY_SET,
  FEATURED,
  cardImage,
  loadSet,
  loadSetTags,
  type CardBrief,
  type SetData,
  type SetTags,
} from "./data";
import { CardFace, ShinyTag } from "./PokeCard";
import SetPicker from "./SetPicker";
import type { Collection, OwnedCard } from "./useCollection";

type Show = "all" | "have" | "missing";
type Kind =
  | "any"
  | "pokemon"
  | "common"
  | "uncommon"
  | "rare"
  | "special"
  | "legendary"
  | "holo"
  | "trainer"
  | "energy";

const SHOW_OPTIONS: { id: Show; label: string }[] = [
  { id: "all", label: "All" },
  { id: "have", label: "✅ Collected" },
  { id: "missing", label: "❓ Missing" },
];

/** Card-type filters. Energy Surge gets its own names for the two kinds of energy. */
function kindOptions(energyPage: boolean): { id: Kind; label: string }[] {
  if (energyPage) {
    return [
      { id: "any", label: "Any energy" },
      { id: "common", label: "⚡ Basic energy" },
      { id: "rare", label: "🌈 Special energy" },
      { id: "holo", label: "✨ My holos" },
    ];
  }
  return [
    { id: "any", label: "Any type" },
    { id: "pokemon", label: "🐾 Pokémon" },
    { id: "common", label: "● Common" },
    { id: "uncommon", label: "◆ Uncommon" },
    { id: "rare", label: "★ Rare" },
    { id: "special", label: "🌟 Ultra rare" },
    { id: "legendary", label: "👑 Legendary" },
    { id: "holo", label: "✨ My holos" },
    { id: "trainer", label: "🧢 Trainer" },
    { id: "energy", label: "🔋 Energy" },
  ];
}

export default function Binder({ collection }: { collection: Collection }) {
  // Show the set they opened last, until they pick another
  const [picked, setPicked] = useState<string | null>(null);
  const setId = picked ?? collection.lastSet ?? FEATURED[1].id;
  const [show, setShow] = useState<Show>("all");
  const [kind, setKind] = useState<Kind>("any");
  const [tags, setTags] = useState<{ setId: string; tags: SetTags } | null>(null);

  const [data, setData] = useState<SetData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [zoomed, setZoomed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSet(setId)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setId, retry]);

  // Which cards are legendary / Trainer / Energy, for the filters (no fuss if it fails)
  useEffect(() => {
    let cancelled = false;
    loadSetTags(setId)
      .then((t) => !cancelled && setTags({ setId, tags: t }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setId]);

  // Cards collected per binder page
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of Object.values(collection.cards)) {
      out[c.setId] = (out[c.setId] ?? 0) + 1;
      // Energies count toward the Energy page whichever pack they came from
      if (c.isEnergy && c.setId !== ENERGY_PACK) out[ENERGY_PACK] = (out[ENERGY_PACK] ?? 0) + 1;
    }
    return out;
  }, [collection.cards]);

  function pickSet(id: string) {
    setPicked(id);
    setShow("all");
    setKind("any");
  }

  // Close the zoomed card with Escape
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  const ready = data !== null && data.id === setId;
  const isEnergyPage = setId === ENERGY_PACK;
  const cards = ready ? data.cards : [];
  const pageTags = tags?.setId === setId ? tags.tags : null;

  // Does a card fit the chosen filters?
  const rarityLists = useMemo(
    () =>
      ready
        ? {
            common: new Set(data.common),
            uncommon: new Set(data.uncommon),
            rare: new Set(data.rare),
            special: new Set(data.special),
          }
        : null,
    [ready, data],
  );
  const isKind = (card: CardBrief, k: Kind, owned: OwnedCard | undefined): boolean => {
    switch (k) {
      case "any":
        return true;
      case "holo":
        return Boolean(owned?.shiny);
      case "common":
      case "uncommon":
      case "rare":
      case "special":
        return Boolean(rarityLists?.[k].has(card.id));
      case "legendary":
      case "trainer":
      case "energy":
        return Boolean(pageTags?.[k].has(card.id));
      case "pokemon":
        return Boolean(pageTags) && !pageTags!.trainer.has(card.id) && !pageTags!.energy.has(card.id);
    }
  };
  const fitsShow = (owned: OwnedCard | undefined) =>
    show === "all" || (show === "have" ? Boolean(owned) : !owned);
  // Only offer filters that match at least one card on this page
  const kinds = kindOptions(isEnergyPage)
    .map((k) => ({
      ...k,
      count: cards.filter((c) => isKind(c, k.id, collection.cards[c.id])).length,
    }))
    .filter((k) => k.id === "any" || k.id === kind || k.count > 0);
  const kindLabel = kinds.find((k) => k.id === kind)?.label ?? "";
  const shown = cards.filter((c) => {
    const owned = collection.cards[c.id];
    return fitsShow(owned) && isKind(c, kind, owned);
  });
  const ownedCount = cards.filter((c) => collection.cards[c.id]).length;
  const holoCount = cards.filter((c) => collection.cards[c.id]?.shiny).length;
  const percent = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0;
  const zoomCard = zoomed ? cards.find((c) => c.id === zoomed) : null;
  const zoomOwned = zoomed ? collection.cards[zoomed] : null;

  return (
    <section className="flex flex-col gap-6">
      <SetPicker
        value={setId}
        onChange={pickSet}
        specials={[ENERGY_SET]}
        counts={counts}
        variant="binder"
        label="Binder set"
      />

      {error ? (
        <div className="chunky rounded-3xl bg-white p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-tomato" />
          <p className="mt-2 font-display text-lg">Couldn&apos;t load this binder page.</p>
          <button
            type="button"
            onClick={() => setRetry((r) => r + 1)}
            className="chunky pop mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-sun px-5 py-2 font-display"
          >
            <RotateCcw className="size-5" /> Try again
          </button>
        </div>
      ) : !ready ? (
        <div className="chunky grid place-items-center rounded-3xl bg-white p-12">
          <LoaderCircle className="size-10 animate-spin text-grape" />
          <p className="mt-2 font-display">Opening your binder…</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="chunky rounded-3xl bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-xl">
                Set Completion: {ownedCount} / {cards.length}
              </p>
              <p className="flex items-center gap-1 text-sm font-bold text-ink/70">
                <Sparkles className="size-4 text-tangerine" /> {holoCount} holo cards found
              </p>
            </div>
            <div className="mt-3 h-6 overflow-hidden rounded-full border-[3px] border-ink bg-ink/10">
              <div
                className="h-full border-r-[3px] border-ink bg-gradient-to-r from-lime via-sun to-tomato transition-[width] duration-700"
                style={{ width: `${Math.max(percent, ownedCount ? 3 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-ink/60">
              {percent}% complete
              {ownedCount === 0 && " — open some packs to start filling your binder!"}
            </p>
          </div>

          {/* Filters: one slim toolbar */}
          <div className="chunky flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-white px-4 py-3">
            <div role="radiogroup" aria-label="Show" className="flex overflow-hidden rounded-full border-[3px] border-ink">
              {SHOW_OPTIONS.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={o.id === show}
                  onClick={() => setShow(o.id)}
                  className={`cursor-pointer px-3 py-1.5 text-sm font-bold ${i ? "border-l-[3px] border-ink" : ""} ${
                    o.id === show ? "bg-ink text-white" : "bg-white hover:bg-sun"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <Filter className="size-4" /> Card type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
                className="cursor-pointer rounded-full border-[3px] border-ink bg-paper px-3 py-1.5 font-bold outline-none focus:shadow-[0_0_0_3px_var(--color-sun)]"
              >
                {kinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.id === "any" ? k.label : `${k.label} (${k.count})`}
                  </option>
                ))}
              </select>
            </label>
            {kind !== "any" && (
              <button
                type="button"
                onClick={() => setKind("any")}
                aria-label={`Clear the ${kindLabel} filter`}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-ink bg-sun px-3 py-1 text-sm font-bold"
              >
                <X className="size-3.5" strokeWidth={3} /> {kindLabel}
              </button>
            )}
            <span className="ml-auto text-sm font-semibold text-ink/60">
              Showing {shown.length} of {cards.length}
            </span>
          </div>

          {/* Card grid */}
          {shown.length === 0 && (
            <p className="chunky rounded-3xl bg-white p-8 text-center font-display text-lg">
              No cards match these filters{show === "have" ? " yet — keep opening packs!" : "."}
            </p>
          )}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shown.map((card) => {
              const owned = collection.cards[card.id];
              return (
                <li key={card.id}>
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => setZoomed(card.id)}
                      aria-label={`${card.name}, owned ${owned.count}`}
                      className="relative block w-full cursor-pointer rounded-xl transition-transform hover:-translate-y-1 hover:rotate-1"
                    >
                      <CardFace
                        src={cardImage(card.image, "high.webp")}
                        alt={card.name}
                        shiny={owned.shiny}
                        className="border-2 border-ink"
                      />
                      <span className="absolute -right-1 -top-1 z-10 rounded-full border-2 border-ink bg-sun px-2 text-xs font-bold">
                        ×{owned.count}
                      </span>
                    </button>
                  ) : (
                    <div
                      aria-label={`${isEnergyPage ? card.name : `Card #${card.localId}`}, not found yet`}
                      className="relative grid aspect-[63/88] place-items-center overflow-hidden rounded-xl border-2 border-ink/40 bg-gradient-to-br from-[#1d1a2b] to-[#3a2f5c]"
                    >
                      <span className="font-display text-4xl text-white/30">?</span>
                      <span className="absolute inset-x-1 bottom-1.5 truncate text-center text-[10px] font-bold text-white/40">
                        {isEnergyPage ? card.name.replace(/^Basic /, "").replace(/ Energy$/, "") : `#${card.localId}`}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {ownedCount < cards.length && (
            <Link
              href="/pack-opener"
              className="chunky pop inline-flex items-center justify-center gap-2 self-center rounded-2xl bg-tomato px-6 py-3 font-display text-white"
            >
              <PackageOpen className="size-5" /> Open more packs
            </Link>
          )}
        </>
      )}

      {/* Zoomed card */}
      {zoomCard && zoomOwned && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomCard.name}
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-xs animate-card-in flex-col items-center gap-3">
            <CardFace src={cardImage(zoomCard.image)} alt={zoomCard.name} shiny={zoomOwned.shiny} />
            <div className="chunky-sm flex w-full flex-col items-center gap-1 rounded-2xl bg-white px-4 py-3 text-center">
              <p className="font-display text-lg leading-tight">{zoomCard.name}</p>
              <p className="text-sm font-semibold text-ink/60">
                #{zoomCard.localId} · {zoomOwned.rarity} · pulled {zoomOwned.count}×
              </p>
              {zoomOwned.shiny && <ShinyTag />}
            </div>
            <button
              type="button"
              onClick={() => setZoomed(null)}
              autoFocus
              className="chunky-sm pop-sm inline-flex cursor-pointer items-center gap-2 rounded-full bg-sun px-4 py-2 font-bold"
            >
              <X className="size-4" /> Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
