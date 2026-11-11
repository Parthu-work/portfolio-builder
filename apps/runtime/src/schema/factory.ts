import { SCHEMA_VERSION, type Portfolio, type Theme } from "./portfolio";
import { createSection } from "./presets";
import { DEFAULT_TEMPLATE_ID, getTemplateMeta } from "../templates/meta";

/** The default theme for a template: its first palette and font pair, in its preferred mode. */
export function defaultTheme(templateId: string = DEFAULT_TEMPLATE_ID): Theme {
  const meta = getTemplateMeta(templateId);
  return {
    templateId: meta.id,
    paletteId: meta.palettes[0]!.id,
    fontPairId: meta.fontPairs[0]!.id,
    mode: "system",
    motion: "full",
    radius: meta.id === "swiss" || meta.id === "brutal" || meta.id === "editorial" ? "sharp" : "soft",
  };
}

/**
 * Switches template without touching content. Palette and font pair ids are
 * template-specific, so they reset to the new template's defaults; mode,
 * motion and radius carry over.
 */
export function switchTemplate(portfolio: Portfolio, templateId: string): Portfolio {
  const meta = getTemplateMeta(templateId);
  const keep = portfolio.theme.templateId === meta.id;
  return {
    ...portfolio,
    theme: {
      ...portfolio.theme,
      templateId: meta.id,
      paletteId: keep ? portfolio.theme.paletteId : meta.palettes[0]!.id,
      fontPairId: keep ? portfolio.theme.fontPairId : meta.fontPairs[0]!.id,
    },
  };
}

/** A minimal starting portfolio: hero, about, projects, contact. */
export function blankPortfolio(input: { name: string; slug: string; templateId?: string }): Portfolio {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title: input.name, description: "", slug: input.slug, language: "en" },
    profile: { name: input.name, headline: "", socials: [] },
    theme: defaultTheme(input.templateId),
    sections: [createSection("hero"), createSection("about"), createSection("projects"), createSection("contact")],
  };
}
