"use client";

import { Check } from "lucide-react";
import type { Portfolio } from "@runtime/schema/portfolio";
import { switchTemplate } from "@runtime/schema/factory";
import { paletteGrade, toHex } from "@runtime/render/color";
import { getTemplateMeta, TEMPLATES } from "@runtime/templates/meta";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { track } from "@/lib/track";
import type { Update } from "./state";

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-[0.8125rem] font-medium">{label}</legend>
      <div className="flex gap-1 rounded-xl bg-panel2 p-1">
        {options.map(([v, l]) => (
          <label key={v} className={cn("flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-center text-[0.8125rem] font-medium text-dim has-[:checked]:bg-panel has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand")}>
            <input type="radio" name={label} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ThemePanel({ portfolio, update, replace }: { portfolio: Portfolio; update: Update; replace: (p: Portfolio) => void }) {
  const { theme } = portfolio;
  const meta = getTemplateMeta(theme.templateId);
  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[0.8125rem] font-medium">Template — switching never changes your content</legend>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const active = t.id === theme.templateId;
            return (
              <label key={t.id} className={cn("grid cursor-pointer gap-0.5 rounded-xl border bg-panel p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand", active ? "border-brand ring-1 ring-brand" : "border-rule hover:border-edge")}>
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={active}
                  className="sr-only"
                  onChange={() => {
                    if (active) return;
                    replace(switchTemplate(portfolio, t.id));
                    track("template_switched", { props: { templateId: t.id, from: theme.templateId } });
                  }}
                />
                <span className="flex items-center justify-between text-sm font-semibold">
                  {t.name}
                  {active ? <Check className="size-4 text-brand" aria-hidden="true" /> : null}
                </span>
                <span className="text-xs leading-snug text-dim">{t.tags.slice(0, 3).join(" · ")}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[0.8125rem] font-medium">Palette</legend>
        {meta.palettes.map((p) => {
          const grade = paletteGrade(p);
          const active = p.id === theme.paletteId;
          return (
            <label key={p.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border bg-panel p-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand", active ? "border-brand ring-1 ring-brand" : "border-rule hover:border-edge")}>
              <input type="radio" name="palette" value={p.id} checked={active} className="sr-only" onChange={() => update((d) => void (d.theme.paletteId = p.id))} />
              <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-lg border border-rule">
                {(["light", "dark"] as const).map((mode) => (
                  <span key={mode} className="flex h-9 w-12" style={{ background: toHex(p[mode].ground) }}>
                    <span className="mt-auto h-3 w-1/2" style={{ background: toHex(p[mode].sig) }} />
                    <span className="mt-auto h-3 w-1/4" style={{ background: toHex(p[mode].comp) }} />
                    <span className="mt-auto h-3 w-1/4" style={{ background: toHex(p[mode].ink) }} />
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              <Badge tone={grade.grade === "fail" ? "bad" : "ok"} title={`Lowest text contrast ${grade.ratio.toFixed(1)}:1`}>
                {grade.grade} · {grade.ratio.toFixed(1)}:1
              </Badge>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[0.8125rem] font-medium">Fonts</legend>
        {meta.fontPairs.map((f) => {
          const active = f.id === theme.fontPairId;
          return (
            <label key={f.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-panel px-3 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand", active ? "border-brand ring-1 ring-brand" : "border-rule hover:border-edge")}>
              <input type="radio" name="fonts" value={f.id} checked={active} className="sr-only" onChange={() => update((d) => void (d.theme.fontPairId = f.id))} />
              <span className="font-medium">{f.name}</span>
              {active ? <Check className="size-4 text-brand" aria-hidden="true" /> : null}
            </label>
          );
        })}
      </fieldset>

      <Segmented label="Mode" value={theme.mode} options={[["system", "Auto"], ["light", "Light"], ["dark", "Dark"]] as const} onChange={(v) => update((d) => void (d.theme.mode = v))} />
      <Segmented label="Motion" value={theme.motion} options={[["full", "Full"], ["subtle", "Subtle"], ["none", "None"]] as const} onChange={(v) => update((d) => void (d.theme.motion = v))} />
      <Segmented label="Corners" value={theme.radius} options={[["sharp", "Sharp"], ["soft", "Soft"], ["round", "Round"]] as const} onChange={(v) => update((d) => void (d.theme.radius = v))} />
      <p className="text-xs leading-relaxed text-dim">Visitors who ask their device for reduced motion always get a still version, whatever you choose here.</p>
    </div>
  );
}
