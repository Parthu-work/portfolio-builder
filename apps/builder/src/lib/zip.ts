import { strToU8, zipSync, type Zippable } from "fflate";
import type { Portfolio } from "@runtime/schema/portfolio";

export type RuntimeFiles = Record<string, string | { base64: string }>;

/**
 * The runtime app as a zip, with the portfolio baked into
 * src/data/portfolio.json (and fallback.json) so it builds and runs anywhere
 * with no builder, no env vars and no network access.
 */
export function buildZip(files: RuntimeFiles, portfolio: Portfolio, folder: string): Uint8Array {
  const tree: Zippable = {};
  const data = `${JSON.stringify(portfolio, null, 2)}\n`;
  for (const [path, content] of Object.entries(files)) {
    if (path === ".env.example") continue;
    const bytes = typeof content === "string" ? strToU8(content) : Uint8Array.from(Buffer.from(content.base64, "base64"));
    tree[`${folder}/${path}`] = bytes;
  }
  tree[`${folder}/src/data/portfolio.json`] = strToU8(data);
  tree[`${folder}/src/data/fallback.json`] = strToU8(data);
  tree[`${folder}/README.md`] = strToU8(
    `# ${portfolio.profile.name || portfolio.meta.title} — portfolio\n\n` +
      "Exported from Persona. Your content lives in `src/data/portfolio.json`.\n\n" +
      "```bash\nnpm install\nnpm run build\nnpm start   # http://localhost:3200\n```\n\n" +
      "Deploy the folder to any Next.js host (Vercel, Netlify, Cloudflare via OpenNext, a VPS…).\n" +
      "This code is MIT licensed — it is yours.\n",
  );
  return zipSync(tree, { level: 6 });
}
