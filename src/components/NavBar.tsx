import Link from "next/link";
import { Gamepad2, House } from "lucide-react";

export default function NavBar() {
  return (
    <header className="site-nav sticky top-0 z-20 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="chunky-sm grid size-10 place-items-center rounded-xl bg-tomato text-white transition-transform group-hover:rotate-12">
            <Gamepad2 className="size-6" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg leading-none sm:text-xl">
            Coding Arcade
          </span>
        </Link>

        <Link
          href="/"
          className="chunky-sm pop-sm flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-ink"
        >
          <House className="size-5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Home / Arcade Hub</span>
          <span className="sm:hidden">Hub</span>
        </Link>
      </nav>
    </header>
  );
}
