import { HttpError, json, route } from "@/lib/api";
import { limitsFor } from "@/lib/billing";

export const POST = route<undefined, { id: string }>({ auth: "user", rate: { name: "create", capacity: 10, perMinute: 6 } }, async ({ store, user, audit }, { id }) => {
  const src = await store.getPortfolio(user!.id, id);
  if (!src) throw new HttpError(404, "Portfolio not found");
  const limits = await limitsFor(user!.id);
  if ((await store.listPortfolios(user!.id)).length >= limits.maxPortfolios) throw new HttpError(403, `You can have up to ${limits.maxPortfolios} portfolios.`);
  const base = `${src.slug.slice(0, 40)}-copy`;
  let slug = base;
  for (let n = 2; !(await store.slugAvailable(slug)); n += 1) slug = `${base}-${n}`;
  const draft = structuredClone(src.draft);
  draft.meta.slug = slug;
  draft.meta.title = `${draft.meta.title} (copy)`.slice(0, 120);
  const row = await store.createPortfolio(user!.id, draft);
  await audit({ action: "portfolio.duplicate", entityType: "portfolio", entityId: row.id, before: { from: id }, after: { slug } });
  return json({ id: row.id, slug }, { status: 201 });
});
