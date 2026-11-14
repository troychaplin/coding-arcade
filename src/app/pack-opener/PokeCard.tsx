"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Gamepad2, Sparkles } from "lucide-react";
import { setLogo } from "./data";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Our own card-back design (face-down cards and locked binder slots). */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative grid aspect-[63/88] w-full place-items-center overflow-hidden rounded-xl border-[3px] border-ink bg-[#2b2f8f] ${className}`}
      style={{
        backgroundImage:
          "repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.07) 0deg 10deg, transparent 10deg 20deg)",
      }}
    >
      <div className="absolute inset-2 rounded-lg border-2 border-sun/70" />
      <div className="relative grid size-16 place-items-center rounded-full border-[3px] border-ink bg-sun shadow-[0_0_0_6px_rgb(255_255_255/0.25)]">
        <Gamepad2 className="size-8 text-ink" strokeWidth={2.5} />
      </div>
      <span className="absolute bottom-3 font-display text-[10px] tracking-[0.25em] text-sun">
        ARCADE TCG
      </span>
    </div>
  );
}

/**
 * Rainbow holographic foil. A rainbow sheen sweeps across by itself (for
 * tablets), and a glare follows the mouse or finger while it moves over the card.
 */
export function HoloFoil({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  // Slow automatic shimmer so the foil shines even without a mouse.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const anim = sheenRef.current?.animate(
      [{ backgroundPosition: "0% 50%" }, { backgroundPosition: "100% 50%" }],
      { duration: 3500, iterations: Infinity, direction: "alternate", easing: "ease-in-out" },
    );
    return () => anim?.cancel();
  }, []);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
    el.style.setProperty("--glare", "1");
    if (!prefersReducedMotion()) {
      el.style.transform = `perspective(700px) rotateY(${(x - 50) / 6}deg) rotateX(${(50 - y) / 6}deg)`;
    }
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--glare", "0");
    el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative overflow-hidden rounded-xl transition-transform duration-150 ease-out ${className}`}
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%", ["--glare" as string]: "0" }}
    >
      {children}
      {/* Rainbow sheen */}
      <div
        ref={sheenRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 20%, rgb(255 0 128 / 0.45) 30%, rgb(255 220 0 / 0.45) 40%, rgb(0 255 170 / 0.45) 50%, rgb(0 160 255 / 0.45) 60%, rgb(190 0 255 / 0.45) 70%, transparent 80%)",
          backgroundSize: "250% 250%",
          opacity: 0.75,
        }}
      />
      {/* Glare that follows the pointer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-200"
        style={{
          opacity: "var(--glare)",
          backgroundImage:
            "radial-gradient(circle at var(--mx) var(--my), rgb(255 255 255 / 0.85), rgb(255 255 255 / 0.15) 35%, transparent 60%)",
        }}
      />
    </div>
  );
}

/** The card face: artwork, with foil when shiny. */
export function CardFace({
  src,
  alt,
  shiny,
  className = "",
}: {
  src: string;
  alt: string;
  shiny: boolean;
  className?: string;
}) {
  const img = (
    // Plain <img> so card art from the TCGdex CDN loads without next/image config
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`block aspect-[63/88] w-full rounded-xl bg-ink/10 object-cover ${className}`}
    />
  );
  return shiny ? <HoloFoil>{img}</HoloFoil> : img;
}

/**
 * A card that starts face-down and flips over when tapped. Turns edge-on,
 * swaps sides, then turns back — so it never shows a mirrored card, in any
 * browser (the trick our ID cards use).
 */
export function FlipCard({
  flipped,
  onFlip,
  front,
  label,
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  label: string;
}) {
  const [turning, setTurning] = useState(false);
  const [showFront, setShowFront] = useState(flipped);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // When the parent flips us (tap or "Flip all"), run the two-step turn.
  useEffect(() => {
    if (flipped === showFront) return;
    const startTurn = setTimeout(() => setTurning(true), 0);
    timer.current = setTimeout(() => {
      setShowFront(flipped);
      setTurning(false);
    }, 200);
    return () => clearTimeout(startTurn);
  }, [flipped, showFront]);

  return (
    <div className="[perspective:900px]">
      <button
        type="button"
        onClick={onFlip}
        disabled={flipped}
        aria-label={flipped ? label : "Face-down card. Tap to flip!"}
        className={`relative block w-full cursor-pointer rounded-xl transition-transform duration-200 ease-in-out [transform-style:preserve-3d] disabled:cursor-default ${
          turning ? "[transform:rotateY(90deg)]" : "[transform:rotateY(0deg)]"
        } ${showFront ? "" : "hover:-translate-y-2 hover:rotate-2"}`}
      >
        {showFront ? front : <CardBack />}
      </button>
    </div>
  );
}

export function ShinyTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-sun px-2 py-0.5 text-[11px] font-bold">
      <Sparkles className="size-3" strokeWidth={3} /> Holo
    </span>
  );
}

/** A set's logo — or, for the Energy pack, a row of energy symbols. */
export function SetLogo({
  setId,
  alt = "",
  className = "",
  large = false,
}: {
  setId: string;
  alt?: string;
  className?: string;
  /** Bigger energy emblem for the big pack artwork */
  large?: boolean;
}) {
  const src = setLogo(setId);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`w-full object-contain ${className}`} />;
  }
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={`flex w-full flex-col items-center justify-center leading-none ${className}`}
    >
      <span className={`leading-none ${large ? "text-2xl" : "text-sm"}`} aria-hidden>
        🔥💧🌿⚡
      </span>
      <span
        className={`font-display leading-none tracking-widest text-tangerine ${large ? "my-1 text-base" : "my-0.5 text-[10px]"}`}
        aria-hidden
      >
        ENERGY
      </span>
      <span className={`leading-none ${large ? "text-2xl" : "text-sm"}`} aria-hidden>
        🔮👊🌙⚙️
      </span>
    </span>
  );
}
