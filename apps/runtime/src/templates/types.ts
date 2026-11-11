import type { ComponentType } from "react";
import type { Portfolio } from "../schema/portfolio";

export const TOKEN_NAMES = ["ground", "surface", "ink", "mute", "line", "edge", "sig", "sigink", "comp"] as const;
export type TokenName = (typeof TOKEN_NAMES)[number];

/**
 * Colour tokens, each an OKLCH triple "L C H".
 *  ground  60% — page background          ink     primary text
 *  surface 30% — cards / raised areas     mute    secondary text
 *  sig     10% — the one signal hue for actions; `sigink` is text on top of it
 *  comp    <5% — complementary accent for small highlights
 *  line    decorative hairlines           edge    UI borders that must be seen (≥ 3:1)
 */
export type Tokens = Record<TokenName, string>;

export type Palette = { id: string; name: string; light: Tokens; dark: Tokens };

export type FontPair = { id: string; name: string; display: string; body: string; mono: string };

export const LAYOUTS = ["timeline", "grid", "list", "quotes", "metrics", "tags"] as const;
export type Layout = (typeof LAYOUTS)[number];

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  /** One line on the template's signature interaction. */
  signature: string;
  tags: string[];
  palettes: Palette[];
  fontPairs: FontPair[];
  /** Layout variants a section can choose in this template. */
  layouts: readonly Layout[];
  /** The mode that shows the template at its best (used for gallery previews). */
  preferredMode: "dark" | "light";
};

export type TemplateProps = { portfolio: Portfolio };
export type TemplateComponent = ComponentType<TemplateProps>;
export type Template = TemplateMeta & { Component: TemplateComponent };
