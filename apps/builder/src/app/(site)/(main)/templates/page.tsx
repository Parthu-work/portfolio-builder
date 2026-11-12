import type { Metadata } from "next";
import { TEMPLATES } from "@runtime/templates/meta";
import { Gallery } from "./Gallery";

export const metadata: Metadata = {
  title: "Templates",
  description: "Eight original portfolio templates — Signal, Editorial, Bento, Aurora, Brutal, Cinematic, Swiss and Desktop OS. Preview each one live with sample content.",
};

export default function TemplatesPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16">
      <div className="grid max-w-3xl gap-4">
        <h1 className="font-display text-[clamp(2.25rem,6vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">Eight templates, all of them live.</h1>
        <p className="text-lg leading-relaxed text-dim">These are not screenshots: each preview is the real template rendering real sample content. Open one to scroll, click and resize it, then make it yours.</p>
      </div>
      <Gallery templates={TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, signature: t.signature, tags: t.tags, palettes: t.palettes.length, fonts: t.fontPairs.length }))} />
    </div>
  );
}
