import type { Metadata } from "next";
import PokeCollector from "../pack-opener/PokeCollector";

export const metadata: Metadata = {
  title: "My Master Binder",
  description: "Every Pokémon card you've pulled, set by set. Can you complete a set?",
};

export default function BinderPage() {
  return (
    <div data-theme="dex" className="contents">
      <PokeCollector tab="binder" />
    </div>
  );
}
