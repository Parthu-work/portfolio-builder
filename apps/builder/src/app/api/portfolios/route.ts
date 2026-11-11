import { z } from "zod";
import { SlugSchema, type Portfolio } from "@runtime/schema/portfolio";
import { blankPortfolio, switchTemplate } from "@runtime/schema/factory";
import { migrate, MigrationError } from "@runtime/schema/migrate";
import { SEEDS, isSeedId } from "@runtime/schema/seeds";
import { TEMPLATE_IDS } from "@runtime/templates/meta";
import { HttpError, json, route } from "@/lib/api";
import { limitsFor } from "@/lib/billing";
import { normalizePortfolio } from "@/lib/portfolio-input";

export const GET = route({ auth: "user" }, async ({ store, user }) => {
  const rows = await store.listPortfolios(user!.id);
  return json({
    portfolios: rows.map((r) => ({ id: r.id, slug: r.slug, templateId: r.templateId, title: r.draft.meta.title, name: r.draft.profile.name, publishedAt: r.publishedAt, updatedAt: r.updatedAt })),
  });
});

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
  slug: SlugSchema,
  templateId: z.string().refine((id) => TEMPLATE_IDS.includes(id), "Unknown template"),
  /** "blank", a seed id, or "import" together with `data`. */
  start: z.string().max(40).default("blank"),
  data: z.unknown().optional(),
});

export const POST = route({ auth: "user", body: CreateSchema, rate: { name: "create", capacity: 10, perMinute: 6 } }, async ({ body, store, user, audit, event }) => {
  const limits = await limitsFor(user!.id);
  if ((await store.listPortfolios(user!.id)).length >= limits.maxPortfolios) {
    throw new HttpError(403, `You can have up to ${limits.maxPortfolios} portfolios.`);
  }
  let draft: Portfolio;
  if (body.start === "import") {
    try {
      draft = migrate(body.data);
    } catch (e) {
      throw new HttpError(422, e instanceof MigrationError ? e.message : "That file is not a Persona portfolio.");
    }
    draft = switchTemplate(draft, body.templateId);
  } else if (isSeedId(body.start)) {
    draft = switchTemplate(structuredClone(SEEDS[body.start].portfolio), body.templateId);
    draft.theme.mode = "system";
  } else {
    draft = blankPortfolio({ name: body.name, slug: body.slug, templateId: body.templateId });
  }
  if (body.start !== "blank") {
    draft.meta.title = draft.meta.title.replace(draft.profile.name, body.name) || body.name;
    draft.profile.name = body.name;
  }
  draft.meta.slug = body.slug;
  await store.ensureProfile(user!);
  const row = await store.createPortfolio(user!.id, normalizePortfolio(draft));
  await audit({ action: "portfolio.create", entityType: "portfolio", entityId: row.id, before: null, after: { slug: row.slug, templateId: row.templateId, start: body.start } });
  await event("portfolio_created", { portfolioId: row.id, props: { templateId: row.templateId, start: body.start } });
  return json({ id: row.id, slug: row.slug }, { status: 201 });
});
