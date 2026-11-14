import type { LucideIcon } from "lucide-react";
import { Factory, PackageOpen, Swords, Rocket } from "lucide-react";

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
    title: "Pokémon Booster Pack Opener",
    blurb: "Rip open virtual packs and hunt for rare shiny pulls.",
    icon: PackageOpen,
    color: "bg-sky",
  },
  {
    title: "Pokédex Battle Arena",
    blurb: "Pick two creatures, compare their stats, and see who wins!",
    icon: Swords,
    color: "bg-lime",
  },
  {
    title: "Mystery Project #4",
    blurb: "What should we build next? Dream it up!",
    icon: Rocket,
    color: "bg-tangerine",
  },
];
