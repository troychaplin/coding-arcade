"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { FEATURED, findSet, loadCatalog, peekCatalog, type Era, type PackSet } from "./data";
import { SetLogo } from "./PokeCard";
import SetBrowser from "./SetBrowser";

/** Every booster set, by era — loads once, then it's instant. */
export function useCatalog() {
  const [eras, setEras] = useState<Era[] | null>(peekCatalog);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((e) => !cancelled && setEras(e))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);
  return { eras, failed };
}

/** How many of your most-collected sets the binder shelf shows */
const TOP_SETS = 6;

/**
 * Pick a set: one shelf of quick picks, ending in "Browse all sets", which
 * opens a sheet with every era and a search box.
 */
export default function SetPicker({
  value,
  onChange,
  specials,
  counts,
  disabled = false,
  variant,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Our own packs (Energy Surge, Legends Only), always on the shelf */
  specials: PackSet[];
  /** Cards collected per set (binder only): the shelf shows your top sets */
  counts?: Record<string, number>;
  disabled?: boolean;
  /** "pack": colourful wrappers; "binder": white pages with a count */
  variant: "pack" | "binder";
  label: string;
}) {
  const { eras, failed } = useCatalog();
  const [browsing, setBrowsing] = useState(false);

  // Every set once, featured first
  const seen = new Set<string>();
  const all = [...FEATURED, ...specials, ...(eras ?? []).flatMap((e) => e.sets)].filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  const total = all.length - specials.length;

  // Your sets, most cards first (binder only)
  const mine = counts
    ? all.filter((s) => counts[s.id] && !specials.includes(s)).sort((a, b) => counts[b.id] - counts[a.id])
    : [];

  // The shelf: featured packs (or your top sets in the binder) and our own packs,
  // with the chosen set up front if it isn't already there
  const base = counts && mine.length ? mine.slice(0, TOP_SETS) : FEATURED;
  let shelf = [...base, ...specials];
  const chosen = all.find((s) => s.id === value) ?? findSet(value);
  if (chosen && !shelf.some((s) => s.id === chosen.id)) shelf = [chosen, ...shelf];

  // The sheet's list: All sets (the default), Featured, My sets in the binder,
  // then every era A–Z
  const byName = [...(eras ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const tabs: Era[] = [
    { id: "all", name: "All sets", sets: all },
    { id: "featured", name: "⭐ Featured", sets: [...FEATURED, ...specials] },
    ...(mine.length ? [{ id: "mine", name: "📒 My sets", sets: mine }] : []),
    ...byName,
  ];

  return (
    <>
      <div
        role="radiogroup"
        aria-label={label}
        className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4 pt-2 [scrollbar-width:thin]"
      >
        {shelf.map((s) => (
          <ShelfTile
            key={s.id}
            set={s}
            active={s.id === value}
            disabled={disabled}
            variant={variant}
            count={counts?.[s.id]}
            onPick={() => onChange(s.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setBrowsing(true)}
          disabled={disabled}
          className="flex w-36 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[3px] border-dashed border-ink/50 bg-white/70 p-2 text-center font-bold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="size-6" strokeWidth={2.5} />
          <span className="text-sm leading-tight">
            {`Browse all${total > FEATURED.length ? ` ${total}` : ""} sets`}
          </span>
        </button>
      </div>

      <SetBrowser
        open={browsing}
        onClose={() => setBrowsing(false)}
        value={value}
        onPick={onChange}
        tabs={tabs}
        loading={!eras && !failed}
        failed={failed}
        counts={counts}
      />
    </>
  );
}

function ShelfTile({
  set: s,
  active,
  disabled,
  variant,
  count,
  onPick,
}: {
  set: PackSet;
  active: boolean;
  disabled: boolean;
  variant: "pack" | "binder";
  count?: number;
  onPick: () => void;
}) {
  const ring = active ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : "";
  if (variant === "pack") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        disabled={disabled}
        onClick={onPick}
        className={`chunky-sm pop-sm w-36 shrink-0 cursor-pointer rounded-2xl bg-gradient-to-br p-2 ${s.wrapper} ${
          active ? ring : "opacity-80"
        }`}
      >
        <span className="grid h-14 place-items-center rounded-xl bg-white/90 p-1.5">
          <SetLogo set={s} className="h-11" />
        </span>
        <span className="mt-1 block font-display text-sm leading-tight text-white [text-shadow:1px_1px_0_var(--color-ink)]">
          {s.name}
        </span>
        {s.price && (
          <span className="mt-1 inline-block rounded-full border-2 border-ink bg-sun px-2 text-[11px] font-bold">
            {s.price} 🪙
          </span>
        )}
      </button>
    );
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onPick}
      className={`chunky-sm pop-sm w-36 shrink-0 cursor-pointer rounded-2xl bg-white p-2 text-left ${ring}`}
    >
      <span className="grid h-11 place-items-center">
        <SetLogo set={s} className="h-11" />
      </span>
      <span className="mt-1 block font-display text-sm leading-tight">{s.name}</span>
      <span className="block text-xs font-semibold text-ink/60">{count ?? 0} collected</span>
    </button>
  );
}
