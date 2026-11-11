// Runs before `next build` (see package.json).
//  1. Snapshots the published portfolio into src/data/fallback.json so the
//     site can always be built and served, even if the builder is unreachable.
//  2. Sends ONE deploy confirmation ping to the builder (portfolio id, site
//     URL, template id, runtime version — nothing else) so the owner's deploy
//     status screen can flip to "live". Disclosed in the builder's privacy note.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RUNTIME_VERSION = "1.0.0";
const builderUrl = process.env.BUILDER_URL?.replace(/\/+$/, "");
const portfolioId = process.env.PORTFOLIO_ID;
const fallbackPath = fileURLToPath(new URL("../src/data/fallback.json", import.meta.url));

async function main() {
  if (!builderUrl || !portfolioId) {
    console.log("[persona] PORTFOLIO_ID / BUILDER_URL not set — building from bundled data.");
    return;
  }
  let templateId = "unknown";
  try {
    const res = await fetch(`${builderUrl}/api/public/portfolios/${encodeURIComponent(portfolioId)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { portfolio } = await res.json();
    if (!portfolio || typeof portfolio !== "object") throw new Error("Unexpected response shape");
    await writeFile(fallbackPath, `${JSON.stringify(portfolio, null, 2)}\n`);
    templateId = portfolio.theme?.templateId ?? templateId;
    console.log("[persona] Wrote fallback.json snapshot of the published portfolio.");
  } catch (error) {
    console.warn(`[persona] Could not snapshot the portfolio (${error}); keeping the existing fallback.json.`);
    try {
      templateId = JSON.parse(await readFile(fallbackPath, "utf8")).theme?.templateId ?? templateId;
    } catch {}
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (!vercelUrl) return; // Not a hosted deploy (local build): nothing to confirm.
  try {
    const res = await fetch(`${builderUrl}/api/public/deployments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portfolioId, vercelUrl, templateId, runtimeVersion: RUNTIME_VERSION }),
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`[persona] Deploy confirmation ping: HTTP ${res.status}`);
  } catch (error) {
    console.warn(`[persona] Deploy confirmation ping failed (non-fatal): ${error}`);
  }
}

await main();
