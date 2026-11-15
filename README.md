# 🕹️ Kid's Coding Arcade

A colourful hub of mini-apps built together with a young coder — one game at a time.

**Live site:** [coding-arcade.com](https://coding-arcade.com)

## The games

| Game | Route | What you do |
| --- | --- | --- |
| **Hero & Monster ID Card Factory** | `/avatar-factory` | Name a character, pick an avatar style, get a collectible ID card with power, superpower, class, rarity (Common → Legendary with holo foil) and flip-side fun facts. Save cards to **My Squad**. |
| **Secret Identity Detective** | `/secret-identity` | A hero hides behind a blurry dossier photo. Unlock 5 clues (500 → 100 pts), type a guess with autocomplete or tap from a shrinking suspect list (8 → 6 → 4 → 2). Categories: Famous, All, DC, Marvel, Other. |
| **Ultimate Pokémon Pack Opener** | `/pack-opener` | Rip open booster packs from every era (~145 sets, by era tab), flip 5 cards, find holo foils. Duplicates become Poké-Coins (+10), packs cost 50. 10 free packs to start, +5 every 2 minutes. Special packs: **Energy Surge** and **Legends Only** (legendary & mythical Pokémon only, coins only, 100). |
| **Master Binder** | `/binder` | Every card pulled, set by set, with completion progress, locked `?` slots and filters (collected/missing, rarity, legendary, holo, Pokémon/Trainer/Energy). |

Everything a player collects — squads, detective scores, binders, coins — is saved in the browser's `localStorage`. There are no accounts and no server.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) built as a **static export**
- TypeScript, [Tailwind CSS v4](https://tailwindcss.com), [Lucide](https://lucide.dev) icons
- Fonts: Bungee (headings) and Fredoka (body) via `next/font`

### Data sources (all free, no API keys)

- [DiceBear](https://www.dicebear.com) (9.x) — avatar artwork for the ID Card Factory
- [Superhero API](https://github.com/akabab/superhero-api) (`akabab/superhero-api@0.3.0` on jsDelivr) — heroes for Secret Identity Detective
- [TCGdex](https://tcgdex.dev) — Pokémon card sets, details and artwork for the Pack Opener

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static export to `out/` |
| `npm run lint` | ESLint (includes the React Compiler rules) |

## Project structure

```text
src/
  app/
    layout.tsx           Fonts, nav bar, footer
    globals.css          Theme colours + shared utilities (chunky borders, pop buttons, holo foil)
    page.tsx             Arcade hub (project cards)
    avatar-factory/      Hero & Monster ID Card Factory
    secret-identity/     Secret Identity Detective
    pack-opener/         Pack Opener + shared Master Binder code
    binder/              /binder route (reuses pack-opener components)
  components/NavBar.tsx  Top bar with the "Home / Arcade Hub" link
  lib/projects.ts        The list of games shown on the hub
```

Each game keeps its rules and API code in a `data.ts`, its saved state in a `use*.ts` hook (`localStorage` + `useSyncExternalStore`), and its screens in `.tsx` components.

## Adding a new mini-app

1. Create a branch, e.g. `git checkout -b my-new-game`.
2. Add a folder under `src/app/` with a `page.tsx` (export `metadata` for the tab title) and a client component for the game.
3. Add an entry to `src/lib/projects.ts` with an `href` — the hub card becomes clickable and the "playable" count updates automatically. Leave out `href` for a "Coming soon" card.
4. Run `npm run lint` and check it works in the dev server.
5. Push the branch for a preview build, then merge into `main` to publish.

## Deployment

The site is hosted on [Spacefast](https://spacefast.com), connected to this GitHub repository:

- **Push to `main`** → builds and publishes to [coding-arcade.com](https://coding-arcade.com) (about 1–2 minutes).
- **Push any other branch** → builds a private preview version without touching the live site.

The custom domain is managed in Cloudflare DNS (records set to **DNS only**, not proxied) and points at the Spacefast Space.

## Gotchas

- **Static export only.** Spacefast serves Next.js 16.4 as static files, so `next.config.ts` uses `output: "export"`. Server features (API routes, server actions, `cacheComponents`) won't work. Fetch APIs from the browser instead.
- **Restart the dev server after editing `globals.css`.** Changes to components hot-reload, but changes to `globals.css` itself may not show until `npm run dev` is restarted.
- **Don't run `npm run build` while `npm run dev` is running** — they share the `.next` folder and the dev server can end up serving stale styles. Stop dev first (or build in a separate copy).
- **Random numbers and time only in event handlers or effects.** The React Compiler lint rules flag `Math.random()` / `Date.now()` that might run during render.
- **Card flips use an edge-on swap**, not `backface-visibility`, because some browsers (notably Safari) showed mirrored cards with the 3D approach.

## Credits

This is a non-commercial, just-for-fun learning project. Pokémon and Pokémon card names and images are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. Marvel, DC and other characters belong to their respective owners. Card and hero data come from the community APIs listed above.
