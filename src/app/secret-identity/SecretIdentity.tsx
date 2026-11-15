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
  const bits = ["POW!", "BAM!", "ZAP!", "💥", "⭐", "WHAM!"];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement("span");
    el.textContent = bits[i % bits.length];
    el.className =
      "pointer-events-none absolute left-1/2 top-1/2 font-display text-3xl text-[#f4d35e] [text-shadow:2px_2px_0_#000]";
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
        <Panel className="p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-tomato" />
          <p className="mt-3 font-display text-xl">Can&apos;t reach Detective HQ!</p>
          <p className="comic-muted font-medium">
            The hero files didn&apos;t load. Check the internet and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              setReloadKey((k) => k + 1);
            }}
            className="comic-panel-sm pop-sm mt-5 inline-flex cursor-pointer items-center gap-2 bg-sun px-6 py-3 font-display text-lg tracking-wide"
          >
            <RotateCcw className="size-5" /> Try again
          </button>
        </Panel>
      ) : !roster || !secret ? (
        <Panel className="grid place-items-center p-12 text-center">
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
                    <div role="alert" className="flex animate-card-in items-center gap-2 self-start">
                      <Burst size="size-20" fill="bg-tomato">
                        <span className="-rotate-6 font-display text-xl text-[#fff8e7] [text-shadow:2px_2px_0_#000]">
                          Nope!
                        </span>
                      </Burst>
                      <p className="speech-balloon font-display text-lg tracking-wide">
                        Access denied, wrong identity! New clue decoded.
                      </p>
                    </div>
                  )}
                  <ClueBoard key={secret.id} secret={secret} clueIndex={clueIndex} />

                  <button
                    type="button"
                    onClick={unlockNext}
                    disabled={clueIndex >= 4}
                    className="comic-panel-sm pop-sm flex cursor-pointer items-center justify-center gap-3 bg-tomato px-6 py-4 font-display text-xl tracking-wide text-[#fff8e7] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span aria-hidden className="decoder-lens block h-7 w-11 -rotate-6" />
                    {clueIndex >= 4 ? "Every clue decoded!" : "Decode next clue (−100 pts)"}
                  </button>

                  {/* Guess box */}
                  <Panel className="p-5 pt-6">
                    <div ref={guessBoxRef}>
                      <label htmlFor="guess" className="speech-balloon mb-6 font-display text-xl tracking-wide">
                        <Search className="mr-1.5 inline size-5 -translate-y-0.5" strokeWidth={3} />
                        Who is it, Detective?
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
                            className={`comic-panel-sm w-full px-4 py-3 font-display text-xl tracking-wide text-[#ebe4d2] outline-none placeholder:text-[#ebe4d2]/40 focus:shadow-[4px_4px_0_0_#000,0_0_0_4px_var(--color-sun)] ${
                              feedback === "wrong" ? "bg-[#3a1419]" : "bg-[#0e1018]"
                            }`}
                          />
                          {open && suggestions.length > 0 && (
                            <ul
                              id="hero-suggestions"
                              role="listbox"
                              className="comic-panel-sm absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto bg-[#0e1018] py-1 text-[#ebe4d2]"
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
                          className="comic-panel-sm pop-sm flex cursor-pointer items-center justify-center gap-2 bg-tomato px-6 py-3 font-display text-xl tracking-wide text-[#fff8e7] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <VenetianMask className="size-6" strokeWidth={2.5} /> Guess!
                        </button>
                      </form>

                      {suspects.length > 0 ? (
                        <div className="mt-6">
                          <p className="comic-caption mb-3 text-sm">
                            The line-up: tap a suspect ({suspects.length} left)
                          </p>
                          <div
                            className={`grid gap-3 ${
                              suspects.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                            }`}
                          >
                            {suspects.map((name, i) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => makeGuess(name)}
                                aria-label={`Accuse ${name}`}
                                className={`comic-panel-sm pop-sm flex min-h-14 cursor-pointer animate-card-in items-center justify-center bg-[#262a3a] px-3 py-2 text-center font-display text-base leading-tight tracking-wide text-[#ebe4d2] hover:bg-sun hover:text-ink sm:text-lg ${
                                  i % 2 ? "rotate-1" : "-rotate-1"
                                }`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="comic-muted mt-5 border-[3px] border-dashed border-[#ebe4d2]/30 px-4 py-3 text-sm font-semibold">
                          🕵️ No line-up yet! Start typing a name to search, or decode Clue 2 to
                          see 8 suspects to choose from.
                        </p>
                      )}
                    </div>

                    {feedback === "pick" && (
                      <p role="status" className="mt-3 font-semibold text-grape">
                        Hmm, we don&apos;t have a file on that name. Check the spelling! 🔎
                      </p>
                    )}
                    {ruledOut.length > 0 && (
                      <p className="comic-muted mt-3 text-sm font-semibold">
                        Ruled out:{" "}
                        {ruledOut.map((name) => (
                          <span key={name} className="mr-2 whitespace-nowrap line-through">
                            ❌ {name}
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="comic-muted mt-3 text-sm font-medium">
                      Stuck? A wrong guess just decodes the next clue. Keep going, Detective!
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

/** A comic book panel */
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
    <div className={`comic-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

/** A sound-effect starburst with an inked outline */
function Burst({ size, fill, children }: { size: string; fill: string; children: ReactNode }) {
  return (
    <span className={`comic-burst grid shrink-0 bg-[#050507] p-1 ${size}`}>
      <span className={`comic-burst grid place-items-center text-center ${fill}`}>{children}</span>
    </span>
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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="comic-caption mb-3 text-sm">Pick your case files</p>
        <div role="radiogroup" aria-label="Hero category" className="flex flex-wrap gap-2.5">
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
                className={`comic-panel-sm pop-sm cursor-pointer px-4 py-2 text-left ${
                  active ? "bg-sun" : "bg-[#171a24] text-[#ebe4d2]"
                }`}
              >
                <span className="block font-display text-base tracking-wide">
                  {c.emoji} {c.label}
                </span>
                <span className={`block text-xs font-semibold ${active ? "text-ink/70" : "comic-muted"}`}>
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

/** How to play, told as a three-panel comic strip */
function HowToPlay() {
  const steps = [
    { emoji: "🔍", text: "Read the clues and look at the blurry photo." },
    { emoji: "⌨️", text: "Type your guess. From Clue 2 you get suspects to tap!" },
    { emoji: "🔑", text: "Each clue you decode makes the photo clearer and the list shorter." },
  ];
  return (
    <ol className="grid gap-5 sm:grid-cols-3">
      {steps.map((step, i) => (
        <li key={i} className="comic-panel flex items-center gap-3 px-4 pb-3 pt-5 text-sm font-semibold">
          <span className="comic-caption absolute -top-3.5 left-3 text-sm">{i + 1}</span>
          <span className="text-3xl" aria-hidden>
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
    <div className={`comic-panel-sm px-3 py-1.5 ${color}`}>
      <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">
        {icon} {label}
      </dt>
      <dd className="font-display text-2xl leading-tight tracking-wide">{value}</dd>
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
    <article className="comic-panel p-4 pt-8">
      <span className="comic-caption absolute -top-4 left-4 -rotate-2 text-sm">
        Case #{String(secret.id).padStart(4, "0")}
      </span>

      <div className="relative">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] border-4 border-[#050507] bg-ink">
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
        {/* The reward, as a starburst over the corner of the photo */}
        <div className="absolute -right-3 -top-4 z-20 rotate-6">
          <Burst size="size-24" fill="bg-sun">
            <span className="leading-none">
              <span className="block text-[10px] font-bold uppercase tracking-wider">
                {status === "playing" ? "Reward" : "Earned"}
              </span>
              <span className="block font-display text-2xl text-tomato">
                {status === "playing" ? potential : awarded}
              </span>
            </span>
          </Burst>
        </div>
      </div>

      <div className="mt-4">
        <p className="comic-muted text-xs font-bold uppercase tracking-wider">
          {solved ? "Identity" : "Suspect"}
        </p>
        <p className="font-display text-2xl leading-tight tracking-wide">
          {solved ? (
            secret.name
          ) : (
            <span
              aria-label="Name redacted"
              className="mt-1 inline-block h-6 w-44 -rotate-1 bg-[#050507] ring-1 ring-[#ebe4d2]/35"
            />
          )}
        </p>
      </div>

      {/* Clues decoded so far: red once decoded, still scrambled if not */}
      <div className="mt-3 flex gap-1.5" aria-label={`Clue ${clueIndex + 1} of 5 decoded`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-4 flex-1 rounded-[2px] border-2 border-[#050507] ${
              i <= clueIndex ? "bg-tomato" : "decoder-noise"
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
    <ol className="grid gap-x-4 gap-y-7 pt-3 sm:grid-cols-2">
      {clues.map((clue, i) => (
        <li key={clue.title} className={i === 4 ? "sm:col-span-2" : ""}>
          <ClueCard clue={clue} n={i + 1} unlocked={i <= clueIndex} fresh={i === clueIndex} />
        </li>
      ))}
    </ol>
  );
}

/** Gibberish printed under the scramble lines of a locked clue */
const SCRAMBLE = ["QX7 ZRK 9WF MT4", "PLV 2HD XQ8 KJ", "WM3 TZK RQ5 BXN", "J8K VXQ 4LM ZPT", "RT9 KXW QZ2 MVL"];

function ClueCard({
  clue,
  n,
  unlocked,
  fresh,
}: {
  clue: Clue;
  n: number;
  unlocked: boolean;
  /** The clue just decoded: play the decoder sweep */
  fresh: boolean;
}) {
  return (
    <div className="comic-panel h-full px-4 pb-4 pt-6">
      <span
        className={`comic-caption absolute -top-4 left-3 text-sm ${
          unlocked ? "" : "!bg-[#cfc4a8] text-ink/70"
        } ${n % 2 ? "-rotate-1" : "rotate-1"}`}
      >
        {clue.emoji} Clue {n}: {clue.title}
      </span>
      <span className="absolute -top-3 right-3 rounded-full border-[3px] border-[#050507] bg-white px-2 text-xs font-bold text-ink">
        {clue.points} pts
      </span>

      {unlocked ? (
        <div className="relative overflow-hidden">
          <div className={`flex flex-col gap-3 ${fresh ? "animate-decoder-reveal" : ""}`}>
            {clue.puzzle && <PuzzleTiles puzzle={clue.puzzle} />}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {clue.rows.map((row) => (
                <div key={row.label} className={row.value.length > 24 ? "col-span-2" : ""}>
                  <dt className="comic-muted text-[11px] font-bold uppercase tracking-wide">
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
          {/* The red decoder sliding over the card (parked off the edge when still) */}
          {fresh && (
            <span
              aria-hidden
              className="decoder-lens pointer-events-none absolute inset-y-0 w-2/5 animate-decoder-sweep"
              style={{ left: "100%" }}
            />
          )}
        </div>
      ) : (
        <div className="decoder-noise relative flex min-h-16 items-center rounded-[3px] border-[3px] border-[#050507] px-3 py-2">
          <p aria-hidden className="select-none font-display text-xl tracking-[0.2em] text-[rgb(255_90_100/0.8)]">
            {SCRAMBLE[n - 1]}
          </p>
          <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border-2 border-[#050507] bg-[#0e1018] text-[#ebe4d2]">
            <Lock className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          <span className="sr-only">Locked clue. Decode it to read it.</span>
        </div>
      )}
    </div>
  );
}

/** The letter puzzle as cipher tiles, one row of tiles per word */
function PuzzleTiles({ puzzle }: { puzzle: string }) {
  // Each word starts with its (shown) first letter; "_" are the hidden ones
  const words: string[][] = [];
  for (const token of puzzle.split(" ")) {
    if (/[A-Za-z0-9]/.test(token) || !words.length) words.push([token]);
    else words[words.length - 1].push(token);
  }
  return (
    <div
      aria-label={`Name puzzle: ${puzzle}`}
      role="img"
      className="comic-well flex flex-wrap justify-center gap-x-5 gap-y-2 px-3 py-3"
    >
      {words.map((word, w) => (
        <span key={w} className="flex gap-1">
          {word.map((ch, i) =>
            ch === "_" || /[A-Za-z0-9]/.test(ch) ? (
              <span
                key={i}
                className={`grid h-9 w-7 place-items-center rounded-[3px] border-[3px] border-[#050507] font-display text-xl ${
                  ch === "_" ? "bg-[#2a2e3c]" : "bg-sun"
                }`}
              >
                {ch === "_" ? "" : ch}
              </span>
            ) : (
              <span key={i} className="self-end font-display text-xl">
                {ch}
              </span>
            ),
          )}
        </span>
      ))}
    </div>
  );
}

/** Super-skills as an 80s tech spec chart: red bars out of 10 */
function PowerBars({ stats }: { stats: NonNullable<Clue["stats"]> }) {
  return (
    <div className="comic-well p-3" aria-label="Super-skills, out of 10">
      <p className="mb-2 flex items-baseline justify-between font-display text-base tracking-wide">
        Tech specs
        <span className="comic-muted text-xs font-bold tracking-normal">out of 10</span>
      </p>
      <div className="grid gap-1.5">
        {STAT_LABELS.map(({ key, label, emoji }) => {
          const score = Math.max(1, Math.round(stats[key] / 10));
          return (
            <div key={key} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-2 text-sm font-semibold">
              <span>
                {emoji} {label}
              </span>
              <span className="grid grid-cols-10 gap-[2px]" title={`${stats[key]} / 100`}>
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-4 rounded-[2px] border-[1.5px] border-[#050507] ${i < score ? "bg-tomato" : "bg-[#2a2e3c]"}`}
                  />
                ))}
              </span>
              <span className="text-right font-display text-base tabular-nums">{score}</span>
            </div>
          );
        })}
      </div>
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
            <span className="mx-0.5 inline-block -rotate-1 bg-[#050507] px-1.5 py-0.5 text-xs font-bold tracking-wider text-paper ring-1 ring-[#ebe4d2]/35">
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
    <div className="flex animate-card-in flex-col gap-6">
      <Panel className="flex flex-col items-center p-6 text-center">
        <Burst size="size-44 sm:size-52" fill={won ? "bg-sun" : "bg-sky"}>
          <span className="-rotate-6 font-display text-4xl text-tomato [text-shadow:3px_3px_0_#000] sm:text-5xl">
            {won ? "Ka-pow!" : "Whoosh!"}
          </span>
        </Burst>
        <p className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
          {won ? "Case cracked!" : "The suspect escaped!"}
        </p>
        <p className="mt-2 max-w-md text-lg font-semibold">
          {won ? (
            <>
              It was <strong>{secret.name}</strong>! You earned{" "}
              <strong>{awarded} points</strong>.
            </>
          ) : (
            <>
              It was <strong>{secret.name}</strong> all along. Your streak resets, so crack
              the next one!
            </>
          )}
        </p>
      </Panel>

      <Panel className="px-5 pb-5 pt-8">
        <span className="comic-caption absolute -top-4 left-4 -rotate-1 text-sm">
          <FolderOpen className="size-4" /> Full hero dossier
        </span>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
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
        className="comic-panel-sm pop-sm flex cursor-pointer items-center justify-center gap-2 bg-tomato px-6 py-4 font-display text-2xl tracking-wide text-[#fff8e7]"
      >
        <Search className="size-6" strokeWidth={3} /> Next case
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="comic-muted text-[11px] font-bold uppercase tracking-wide">{label}</p>
      <p className="font-semibold leading-snug break-words">{value}</p>
    </div>
  );
}
