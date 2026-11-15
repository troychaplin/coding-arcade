import type { CSSProperties } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { projects, type Project } from "@/lib/projects";

export default function Home() {
  const liveCount = projects.filter((p) => p.href).length;

  return (
    <div data-theme="arcade" className="flex flex-col gap-14 pt-4">
      {/* The neon sign over the door */}
      <header className="flex flex-col items-center text-center">
        <p className="font-display text-sm tracking-[0.3em] text-[#34e7ff] [text-shadow:0_0_6px_#34e7ff,0_0_18px_#34e7ff] sm:text-base">
          Kid&apos;s
        </p>
        <h1 className="neon-sign mt-1 font-[family-name:var(--font-monoton)] text-5xl leading-none text-[#ffd6f6] sm:text-7xl lg:text-8xl">
          Coding Arcade
        </h1>
        <p className="mt-6 max-w-md text-lg font-medium text-[#d8c9ff]">
          Every machine here is a game we built together. Pick one and press start.
        </p>
        <p className="mt-5 inline-flex items-center gap-3 rounded-full border-2 border-[#5dff8a] bg-[#05170c] px-4 py-1.5 font-display text-sm text-[#5dff8a] shadow-[0_0_14px_rgb(93_255_138/0.45)]">
          <span className="size-2.5 animate-pulse rounded-full bg-[#5dff8a] shadow-[0_0_8px_#5dff8a]" aria-hidden />
          {liveCount} {liveCount === 1 ? "machine" : "machines"} ready to play
        </p>
      </header>

      {/* The arcade floor */}
      <section aria-labelledby="floor">
        <h2 id="floor" className="sr-only">
          Games
        </h2>
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.title} className="flex">
              <Cabinet project={project} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** One arcade cabinet: a lit marquee, a screen and a control deck. */
function Cabinet({ project }: { project: Project }) {
  const Icon = project.icon;
  const live = Boolean(project.href);
  const neon = { "--neon": project.neon } as CSSProperties;

  const body = (
    <>
      {/* Marquee */}
      <div className="relative rounded-t-[1.75rem] border-[3px] border-b-0 border-[var(--neon)] bg-[#12062e] px-4 py-4 text-center shadow-[0_0_22px_color-mix(in_srgb,var(--neon)_55%,transparent),inset_0_0_18px_color-mix(in_srgb,var(--neon)_35%,transparent)]">
        <h3 className="font-display text-lg leading-snug text-white [text-shadow:0_0_6px_var(--neon),0_0_16px_var(--neon)]">
          {project.title}
        </h3>
      </div>

      {/* Screen inside the bezel */}
      <div className="flex flex-1 flex-col bg-[#1d0d45] px-4 pb-4 pt-3">
        <div className="relative flex flex-1 flex-col items-center gap-4 overflow-hidden rounded-2xl border-4 border-[#05010f] bg-[radial-gradient(ellipse_at_center,#123236,#050b14_75%)] px-5 py-6 text-center transition-[filter] duration-200 group-hover:brightness-125">
          <Icon
            className="size-14 text-[var(--neon)] drop-shadow-[0_0_10px_var(--neon)]"
            strokeWidth={1.75}
            aria-hidden
          />
          <p className="font-medium leading-snug text-[#cfe9ea]">{project.blurb}</p>
          {!live && (
            <p className="rotate-[-4deg] rounded border-2 border-[#ff3d71] px-2 font-display text-sm text-[#ff3d71]">
              Out of order
            </p>
          )}
          {/* Scanlines on the glass */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(rgb(255_255_255/0.04)_0_1px,transparent_1px_3px)]"
          />
        </div>
      </div>

      {/* Control deck */}
      <div className="flex items-center justify-between gap-3 rounded-b-xl border-t-4 border-[#05010f] bg-[#2b1466] px-5 py-3">
        <span aria-hidden className="flex items-end gap-1.5">
          <span className="block h-5 w-1.5 rounded-full bg-[#9a8bc7]" />
          <span className="-ml-[0.6rem] -mt-1 block size-4 rounded-full bg-[#ff3d71] shadow-[inset_-2px_-2px_0_rgb(0_0_0/0.3)]" />
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm ${
            live
              ? "bg-[var(--neon)] text-[#12062e] shadow-[0_0_16px_var(--neon)] transition-transform group-hover:scale-105 group-active:scale-95"
              : "bg-[#3d2a72] text-[#a596d4]"
          }`}
        >
          {live ? (
            "Press start"
          ) : (
            <>
              <Lock className="size-4" strokeWidth={2.5} aria-hidden /> Coming soon
            </>
          )}
        </span>
      </div>
    </>
  );

  const base = "group flex w-full flex-col";

  if (project.href) {
    return (
      <Link
        href={project.href}
        style={neon}
        className={`${base} rounded-[1.75rem] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--neon)]`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div style={neon} className={`${base} opacity-70 saturate-50`} aria-disabled="true">
      {body}
    </div>
  );
}
