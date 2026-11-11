import { HttpError, json, route } from "@/lib/api";

/** Publish: copies the saved draft to `published` — the only version the public API ever serves. */
export const POST = route<undefined, { id: string }>({ auth: "user", rate: { name: "publish", capacity: 10, perMinute: 10 } }, async ({ store, user, audit, event }, { id }) => {
  const before = await store.getPortfolio(user!.id, id);
  if (!before) throw new HttpError(404, "Portfolio not found");
  if (!before.draft.profile.name.trim()) throw new HttpError(422, "Add your name before publishing.");
  const row = await store.publish(user!.id, id);
  await store.addVersion(user!.id, id, row.draft, "Published");
  await audit({ action: "portfolio.publish", entityType: "portfolio", entityId: id, before: { publishedAt: before.publishedAt }, after: { publishedAt: row.publishedAt, templateId: row.templateId } });
  await event("published", { portfolioId: id, props: { templateId: row.templateId, first: !before.publishedAt } });
  return json({ ok: true, publishedAt: row.publishedAt });
});
