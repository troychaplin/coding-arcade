"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import type { Era, PackSet } from "./data";
import { SetLogo } from "./PokeCard";

/**
 * Every set in one place: a full-screen sheet with the eras down the side,
 * a search box, and set tiles. Picking a set closes it.
 */
/** Shortcut tabs that aren't real eras */
const SHORTCUT_TABS = new Set(["all", "featured", "mine"]);

export default function SetBrowser({
  open,
  onClose,
  value,
  onPick,
  tabs,
  loading,
  failed,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onPick: (id: string) => void;
  /** All sets, Featured, My sets (binder) and each era, in order */
  tabs: Era[];
  /** Still fetching the full set list */
  loading: boolean;
  failed: boolean;
  /** Cards collected per set (binder only) */
  counts?: Record<string, number>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Open and close the native dialog (it handles Escape and keeps focus inside)
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // "All sets" (the first tab) unless they've picked another
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  // The real eras, A–Z (not All sets, Featured or My sets)
  const eraTabs = tabs.filter((t) => !SHORTCUT_TABS.has(t.id));
  // "All sets" is every era, plus our own packs (Energy Surge, Legends Only) at the end
  const inEras = new Set(eraTabs.flatMap((t) => t.sets.map((s) => s.id)));
  const ownPacks = (tabs.find((t) => t.id === "featured")?.sets ?? []).filter((s) => !inEras.has(s.id));
  const allGroups: Era[] = eraTabs.length
    ? [...eraTabs, ...(ownPacks.length ? [{ id: "special", name: "Special packs", sets: ownPacks }] : [])]
    : [];

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    const seen = new Set<string>();
    // Group matches by their real era; our own packs only live under Featured
    return [...eraTabs, ...tabs.filter((t) => t.id === "featured")]
      .map((t) => ({
        ...t,
        sets: t.sets.filter((s) => {
          if (seen.has(s.id) || !s.name.toLowerCase().includes(q)) return false;
          seen.add(s.id);
          return true;
        }),
      }))
      .filter((t) => t.sets.length);
  }, [q, tabs, eraTabs]);

  /** Close, starting fresh next time */
  function close() {
    setQuery("");
    setTab(null);
    onClose();
  }

  function pick(id: string) {
    onPick(id);
    close();
  }

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()}
      aria-label="Browse all sets"
      className="m-auto h-[min(46rem,92dvh)] w-[min(64rem,94vw)] max-w-none overflow-hidden rounded-3xl border-[3px] border-ink bg-white p-0 text-ink shadow-[0_8px_0_#0f1b3d,0_24px_60px_rgb(0_0_0/0.5)] backdrop:bg-[#0a1230]/75 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-ink bg-[linear-gradient(160deg,#ef3b52,#c81d36_55%,#a3132a)] px-4 py-3 text-white sm:px-5">
            <h2 className="font-display text-xl text-[#fff]">Browse sets</h2>
            <label className="relative order-last w-full sm:order-none sm:ml-auto sm:w-72">
              <span className="sr-only">Search sets</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/50" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sets…"
                className="w-full rounded-full border-[3px] border-ink bg-white py-1.5 pl-9 pr-3 font-semibold text-ink outline-none focus:shadow-[0_0_0_3px_var(--color-sun)]"
              />
            </label>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="ml-auto grid size-9 cursor-pointer place-items-center rounded-full border-2 border-white/40 hover:bg-white/10 sm:ml-0"
            >
              <X className="size-5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Eras: a side list on wide screens, a strip on phones */}
            {!results && (
              <nav
                aria-label="Eras"
                className="flex shrink-0 gap-1 overflow-x-auto border-b-[3px] border-ink bg-[#141a28] p-2 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r-[3px]"
              >
                {tabs.map((t) => {
                  const active = t.id === current?.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-current={active || undefined}
                      onClick={() => setTab(t.id)}
                      className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-bold sm:border-l-4 ${
                        active
                          ? "bg-[#e9edf7] text-[#10131c] sm:border-sun"
                          : "text-ink/80 hover:bg-[#fff]/10 sm:border-transparent"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
                {loading && (
                  <span className="flex shrink-0 items-center gap-1 px-3 py-2 text-xs font-semibold text-ink/60">
                    <LoaderCircle className="size-4 animate-spin" /> Finding more sets…
                  </span>
                )}
                {failed && (
                  <span className="shrink-0 px-3 py-2 text-xs font-semibold text-ink/60">
                    Couldn&apos;t load more sets right now
                  </span>
                )}
              </nav>
            )}

            {/* Set tiles */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {results ? (
                results.length ? (
                  results.map((t) => (
                    <section key={t.id} className="mb-5">
                      <h3 className="mb-2 font-display text-sm text-ink/70">{t.name}</h3>
                      <TileGrid sets={t.sets} value={value} counts={counts} onPick={pick} />
                    </section>
                  ))
                ) : (
                  <p className="py-10 text-center font-semibold text-ink/70">
                    No sets match “{query.trim()}”. Try part of the name, like “evol” or “151”.
                  </p>
                )
              ) : current?.id === "all" ? (
                // Every set, under its era's heading
                allGroups.length ? (
                  allGroups.map((t) => (
                    <section key={t.id} className="mb-5">
                      <h3 className="mb-2 font-display text-sm text-ink/70">{t.name}</h3>
                      <TileGrid sets={t.sets} value={value} counts={counts} onPick={pick} />
                    </section>
                  ))
                ) : (
                  <TileGrid sets={current.sets} value={value} counts={counts} onPick={pick} />
                )
              ) : current ? (
                <TileGrid sets={current.sets} value={value} counts={counts} onPick={pick} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

function TileGrid({
  sets,
  value,
  counts,
  onPick,
}: {
  sets: PackSet[];
  value: string;
  counts?: Record<string, number>;
  onPick: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sets.map((s) => {
        const chosen = s.id === value;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-pressed={chosen}
              className={`chunky-sm pop-sm flex h-full w-full cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white p-2 text-center ${
                chosen ? "ring-4 ring-sun ring-offset-2" : ""
              }`}
            >
              <span className="grid h-14 w-full place-items-center rounded-xl bg-[#fff] p-1.5">
                <SetLogo set={s} className="h-11" />
              </span>
              <span className="font-display text-sm leading-tight">{s.name}</span>
              {counts ? (
                <span className="text-xs font-semibold text-ink/60">{counts[s.id] ?? 0} collected</span>
              ) : s.price ? (
                <span className="rounded-full border-2 border-ink bg-sun px-2 text-[11px] font-bold">
                  {s.price} 🪙
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
