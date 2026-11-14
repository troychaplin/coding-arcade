import { Flame, Sparkles, Star, Zap } from "lucide-react";
import {
  avatarUrl,
  rarityInfo,
  styleOption,
  type AvatarStyle,
  type Stats,
} from "./data";

type Props = Stats & {
  name: string;
  style: AvatarStyle;
  /** Smaller layout for the squad grid */
  compact?: boolean;
  serial?: string;
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
}: Props) {
  const theme = styleOption(style);
  const tier = rarityInfo(rarity);
  const shiny = tier.id === "epic" || tier.id === "legendary";
  const displayName = name.trim() || "Mystery Hero";
  // Keep the bar visibly meaningful: 50 → ~0%, 100 → 100%
  const barWidth = Math.max(8, ((power - 50) / 50) * 100);

  return (
    <article
      data-rarity={tier.id}
      className={`chunky relative flex w-full flex-col overflow-hidden rounded-3xl bg-white ${tier.frame} ${
        compact ? "max-w-xs" : "max-w-sm"
      }`}
    >
      {/* Holo foil shine sweeps over Epic + Legendary cards */}
      {tier.holo && (
        <div
          aria-hidden
          className={`${tier.holo} pointer-events-none absolute inset-0 z-10`}
        />
      )}

      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-2 text-paper">
        <span className="flex items-center gap-1 text-xs font-semibold">
          {theme.emoji} {theme.label}
        </span>
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

      {/* Avatar */}
      <div
        className={`${theme.color} relative grid place-items-center border-b-[3px] border-ink ${
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
            src={avatarUrl(style, displayName)}
            alt={`${displayName} avatar`}
            className="size-full"
            width={160}
            height={160}
          />
        </div>
        <span className="chunky-sm absolute right-3 top-3 flex items-center gap-1 rounded-full bg-sun px-2 py-0.5 text-xs font-bold">
          <Star className="size-3.5 fill-ink" /> {power}
        </span>
      </div>

      {/* Details */}
      <div className={`flex flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
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

        <div className="flex items-start gap-2 rounded-xl border-[3px] border-dashed border-ink/40 bg-paper p-3">
          <Flame className="mt-0.5 size-5 shrink-0 text-tomato" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
              Superpower
            </p>
            <p className="font-semibold">{superpower}</p>
          </div>
        </div>

        {serial && (
          <p className="text-right font-mono text-[10px] text-ink/50">
            #{serial}
          </p>
        )}
      </div>
    </article>
  );
}
