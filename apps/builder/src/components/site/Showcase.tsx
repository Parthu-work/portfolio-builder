"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TemplateFrame } from "./TemplateFrame";
import { cn } from "@/lib/cn";

type Item = { id: string; name: string; signature: string };

/**
 * The landing hero: one sample portfolio, re-rendered live in each template.
 * Auto-advances (unless the visitor prefers reduced motion, hovers, focuses
 * inside, or presses pause); every template is also directly selectable.
 */
export function Showcase({ templates, seed }: { templates: Item[]; seed: string }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const held = useRef(false);

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (!held.current && document.visibilityState === "visible") setIndex((i) => (i + 1) % templates.length);
    }, 6500);
    return () => window.clearInterval(t);
  }, [playing, templates.length]);

  const current = templates[index]!;
  return (
    <div
      className="grid gap-4"
      onPointerEnter={() => (held.current = true)}
      onPointerLeave={() => (held.current = false)}
      onFocusCapture={() => (held.current = true)}
      onBlurCapture={() => (held.current = false)}
    >
      <div className="overflow-hidden rounded-2xl border border-rule bg-panel shadow-[0_40px_120px_-40px_color-mix(in_oklch,var(--brand)_55%,transparent)]">
        <div className="flex items-center gap-3 border-b border-rule px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-rule" />
            <span className="size-2.5 rounded-full bg-rule" />
            <span className="size-2.5 rounded-full bg-rule" />
          </span>
          <p className="min-w-0 flex-1 truncate rounded-md bg-panel2 px-3 py-1 text-center font-mono text-xs text-dim">maya-okafor.vercel.app</p>
          <button type="button" onClick={() => setPlaying(!playing)} className="grid size-7 place-items-center rounded-md text-dim hover:bg-panel2 hover:text-fg" aria-label={playing ? "Pause template rotation" : "Play template rotation"}>
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
        </div>
        <TemplateFrame key={current.id} src={`/frame/${current.id}/${seed}`} title={`Sample portfolio in the ${current.name} template`} idle eager />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Choose a template for the demo">
        {templates.map((t, i) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              setPlaying(false);
            }}
            className={cn("rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors", i === index ? "border-brand bg-brand text-brand-fg" : "border-rule bg-panel text-dim hover:border-edge hover:text-fg")}
          >
            {t.name}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-dim" aria-live="polite">
        <span className="font-medium text-fg">{current.name}</span> — {current.signature}
      </p>
    </div>
  );
}
