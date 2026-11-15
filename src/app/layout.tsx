import type { Metadata } from "next";
import { Bangers, Bungee, Chakra_Petch, Creepster, Fredoka, Monoton } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const bungee = Bungee({
  variable: "--font-bungee",
  weight: "400",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

// Each game's theme font (see themes.css). Not preloaded: a page only
// downloads the one its theme uses.
const chakra = Chakra_Petch({ variable: "--font-chakra", weight: ["600", "700"], subsets: ["latin"], preload: false });
const bangers = Bangers({ variable: "--font-bangers", weight: "400", subsets: ["latin"], preload: false });
const monoton = Monoton({ variable: "--font-monoton", weight: "400", subsets: ["latin"], preload: false });
const creepster = Creepster({ variable: "--font-creepster", weight: "400", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: {
    default: "Kid's Coding Arcade",
    template: "%s · Kid's Coding Arcade",
  },
  description: "A hub of mini-apps built together, one project at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} ${fredoka.variable} ${chakra.variable} ${bangers.variable} ${creepster.variable} ${monoton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="site-footer py-4 text-center text-sm font-medium">
          Built with code, snacks &amp; big ideas 🕹️
        </footer>
      </body>
    </html>
  );
}
