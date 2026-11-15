"use client";

import { useState } from "react";
import {
  Check,
  FlaskConical,
  FlaskRound,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import IdCard from "./IdCard";
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
        <div className="chunky flex min-w-0 flex-col gap-8 rounded-3xl bg-white p-5 sm:p-8">
          {/* Step 1: name */}
          <div>
            <StepLabel n={1} text="Name your character" />
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
                className="chunky-sm min-w-0 flex-1 rounded-2xl bg-paper px-4 py-3 font-display text-xl outline-none transition-shadow focus:shadow-[3px_3px_0_0_var(--color-ink),0_0_0_4px_var(--color-sky)] sm:text-2xl"
              />
              <button
                type="button"
                onClick={randomize}
                className="chunky-sm pop-sm flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sun px-5 py-3 font-bold"
              >
                <Shuffle className="size-5" strokeWidth={2.5} />
                Randomize Name
              </button>
            </div>
          </div>

          {/* Step 2: style */}
          <div>
            <StepLabel n={2} text="Pick a style" />
            <div
              role="radiogroup"
              aria-label="Avatar style"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {STYLES.map((s) => {
                const active = s.id === style;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => chooseStyle(s.id)}
                    className={`chunky-sm pop-sm flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-3 py-4 font-bold ${
                      active
                        ? `${s.color} -translate-y-0.5 ring-4 ring-ink/80 ring-offset-2 ring-offset-white`
                        : "bg-white"
                    }`}
                  >
                    <span className="text-3xl" aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="text-sm">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: actions */}
          <div>
            <StepLabel n={3} text="Save your card" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={save}
                disabled={justSaved}
                className={`chunky pop flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-4 font-display text-lg disabled:cursor-default ${
                  justSaved ? "bg-lime" : "bg-sky"
                }`}
              >
                {justSaved ? (
                  <>
                    <Check className="size-6" strokeWidth={3} /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="size-6" strokeWidth={2.5} /> Save to My
                    Squad
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 text-sm font-medium text-ink/60">
              Every name + style has its own secret stats and rarity. Can you
              find a Legendary?
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Rarity odds">
              {RARITIES.map((r) => (
                <li
                  key={r.id}
                  className={`${r.badge} ${
                    r.id === stats.rarity ? "chunky-sm" : "border-2 border-ink/30 opacity-70"
                  } rounded-full px-3 py-0.5 text-xs font-bold transition-all`}
                >
                  {r.label} · {r.odds}%
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Live preview */}
        <div className="flex min-w-0 flex-col items-center gap-3 lg:sticky lg:top-24 lg:w-[22rem]">
          <p className="font-display text-sm uppercase tracking-wider opacity-70">
            Live preview
          </p>
          <div key={popKey} className="flex w-full justify-center animate-card-in">
            <IdCard
              name={name}
              style={style}
              {...stats}
              avatarVariant={avatarVariant}
              onNewLook={() => setAvatarVariant((v) => v + 1)}
            />
          </div>
        </div>
      </section>

      {/* Squad */}
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl sm:text-3xl">
            <Users className="size-8" strokeWidth={2.5} /> My Squad
          </h2>
          <span className="chunky-sm rounded-full bg-grape px-3 py-0.5 font-bold text-white">
            {squad.length}
          </span>
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
                    className="chunky-sm pop-sm flex cursor-pointer items-center gap-1 rounded-full bg-tomato px-4 py-1.5 font-bold text-white"
                  >
                    <Trash2 className="size-4" strokeWidth={2.5} /> Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="chunky-sm pop-sm flex cursor-pointer items-center gap-1 rounded-full bg-white px-4 py-1.5 font-bold"
                  >
                    <X className="size-4" strokeWidth={2.5} /> Keep them
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  className="chunky-sm pop-sm flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-1.5 font-bold"
                >
                  <RotateCcw className="size-4" strokeWidth={2.5} /> Clear Squad
                </button>
              )}
            </div>
          )}
        </div>

        {squad.length === 0 ? (
          <div className="rounded-3xl border-[3px] border-dashed border-ink/40 bg-white/60 px-6 py-12 text-center">
            <p className="text-5xl" aria-hidden>
              🫙
            </p>
            <p className="mt-3 font-display text-lg">Your squad is empty!</p>
            <p className="font-medium text-ink/60">
              Make a card above and smash “Save to My Squad”.
            </p>
          </div>
        ) : (
          <ul className="grid justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {squad.map((card) => (
              <li key={card.id} className="relative w-full max-w-xs animate-card-in">
                <IdCard {...card} compact serial={card.id.slice(0, 8)} />
                <button
                  type="button"
                  onClick={() => remove(card.id)}
                  aria-label={`Delete ${card.name} from squad`}
                  title="Remove from squad"
                  className="chunky-sm pop-sm absolute -left-2 -top-2 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-tomato text-white"
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

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 font-display text-lg">
      <span className="chunky-sm grid size-8 place-items-center rounded-full bg-ink text-sm text-paper">
        {n}
      </span>
      {text}
    </h2>
  );
}
