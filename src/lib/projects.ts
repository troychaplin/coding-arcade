import type { LucideIcon } from "lucide-react";
import { Factory, PackageOpen, VenetianMask } from "lucide-react";

export type Project = {
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** Tailwind background class for the card's banner */
  color: string;
  /** Route for live projects; omit for "coming soon" */
  href?: string;
};

/** Add a new entry here whenever we build a new mini-app. */
export const projects: Project[] = [
  {
    title: "Hero & Monster ID Card Factory",
    blurb:
      "Invent a character, roll their stats, and build your very own squad of collectible ID cards.",
    icon: Factory,
    color: "bg-bubble",
    href: "/avatar-factory",
  },
  {
    title: "Secret Identity Detective",
    blurb:
      "A mystery hero from Marvel, DC, Star Wars and more is hiding behind a blurry photo. Unlock clues and crack the case!",
    icon: VenetianMask,
    color: "bg-sun",
    href: "/secret-identity",
  },
  {
    title: "Ultimate Pokémon Pack Opener",
    blurb:
      "Rip open booster packs, flip your cards, hunt for shiny holos and fill your Master Binder!",
    icon: PackageOpen,
    color: "bg-tomato",
    href: "/pack-opener",
  },
];
