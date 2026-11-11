import { z } from "zod";
import { HttpError, json, route } from "@/lib/api";

type P = { id: string };

export const GET = route<undefined, P>({ auth: "user" }, async ({ store, user }, { id }) => json({ versions: await store.listVersions(user!.id, id) }));

const Body = z.object({ label: z.string().trim().max(80).optional() });

/** Manual snapshot of the current draft. Only the latest 20 are kept. */
export const POST = route<typeof Body, P>({ auth: "user", body: Body, rate: { name: "version", capacity: 10, perMinute: 10 } }, async ({ body, store, user }, { id }) => {
  const row = await store.getPortfolio(user!.id, id);
  if (!row) throw new HttpError(404, "Portfolio not found");
  return json({ version: await store.addVersion(user!.id, id, row.draft, body.label || "Manual snapshot") }, { status: 201 });
});
