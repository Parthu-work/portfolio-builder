import { ImageResponse } from "next/og";
import { loadPortfolio } from "../lib/load";
import { toHex } from "../render/color";
import { htmlToText } from "../render/sanitize";
import { getPalette, getTemplateMeta } from "../templates/meta";

export const revalidate = 3600;
export const alt = "Portfolio preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG image generated from the profile, in the portfolio's own palette. */
export default async function OpengraphImage() {
  const p = await loadPortfolio();
  const meta = getTemplateMeta(p.theme.templateId);
  const palette = getPalette(meta, p.theme.paletteId);
  const t = p.theme.mode === "light" || (p.theme.mode === "system" && meta.preferredMode === "light") ? palette.light : palette.dark;
  const c = { ground: toHex(t.ground), ink: toHex(t.ink), mute: toHex(t.mute), sig: toHex(t.sig), surface: toHex(t.surface), line: toHex(t.line) };
  const name = p.profile.name || p.meta.title || "Portfolio";
  const headline = htmlToText(p.profile.headline || p.meta.description || "").slice(0, 140);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: c.ground, color: c.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: c.mute }}>
          <div style={{ width: 18, height: 18, background: c.sig, display: "flex" }} />
          {p.profile.location || "Portfolio"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: name.length > 18 ? 92 : 124, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{name}</div>
          {headline ? <div style={{ fontSize: 38, color: c.mute, lineHeight: 1.25, maxWidth: 980 }}>{headline}</div> : null}
        </div>
        <div style={{ display: "flex", height: 10, width: "100%", background: c.surface }}>
          <div style={{ display: "flex", width: "32%", height: "100%", background: c.sig }} />
        </div>
      </div>
    ),
    size,
  );
}
