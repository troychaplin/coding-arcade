"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { FEATURED, loadCatalog, peekCatalog, type Era, type PackSet } from "./data";
import { SetLogo } from "./PokeCard";

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

/**
 * Pick a set: a row of tabs (Featured, My sets, then each era, newest first)
 * and a grid of that tab's sets.
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
  /** Our own packs, shown on the Featured tab */
  specials: PackSet[];
  /** Cards collected per set (binder only) — adds a "My sets" tab */
  counts?: Record<string, number>;
  disabled?: boolean;
  /** "pack": colourful wrappers; "binder": white pages with a count */
  variant: "pack" | "binder";
  label: string;
}) {
  const { eras, failed } = useCatalog();
  const [tab, setTab] = useState<string | null>(null);

  const featured: Era = { id: "featured", name: "⭐ Featured", sets: [...FEATURED, ...specials] };
  const tabs: Era[] = [featured];
  if (counts) {
    const seen = new Set<string>();
    const mine = [...featured.sets, ...(eras ?? []).flatMap((e) => e.sets)].filter((s) => {
      if (seen.has(s.id) || !counts[s.id]) return false;
      seen.add(s.id);
      return true;
    });
    if (mine.length) tabs.push({ id: "mine", name: "📒 My sets", sets: mine });
  }
  tabs.push(...(eras ?? []));

  // Until they pick a tab, show the one holding the chosen set
  const current =
    tabs.find((t) => t.id === tab) ?? tabs.find((t) => t.sets.some((s) => s.id === value)) ?? featured;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={`${label} eras`} className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === current.id}
            onClick={() => setTab(t.id)}
            className={`chunky-sm cursor-pointer rounded-full px-3 py-1 text-sm font-bold ${
              t.id === current.id ? "bg-ink text-white" : "bg-white"
            }`}
          >
            {t.name}
          </button>
        ))}
        {!eras && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-ink/60">
            {failed ? (
              "Couldn't load more sets right now"
            ) : (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Finding more sets…
              </>
            )}
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {current.sets.map((s) =>
          variant === "pack" ? (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === value}
              disabled={disabled}
              onClick={() => onChange(s.id)}
              className={`chunky-sm pop-sm cursor-pointer rounded-2xl bg-gradient-to-br p-2 ${s.wrapper} ${
                s.id === value ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : "opacity-80"
              }`}
            >
              <span className="grid h-16 place-items-center rounded-xl bg-white/90 p-2">
                <SetLogo set={s} className="h-12" />
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
          ) : (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === value}
              onClick={() => onChange(s.id)}
              className={`chunky-sm pop-sm cursor-pointer rounded-2xl bg-white p-2 text-left ${
                s.id === value ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""
              }`}
            >
              <span className="grid h-12 place-items-center">
                <SetLogo set={s} className="h-12" />
              </span>
              <span className="mt-1 block font-display text-sm leading-tight">{s.name}</span>
              <span className="block text-xs font-semibold text-ink/60">{counts?.[s.id] ?? 0} collected</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
