"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SEEDS, SEED_IDS, type SeedId } from "@runtime/schema/seeds";
import { TemplateFrame } from "@/components/site/TemplateFrame";
import { Badge, Button, Dialog, DialogContent, Select } from "@/components/ui";
import { buttonStyles } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { track } from "@/lib/track";

type T = { id: string; name: string; description: string; signature: string; tags: string[]; palettes: number; fonts: number };

const DEVICES = { desktop: { w: 1440, h: 900, icon: Monitor }, tablet: { w: 820, h: 1100, icon: Tablet }, mobile: { w: 390, h: 780, icon: Smartphone } } as const;
type Device = keyof typeof DEVICES;

export function Gallery({ templates }: { templates: T[] }) {
  const tags = useMemo(() => [...new Set(templates.flatMap((t) => t.tags))].sort(), [templates]);
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<T | null>(null);
  const [seed, setSeed] = useState<SeedId>("developer");
  const [device, setDevice] = useState<Device>("desktop");
  const shown = tag ? templates.filter((t) => t.tags.includes(tag)) : templates;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter templates by style">
        {[null, ...tags].map((t) => (
          <button
            key={t ?? "all"}
            type="button"
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
            className={cn("rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors", tag === t ? "border-brand bg-brand text-brand-fg" : "border-rule bg-panel text-dim hover:border-edge hover:text-fg")}
          >
            {t ?? "All"}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {shown.length} template{shown.length === 1 ? "" : "s"} shown
      </p>

      <ul className="grid gap-6 md:grid-cols-2">
        {shown.map((t) => (
          <li key={t.id} id={t.id} className="grid scroll-mt-24 overflow-hidden rounded-2xl border border-rule bg-panel shadow-sm">
            <TemplateFrame src={`/frame/${t.id}/developer`} title={`${t.name} template preview`} />
            <div className="grid gap-4 border-t border-rule p-5">
              <div className="grid gap-1.5">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">{t.name}</h2>
                <p className="leading-relaxed text-dim">{t.description}</p>
              </div>
              <ul className="flex flex-wrap gap-1.5" aria-label="Styles">
                {t.tags.map((x) => (
                  <li key={x}>
                    <Badge className="capitalize">{x}</Badge>
                  </li>
                ))}
                <li>
                  <Badge tone="brand">
                    {t.palettes} palettes · {t.fonts} font pairs
                  </Badge>
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link href={`/new?template=${t.id}`} className={buttonStyles({ variant: "primary" })} onClick={() => track("template_selected", { props: { templateId: t.id, from: "gallery" } })}>
                  Use this template
                </Link>
                <Button onClick={() => setOpen(t)} aria-haspopup="dialog">
                  Open live preview<span className="sr-only"> of {t.name}</span>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? (
          <DialogContent title={`${open.name} — live preview`} description={open.signature} wide className="h-[92dvh] max-w-[1500px]">
            <div className="grid h-full grid-rows-[auto_1fr] gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="preview-seed" className="text-sm text-dim">
                    Sample
                  </label>
                  <Select id="preview-seed" className="h-9 w-48" value={seed} onChange={(e) => setSeed(e.target.value as SeedId)}>
                    {SEED_IDS.map((s) => (
                      <option key={s} value={s}>
                        {SEEDS[s].label}
                      </option>
                    ))}
                  </Select>
                  <div role="group" aria-label="Preview size" className="flex rounded-lg bg-panel2 p-0.5">
                    {(Object.keys(DEVICES) as Device[]).map((d) => {
                      const Icon = DEVICES[d].icon;
                      return (
                        <button key={d} type="button" aria-label={`${d} size`} aria-pressed={device === d} onClick={() => setDevice(d)} className={cn("grid size-8 place-items-center rounded-md text-dim hover:text-fg", device === d && "bg-panel text-fg shadow-sm")}>
                          <Icon className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Link href={`/new?template=${open.id}`} className={buttonStyles({ variant: "primary" })}>
                  Use {open.name}
                </Link>
              </div>
              <div className="min-h-0 overflow-auto rounded-xl border border-rule bg-panel2">
                <div className="mx-auto" style={{ maxWidth: device === "desktop" ? undefined : DEVICES[device].w }}>
                  <TemplateFrame key={`${open.id}-${seed}-${device}`} src={`/frame/${open.id}/${seed}`} title={`${open.name} live preview with ${SEEDS[seed].label} sample content`} width={DEVICES[device].w} height={DEVICES[device].h} interactive eager />
                </div>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
