import { z } from "zod";
import { json, route } from "@/lib/api";
import { computeStats, RANGES, rangeStart } from "@/lib/stats";

const MAX_EVENTS = 20_000;

export const GET = route({ auth: "admin" }, async ({ req, store, audit }) => {
  const range = z.enum(RANGES).catch("7d").parse(new URL(req.url).searchParams.get("range"));
  const events = await store.listEvents(rangeStart(range), MAX_EVENTS);
  const [deployments, signups, mostEdited] = await Promise.all([store.recentDeployments(15), store.recentProfiles(15), store.mostEdited(10)]);
  await audit({ action: "admin.view_dashboard", entityType: "admin", entityId: range, before: null, after: null });
  return json(
    { stats: computeStats(events, range, Date.now(), events.length >= MAX_EVENTS), deployments, signups, mostEdited },
    { headers: { "cache-control": "no-store" } },
  );
});
