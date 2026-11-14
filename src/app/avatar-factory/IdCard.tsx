"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dices,
  Flame,
  HeartCrack,
  House,
  Pizza,
  Quote,
  RotateCw,
  Ruler,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import {
  avatarUrl,
  extrasFor,
  rarityInfo,
  styleOption,
  type AvatarStyle,
  type RarityInfo,
  type Stats,
} from "./data";

type Props = Stats & {
  name: string;
  style: AvatarStyle;
  /** Smaller layout for the squad grid */
  compact?: boolean;
  serial?: string;
  /** Alternate avatar look (0 = default for the name) */
  avatarVariant?: number;
  /** When given, shows a "New look" button on the avatar (live preview only) */
  onNewLook?: () => void;
};

function powerColor(power: number) {
  if (power >= 90) return "bg-tomato";
  if (power >= 75) return "bg-tangerine";
  if (power >= 60) return "bg-sun";
  return "bg-lime";
}

export default function IdCard({
  name,
  style,
  power,
  superpower,
  characterClass,
  rarity,
  compact = false,
  serial,
  avatarVariant = 0,
  onNewLook,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  /** True while the card is turned edge-on (halfway through a flip) */
  const [turning, setTurning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const theme = styleOption(style);
  const tier = rarityInfo(rarity);
  const displayName = name.trim() || "Mystery Hero";
  const extras = extrasFor(displayName, style);
  // Keep the bar visibly meaningful: 50 → ~0%, 100 → 100%
  const barWidth = Math.max(8, ((power - 50) / 50) * 100);

  /**
   * Flip in two halves: turn edge-on, swap which side is showing while it's
   * edge-on, then turn back flat. Only one side is ever visible, so the card
   * can never appear mirrored, whatever the browser.
   */
  const HALF_FLIP_MS = 180;
  function flip() {
    if (turning) return;
    setTurning(true);
    timer.current = setTimeout(() => {
      setFlipped((f) => !f);
      setTurning(false);
    }, HALF_FLIP_MS);
  }

  // Both sides sit in the same grid cell, so the card keeps the taller
  // side's height and doesn't jump when it flips.
  const faceClass = `[grid-area:1/1] chunky flex flex-col overflow-hidden rounded-3xl bg-white ${tier.frame}`;

  return (
    <div
      data-rarity={tier.id}
      className={`relative w-full perspective-[1400px] ${compact ? "max-w-xs" : "max-w-sm"}`}
    >
      <div
        className={`grid transition-transform duration-[180ms] ease-in-out ${
          turning ? "rotate-y-90" : "rotate-y-0"
        }`}
      >
        {/* ---------- FRONT ---------- */}
        <article
          aria-hidden={flipped}
          inert={flipped}
          className={`${faceClass} relative ${flipped ? "invisible" : ""}`}
        >
          <Holo tier={tier} />
          <HeaderStrip left={`${theme.emoji} ${theme.label}`} tier={tier} />

          {/* Avatar */}
          <div
            className={`${theme.color} relative flex flex-col items-center gap-3 border-b-[3px] border-ink ${
              compact ? "py-4" : "py-6"
            }`}
          >
            <div
              className={`chunky-sm overflow-hidden rounded-2xl bg-white ${
                compact ? "size-28" : "size-40"
              }`}
            >
              {/* Plain <img> so DiceBear SVGs load without next/image domain config */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={avatarVariant}
                src={avatarUrl(style, displayName, avatarVariant)}
                alt={`${displayName} avatar`}
                className="size-full animate-card-in"
                width={160}
                height={160}
              />
            </div>
            <span className="chunky-sm absolute right-3 top-3 flex items-center gap-1 rounded-full bg-sun px-2 py-0.5 text-xs font-bold">
              <Star className="size-3.5 fill-ink" /> {power}
            </span>
            {onNewLook && (
              <button
                type="button"
                onClick={onNewLook}
                title="Get a new avatar look (stats stay the same)"
                className="chunky-sm pop-sm flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold"
              >
                <Dices className="size-4" strokeWidth={2.5} /> New look
              </button>
            )}
          </div>

          {/* Details */}
          <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
            <div>
              <h3
                className={`font-display leading-tight break-words ${
                  compact ? "text-lg" : "text-2xl"
                }`}
              >
                {displayName}
              </h3>
              <p className="mt-1 inline-block rounded-md bg-grape px-2 py-0.5 text-sm font-semibold text-white">
                {characterClass}
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-1">
                  <Zap className="size-4 fill-sun" /> Power Level
                </span>
                <span>{power} / 100</span>
              </div>
              <div className="h-5 overflow-hidden rounded-full border-[3px] border-ink bg-ink/10">
                <div
                  className={`${powerColor(power)} h-full border-r-[3px] border-ink transition-[width] duration-500 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat
                icon={<Flame className="size-4 text-tomato" />}
                label="Superpower"
                value={superpower}
              />
              <MiniStat
                icon={<HeartCrack className="size-4 text-grape" />}
                label="Weakness"
                value={extras.weakness}
              />
            </div>

            <FlipFooter onFlip={flip} label="Fun facts" serial={serial} />
          </div>
        </article>

        {/* ---------- BACK ---------- */}
        <article
          aria-hidden={!flipped}
          inert={!flipped}
          className={`${faceClass} relative ${flipped ? "" : "invisible"}`}
        >
          <Holo tier={tier} />
          <HeaderStrip left="⭐ Fun Facts" tier={tier} />

          <div
            className={`${theme.color} border-b-[3px] border-ink px-4 py-3 text-center`}
          >
            <p className={`font-display leading-tight break-words ${compact ? "text-base" : "text-xl"}`}>
              {displayName}
            </p>
          </div>

          <div className={`flex flex-1 flex-col gap-3 overflow-y-auto ${compact ? "p-4" : "p-5"}`}>
            <Fact icon={<Pizza className="size-5 text-tangerine" />} label="Favourite snack" value={extras.snack} />
            <Fact icon={<House className="size-5 text-sky" />} label="Home base" value={extras.homeBase} />
            <Fact icon={<Ruler className="size-5 text-lime" />} label="Size" value={extras.size} />

            <blockquote className="relative mt-auto rounded-2xl border-[3px] border-ink bg-sun px-4 py-3 font-display text-sm leading-snug">
              <Quote className="absolute -left-2 -top-3 size-6 rounded-full border-2 border-ink bg-white p-0.5" />
              “{extras.catchphrase}”
            </blockquote>

            <FlipFooter onFlip={flip} label="Flip back" serial={serial} />
          </div>
        </article>
      </div>
    </div>
  );
}

function Holo({ tier }: { tier: RarityInfo }) {
  if (!tier.holo) return null;
  return (
    <div
      aria-hidden
      className={`${tier.holo} pointer-events-none absolute inset-0 z-10`}
    />
  );
}

function HeaderStrip({ left, tier }: { left: string; tier: RarityInfo }) {
  const shiny = tier.id === "epic" || tier.id === "legendary";
  return (
    <div className="flex items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-2 text-paper">
      <span className="flex items-center gap-1 text-xs font-semibold">{left}</span>
      <span
        className={`${tier.badge} flex items-center gap-1 rounded-full border-2 border-paper px-2 py-0.5 font-display text-[11px] tracking-wider`}
      >
        {shiny && (
          <Sparkles
            className={`size-3 ${tier.id === "legendary" ? "animate-sparkle" : ""}`}
            strokeWidth={3}
          />
        )}
        {tier.label}
      </span>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-paper p-2.5">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink/60">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="chunky-sm grid size-9 shrink-0 place-items-center rounded-xl bg-white">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{label}</p>
        <p className="font-semibold leading-snug">{value}</p>
      </div>
    </div>
  );
}

function FlipFooter({
  onFlip,
  label,
  serial,
}: {
  onFlip: () => void;
  label: string;
  serial?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onFlip}
        className="chunky-sm pop-sm relative z-20 flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold"
      >
        <RotateCw className="size-4" strokeWidth={2.5} /> {label}
      </button>
      {serial && (
        <span className="font-mono text-[10px] text-ink/50">#{serial}</span>
      )}
    </div>
  );
}
