import type { LucideIcon } from "lucide-react";
import { Factory, Rocket, Sparkles } from "lucide-react";

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
    title: "Mystery Project #2",
    blurb: "Something awesome is being built in the secret lab…",
    icon: Sparkles,
    color: "bg-sky",
  },
  {
    title: "Mystery Project #3",
    blurb: "What should we build next? Dream it up!",
    icon: Rocket,
    color: "bg-tangerine",
  },
];
