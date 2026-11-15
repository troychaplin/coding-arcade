import type { Metadata } from "next";
import PokeCollector from "./PokeCollector";

export const metadata: Metadata = {
  title: "Pokémon Pack Opener",
  description:
    "Rip open Pokémon booster packs, flip your cards, find shiny holos and fill your Master Binder.",
};

export default function PackOpenerPage() {
  return (
    <div data-theme="dex" className="contents">
      <PokeCollector tab="packs" />
    </div>
  );
}
