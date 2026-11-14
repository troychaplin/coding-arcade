import type { Metadata } from "next";
import AvatarFactory from "./AvatarFactory";

export const metadata: Metadata = {
  title: "Hero & Monster ID Card Factory",
  description:
    "Invent a hero or monster, roll their stats, and save them to your squad.",
};

export default function AvatarFactoryPage() {
  return <AvatarFactory />;
}
