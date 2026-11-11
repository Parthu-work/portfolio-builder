import type { CSSProperties, ReactNode } from "react";
import type { Portfolio } from "../schema/portfolio";
import { getFontPair, getPalette, getTemplateMeta } from "../templates/meta";
import { TOKEN_NAMES, type Tokens } from "../templates/types";
import { hash, initials } from "./view";

const vars = (t: Tokens) => TOKEN_NAMES.map((n) => `--${n}:oklch(${t[n]})`).join(";");

const RADIUS = { sharp: "0px", soft: "10px", round: "22px" } as const;

/** CSS for the active palette, fonts and radius. Mode "system" follows the visitor's OS setting. */
export function themeCss(theme: Portfolio["theme"]): string {
  const meta = getTemplateMeta(theme.templateId);
  const palette = getPalette(meta, theme.paletteId);
  const fonts = getFontPair(meta, theme.fontPairId);
  const shared = `--pf-display:${fonts.display};--pf-body:${fonts.body};--pf-mono:${fonts.mono};--r:${RADIUS[theme.radius] ?? RADIUS.soft}`;
  if (theme.mode === "dark") return `:root{${vars(palette.dark)};${shared};color-scheme:dark}`;
  if (theme.mode === "light") return `:root{${vars(palette.light)};${shared};color-scheme:light}`;
  return `:root{${vars(palette.light)};${shared};color-scheme:light dark}@media (prefers-color-scheme:dark){:root{${vars(palette.dark)}}}`;
}

/**
 * The wrapper every template renders: theme variables, skip link and the
 * data attributes that CSS and client islands key off.
 */
export function TemplateRoot({ portfolio, children, className = "", style }: { portfolio: Portfolio; children: ReactNode; className?: string; style?: CSSProperties }) {
  const { theme } = portfolio;
  const meta = getTemplateMeta(theme.templateId);
  return (
    <div
      className={`pf-root ${className}`}
      data-template={meta.id}
      data-motion={theme.motion}
      data-mode={theme.mode}
      data-radius={theme.radius}
      lang={portfolio.meta.language || "en"}
      style={style}
    >
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      <a href="#main" className="pf-skip">
        Skip to content
      </a>
      {children}
    </div>
  );
}

/**
 * Procedural cover art for entries without an image: a deterministic
 * gradient from the palette. Purely decorative.
 */
export function Cover({ seed, label, className = "", style }: { seed: string; label?: string; className?: string; style?: CSSProperties }) {
  const h = hash(seed);
  const x1 = 10 + (h % 70);
  const y1 = 10 + ((h >> 7) % 70);
  const x2 = 90 - ((h >> 13) % 70);
  const y2 = 90 - ((h >> 19) % 70);
  const angle = (h >> 5) % 360;
  return (
    <span
      aria-hidden="true"
      className={`pf-cover ${className}`}
      {...(label ? { "data-label": initials(label) } : {})}
      style={
        {
          "--cx1": `${x1}%`,
          "--cy1": `${y1}%`,
          "--cx2": `${x2}%`,
          "--cy2": `${y2}%`,
          "--ca": `${angle}deg`,
          ...style,
        } as CSSProperties
      }
    />
  );
}
