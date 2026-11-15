import type { Metadata } from "next";
import SecretIdentity from "./SecretIdentity";

export const metadata: Metadata = {
  title: "Secret Identity Detective",
  description:
    "Crack the case! Use clues to guess the hidden hero — from Marvel, DC, Star Wars and more — behind the blurred dossier photo.",
};

export default function SecretIdentityPage() {
  return (
    <div data-theme="noir" className="contents">
      <SecretIdentity />
    </div>
  );
}
