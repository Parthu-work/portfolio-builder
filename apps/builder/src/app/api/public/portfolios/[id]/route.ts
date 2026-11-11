import { z } from "zod";
import { HttpError, json, route } from "@/lib/api";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

/**
 * Public, read-only: the PUBLISHED version of a portfolio (never the draft).
 * This is what deployed sites fetch at build time and on ISR revalidation.
 */
export const GET = route<undefined, { id: string }>({ auth: "public", rate: { name: "public-portfolio", capacity: 60, perMinute: 120 } }, async ({ store }, { id }) => {
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, "Not found");
  const found = await store.getPublished({ id });
  if (!found) throw new HttpError(404, "This portfolio has not been published.");
  return json(
    { portfolio: found.portfolio, publishedAt: found.publishedAt },
    { headers: { ...CORS, "cache-control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
