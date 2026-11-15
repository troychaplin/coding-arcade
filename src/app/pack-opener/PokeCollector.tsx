"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Coins, Gift, PackageOpen, Sparkles, Timer } from "lucide-react";
import { MAX_FREE_PACKS, PACKS_PER_REFILL } from "./data";
import { freePacksAt, useCollection, type Collection } from "./useCollection";
import PackOpening from "./PackOpening";
import Binder from "./Binder";

/** Current time, ticking every second (0 until the page is running in the browser). */
export function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

export function freePacksNow(c: Collection, now: number) {
  return now ? freePacksAt(c, now) : { available: c.freePacks, nextAt: null };
}

/** The page title on the device, per section */
const TITLES = {
  packs: "Pack opener",
  binder: "Master binder",
} as const;

/**
 * The whole game lives in an original handheld "Card Dex": a red shell with
 * a top bar (title + stats), Packs | Binder tabs, and a dark glass screen.
 */
export default function PokeCollector({ tab }: { tab: "packs" | "binder" }) {
  const { collection, payForPack, addPack } = useCollection();
  const now = useNow();
  const { available, nextAt } = freePacksNow(collection, now);
  const full = available >= MAX_FREE_PACKS;

  return (
    <div className="dex-shell px-3 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-2 pb-4 text-white">
        <div className="flex items-center gap-3">
          {/* Camera dot and two status lights (green when free packs are full) */}
          <span aria-hidden className="flex items-center gap-1.5">
            <span className="grid size-7 place-items-center rounded-full bg-[#10131c] shadow-[inset_0_1px_3px_rgb(0_0_0/0.6),0_1px_0_rgb(255_255_255/0.3)]">
              <span className="size-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#6aa8ff,#1b3d7a)]" />
            </span>
            <span className={`size-2 rounded-full ${full ? "bg-[#3ee07a] shadow-[0_0_6px_#3ee07a]" : "bg-[#ffb020] shadow-[0_0_6px_#ffb020]"}`} />
            <span className="size-2 rounded-full bg-white/35" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Card Dex</p>
            <h1 className="font-display text-2xl sm:text-3xl">{TITLES[tab]}</h1>
          </div>
        </div>
        <Stats collection={collection} now={now} available={available} nextAt={nextAt} />
      </header>

      {/* Packs | Binder */}
      <nav aria-label="Pack opener sections" className="dex-inset mx-1 mb-4 grid grid-cols-2 gap-1 p-1 sm:mx-2 sm:max-w-md">
        <TabLink href="/pack-opener" active={tab === "packs"} icon={<PackageOpen className="size-5" />}>
          Packs
        </TabLink>
        <TabLink href="/binder" active={tab === "binder"} icon={<BookOpen className="size-5" />}>
          Binder
        </TabLink>
      </nav>

      {/* The screen */}
      <div className="dex-screen p-4 sm:p-6">
        {tab === "packs" ? (
          <PackOpening collection={collection} now={now} payForPack={payForPack} addPack={addPack} />
        ) : (
          <Binder collection={collection} />
        )}
      </div>

      {/* Speaker grille */}
      <div aria-hidden className="mt-4 flex justify-center gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-1.5 w-6 rounded-full bg-black/25 shadow-[0_1px_0_rgb(255_255_255/0.25)]" />
        ))}
      </div>
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-center gap-2 rounded-[0.7rem] px-4 py-2 font-display text-base transition-colors focus-visible:outline-2 focus-visible:outline-white ${
        active ? "bg-[#fff] text-[#c81d36] shadow-[0_2px_6px_rgb(0_0_0/0.35)]" : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon} {children}
    </Link>
  );
}

/** Coins, free packs, the refill timer and cards collected, as small chips on the shell */
function Stats({
  collection,
  now,
  available,
  nextAt,
}: {
  collection: Collection;
  now: number;
  available: number;
  nextAt: number | null;
}) {
  const owned = Object.keys(collection.cards).length;
  const left = nextAt && now ? Math.max(0, nextAt - now) : 0;
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <dl className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
      <Stat icon={<Coins className="size-4 text-[#f5b301]" />} label="Poké-Coins">
        {collection.coins}
      </Stat>
      <Stat icon={<Gift className="size-4 text-[#3ee07a]" />} label="Free packs">
        {available} / {MAX_FREE_PACKS}
      </Stat>
      <Stat icon={<Timer className="size-4 text-[#6aa8ff]" />} label={`+${PACKS_PER_REFILL} packs in`}>
        {available >= MAX_FREE_PACKS ? "Full" : now ? `${mm}:${ss}` : "…"}
      </Stat>
      <Stat icon={<Sparkles className="size-4 text-[#ff7ab8]" />} label="Cards">
        {owned}
      </Stat>
    </dl>
  );
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="dex-inset min-w-[6.5rem] px-3 py-1.5">
      <dt className="flex items-center gap-1 text-[11px] font-bold text-white/65">
        {icon} {label}
      </dt>
      <dd className="font-display text-lg leading-tight tabular-nums">{children}</dd>
    </div>
  );
}
