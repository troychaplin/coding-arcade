"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dices, Flame, HeartCrack, House, Pizza, Quote, RotateCw, Ruler, Sparkles, Zap } from "lucide-react";
import {
  avatarUrl,
  extrasFor,
  rarityInfo,
  styleOption,
  type AvatarStyle,
  type Rarity,
  type Stats,
} from "./data";

type Props = Stats & {
  name: string;
  style: AvatarStyle;
  /** Alternate avatar look (0 = default for the name) */
  avatarVariant?: number;
  /** Shows a "New look" button under the jar */
  onNewLook?: () => void;
  /** Smaller jar for the squad shelf */
  compact?: boolean;
  /** Squad card id, shown as the specimen number */
  serial?: string;
};

type Phase = "idle" | "out" | "in";

const OUT_MS = 340;
const IN_MS = 380;

/** Glass and glow for each rarity */
const RARITY_GLASS: Record<Rarity, string> = {
  common: "border-[#a8e6bd]/50 shadow-[0_0_24px_rgb(77_255_106/0.18)]",
  rare: "border-sky shadow-[0_0_32px_rgb(61_227_207/0.5)]",
  epic: "border-grape shadow-[0_0_36px_rgb(154_92_255/0.6)]",
  legendary: "border-sun shadow-[0_0_44px_rgb(212_255_58/0.65)]",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A steady 4-digit specimen number for a name + style */
function specimenNumber(name: string, style: AvatarStyle) {
  let h = 7;
  for (const ch of `${name.trim().toLowerCase()}|${style}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h % 10000).padStart(4, "0");
}

/** Sizes for the giant preview jar and the small squad jars */
const SIZES = {
  large: {
    wrap: "max-w-[22rem]",
    lid: "mx-5",
    neck: "mx-9",
    jar: "h-[27rem] rounded-b-[4.5rem] rounded-t-[2rem]",
    specimen: "size-40 top-[9%]",
    front: "inset-x-7 bottom-8",
    back: "inset-x-6 bottom-7 top-6",
    name: "text-3xl",
    notesTitle: "text-2xl",
    noteText: "text-sm",
    tag: "text-sm",
  },
  compact: {
    wrap: "max-w-[15rem]",
    lid: "mx-4",
    neck: "mx-7",
    jar: "h-[22rem] rounded-b-[3.5rem] rounded-t-[1.5rem]",
    specimen: "size-28 top-[8%]",
    front: "inset-x-4 bottom-6",
    back: "inset-x-3.5 bottom-5 top-4",
    name: "text-xl",
    notesTitle: "text-lg",
    noteText: "text-xs",
    tag: "text-xs",
  },
};

/**
 * Your creation floating in a specimen jar: giant for the live preview,
 * small on the squad shelf. The
 * front label has its name and class, the liquid level is its power, and the
 * rarity hangs on a tag. Spin the jar to read the lab notes on the back.
 */
export default function JarCard({
  name,
  style,
  power,
  superpower,
  characterClass,
  rarity,
  avatarVariant = 0,
  onNewLook,
  compact = false,
  serial,
}: Props) {
  const size = SIZES[compact ? "compact" : "large"];
  const [side, setSide] = useState<"front" | "back">("front");
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const theme = styleOption(style);
  const tier = rarityInfo(rarity);
  const displayName = name.trim() || "Mystery Hero";
  const extras = extrasFor(displayName, style);
  // Liquid level: power 50 → 62% full, power 100 → 90% full, so even a weak
  // specimen is well under the surface
  const level = (p: number) => 62 + ((p - 50) / 50) * 28;

  /** Turn the jar round: the label slides away round the curve, then the other one comes round */
  function spin() {
    if (phase !== "idle") return;
    const other = side === "front" ? "back" : "front";
    if (prefersReducedMotion()) {
      setSide(other);
      return;
    }
    setPhase("out");
    timers.current.push(
      setTimeout(() => {
        setSide(other);
        setPhase("in");
        timers.current.push(setTimeout(() => setPhase("idle"), IN_MS));
      }, OUT_MS),
    );
  }

  const labelMotion =
    phase === "out" ? "animate-jar-label-out" : phase === "in" ? "animate-jar-label-in" : "";
  const specimenMotion =
    phase === "out" ? "animate-jar-specimen-out" : phase === "in" ? "animate-jar-specimen-in" : "";

  return (
    <div data-rarity={tier.id} className={`relative mx-auto w-full ${size.wrap}`}>
      <div className={phase !== "idle" ? "animate-jar-wobble" : ""}>
        {/* Lid with a knob */}
        <div aria-hidden className={`relative ${size.lid}`}>
          <span className="brass absolute -top-3 left-1/2 h-4 w-10 -translate-x-1/2 rounded-t-lg" />
          <span className="brass block h-7 rounded-t-2xl" />
        </div>
        {/* Neck */}
        <div aria-hidden className={`${size.neck} h-3 border-x-[3px] border-[#a8e6bd]/40 bg-white/5`} />

        {/* The rarity, on a paper tag tied to the neck */}
        <div className="absolute -right-1 top-6 z-30 flex rotate-[10deg] flex-col items-center sm:-right-3">
          <span aria-hidden className="h-5 w-0.5 bg-[#d6a041]" />
          <span
            className={`${tier.badge} relative flex items-center gap-1 rounded-md border-2 border-[#050806] py-1 pl-4 pr-2.5 font-display ${size.tag} tracking-wider shadow-[2px_2px_0_#020604]`}
          >
            <span aria-hidden className="absolute left-1.5 size-1.5 rounded-full border border-[#050806] bg-[#07100b]" />
            {(tier.id === "epic" || tier.id === "legendary") && (
              <Sparkles className={`size-3.5 ${tier.id === "legendary" ? "animate-sparkle" : ""}`} strokeWidth={3} />
            )}
            {tier.label}
          </span>
        </div>

        {/* The jar */}
        <div
          className={`relative ${size.jar} overflow-hidden border-[3px] bg-[#07100b]/75 ${RARITY_GLASS[tier.id]}`}
        >
          {/* Liquid, filled to its power level */}
          <div
            aria-hidden
            className={`absolute inset-x-0 bottom-0 ${theme.color} opacity-50 transition-[height] duration-500 ease-out`}
            style={{ height: `${level(power)}%` }}
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-white/40" />
          </div>
          {/* Bubbles */}
          {(compact ? [30, 68] : [22, 46, 64, 81]).map((left, i) => (
            <span
              key={left}
              aria-hidden
              className="animate-bubble absolute bottom-6 size-3 rounded-full border-2 border-white/60"
              style={{ left: `${left}%`, animationDelay: `${i * 0.6}s`, animationDuration: `${3 + i * 0.4}s`, opacity: 0 }}
            />
          ))}

          {/* Power gauge marked on the glass */}
          <div aria-hidden className="absolute inset-y-0 right-3 w-8">
            {[60, 70, 80, 90, 100].map((mark) => (
              <span
                key={mark}
                className="absolute right-0 flex translate-y-1/2 items-center gap-1 text-[10px] font-bold text-[#d9f5dc]/70"
                style={{ bottom: `${level(mark)}%` }}
              >
                {!compact && mark}
                <span className="h-0.5 w-2.5 bg-[#d9f5dc]/60" />
              </span>
            ))}
          </div>

          {/* The specimen, floating */}
          <div
            className={`absolute left-1/2 ${size.specimen} -translate-x-1/2 transition-opacity duration-300 ${
              side === "back" ? "opacity-30" : ""
            }`}
          >
            <div className={`size-full ${specimenMotion}`}>
              {/* Plain <img> so DiceBear SVGs load without next/image domain config */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={avatarVariant}
                src={avatarUrl(style, displayName, avatarVariant)}
                alt={side === "front" ? `${displayName} floating in the jar` : ""}
                className={`size-full animate-card-in drop-shadow-[0_0_18px_rgb(77_255_106/0.45)] ${
                  // The monster style paints its face as a square: make it a floating blob
                  style === "fun-emoji" ? "rounded-full" : ""
                }`}
                width={160}
                height={160}
              />
            </div>
          </div>

          {/* Labels stuck on the glass: one at a time, coming round as the jar turns */}
          {side === "front" ? (
            <div className={`absolute ${size.front} ${labelMotion}`}>
              <Label className={`-rotate-1 text-center ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
                <p className="text-[11px] font-bold tracking-wider text-[#5a4a2a]">
                  Specimen no. {serial ? serial.slice(0, 4).toUpperCase() : specimenNumber(displayName, style)}
                </p>
                <h3 className={`mt-0.5 font-display ${size.name} leading-tight tracking-wide break-words`}>
                  {displayName}
                </h3>
                <p className={`mt-1 inline-block rounded bg-grape px-2 py-0.5 font-semibold text-white ${compact ? "text-xs" : "text-sm"}`}>
                  {characterClass}
                </p>
                <p className={`flex items-center justify-center gap-1 font-bold ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>
                  <Zap className="size-4 fill-[#e3a92b]" /> Power {power} / 100
                </p>
              </Label>
            </div>
          ) : (
            <div className={`absolute ${size.back} ${labelMotion}`}>
              <Label
                className={`flex h-full rotate-[0.6deg] flex-col overflow-y-auto ${
                  compact ? "gap-1.5 px-3 py-2" : "gap-2.5 px-4 py-3"
                }`}
              >
                <p className={`text-center font-display ${size.notesTitle} tracking-wide`}>Lab notes</p>
                <Note icon={<Flame className="size-4 text-[#d4442f]" />} label="Superpower" value={superpower} textSize={size.noteText} />
                <Note icon={<HeartCrack className="size-4 text-[#7a3fd1]" />} label="Weakness" value={extras.weakness} textSize={size.noteText} />
                <Note icon={<Pizza className="size-4 text-[#c9772b]" />} label="Favourite snack" value={extras.snack} textSize={size.noteText} />
                <Note icon={<House className="size-4 text-[#2a8f86]" />} label="Home base" value={extras.homeBase} textSize={size.noteText} />
                <Note icon={<Ruler className="size-4 text-[#3f8a3a]" />} label="Size" value={extras.size} textSize={size.noteText} />
                <blockquote
                  className={`relative mt-auto rounded-md border-2 border-dashed border-[#5a4a2a]/50 font-display leading-snug tracking-wide ${
                    compact ? "px-2 py-1.5 text-sm" : "px-3 py-2 text-base"
                  }`}
                >
                  <Quote className="absolute -left-2 -top-2.5 size-5 rounded-full bg-[#efe6c8] p-0.5" />
                  “{extras.catchphrase}”
                </blockquote>
              </Label>
            </div>
          )}

          {/* Shiny-tier shimmer on the glass */}
          {tier.holo && <div aria-hidden className={`${tier.holo} pointer-events-none absolute inset-0 opacity-60`} />}
          {/* Curved-glass shading and the light catching it (stays put while it turns) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.4),transparent_22%,transparent_72%,rgb(0_0_0/0.45))]"
          />
          <span aria-hidden className="pointer-events-none absolute bottom-16 left-4 top-8 w-2.5 rounded-full bg-white/20" />
          <span aria-hidden className="pointer-events-none absolute bottom-24 left-9 top-14 w-1 rounded-full bg-white/10" />
        </div>

        {/* Base */}
        <div aria-hidden className="brass mx-2 h-5 rounded-b-xl" />
      </div>

      {/* Controls */}
      <div className={`flex flex-wrap justify-center gap-2 ${compact ? "mt-3" : "mt-4"}`}>
        {onNewLook && side === "front" && (
          <button
            type="button"
            onClick={onNewLook}
            title="Get a new avatar look (stats stay the same)"
            className="chunky-sm pop-sm flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1b2a20] px-4 py-1.5 text-sm font-bold text-[#d9f5dc]"
          >
            <Dices className="size-4" strokeWidth={2.5} /> New look
          </button>
        )}
        <button
          type="button"
          onClick={spin}
          aria-label={side === "front" ? "Spin the jar to read the lab notes" : "Spin the jar back to the front"}
          className="chunky-sm pop-sm flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1b2a20] px-4 py-1.5 text-sm font-bold text-[#d9f5dc]"
        >
          <RotateCw className="size-4" strokeWidth={2.5} />{" "}
          {side === "front" ? (compact ? "Lab notes" : "Spin for lab notes") : compact ? "Front" : "Spin back"}
        </button>
      </div>
    </div>
  );
}

/** A parchment label stuck on the glass */
function Label({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-md border-2 border-[#3b3324] bg-[#efe6c8] text-[#2a2214] shadow-[2px_3px_0_rgb(0_0_0/0.45)] outline-1 -outline-offset-[6px] outline-dashed outline-[#5a4a2a]/40 ${className}`}
    >
      {children}
    </div>
  );
}

function Note({
  icon,
  label,
  value,
  textSize,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  textSize: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#5a4a2a]">
        {icon} {label}
      </p>
      <p className={`${textSize} font-semibold leading-snug`}>{value}</p>
    </div>
  );
}
