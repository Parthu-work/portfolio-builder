import { TOKEN_NAMES, type Palette, type TokenName, type Tokens } from "../templates/types";

export type Rgb = [number, number, number];

/** Parses "L C H" (L in 0–1, C, H in degrees). */
export function parseOklch(triple: string): [number, number, number] {
  const parts = triple.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) throw new Error(`Bad OKLCH triple: "${triple}"`);
  return parts as [number, number, number];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** OKLCH → linear sRGB (may be out of gamut). */
function oklchToLinear(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** OKLCH → gamut-mapped linear sRGB (chroma is reduced until the colour fits, as browsers do). */
export function oklchToLinearSrgb(triple: string): Rgb {
  const [L, C, H] = parseOklch(triple);
  let rgb = oklchToLinear(L, C, H);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, H))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear(L, lo, H);
  }
  return rgb.map(clamp01) as Rgb;
}

const encode = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** OKLCH → 8-bit sRGB. */
export function oklchToSrgb(triple: string): Rgb {
  return oklchToLinearSrgb(triple).map((c) => Math.round(clamp01(encode(c)) * 255)) as Rgb;
}

export function toHex(triple: string): string {
  return `#${oklchToSrgb(triple).map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance of an 8-bit sRGB colour. */
export function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio between two OKLCH triples. */
export function contrast(a: string, b: string): number {
  const la = luminance(oklchToSrgb(a));
  const lb = luminance(oklchToSrgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Every foreground/background pair the templates rely on, with its WCAG threshold. */
export const CONTRAST_PAIRS: { fg: TokenName; bg: TokenName; min: number; why: string }[] = [
  { fg: "ink", bg: "ground", min: 4.5, why: "body text" },
  { fg: "ink", bg: "surface", min: 4.5, why: "body text on cards" },
  { fg: "mute", bg: "ground", min: 4.5, why: "secondary text" },
  { fg: "mute", bg: "surface", min: 4.5, why: "secondary text on cards" },
  { fg: "sig", bg: "ground", min: 4.5, why: "links / accent text" },
  { fg: "sig", bg: "surface", min: 4.5, why: "links / accent text on cards" },
  { fg: "sigink", bg: "sig", min: 4.5, why: "button label" },
  { fg: "comp", bg: "ground", min: 3, why: "complementary accent (large / UI)" },
  { fg: "comp", bg: "surface", min: 3, why: "complementary accent on cards (large / UI)" },
  { fg: "edge", bg: "ground", min: 3, why: "UI border" },
  { fg: "edge", bg: "surface", min: 3, why: "UI border on cards" },
];

export type ContrastResult = { fg: TokenName; bg: TokenName; min: number; ratio: number; pass: boolean; why: string };

export function checkTokens(tokens: Tokens): ContrastResult[] {
  return CONTRAST_PAIRS.map((p) => {
    const ratio = contrast(tokens[p.fg], tokens[p.bg]);
    return { ...p, ratio, pass: ratio >= p.min };
  });
}

/** Lowest text contrast ratio (ink/mute/sig pairs) across both modes — shown as a badge in the editor. */
export function paletteGrade(palette: Palette): { ratio: number; grade: "AAA" | "AA" | "fail" } {
  const ratios = (["light", "dark"] as const).flatMap((mode) =>
    checkTokens(palette[mode]).filter((r) => r.min === 4.5).map((r) => r.ratio),
  );
  const ratio = Math.min(...ratios);
  return { ratio, grade: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "fail" };
}

export function validTokens(tokens: Tokens): boolean {
  return TOKEN_NAMES.every((n) => {
    try {
      parseOklch(tokens[n]);
      return true;
    } catch {
      return false;
    }
  });
}
