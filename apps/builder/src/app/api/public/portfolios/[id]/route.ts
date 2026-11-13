import { after } from "next/server";
import { z } from "zod";
import { HttpError, json, log, route } from "@/lib/api";
import { stripProofs } from "@/lib/integrations/sections";
import { mergeLive, refreshStale } from "@/lib/integrations/service";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

/**
 * Public, read-only: the PUBLISHED version of a portfolio (never the draft).
 * This is what deployed sites fetch at build time and on ISR revalidation.
 *
 * Sections synced from connected accounts get their content from the latest
 * snapshot here, so deployed sites update themselves with no cron and no
 * redeploy. Snapshots older than 12 hours are served as they are and
 * refreshed after the response (stale-while-revalidate).
 */
export const GET = route<undefined, { id: string }>({ auth: "public", rate: { name: "public-portfolio", capacity: 60, perMinute: 120 } }, async ({ store }, { id }) => {
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, "Not found");
  const found = await store.getPublished({ id });
  if (!found) throw new HttpError(404, "This portfolio has not been published.");
  let portfolio = stripProofs(found.portfolio);
  try {
    const merged = await mergeLive(store, found.id, found.portfolio);
    portfolio = merged.portfolio;
    if (merged.stale.length) after(() => refreshStale(store, merged.stale, found.portfolio));
  } catch (e) {
    // Integrations must never take a published site down: serve the document as stored.
    log("error", "integration merge failed", { portfolioId: found.id, error: String(e) });
  }
  return json(
    { portfolio, publishedAt: found.publishedAt },
    { headers: { ...CORS, "cache-control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
