"use client";

import { useState } from "react";
import {
  Check,
  FlaskConical,
  FlaskRound,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import JarCard from "./JarCard";
import { useSquad } from "./useSquad";
import {
  RARITIES,
  STYLES,
  newId,
  randomName,
  statsFor,
  type AvatarStyle,
} from "./data";

export default function AvatarFactory() {
  const [name, setName] = useState("Captain Pickletoes");
  const [style, setStyle] = useState<AvatarStyle>("pixel-art");
  /** Alternate avatar look; resets when the name changes */
  const [avatarVariant, setAvatarVariant] = useState(0);
  /** Bumped on big changes (style / random name) to replay the pop-in animation */
  const [popKey, setPopKey] = useState(0);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  /** Bumped each time a card is brought to life, to replay the lightning strike */
  const [zapKey, setZapKey] = useState(0);

  const [confirmingClear, setConfirmingClear] = useState(false);

  const { squad, add, remove, clear } = useSquad();

  function clearSquad() {
    clear();
    setConfirmingClear(false);
    setSavedSignature(null); // let the current card be saved again
  }

  const stats = statsFor(name, style);
  const signature = JSON.stringify([name.trim(), style, avatarVariant]);
  const justSaved = savedSignature === signature;

  function chooseStyle(next: AvatarStyle) {
    if (next === style) return;
    setStyle(next);
    setPopKey((n) => n + 1);
  }

  function randomize() {
    setName(randomName());
    setAvatarVariant(0);
    setPopKey((n) => n + 1);
  }

  function save() {
    add({
      id: newId(),
      name: name.trim() || "Mystery Hero",
      style,
      ...stats,
      avatarVariant,
      createdAt: Date.now(),
    });
    setSavedSignature(signature);
    setZapKey((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Title: the iron sign bolted over the lab door */}
      <header
        className="chunky relative overflow-hidden rounded-3xl bg-[#101b15] px-6 py-9 text-center sm:py-11"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18px 18px, #d6a041 0 4px, transparent 5px), radial-gradient(circle at calc(100% - 18px) 18px, #d6a041 0 4px, transparent 5px), radial-gradient(circle at 18px calc(100% - 18px), #d6a041 0 4px, transparent 5px), radial-gradient(circle at calc(100% - 18px) calc(100% - 18px), #d6a041 0 4px, transparent 5px), radial-gradient(ellipse 60% 80% at 50% 120%, rgb(77 255 106 / 0.28), transparent 70%)",
        }}
      >
        {/* Glassware bubbling on the bench, and a spark from the coil */}
        <FlaskConical
          aria-hidden
          className="pointer-events-none absolute bottom-4 left-6 hidden size-20 -rotate-6 text-lime drop-shadow-[0_0_14px_rgb(77_255_106/0.8)] sm:block"
          strokeWidth={1.5}
        />
        <FlaskRound
          aria-hidden
          className="pointer-events-none absolute bottom-5 left-24 hidden size-12 text-sky drop-shadow-[0_0_12px_rgb(61_227_207/0.8)] sm:block"
          strokeWidth={1.5}
        />
        <Zap
          aria-hidden
          className="pointer-events-none absolute right-8 top-6 hidden size-16 rotate-12 fill-grape/40 text-grape drop-shadow-[0_0_14px_rgb(154_92_255/0.9)] sm:block"
          strokeWidth={1.5}
        />
        <p className="relative mb-4 inline-flex items-center gap-2 rounded-full border-2 border-tangerine/70 px-3 py-1 text-sm font-bold text-tangerine">
          <Sparkles className="size-4" /> Mini-App #1
        </p>
        <h1 className="relative font-display text-4xl leading-tight tracking-wide sm:text-6xl">
          <span className="block text-[#d9f5dc]">The Hero &amp; Monster</span>
          <span className="block text-lime [text-shadow:0_0_12px_rgb(77_255_106/0.8),0_0_32px_rgb(77_255_106/0.5)]">
            ID Card Factory
          </span>
        </h1>
        <p className="relative mx-auto mt-4 max-w-md font-semibold text-[#a9cdb0]">
          Stitch together a hero or monster, give it a name, then flip the switch and bring
          its card to life.
        </p>
      </header>

      {/* Builder + preview */}
      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* The control console */}
        <div className="lab-panel flex min-w-0 flex-col gap-8 p-6 sm:p-9">
          {/* Step 1: name */}
          <div>
            <StepLabel n={1} text="Name your creation" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setAvatarVariant(0);
                }}
                maxLength={40}
                placeholder="Type a name…"
                aria-label="Character name"
                className="lab-glass min-w-0 flex-1 px-4 py-3 font-display text-xl tracking-wide outline-none transition-shadow placeholder:text-[#b9ffc4]/35 [text-shadow:0_0_8px_rgb(77_255_106/0.6)] focus:shadow-[inset_0_0_18px_rgb(77_255_106/0.18),0_0_0_3px_#4dff6a] sm:text-2xl"
              />
              <button
                type="button"
                onClick={randomize}
                className="chunky-sm pop-sm flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sun px-5 py-3 font-bold"
              >
                <Shuffle className="size-5" strokeWidth={2.5} />
                Randomize Name
              </button>
            </div>
          </div>

          {/* Step 2: style, as a row of specimen jars */}
          <div>
            <StepLabel n={2} text="Choose a specimen" />
            <div
              role="radiogroup"
              aria-label="Avatar style"
              className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4"
            >
              {STYLES.map((s) => (
                <SpecimenJar
                  key={s.id}
                  emoji={s.emoji}
                  label={s.label}
                  liquid={s.color}
                  active={s.id === style}
                  onPick={() => chooseStyle(s.id)}
                />
              ))}
            </div>
          </div>

          {/* Step 3: bring it to life */}
          <div>
            <StepLabel n={3} text="Bring it to life" />
            <button
              type="button"
              onClick={save}
              disabled={justSaved}
              className={`chunky pop flex w-full cursor-pointer items-center justify-center gap-4 rounded-xl px-6 py-4 font-display text-2xl tracking-wide disabled:cursor-default ${
                justSaved
                  ? "bg-lime"
                  : "bg-[#1b2a20] text-lime [text-shadow:0_0_10px_rgb(77_255_106/0.7)]"
              }`}
            >
              <KnifeSwitch on={justSaved} />
              {justSaved ? (
                <span className="flex items-center gap-2">
                  <Check className="size-6" strokeWidth={3} /> It&apos;s alive! Saved to your squad
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="size-6 fill-lime/40" strokeWidth={2.5} /> Bring it to life!
                </span>
              )}
            </button>
            <p className="lab-muted mt-4 text-sm font-medium">
              Every name + style has its own secret stats and rarity. Can you brew a Legendary?
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Rarity odds">
              {RARITIES.map((r) => {
                const current = r.id === stats.rarity;
                return (
                  <li
                    key={r.id}
                    aria-current={current || undefined}
                    className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1.5 pr-3 text-xs font-bold transition-all ${
                      current
                        ? "border-lime bg-[#0b1a10] text-[#d9f5dc] shadow-[0_0_14px_rgb(77_255_106/0.5)]"
                        : "lab-muted border-[#a8e6bd]/25 bg-[#07100b]"
                    }`}
                  >
                    {/* A test-tube vial filled to the odds */}
                    <span aria-hidden className="relative h-3 w-12 overflow-hidden rounded-full border-2 border-[#a8e6bd]/50 bg-black/50">
                      <span
                        className={`absolute inset-y-0 left-0 ${VIAL[r.id] ?? "bg-lime"}`}
                        style={{ width: `${r.odds}%` }}
                      />
                    </span>
                    {r.label} {r.odds}%
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Live preview: your creation floating in a giant specimen jar */}
        <div className="relative flex min-w-0 flex-col items-center lg:sticky lg:top-24 lg:w-[23rem]">
          <div key={`jar-${popKey}`} className="w-full animate-card-in">
            <JarCard
              name={name}
              style={style}
              {...stats}
              avatarVariant={avatarVariant}
              onNewLook={() => setAvatarVariant((v) => v + 1)}
            />
          </div>
          {/* The lightning strike when it comes to life */}
          {zapKey > 0 && (
            <span
              key={`zap-${zapKey}`}
              aria-hidden
              className="animate-zap pointer-events-none absolute inset-x-0 top-0 z-40 grid h-[30rem] place-items-center rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.95),rgb(200_255_210/0.6)_35%,rgb(154_92_255/0.25)_70%,transparent)]"
              style={{ opacity: 0 }}
            >
              <Zap className="size-28 fill-white text-grape drop-shadow-[0_0_18px_#9a5cff]" strokeWidth={1.5} />
            </span>
          )}
        </div>
      </section>

      {/* Squad */}
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide sm:text-4xl">
            <Users className="size-8" strokeWidth={2.5} /> My Squad
          </h2>
          <span className="brass rounded-md px-3 py-0.5 font-bold">{squad.length}</span>
          {RARITIES.filter((r) => r.id !== "common").map((r) => {
            const count = squad.filter((c) => c.rarity === r.id).length;
            return count > 0 ? (
              <span
                key={r.id}
                className={`${r.badge} chunky-sm rounded-full px-3 py-0.5 text-sm font-bold`}
              >
                {count} {r.label}
              </span>
            ) : null;
          })}

          {squad.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {confirmingClear ? (
                <>
                  <span className="font-bold">
                    Clear all {squad.length} card{squad.length === 1 ? "" : "s"}?
                  </span>
                  <button
                    type="button"
                    onClick={clearSquad}
                    className="chunky-sm pop-sm flex cursor-pointer items-center gap-1 rounded-full bg-tomato px-4 py-1.5 font-bold"
                  >
                    <Trash2 className="size-4" strokeWidth={2.5} /> Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="chunky-sm pop-sm flex cursor-pointer items-center gap-1 rounded-full bg-[#1b2a20] px-4 py-1.5 font-bold text-[#d9f5dc]"
                  >
                    <X className="size-4" strokeWidth={2.5} /> Keep them
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  className="chunky-sm pop-sm flex cursor-pointer items-center gap-2 rounded-full bg-[#1b2a20] px-4 py-1.5 font-bold text-[#d9f5dc]"
                >
                  <RotateCcw className="size-4" strokeWidth={2.5} /> Clear Squad
                </button>
              )}
            </div>
          )}
        </div>

        {squad.length === 0 ? (
          <div className="lab-panel px-6 py-12 text-center">
            <p className="text-5xl" aria-hidden>
              🫙
            </p>
            <p className="mt-3 font-display text-2xl tracking-wide">Your squad is empty!</p>
            <p className="lab-muted font-medium">
              Make a card above and pull the switch to bring it to life.
            </p>
          </div>
        ) : (
          <ul className="grid justify-items-center gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {squad.map((card) => (
              <li key={card.id} className="relative w-full max-w-[15rem] animate-card-in">
                <JarCard {...card} compact serial={card.id} />
                <button
                  type="button"
                  onClick={() => remove(card.id)}
                  aria-label={`Delete ${card.name} from squad`}
                  title="Remove from squad"
                  className="chunky-sm pop-sm absolute -left-2 -top-2 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-tomato"
                >
                  <Trash2 className="size-5" strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Liquid colour in each rarity's vial */
const VIAL: Record<string, string> = {
  common: "bg-[#cfe9d4]",
  rare: "bg-sky",
  epic: "bg-grape",
  legendary: "bg-sun",
};

/** A step in the lab procedure, with a brass number plate */
function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-display text-2xl tracking-wide">
      <span className="brass grid size-9 place-items-center rounded-full font-sans text-base font-bold">
        {n}
      </span>
      {text}
    </h2>
  );
}

/** One avatar style, floating in a glass specimen jar */
function SpecimenJar({
  emoji,
  label,
  liquid,
  active,
  onPick,
}: {
  emoji: string;
  label: string;
  /** Tailwind background class for the liquid */
  liquid: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onPick}
      className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl p-1 font-bold focus-visible:outline-3 focus-visible:outline-lime"
    >
      <span className="flex w-full max-w-[7.5rem] flex-col items-center">
        {/* Lid */}
        <span aria-hidden className="brass h-3.5 w-3/5 rounded-t-md" />
        {/* Jar */}
        <span
          className={`relative grid h-28 w-full place-items-center overflow-hidden rounded-b-[2.25rem] rounded-t-xl border-[3px] bg-[#07100b]/80 transition-[box-shadow,border-color,transform] duration-200 group-hover:-translate-y-1 ${
            active
              ? "border-lime shadow-[0_0_26px_rgb(77_255_106/0.6)]"
              : "border-[#a8e6bd]/40"
          }`}
        >
          {/* Liquid */}
          <span
            aria-hidden
            className={`absolute inset-x-0 bottom-0 ${liquid} transition-[height,opacity] duration-300 ${
              active ? "h-4/5 opacity-85" : "h-1/2 opacity-40"
            }`}
          />
          {/* Bubbles, only in the jar you picked */}
          {active &&
            [18, 48, 72].map((left, i) => (
              <span
                key={left}
                aria-hidden
                className="animate-bubble absolute bottom-2 size-2.5 rounded-full border-2 border-white/70"
                style={{ left: `${left}%`, animationDelay: `${i * 0.7}s`, opacity: 0 } as CSSProperties}
              />
            ))}
          {/* Glass shine */}
          <span aria-hidden className="absolute bottom-6 left-2 top-3 w-1.5 rounded-full bg-white/25" />
          <span className="relative text-4xl drop-shadow-[0_2px_0_rgb(0_0_0/0.4)]" aria-hidden>
            {emoji}
          </span>
        </span>
      </span>
      <span className={`text-sm ${active ? "text-lime" : "text-[#d9f5dc]"}`}>{label}</span>
    </button>
  );
}

/** The big knife switch: thrown down once the card is alive */
function KnifeSwitch({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="relative block h-11 w-10 shrink-0">
      <span className="brass absolute inset-x-0 bottom-0 h-3 rounded-sm" />
      <span
        className={`absolute bottom-2 left-1/2 h-9 w-2 origin-bottom -translate-x-1/2 rounded-sm border-2 border-[#050806] bg-[#c9d6cc] transition-transform duration-300 ${
          on ? "rotate-[40deg]" : "-rotate-[40deg]"
        }`}
      >
        <span className="absolute -left-1.5 -top-2.5 size-4 rounded-full border-2 border-[#050806] bg-tomato" />
      </span>
    </span>
  );
}
