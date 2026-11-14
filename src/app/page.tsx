import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { projects, type Project } from "@/lib/projects";

export default function Home() {
  const liveCount = projects.filter((p) => p.href).length;

  return (
    <div className="flex flex-col gap-10">
      <section className="chunky relative overflow-hidden rounded-3xl bg-grape px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full border-[3px] border-ink bg-sun" />
        <div className="pointer-events-none absolute -bottom-12 right-24 size-28 rounded-full border-[3px] border-ink bg-tomato" />

        <div className="relative max-w-2xl">
          <p className="chunky-sm mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">
            <Sparkles className="size-4 animate-wiggle text-tangerine" />
            Insert coin to play
          </p>
          <h1 className="font-display text-4xl leading-tight [text-shadow:4px_4px_0_var(--color-ink)] sm:text-6xl">
            Kid&apos;s Coding Arcade
          </h1>
          <p className="mt-4 max-w-xl text-lg font-medium sm:text-xl">
            Every machine here is a mini-app we built together. Pick one and
            press start!
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-ink">
            <span className="chunky-sm rounded-lg bg-lime px-3 py-1">
              {liveCount} playable
            </span>
            <span className="chunky-sm rounded-lg bg-sun px-3 py-1">
              {projects.length - liveCount} coming soon
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-5 font-display text-2xl sm:text-3xl">Pick a game</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.title} className="flex">
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const Icon = project.icon;
  const live = Boolean(project.href);

  const body = (
    <>
      <div
        className={`${project.color} relative grid h-36 place-items-center border-b-[3px] border-ink`}
      >
        <span className="chunky-sm grid size-20 place-items-center rounded-2xl bg-white transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
          <Icon className="size-10" strokeWidth={2.25} />
        </span>
        <span
          className={`chunky-sm absolute right-3 top-3 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${
            live ? "bg-lime" : "bg-white"
          }`}
        >
          {live ? "Play now" : "Coming soon"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg leading-snug">{project.title}</h3>
        <p className="flex-1 font-medium text-ink/75">{project.blurb}</p>
        <span
          className={`mt-2 inline-flex items-center gap-2 self-start rounded-full px-4 py-1.5 text-sm font-bold ${
            live ? "chunky-sm bg-tomato text-white" : "bg-ink/10 text-ink/60"
          }`}
        >
          {live ? (
            <>
              Start <ArrowRight className="size-4" strokeWidth={3} />
            </>
          ) : (
            <>
              <Lock className="size-4" strokeWidth={2.5} /> Locked
            </>
          )}
        </span>
      </div>
    </>
  );

  const base =
    "chunky group flex w-full flex-col overflow-hidden rounded-3xl bg-white";

  if (project.href) {
    return (
      <Link href={project.href} className={`${base} pop`}>
        {body}
      </Link>
    );
  }

  return (
    <div className={`${base} opacity-80 saturate-50`} aria-disabled="true">
      {body}
    </div>
  );
}
