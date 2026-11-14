import type { Metadata } from "next";
import { Bungee, Fredoka } from "next/font/google";
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
      className={`${bungee.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t-[3px] border-ink bg-ink py-4 text-center text-sm font-medium text-paper">
          Built with code, snacks &amp; big ideas 🕹️
        </footer>
      </body>
    </html>
  );
}
