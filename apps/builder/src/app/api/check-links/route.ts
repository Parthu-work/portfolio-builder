import { z } from "zod";
import { json, route } from "@/lib/api";
import { checkLink } from "@/lib/links";

const Body = z.object({ urls: z.array(z.string().max(2048)).min(1).max(40) });

/** Checks links server-side (the browser cannot, because of CORS). Rate limited and SSRF-guarded. */
export const POST = route({ auth: "user", body: Body, rate: { name: "links", capacity: 6, perMinute: 6 } }, async ({ body }) => {
  const results = await Promise.all([...new Set(body.urls)].map((u) => checkLink(u)));
  return json({ results });
});
