import { PortfolioSchema, type Portfolio } from "@runtime/schema/portfolio";
import { sanitizeRichText } from "@runtime/render/sanitize";
import { getFontPair, getPalette, getTemplateMeta } from "@runtime/templates/meta";

/**
 * Server-side normalisation applied to every portfolio before it is stored:
 * rich text goes through the allowlist sanitizer and theme ids are snapped to
 * real template / palette / font-pair ids.
 */
export function normalizePortfolio(input: Portfolio): Portfolio {
  const p = structuredClone(input);
  const meta = getTemplateMeta(p.theme.templateId);
  p.theme.templateId = meta.id;
  p.theme.paletteId = getPalette(meta, p.theme.paletteId).id;
  p.theme.fontPairId = getFontPair(meta, p.theme.fontPairId).id;
  for (const section of p.sections) {
    for (const field of section.fields) {
      if (field.type === "richtext" && typeof field.value === "string") field.value = sanitizeRichText(field.value);
    }
    const rich = (section.itemSchema ?? []).filter((d) => d.type === "richtext").map((d) => d.key);
    for (const item of section.items ?? []) {
      for (const key of rich) {
        const v = item.values[key];
        if (typeof v === "string") item.values[key] = sanitizeRichText(v);
      }
    }
  }
  return p;
}

export const PortfolioInputSchema = PortfolioSchema.transform(normalizePortfolio);
