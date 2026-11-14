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

/** The big page title changes with the section you're in */
const HEADINGS = {
  packs: {
    top: "Ultimate Pokémon",
    main: "Pack Opener",
    sub: "Rip packs · Flip cards · Find holos",
    color: "bg-tomato",
  },
  binder: {
    top: "My Pokémon",
    main: "Master Binder",
    sub: "Every card you've pulled, set by set",
    color: "bg-grape",
  },
} as const;

const halftone = (color: string) => ({
  backgroundImage: `radial-gradient(${color} 1.4px, transparent 1.6px)`,
  backgroundSize: "12px 12px",
});

export default function PokeCollector({ tab }: { tab: "packs" | "binder" }) {
  const { collection, payForPack, addPack } = useCollection();
  const now = useNow();
  const heading = HEADINGS[tab];

  return (
    <div className="flex flex-col gap-8">
      <header
        className={`chunky relative overflow-hidden rounded-3xl px-6 py-8 text-center text-white sm:py-10 ${
          heading.color
        }`}
        style={halftone("rgb(255 210 63 / 0.45)")}
      >
        <p className="chunky-sm mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-ink">
          <Sparkles className="size-4 text-tangerine" /> Mini-App #3
        </p>
        <h1 className="font-display text-3xl leading-tight [text-shadow:3px_3px_0_var(--color-ink)] sm:text-5xl">
          {heading.top}
          <span className="block text-sun">{heading.main}</span>
        </h1>
        <p className="mt-2 font-display text-lg text-white/90 [text-shadow:2px_2px_0_var(--color-ink)]">
          {heading.sub}
        </p>
      </header>

      <Wallet collection={collection} now={now} />

      <nav aria-label="Pack opener sections" className="grid grid-cols-2 gap-3">
        <TabLink href="/pack-opener" active={tab === "packs"} icon={<PackageOpen className="size-5" />}>
          Pack Opening
        </TabLink>
        <TabLink href="/binder" active={tab === "binder"} icon={<BookOpen className="size-5" />}>
          My Master Binder
        </TabLink>
      </nav>

      {tab === "packs" ? (
        <PackOpening collection={collection} now={now} payForPack={payForPack} addPack={addPack} />
      ) : (
        <Binder collection={collection} />
      )}
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
      className={`chunky-sm pop-sm flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-display text-sm sm:text-lg ${
        active ? "bg-sun" : "bg-white"
      }`}
    >
      {icon} {children}
    </Link>
  );
}

function Wallet({ collection, now }: { collection: Collection; now: number }) {
  const { available, nextAt } = freePacksNow(collection, now);
  const owned = Object.keys(collection.cards).length;
  const left = nextAt && now ? Math.max(0, nextAt - now) : 0;
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <WalletStat icon={<Coins className="size-4" />} label="Poké-Coins" color="bg-sun">
        {collection.coins} 🪙
      </WalletStat>
      <WalletStat icon={<Gift className="size-4" />} label="Free packs" color="bg-lime">
        {available} / {MAX_FREE_PACKS}
      </WalletStat>
      <WalletStat icon={<Timer className="size-4" />} label={`+${PACKS_PER_REFILL} free packs in`} color="bg-sky">
        {available >= MAX_FREE_PACKS ? "Full!" : now ? `${mm}:${ss}` : "…"}
      </WalletStat>
      <WalletStat icon={<BookOpen className="size-4" />} label="Cards collected" color="bg-bubble">
        {owned}
      </WalletStat>
    </dl>
  );
}

function WalletStat({
  icon,
  label,
  color,
  children,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div className={`chunky-sm rounded-xl px-3 py-2 ${color}`}>
      <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">
        {icon} {label}
      </dt>
      <dd className="font-display text-xl leading-tight">{children}</dd>
    </div>
  );
}
