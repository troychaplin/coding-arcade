"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  BadgeCheck,
  Flame,
  FolderOpen,
  KeyRound,
  LoaderCircle,
  Lock,
  RotateCcw,
  Search,
  ShieldAlert,
  Trophy,
  VenetianMask,
} from "lucide-react";
import {
  BLUR_STEPS,
  CATEGORIES,
  ROSTER_URL,
  STAT_LABELS,
  SUSPECT_COUNTS,
  cluesFor,
  normalize,
  suggest,
  suspectList,
  toSuspects,
  type Clue,
  type Category,
  type Suspect,
} from "./data";
import { useDetectiveStats } from "./useDetectiveStats";

type Status = "playing" | "won" | "lost";
type Feedback = "wrong" | "pick" | null;

/** Comic-book halftone dots for panel backgrounds */
const halftone = (color: string) => ({
  backgroundImage: `radial-gradient(${color} 1.4px, transparent 1.6px)`,
  backgroundSize: "12px 12px",
});

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pickSuspect(pool: Suspect[], excludeId?: number): Suspect | null {
  const choices = pool.length > 1 ? pool.filter((s) => s.id !== excludeId) : pool;
  return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
}

/** Burst of emoji confetti from the middle of `box` */
function celebrate(box: HTMLElement | null) {
  if (!box || prefersReducedMotion()) return;
  const bits = ["⭐", "💥", "🎉", "✨", "🦸", "🔍", "💫"];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement("span");
    el.textContent = bits[i % bits.length];
    el.className = "pointer-events-none absolute left-1/2 top-1/2 text-2xl";
    box.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 160;
    el.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.3)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${
            Math.sin(angle) * dist
          }px)) scale(1.2) rotate(${Math.random() * 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 500, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
    ).onfinish = () => el.remove();
    // Backup cleanup in case the animation never finishes (e.g. background tab)
    setTimeout(() => el.remove(), 2000);
  }
}

