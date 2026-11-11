import { SlugSchema } from "@runtime/schema/portfolio";
import { json, route } from "@/lib/api";

export const GET = route({ auth: "user", rate: { name: "slug", capacity: 30, perMinute: 60 } }, async ({ req, store }) => {
  const url = new URL(req.url);
  const parsed = SlugSchema.safeParse(url.searchParams.get("slug") ?? "");
  if (!parsed.success) return json({ available: false, reason: parsed.error.issues[0]?.message ?? "Invalid" });
  const except = url.searchParams.get("except") ?? undefined;
  return json({ available: await store.slugAvailable(parsed.data, except) });
});
