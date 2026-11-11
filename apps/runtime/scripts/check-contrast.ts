/**
 * Fails (exit 1) when any template palette has a text/background pair below
 * WCAG AA: 4.5:1 for text, 3:1 for UI borders and large text.
 * Colours are converted OKLCH → gamut-mapped sRGB exactly as rendered.
 */
import { checkTokens, toHex } from "../src/render/color";
import { TEMPLATES } from "../src/templates/meta";

let failures = 0;
let checked = 0;
for (const template of TEMPLATES) {
  if (template.palettes.length < 3 || template.palettes.length > 4) {
    console.error(`✗ ${template.id}: expected 3–4 palettes, found ${template.palettes.length}`);
    failures += 1;
  }
  for (const palette of template.palettes) {
    for (const mode of ["light", "dark"] as const) {
      for (const r of checkTokens(palette[mode])) {
        checked += 1;
        if (!r.pass) {
          failures += 1;
          const t = palette[mode];
          console.error(
            `✗ ${template.id}/${palette.id}/${mode}: ${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)}:1 (needs ${r.min}:1, ${r.why}) ` +
              `[${toHex(t[r.fg])} on ${toHex(t[r.bg])}]`,
          );
        }
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s) across ${checked} checked pairs.`);
  process.exit(1);
}
console.log(`✓ ${checked} colour pairs across ${TEMPLATES.length} templates pass WCAG AA.`);