export default function SecretIdentity() {
  const [roster, setRoster] = useState<Suspect[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [category, setCategory] = useState<Category>("famous");
  const [secret, setSecret] = useState<Suspect | null>(null);
  const [clueIndex, setClueIndex] = useState(0);
  const [status, setStatus] = useState<Status>("playing");
  const [awarded, setAwarded] = useState(0);

  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  /** Typing autocomplete: is the dropdown open, and which row is highlighted */
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  /** Suspect names to tap (none on clue 1, then 8 → 6 → 4 → 2) */
  const [suspects, setSuspects] = useState<string[]>([]);
  /** Wrong guesses this round — never shown as suspects again */
  const [ruledOut, setRuledOut] = useState<string[]>([]);

  const guessBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caseBoardRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { stats, recordWin, recordLoss } = useDetectiveStats();

  // Load the hero roster once (and again if the player hits "Try again").
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(ROSTER_URL, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = toSuspects(data);
        setRoster(list);
        setSecret(pickSuspect(list.filter((s) => s.kidFamous)));
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setLoadError(true);
      });
    return () => ctrl.abort();
  }, [reloadKey]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const pool = useMemo(
    () => (roster ? roster.filter(CATEGORIES[category].includes) : []),
    [roster, category],
  );

  /** How many heroes are in each category, for the picker */
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<Category, number>;
    for (const id of Object.keys(CATEGORIES) as Category[]) {
      counts[id] = roster ? roster.filter(CATEGORIES[id].includes).length : 0;
    }
    return counts;
  }, [roster]);

  /** Every hero name we have a file on, for checking typed guesses */
  const allNames = useMemo(
    () => (roster ? [...new Set(roster.map((s) => s.name))] : []),
    [roster],
  );

  /** Autocomplete names: this category's heroes, minus anyone already ruled out */
  const suggestions = useMemo(() => {
    const names = [...new Set(pool.map((s) => s.name))]
      .filter((n) => !ruledOut.includes(n))
      .sort((a, b) => a.localeCompare(b));
    return suggest(names, guess);
  }, [pool, ruledOut, guess]);

  const potential = 500 - clueIndex * 100;
  const roundOver = status !== "playing";
  const blur = roundOver ? 0 : BLUR_STEPS[clueIndex];

  function flash(kind: Feedback) {
    setFeedback(kind);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  }

  function shake() {
    if (prefersReducedMotion()) return;
    guessBoxRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-12px) rotate(-1deg)" },
        { transform: "translateX(10px) rotate(1deg)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 450, easing: "ease-out" },
    );
  }

  function startCase(fromPool: Suspect[], excludeId?: number) {
    confettiRef.current?.replaceChildren();
    setSecret(pickSuspect(fromPool, excludeId));
    setSuspects([]);
    setRuledOut([]);
    setClueIndex(0);
    setStatus("playing");
    setAwarded(0);
    setGuess("");
    setOpen(false);
    setFeedback(null);
  }

  function changeCategory(next: Category) {
    if (!roster || next === category) return;
    setCategory(next);
    startCase(roster.filter(CATEGORIES[next].includes), secret?.id);
  }

  /** Move to a clue and shrink the suspect list to that clue's size. */
  function goToClue(next: number, out: string[]) {
    if (!secret) return;
    setClueIndex(next);
    setSuspects(suspectList(secret, pool, suspects, out, SUSPECT_COUNTS[next]));
  }

  function unlockNext() {
    if (roundOver || clueIndex >= 4) return;
    goToClue(clueIndex + 1, ruledOut);
    scrollToClues(80);
  }

  /** Check a guess, typed or tapped. */
  function makeGuess(name: string) {
    if (!secret || roundOver) return;
    if (normalize(name) === normalize(secret.name)) {
      setStatus("won");
      setAwarded(potential);
      recordWin(potential);
      setFeedback(null);
      celebrate(confettiRef.current);
      return;
    }

    // Wrong identity: shake, show the badge, rule them out, unlock the next clue,
    // then scroll back up so the new clue is easy to see.
    const out = [...ruledOut, name];
    setRuledOut(out);
    setOpen(false);
    flash("wrong");
    shake();
    scrollToClues();
    if (clueIndex < 4) {
      goToClue(clueIndex + 1, out);
    } else {
      setStatus("lost");
      recordLoss();
    }
  }

  /** Scroll up to the clue board (after the shake, or once the new clue renders). */
  function scrollToClues(delayMs = 350) {
    setTimeout(() => {
      caseBoardRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    }, delayMs);
  }

  function choose(name: string) {
    setGuess(name);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const listOpen = open && suggestions.length > 0;
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      // First Enter fills in the highlighted name; the next Enter makes the guess.
      const picked = suggestions[highlight];
      if (listOpen && picked && normalize(picked) !== normalize(guess)) {
        e.preventDefault();
        choose(picked);
      }
    }
  }

  function submitTyped() {
    const n = normalize(guess);
    if (!n) return;
    // Spaces, hyphens and capitals don't matter: "spiderman" finds "Spider-Man".
    const match = allNames.find((name) => normalize(name) === n);
    if (!match) {
      flash("pick"); // not a hero we know — no penalty, just a nudge
      return;
    }
    setGuess("");
    setOpen(false);
    makeGuess(match);
  }

  return (
    <div className="flex flex-col gap-8">
      <Header />

      {loadError ? (
        <Panel className="bg-white p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-tomato" />
          <p className="mt-3 font-display text-xl">Can&apos;t reach Detective HQ!</p>
          <p className="font-medium text-ink/70">
            The hero files didn&apos;t load. Check the internet and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              setReloadKey((k) => k + 1);
            }}
            className="chunky pop mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-sun px-6 py-3 font-display"
          >
            <RotateCcw className="size-5" /> Try again
          </button>
        </Panel>
      ) : !roster || !secret ? (
        <Panel className="grid place-items-center bg-white p-12 text-center">
          <LoaderCircle className="size-12 animate-spin text-grape" />
          <p className="mt-3 font-display text-xl">Decrypting top secret files…</p>
        </Panel>
      ) : (
        <>
          <Toolbar
            category={category}
            onCategory={changeCategory}
            counts={categoryCounts}
            stats={stats}
          />
          <HowToPlay />

          <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            {/* ---------- Dossier ---------- */}
            <div className="relative lg:sticky lg:top-24">
              <Dossier
                secret={secret}
                blur={blur}
                status={status}
                potential={potential}
                clueIndex={clueIndex}
                awarded={awarded}
              />
              <div ref={confettiRef} className="pointer-events-none absolute inset-0 z-30" />
            </div>

            {/* ---------- Case board ---------- */}
            <div ref={caseBoardRef} className="flex min-w-0 scroll-mt-24 flex-col gap-6">
              {roundOver ? (
                <CaseClosed
                  secret={secret}
                  status={status}
                  awarded={awarded}
                  onNext={() => startCase(pool, secret.id)}
                />
              ) : (
                <>
                  {feedback === "wrong" && (
                    <p
                      role="alert"
                      className="chunky-sm inline-flex -rotate-1 animate-card-in items-center gap-2 self-start rounded-xl bg-tomato px-4 py-2 font-display text-white"
                    >
                      <ShieldAlert className="size-5" /> Access Denied — Wrong Identity! New clue
                      unlocked 🔑
                    </p>
                  )}
                  <ClueBoard secret={secret} clueIndex={clueIndex} />

                  <button
                    type="button"
                    onClick={unlockNext}
                    disabled={clueIndex >= 4}
                    className="chunky pop flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky px-6 py-4 font-display text-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound className="size-6" strokeWidth={2.5} />
                    {clueIndex >= 4 ? "All clues unlocked!" : "Unlock Next Clue (−100 pts)"}
                  </button>

                  {/* Guess box */}
                  <Panel className="relative bg-white p-5" style={halftone("rgb(22 18 31 / 0.06)")}>
                    <div ref={guessBoxRef}>
                      <label
                        htmlFor="guess"
                        className="mb-2 flex items-center gap-2 font-display text-lg"
                      >
                        <Search className="size-5" strokeWidth={3} /> Who is it, Detective?
                      </label>
                      <form
                        className="flex flex-col gap-3 sm:flex-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitTyped();
                        }}
                      >
                        <div className="relative min-w-0 flex-1">
                          <input
                            ref={inputRef}
                            id="guess"
                            role="combobox"
                            aria-expanded={open && suggestions.length > 0}
                            aria-controls="hero-suggestions"
                            aria-autocomplete="list"
                            aria-activedescendant={
                              open && suggestions.length ? `hero-opt-${highlight}` : undefined
                            }
                            autoComplete="off"
                            spellCheck={false}
                            value={guess}
                            placeholder="Type the hero's name…"
                            onChange={(e) => {
                              setGuess(e.target.value);
                              setOpen(true);
                              setHighlight(0);
                              if (feedback === "pick") setFeedback(null);
                            }}
                            onFocus={() => setOpen(true)}
                            onBlur={() => setTimeout(() => setOpen(false), 120)}
                            onKeyDown={onKeyDown}
                            className={`chunky-sm w-full rounded-2xl px-4 py-3 font-display text-xl outline-none transition-shadow focus:shadow-[3px_3px_0_0_var(--color-ink),0_0_0_4px_var(--color-sun)] ${
                              feedback === "wrong" ? "bg-tomato/15" : "bg-paper"
                            }`}
                          />
                          {open && suggestions.length > 0 && (
                            <ul
                              id="hero-suggestions"
                              role="listbox"
                              className="chunky absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white py-1"
                            >
                              {suggestions.map((name, i) => (
                                <li
                                  key={name}
                                  id={`hero-opt-${i}`}
                                  role="option"
                                  aria-selected={i === highlight}
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // keep focus in the input
                                    choose(name);
                                  }}
                                  onMouseEnter={() => setHighlight(i)}
                                  className={`cursor-pointer px-4 py-2 font-semibold ${
                                    i === highlight ? "bg-sun" : ""
                                  }`}
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={!guess.trim()}
                          className="chunky pop flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-tomato px-6 py-3 font-display text-lg text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <VenetianMask className="size-6" strokeWidth={2.5} /> Guess!
                        </button>
                      </form>

                      {suspects.length > 0 ? (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/60">
                            Or tap a suspect · {suspects.length} left
                          </p>
                          <div
                            className={`grid gap-3 ${
                              suspects.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                            }`}
                          >
                            {suspects.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => makeGuess(name)}
                                aria-label={`Accuse ${name}`}
                                className="chunky-sm pop-sm flex min-h-14 cursor-pointer animate-card-in items-center justify-center rounded-2xl bg-paper px-3 py-2 text-center font-display text-sm leading-tight hover:bg-sun sm:text-base"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl border-[3px] border-dashed border-ink/30 px-4 py-3 text-sm font-semibold text-ink/70">
                          🕵️ No suspect list yet! Start typing a name to search, or unlock Clue 2
                          to see 8 suspects to choose from.
                        </p>
                      )}
                    </div>

                    {feedback === "pick" && (
                      <p role="status" className="mt-3 font-semibold text-grape">
                        Hmm, we don&apos;t have a file on that name. Check the spelling! 🔎
                      </p>
                    )}
                    {ruledOut.length > 0 && (
                      <p className="mt-3 text-sm font-semibold text-ink/70">
                        Ruled out:{" "}
                        {ruledOut.map((name) => (
                          <span key={name} className="mr-2 whitespace-nowrap line-through">
                            ❌ {name}
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-medium text-ink/60">
                      Stuck? A wrong guess just unlocks the next clue. Keep going, Detective!
                    </p>
                  </Panel>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Pieces
 * ------------------------------------------------------------------------- */

function Panel({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`chunky rounded-3xl ${className}`} style={style}>
      {children}
    </div>
  );
}

function Stamp({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-12 whitespace-nowrap rounded-lg border-4 px-3 py-1 font-display text-2xl tracking-widest opacity-90 mix-blend-multiply ${color}`}
    >
      {text}
    </span>
  );
}

/** The title card: a masked figure in the shadows, caught in a searchlight */
function Header() {
  return (
    <header
      className="chunky relative overflow-hidden rounded-3xl bg-[#0a0c14] px-6 py-10 text-center sm:py-12"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 55% 75% at 50% -10%, rgb(233 180 76 / 0.32), transparent 70%), radial-gradient(rgb(233 180 76 / 0.12) 1.2px, transparent 1.6px)",
        backgroundSize: "auto, 9px 9px",
      }}
    >
      {/* The hero hiding in the dark */}
      <VenetianMask
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-8 size-56 -rotate-12 text-[#e9b44c]/10"
        strokeWidth={1.25}
      />
      <p className="relative mb-4 inline-flex items-center gap-2 rounded-full border-2 border-[#e9b44c]/60 px-3 py-1 text-sm font-bold text-[#e9b44c]">
        <FolderOpen className="size-4" /> Mini-App #2: Detective HQ
      </p>
      <h1 className="relative font-display text-5xl leading-[0.95] tracking-wide sm:text-7xl">
        <span className="block text-[#e9b44c] [text-shadow:4px_4px_0_#000]">Secret Identity</span>
        <span className="block text-[#f6eedb] [text-shadow:4px_4px_0_#c22d3a,8px_8px_0_#000]">Detective</span>
      </h1>
      <p className="relative mx-auto mt-5 max-w-lg font-semibold text-[#d9d0bb]">
        A mystery hero is hiding in the files. Read the clues, crack the case, and
        unmask them before the trail goes cold!
      </p>
      <span className="pointer-events-none absolute -right-6 top-7 hidden rotate-12 rounded-lg border-4 border-tomato px-3 py-1 font-display text-2xl tracking-widest text-tomato sm:block">
        Top Secret
      </span>
    </header>
  );
}

function Toolbar({
  category,
  onCategory,
  counts,
  stats,
}: {
  category: Category;
  onCategory: (c: Category) => void;
  counts: Record<Category, number>;
  stats: { score: number; streak: number; bestStreak: number; solved: number };
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider opacity-70">
          Pick your case files
        </p>
        <div role="radiogroup" aria-label="Hero category" className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as Category[]).map((id) => {
            const c = CATEGORIES[id];
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onCategory(id)}
                className={`chunky-sm pop-sm cursor-pointer rounded-2xl px-4 py-2 text-left ${
                  active ? "bg-grape text-white" : "bg-white"
                }`}
              >
                <span className="block font-display text-sm">
                  {c.emoji} {c.label}
                </span>
                <span className={`block text-xs font-semibold ${active ? "text-white/85" : "text-ink/60"}`}>
                  {counts[id]} suspects
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Trophy className="size-4" />} label="Score" value={stats.score} color="bg-sun" />
        <Stat icon={<Flame className="size-4" />} label="Streak" value={stats.streak} color="bg-tangerine" />
        <Stat icon={<Flame className="size-4" />} label="Best" value={stats.bestStreak} color="bg-bubble" />
        <Stat icon={<BadgeCheck className="size-4" />} label="Solved" value={stats.solved} color="bg-lime" />
      </dl>
    </div>
  );
}

function HowToPlay() {
  const steps = [
    { emoji: "🔍", text: "Read the clues and look at the blurry photo." },
    { emoji: "⌨️", text: "Type your guess. From Clue 2 you get suspects to tap!" },
    { emoji: "🔑", text: "Each new clue makes the photo clearer and the list shorter." },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-2xl border-[3px] border-dashed border-ink/30 bg-white/70 px-4 py-2 text-sm font-semibold"
        >
          <span className="text-2xl" aria-hidden>
            {step.emoji}
          </span>
          {step.text}
        </li>
      ))}
    </ol>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`chunky-sm rounded-xl px-3 py-1.5 ${color}`}>
      <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">
        {icon} {label}
      </dt>
      <dd className="font-display text-xl leading-tight">{value}</dd>
    </div>
  );
}

function Dossier({
  secret,
  blur,
  status,
  potential,
  clueIndex,
  awarded,
}: {
  secret: Suspect;
  blur: number;
  status: Status;
  potential: number;
  clueIndex: number;
  awarded: number;
}) {
  const solved = status !== "playing";
  return (
    <article className="chunky relative rounded-3xl bg-[#f3d9a4] p-4 pt-10">
      {/* Folder tab */}
      <span className="absolute -top-[3px] left-6 rounded-b-xl border-[3px] border-t-0 border-ink bg-tomato px-4 py-1 font-display text-xs tracking-widest text-white">
        Case #{String(secret.id).padStart(4, "0")}
      </span>

      <div className="chunky-sm relative aspect-[3/4] overflow-hidden rounded-xl bg-ink">
        {/* Standard <img> so the external portrait loads without next/image config */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={secret.id}
          src={secret.image}
          alt={solved ? `${secret.name} portrait` : "Classified suspect photo"}
          className={`size-full object-cover transition-[filter,transform] duration-700 ease-out ${
            blur > 0 ? "scale-110" : "scale-100"
          }`}
          style={{ filter: `blur(${blur}px)` }}
        />
        {status === "playing" && (
          <Stamp text="Classified" color="border-tomato text-tomato bg-white/40" />
        )}
        {status === "won" && (
          <Stamp text="Unmasked!" color="border-lime text-lime bg-white/60 animate-card-in" />
        )}
        {status === "lost" && (
          <Stamp text="Case Closed" color="border-grape text-grape bg-white/60 animate-card-in" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
            {solved ? "Identity" : "Suspect"}
          </p>
          <p className="font-display text-xl leading-tight">
            {solved ? secret.name : "▇▇▇▇▇▇"}
          </p>
        </div>
        <div className="chunky-sm rounded-xl bg-white px-3 py-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
            {status === "won" ? "Earned" : status === "lost" ? "Earned" : "Reward"}
          </p>
          <p className="font-display text-2xl leading-none text-tomato">
            {status === "playing" ? potential : awarded}
          </p>
        </div>
      </div>

      {/* Clue pips */}
      <div className="mt-3 flex gap-1.5" aria-label={`Clue ${clueIndex + 1} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${
              i <= clueIndex ? "bg-tomato" : "bg-white/70"
            }`}
          />
        ))}
      </div>
    </article>
  );
}

function ClueBoard({ secret, clueIndex }: { secret: Suspect; clueIndex: number }) {
  const clues = cluesFor(secret);
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {clues.map((clue, i) => (
        <li key={clue.title} className={i === 4 ? "sm:col-span-2" : ""}>
          <ClueCard clue={clue} n={i + 1} unlocked={i <= clueIndex} fresh={i === clueIndex} />
        </li>
      ))}
    </ol>
  );
}

const CLUE_COLORS = ["bg-sky", "bg-lime", "bg-tangerine", "bg-bubble", "bg-grape"];

function ClueCard({
  clue,
  n,
  unlocked,
  fresh,
}: {
  clue: Clue;
  n: number;
  unlocked: boolean;
  fresh: boolean;
}) {
  return (
    <div
      className={`chunky h-full overflow-hidden rounded-2xl bg-white ${
        fresh && n > 1 ? "animate-card-in" : ""
      } ${unlocked ? "" : "brightness-[0.82]"}`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b-[3px] border-ink px-4 py-2 ${
          unlocked ? CLUE_COLORS[n - 1] : "bg-ink/10"
        } ${n === 5 && unlocked ? "text-white" : ""}`}
      >
        <span className="font-display text-sm">
          {clue.emoji} Clue {n}: {clue.title}
        </span>
        <span className="rounded-full border-2 border-ink bg-white px-2 text-xs font-bold text-ink">
          {clue.points} pts
        </span>
      </div>
      <div className="p-4">
        {unlocked ? (
          <div className="flex flex-col gap-3">
            {clue.puzzle && (
              <p
                aria-label={`Name puzzle: ${clue.puzzle}`}
                className="rounded-xl border-[3px] border-ink bg-sun px-3 py-2 text-center font-mono text-2xl font-bold tracking-wider break-words"
              >
                {clue.puzzle}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {clue.rows.map((row) => (
                <div key={row.label} className={row.value.length > 24 ? "col-span-2" : ""}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/60">
                    {row.label}
                  </dt>
                  <dd className="font-semibold leading-snug break-words">
                    <RedactedText text={row.value} />
                  </dd>
                </div>
              ))}
            </dl>
            {clue.stats && <PowerBars stats={clue.stats} />}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-ink/50">
            <Lock className="size-5 shrink-0" strokeWidth={2.5} />
            <div className="flex flex-1 flex-col gap-1.5" aria-label="Locked clue">
              <span className="h-3 w-4/5 rounded bg-ink/80" />
              <span className="h-3 w-3/5 rounded bg-ink/80" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PowerBars({ stats }: { stats: NonNullable<Clue["stats"]> }) {
  return (
    <div className="grid gap-1.5" aria-label="Super-skills">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">Super-skills</p>
      {STAT_LABELS.map(({ key, label, emoji }) => (
        <div key={key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm font-semibold">
          <span>
            {emoji} {label}
          </span>
          <span className="h-3 overflow-hidden rounded-full border-2 border-ink bg-ink/10">
            <span
              className="block h-full rounded-full bg-tomato"
              style={{ width: `${Math.max(4, stats[key])}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{stats[key]}</span>
        </div>
      ))}
    </div>
  );
}

/** Shows [REDACTED] as a black censor bar */
function RedactedText({ text }: { text: string }) {
  const parts = text.split("[REDACTED]");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="mx-0.5 rounded bg-ink px-1.5 py-0.5 text-xs font-bold tracking-wider text-paper">
              REDACTED
            </span>
          )}
        </span>
      ))}
    </>
  );
}

function CaseClosed({
  secret,
  status,
  awarded,
  onNext,
}: {
  secret: Suspect;
  status: Status;
  awarded: number;
  onNext: () => void;
}) {
  const won = status === "won";
  const clues = cluesFor(secret, true);
  return (
    <div className="flex animate-card-in flex-col gap-5">
      <Panel
        className={`p-6 text-center ${won ? "bg-lime" : "bg-bubble"}`}
        style={halftone("rgb(255 255 255 / 0.45)")}
      >
        <p className="font-display text-3xl leading-tight [text-shadow:3px_3px_0_white] sm:text-4xl">
          {won ? "Case Cracked! 🎉" : "The suspect escaped! 💨"}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {won ? (
            <>
              It was <strong>{secret.name}</strong>! You earned{" "}
              <strong>{awarded} points</strong>.
            </>
          ) : (
            <>
              It was <strong>{secret.name}</strong> all along. Your streak resets —
              crack the next one!
            </>
          )}
        </p>
      </Panel>

      <Panel className="overflow-hidden bg-white">
        <div className="flex items-center gap-2 border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
          <FolderOpen className="size-5" />
          <span className="font-display tracking-wider">Full Hero Dossier</span>
        </div>
        <div className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
          <Fact label="Codename" value={secret.name} />
          <Fact label="Power rating" value={`${secret.powerTotal} / 600`} />
          {clues.flatMap((c) =>
            c.rows.map((r) => <Fact key={`${c.title}-${r.label}`} label={r.label} value={r.value} />),
          )}
        </div>
      </Panel>

      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="chunky pop flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-tomato px-6 py-4 font-display text-xl text-white"
      >
        <Search className="size-6" strokeWidth={3} /> Next Case
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{label}</p>
      <p className="font-semibold leading-snug break-words">{value}</p>
    </div>
  );
}
