import { ImageResponse } from "next/og";
import { loadPortfolio } from "../lib/load";
import { toHex } from "../render/color";
import { initials } from "../render/view";
import { getPalette, getTemplateMeta } from "../templates/meta";

export const revalidate = 3600;
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon generated from the owner's initials in the portfolio's accent colour (unless meta.favicon is set). */
export default async function Icon() {
  const p = await loadPortfolio();
  const t = getPalette(getTemplateMeta(p.theme.templateId), p.theme.paletteId).light;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: toHex(t.sig), color: toHex(t.sigink), fontSize: 30, fontWeight: 700, borderRadius: 14 }}>
        {initials(p.profile.name || p.meta.title || "P") || "P"}
      </div>
    ),
    size,
  );
}
