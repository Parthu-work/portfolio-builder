import type { FieldDef, Portfolio, Section } from "../portfolio";
import { presetFor } from "../presets";
import { emptyValue } from "../portfolio";

type SeedSection = {
  kind: string;
  id?: string;
  title?: string;
  subtitle?: string;
  layout?: string;
  fields?: Record<string, unknown>;
  /** Overrides the preset item shape (used by custom sections). */
  itemSchema?: FieldDef[];
  items?: Record<string, unknown>[];
};

/** Builds a deterministic section (stable ids) from a preset plus seed values. */
export function seedSection(s: SeedSection): Section {
  const preset = presetFor(s.kind);
  const id = s.id ?? s.kind;
  const itemSchema = s.itemSchema ?? preset.itemSchema;
  return {
    id,
    kind: s.kind,
    title: s.title ?? preset.title,
    ...(s.subtitle ? { subtitle: s.subtitle } : {}),
    visible: true,
    ...(s.layout ?? preset.layout ? { layout: s.layout ?? preset.layout } : {}),
    fields: preset.fields.map((d) => ({ ...d, value: s.fields?.[d.key] ?? emptyValue(d.type) })),
    ...(itemSchema
      ? {
          itemSchema,
          items: (s.items ?? []).map((values, i) => ({
            id: `${id}-${i + 1}`,
            visible: true,
            values: Object.fromEntries(itemSchema.map((d) => [d.key, values[d.key] ?? emptyValue(d.type)])),
          })),
        }
      : {}),
  };
}

export function seedPortfolio(p: Omit<Portfolio, "schemaVersion" | "sections"> & { sections: SeedSection[] }): Portfolio {
  return { ...p, schemaVersion: 1, sections: p.sections.map(seedSection) };
}

export const link = (label: string, href: string) => ({ label, href });
export const metric = (value: string, label: string) => ({ value, label });
export const range = (start: string, end?: string) => ({ start, end: end ?? "", present: !end });
