import { z } from "zod";
import { HttpError, json, route } from "@/lib/api";
import { PortfolioInputSchema } from "@/lib/portfolio-input";

type P = { id: string };
const Id = z.string().uuid();
const id = (p: P) => {
  const r = Id.safeParse(p.id);
  if (!r.success) throw new HttpError(404, "Portfolio not found");
  return r.data;
};

export const GET = route<undefined, P>({ auth: "user" }, async ({ store, user }, params) => {
  const row = await store.getPortfolio(user!.id, id(params));
  if (!row) throw new HttpError(404, "Portfolio not found");
  return json({ portfolio: row });
});

const SaveSchema = z.object({ draft: PortfolioInputSchema });

/** Autosave: validates, sanitizes and stores the draft. Takes a snapshot when the last one is older than 10 minutes. */
export const PATCH = route<typeof SaveSchema, P>({ auth: "user", body: SaveSchema, rate: { name: "save", capacity: 60, perMinute: 60 } }, async ({ body, store, user }, params) => {
  const pid = id(params);
  const row = await store.saveDraft(user!.id, pid, body.draft);
  const [latest] = await store.listVersions(user!.id, pid);
  if (!latest || Date.now() - Date.parse(latest.createdAt) > 10 * 60 * 1000) {
    await store.addVersion(user!.id, pid, body.draft, "Autosave");
  }
  return json({ ok: true, updatedAt: row.updatedAt, slug: row.slug });
});

export const DELETE = route<undefined, P>({ auth: "user" }, async ({ store, user, audit }, params) => {
  const pid = id(params);
  const row = await store.getPortfolio(user!.id, pid);
  if (!row) throw new HttpError(404, "Portfolio not found");
  await store.deletePortfolio(user!.id, pid);
  await audit({ action: "portfolio.delete", entityType: "portfolio", entityId: pid, before: { slug: row.slug, templateId: row.templateId, published: Boolean(row.published) }, after: null });
  return json({ ok: true });
});
