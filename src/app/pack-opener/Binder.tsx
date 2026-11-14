"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, PackageOpen, RotateCcw, ShieldAlert, Sparkles, X } from "lucide-react";
import { ENERGY_PACK, PACK_SETS, cardImage, loadSet, type SetData } from "./data";
import { CardFace, SetLogo, ShinyTag } from "./PokeCard";
import type { Collection } from "./useCollection";

export default function Binder({ collection }: { collection: Collection }) {
  // Show the set they opened last, until they pick another
  const [picked, setPicked] = useState<string | null>(null);
  const setId = picked ?? collection.lastSet ?? PACK_SETS[1].id;

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

  // Close the zoomed card with Escape
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  const ready = data?.id === setId;
  const isEnergyPage = setId === ENERGY_PACK;
  const cards = ready ? data.cards : [];
  const ownedCount = cards.filter((c) => collection.cards[c.id]).length;
  const holoCount = cards.filter((c) => collection.cards[c.id]?.shiny).length;
  const percent = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0;
  const zoomCard = zoomed ? cards.find((c) => c.id === zoomed) : null;
  const zoomOwned = zoomed ? collection.cards[zoomed] : null;

  return (
    <section className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Binder set" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PACK_SETS.map((s) => {
          // Energies count toward the Energy page whichever pack they came from
          const owned = Object.values(collection.cards).filter((c) =>
            s.id === ENERGY_PACK ? c.isEnergy : c.setId === s.id,
          ).length;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === setId}
              onClick={() => setPicked(s.id)}
              className={`chunky-sm pop-sm cursor-pointer rounded-2xl bg-white p-2 text-left ${
                s.id === setId ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""
              }`}
            >
              <span className="grid h-12 place-items-center">
                <SetLogo setId={s.id} className="h-12" />
              </span>
              <span className="mt-1 block font-display text-sm">{s.name}</span>
              <span className="block text-xs font-semibold text-ink/60">{owned} collected</span>
            </button>
          );
        })}
      </div>

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

          {/* Card grid */}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {cards.map((card) => {
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
