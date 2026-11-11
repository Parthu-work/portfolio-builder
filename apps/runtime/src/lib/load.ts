import { cache } from "react";
import fallback from "../data/fallback.json";
import baked from "../data/portfolio.json";
import { migrate } from "../schema/migrate";
import type { Portfolio } from "../schema/portfolio";

export const RUNTIME_VERSION = "1.0.0";
export const REVALIDATE_SECONDS = 3600;

const BUILDER_URL = process.env.BUILDER_URL?.replace(/\/+$/, "");
const PORTFOLIO_ID = process.env.PORTFOLIO_ID;

/**
 * Where the portfolio comes from, in order:
 *  1. `src/data/portfolio.json` when it holds a portfolio (the "Download code" zip bakes one in).
 *  2. The builder's public API (published version only), revalidated hourly (ISR).
 *     - At build time a failed fetch falls back to the bundled `fallback.json` snapshot.
 *     - At revalidation time a failed fetch THROWS, which makes Next.js keep serving
 *       the last successfully generated page — the site never breaks if the builder is down.
 *  3. `fallback.json` (written by scripts/prebuild.mjs, or the sample portfolio).
 */
export const loadPortfolio = cache(async (): Promise<Portfolio> => {
  if (baked !== null) return migrate(baked);
  if (BUILDER_URL && PORTFOLIO_ID) {
    try {
      const res = await fetch(`${BUILDER_URL}/api/public/portfolios/${encodeURIComponent(PORTFOLIO_ID)}`, {
        next: { revalidate: REVALIDATE_SECONDS },
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Builder responded ${res.status}`);
      const body = (await res.json()) as { portfolio?: unknown };
      return migrate(body.portfolio);
    } catch (error) {
      if (process.env.NEXT_PHASE !== "phase-production-build") throw error;
      console.warn(`[persona] Could not fetch the portfolio at build time, using fallback.json: ${String(error)}`);
    }
  }
  return migrate(fallback);
});

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.CF_PAGES_URL ||
    "http://localhost:3200";
  return (/^https?:\/\//.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
}
